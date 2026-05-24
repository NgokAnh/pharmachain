import { Router, Response } from 'express';
import { InventoryTransactionType, StockStatus } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';
import { createInventoryTransaction } from '../services/inventory';

const router = Router();

// 1. Get all inventory checks
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userBranchId = req.user?.branchId;

    let queryOptions = {};

    if (userRole !== 'ROLE_ADMIN' && userRole !== 'ROLE_CHAIN_MANAGER') {
      if (!userBranchId) {
        return res.status(403).json({ error: 'User does not belong to any branch' });
      }
      queryOptions = {
        where: { branchId: userBranchId }
      };
    }

    const checks = await prisma.inventoryCheck.findMany({
      ...queryOptions,
      include: {
        branch: { select: { name: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(checks);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching inventory checks');
  }
});

// 2. Create an inventory check
router.post('/', authenticateJWT, requirePermission('inventory.stocktake'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let branchId = req.user?.branchId;
    const userRole = req.user?.role;

    if (!branchId) {
      if (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_CHAIN_MANAGER') {
        if (req.body.branchId) {
          branchId = req.body.branchId;
        } else {
          return res.status(400).json({ error: 'Vui lòng chọn chi nhánh để kiểm kho' });
        }
      } else {
        return res.status(403).json({ error: 'Tài khoản không thuộc chi nhánh nào' });
      }
    }

    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cần có ít nhất 1 mặt hàng để kiểm kho' });
    }

    // Generate checkNumber
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.inventoryCheck.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });
    const checkNumber = `CHK${dateStr}${(count + 1).toString().padStart(4, '0')}`;

    const check = await prisma.inventoryCheck.create({
      data: {
        checkNumber,
        branchId: branchId as string,
        status: 'pending',
        createdBy: req.user?.username || 'Unknown',
        notes,
        items: {
          create: items.map((item: any) => ({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            lotNumber: item.lotNumber,
            systemQuantity: item.systemQuantity,
            actualQuantity: item.actualQuantity,
            difference: item.actualQuantity - item.systemQuantity,
            reason: item.reason
          }))
        }
      },
      include: { items: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'unknown',
        userName: req.user?.username || 'unknown',
        action: 'create',
        entityType: 'inventory_check',
        entityId: check.id,
        details: `Tạo phiếu kiểm kho ${checkNumber} với ${items.length} mặt hàng.`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(check);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating inventory check');
  }
});

// 3. Get single inventory check
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const check = await prisma.inventoryCheck.findUnique({
      where: { id: req.params.id },
      include: {
        branch: { select: { name: true } },
        items: true
      }
    });

    if (!check) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu kiểm kho' });
    }

    res.json(check);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching inventory check');
  }
});

// 4. Approve an inventory check and create transactions
router.put('/:id/approve', authenticateJWT, requirePermission('inventory.adjust'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const check = await tx.inventoryCheck.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!check) {
        throw new Error('Không tìm thấy phiếu kiểm kho');
      }

      if (req.user?.role !== 'ROLE_ADMIN' && req.user?.role !== 'ROLE_CHAIN_MANAGER') {
        if (check.branchId !== req.user?.branchId) {
          throw new Error('Bạn không có quyền duyệt phiếu kiểm kho của chi nhánh khác');
        }
      }

      if (check.status !== 'pending') {
        throw new Error('Chỉ có thể duyệt phiếu đang chờ duyệt');
      }

      for (const item of check.items) {
        if (item.difference === 0) continue;

        const lot = await tx.inventoryLot.findFirst({
          where: {
            medicineId: item.medicineId,
            branchId: check.branchId,
            lotNumber: item.lotNumber
          }
        });

        if (!lot) {
          throw new Error(`Không tìm thấy lô ${item.lotNumber} của thuốc ${item.medicineName}`);
        }

        const transactionType = item.difference > 0 ? InventoryTransactionType.ADJUSTMENT_IN : InventoryTransactionType.ADJUSTMENT_OUT;

        await createInventoryTransaction(tx, {
          medicineId: item.medicineId,
          inventoryLotId: lot.id,
          branchId: check.branchId,
          locationId: lot.locationId,
          stockStatus: StockStatus.AVAILABLE,
          transactionType,
          quantity: item.difference, // difference is positive for IN, negative for OUT
          referenceType: 'inventory_check',
          referenceId: check.id,
          referenceNumber: check.checkNumber,
          createdByUserId: req.user?.id,
          createdByUserName: req.user?.username,
          notes: `Kiểm kho chênh lệch: ${item.reason || ''}`
        });
      }

      return tx.inventoryCheck.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: req.user?.username || 'Unknown'
        },
        include: {
          branch: { select: { name: true } },
          items: true
        }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'unknown',
        userName: req.user?.username || 'unknown',
        action: 'approve',
        entityType: 'inventory_check',
        entityId: id,
        details: `Duyệt phiếu kiểm kho ${result.checkNumber} và cập nhật tồn kho.`,
        ipAddress: req.ip
      }
    });

    res.json(result);
  } catch (err: any) {
    if (err instanceof Error) {
      if (err.message.startsWith('Không tìm thấy') || err.message.startsWith('Chỉ có thể')) {
        return res.status(400).json({ error: err.message });
      }
    }
    return respondWithDatabaseAwareError(res, err, 'Internal server error approving inventory check');
  }
});

export default router;
