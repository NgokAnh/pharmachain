import { Router, Response } from 'express';
import { InventoryTransactionType, StockStatus } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';
import { createInventoryTransaction } from '../services/inventory';

const router = Router();

// 1. Lấy danh sách phiếu chuyển kho
router.get('/transfers', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userBranchId = req.user?.branchId;

    let queryOptions = {};

    // Nếu không phải là Admin/Chain Manager, chỉ hiển thị phiếu chuyển kho liên quan đến chi nhánh của họ
    if (userRole !== 'ROLE_ADMIN' && userRole !== 'ROLE_CHAIN_MANAGER') {
      if (!userBranchId) {
        return res.status(403).json({ error: 'User does not belong to any branch' });
      }
      queryOptions = {
        where: {
          OR: [
            { fromBranchId: userBranchId },
            { toBranchId: userBranchId }
          ]
        }
      };
    }

    const transfers = await prisma.stockTransfer.findMany({
      ...queryOptions,
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transfers);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching transfers');
  }
});

// 2. Tạo yêu cầu chuyển kho (status = 'pending')
router.post('/transfers', authenticateJWT, requirePermission('transfer.create'), async (req: AuthenticatedRequest, res: Response) => {
  const { toBranchId, items, notes } = req.body;
  let transferFromBranchId = req.user?.branchId;
  const userRole = req.user?.role;

  if (!transferFromBranchId) {
    if (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_CHAIN_MANAGER') {
      if (req.body.fromBranchId) {
        transferFromBranchId = req.body.fromBranchId;
      } else {
        return res.status(400).json({ error: 'Quản trị viên cần chọn chi nhánh xuất (fromBranchId) để chuyển kho' });
      }
    } else {
      return res.status(403).json({ error: 'Tài khoản không thuộc chi nhánh nào để chuyển kho' });
    }
  }

  const finalTransferFromBranchId = transferFromBranchId as string;

  if (!toBranchId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Target branch and items are required' });
  }

  try {
    const transferNumber = `TRF${Date.now().toString().slice(-9)}`;
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromBranchId: finalTransferFromBranchId,
        toBranchId,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        requestedBy: req.user?.username || 'user',
        notes,
        items: {
          create: items.map((i: any) => ({
            medicineId: i.medicineId,
            medicineName: i.medicineName,
            lotNumber: i.lotNumber,
            quantity: i.quantity
          }))
        }
      },
      include: { items: true }
    });

    // Ghi nhật ký
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || '3',
        userName: req.user?.username || 'branch_manager',
        action: 'create',
        entityType: 'transfer',
        entityId: transfer.id,
        details: `Tạo yêu cầu chuyển kho ${transferNumber} từ chi nhánh gửi sang chi nhánh nhận.`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(transfer);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating transfer');
  }
});

// 3. Phê duyệt phiếu chuyển kho (status = 'approved')
router.put('/transfers/:id/approve', authenticateJWT, requirePermission('transfer.approve'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user?.username || 'manager'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || '2',
        userName: req.user?.username || 'chain_manager',
        action: 'update',
        entityType: 'transfer',
        entityId: id,
        details: `Phê duyệt yêu cầu chuyển kho ${transfer.transferNumber}.`,
        ipAddress: req.ip
      }
    });

    res.json(transfer);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error approving transfer');
  }
});

// 4. Bắt đầu vận chuyển / Xuất kho (status = 'in_transit')
router.put('/transfers/:id/ship', authenticateJWT, requirePermission('transfer.ship'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const currentTransfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!currentTransfer) {
        throw new Error('Stock transfer request not found');
      }

      if (currentTransfer.status !== 'approved') {
        throw new Error('Transfer must be approved before shipping');
      }

      for (const item of currentTransfer.items) {
        const fromLot = await tx.inventoryLot.findFirst({
          where: {
            medicineId: item.medicineId,
            branchId: currentTransfer.fromBranchId,
            lotNumber: item.lotNumber
          }
        });

        if (!fromLot) {
          throw new Error(`Khong tim thay lo ${item.lotNumber} tai chi nhanh gui.`);
        }

        await createInventoryTransaction(tx, {
          medicineId: item.medicineId,
          inventoryLotId: fromLot.id,
          branchId: currentTransfer.fromBranchId,
          locationId: fromLot.locationId,
          stockStatus: StockStatus.AVAILABLE,
          transactionType: InventoryTransactionType.TRANSFER_OUT,
          quantity: -item.quantity,
          referenceType: 'transfer',
          referenceId: currentTransfer.id,
          referenceNumber: currentTransfer.transferNumber,
          createdByUserId: req.user?.id,
          createdByUserName: req.user?.username,
          notes: `Xuat kho chuyen hang ${currentTransfer.transferNumber}`
        });

        await createInventoryTransaction(tx, {
          medicineId: item.medicineId,
          inventoryLotId: fromLot.id,
          branchId: currentTransfer.fromBranchId,
          locationId: fromLot.locationId,
          stockStatus: StockStatus.IN_TRANSIT,
          transactionType: InventoryTransactionType.TRANSFER_OUT,
          quantity: item.quantity,
          referenceType: 'transfer',
          referenceId: currentTransfer.id,
          referenceNumber: currentTransfer.transferNumber,
          createdByUserId: req.user?.id,
          createdByUserName: req.user?.username,
          notes: `Chuyen AVAILABLE sang IN_TRANSIT cho ${currentTransfer.transferNumber}`
        });
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'in_transit' }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || '5',
        userName: req.user?.username || 'warehouse',
        action: 'update',
        entityType: 'transfer',
        entityId: id,
        details: `Nhân viên kho xác nhận xuất hàng vận chuyển phiếu ${transfer.transferNumber} va ghi ledger AVAILABLE -> IN_TRANSIT.`,
        ipAddress: req.ip
      }
    });

    res.json(transfer);
  } catch (err: any) {
    if (err instanceof Error) {
      if (err.message === 'Stock transfer request not found' || err.message.startsWith('Khong tim thay lo ')) {
        return res.status(404).json({ error: err.message });
      }

      if (err.message === 'Transfer must be approved before shipping') {
        return res.status(409).json({ error: err.message });
      }
    }

    return respondWithDatabaseAwareError(res, err, 'Internal server error shipping transfer');
  }
});

// 5. Xác nhận nhận hàng và cập nhật ledger tồn kho ở cả 2 chi nhánh
router.put('/transfers/:id/receive', authenticateJWT, requirePermission('transfer.receive'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { receivedItems } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!transfer) {
        throw new Error('Stock transfer request not found');
      }

      if (transfer.status !== 'in_transit') {
        throw new Error('Transfer is not in transit');
      }

      for (const item of transfer.items) {
        const inputItem = receivedItems?.find((candidate: any) => candidate.itemId === item.id);
        const qtyReceived = inputItem ? inputItem.receivedQuantity : item.quantity;

        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQuantity: qtyReceived }
        });

        const fromLot = await tx.inventoryLot.findFirst({
          where: {
            medicineId: item.medicineId,
            branchId: transfer.fromBranchId,
            lotNumber: item.lotNumber
          }
        });

        if (fromLot) {
          await createInventoryTransaction(tx, {
            medicineId: item.medicineId,
            inventoryLotId: fromLot.id,
            branchId: transfer.fromBranchId,
            locationId: fromLot.locationId,
            stockStatus: StockStatus.IN_TRANSIT,
            transactionType: InventoryTransactionType.TRANSFER_IN,
            quantity: -qtyReceived,
            referenceType: 'transfer',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            createdByUserId: req.user?.id,
            createdByUserName: req.user?.username,
            notes: `Giam IN_TRANSIT khi chi nhanh nhan xac nhan ${transfer.transferNumber}`
          });
        }

        const destinationLocation = await tx.location.findFirst({
          where: { branchId: transfer.toBranchId },
          orderBy: { createdAt: 'asc' }
        });

        if (!destinationLocation) {
          throw new Error('Target branch does not have a receiving location');
        }

        let toLot = await tx.inventoryLot.findFirst({
          where: {
            medicineId: item.medicineId,
            branchId: transfer.toBranchId,
            lotNumber: item.lotNumber
          }
        });

        if (!toLot) {
          const baseLot = fromLot || await tx.inventoryLot.findFirst({ where: { medicineId: item.medicineId } });

          toLot = await tx.inventoryLot.create({
            data: {
              medicineId: item.medicineId,
              branchId: transfer.toBranchId,
              locationId: destinationLocation.id,
              lotNumber: item.lotNumber,
              manufacturingDate: baseLot?.manufacturingDate,
              expiryDate: baseLot?.expiryDate || '2027-12-31',
              costPrice: baseLot?.costPrice || 10,
              receivedDate: new Date().toISOString().split('T')[0],
              supplierName: baseLot?.supplierName || 'Nha cung cap doi tac',
              inboundDocumentNo: transfer.transferNumber,
              status: StockStatus.AVAILABLE
            }
          });
        }

        await createInventoryTransaction(tx, {
          medicineId: item.medicineId,
          inventoryLotId: toLot.id,
          branchId: transfer.toBranchId,
          locationId: toLot.locationId,
          stockStatus: StockStatus.AVAILABLE,
          transactionType: InventoryTransactionType.TRANSFER_IN,
          quantity: qtyReceived,
          referenceType: 'transfer',
          referenceId: transfer.id,
          referenceNumber: transfer.transferNumber,
          createdByUserId: req.user?.id,
          createdByUserName: req.user?.username,
          notes: `Nhap kho nhan hang tu ${transfer.transferNumber}`
        });
      }

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'received' }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id || '3',
          userName: req.user?.username || 'branch_manager',
          action: 'update',
          entityType: 'transfer',
          entityId: id,
          details: `Xac nhan nhan hang hoan tat cho phieu chuyen kho ${transfer.transferNumber}. Ledger IN_TRANSIT da duoc giam o chi nhanh gui va cong AVAILABLE tai chi nhanh nhan.`,
          ipAddress: req.ip
        }
      });

      return updatedTransfer;
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.json(result);
  } catch (err: any) {
    if (err instanceof Error) {
      if (err.message === 'Stock transfer request not found') {
        return res.status(404).json({ error: err.message });
      }

      if (
        err.message === 'Transfer is not in transit' ||
        err.message === 'Target branch does not have a receiving location'
      ) {
        return res.status(409).json({ error: err.message });
      }
    }

    return respondWithDatabaseAwareError(res, err, 'Internal server error completing transfer reception');
  }
});

export default router;
