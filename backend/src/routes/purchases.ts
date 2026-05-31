import { Router, Response } from 'express';
import { InventoryTransactionType, StockStatus } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';
import { convertToBaseQuantity, createInventoryTransaction } from '../services/inventory';

const router = Router();

// Lấy danh sách phiếu nhập kho thực tế (Aggregated receipts from transaction ledger)
router.get('/purchases', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userBranchId = req.user?.branchId;
    let branchFilter: string | undefined;

    // Phân quyền: Nếu không phải Admin hoặc Chain Manager, lọc theo chi nhánh trực thuộc
    if (userRole !== 'ROLE_ADMIN' && userRole !== 'ROLE_CHAIN_MANAGER') {
      if (!userBranchId) {
        return res.status(403).json({ error: 'User does not belong to any branch' });
      }
      branchFilter = userBranchId;
    }

    const whereClause: any = {
      transactionType: InventoryTransactionType.RECEIPT,
      referenceType: 'purchase'
    };
    if (branchFilter) {
      whereClause.branchId = branchFilter;
    }

    const receipts = await prisma.inventoryTransaction.findMany({
      where: whereClause,
      include: {
        medicine: true,
        inventoryLot: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Gom nhóm giao dịch kho theo mã hóa đơn
    const receiptMap = new Map<string, any>();
    for (const tx of receipts) {
      const invNo = tx.referenceNumber || 'N/A';
      const current = receiptMap.get(invNo) || {
        invoiceNumber: invNo,
        receivedDate: tx.createdAt.toISOString().split('T')[0],
        supplierName: tx.inventoryLot?.supplierName || 'N/A',
        branchName: tx.branch?.name || 'N/A',
        itemCount: 0,
        totalAmount: 0,
        items: []
      };

      current.itemCount += 1;
      const itemCost = (tx.inventoryLot?.costPrice || 0) * Math.abs(tx.quantity);
      current.totalAmount += itemCost;
      current.items.push({
        medicineName: tx.medicine?.name || 'N/A',
        quantity: Math.abs(tx.quantity),
        unit: tx.medicine?.unit || 'N/A',
        costPrice: tx.inventoryLot?.costPrice || 0,
        totalPrice: itemCost
      });

      receiptMap.set(invNo, current);
    }

    res.json(Array.from(receiptMap.values()));
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching purchase receipts');
  }
});

router.post(
  '/purchases/receive',
  authenticateJWT,
  requirePermission('purchasing.receive'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { supplierId, supplierName, invoiceNumber, invoiceDate, items } = req.body;
    let receiveBranchId = req.user?.branchId;
    const userRole = req.user?.role;

    if (!receiveBranchId) {
      if (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_CHAIN_MANAGER') {
        if (req.body.branchId) {
          receiveBranchId = req.body.branchId;
        } else {
          return res.status(400).json({ error: 'Quản trị viên cần chọn chi nhánh để nhập kho' });
        }
      } else {
        return res.status(403).json({ error: 'User does not belong to any branch to receive stock' });
      }
    }

    const finalReceiveBranchId = receiveBranchId as string;

    if (!invoiceNumber || !invoiceDate) {
      return res.status(400).json({ error: 'Invoice number and invoice date are required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one receipt item is required' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const receiptLines = [];

        for (const item of items) {
          const medicine = await tx.medicine.findUnique({
            where: { id: item.medicineId },
            include: { unitConversions: true },
          });

          if (!medicine) {
            throw new Error(`Khong tim thay thuoc voi id ${item.medicineId}.`);
          }

          const transactionUnit = item.transactionUnit || medicine.unit;
          const transactionQuantity = Number(item.quantity);
          const transactionUnitPrice = Number(item.unitPrice);

          if (!Number.isFinite(transactionUnitPrice) || transactionUnitPrice <= 0) {
            throw new Error(`Don gia nhap cua ${medicine.name} phai lon hon 0.`);
          }

          if (!item.batchNumber || !item.expiryDate) {
            throw new Error(`Can nhap so lo va han dung cho ${medicine.name}.`);
          }

          const { baseQuantity, conversionFactor } = convertToBaseQuantity(
            medicine,
            transactionUnit,
            transactionQuantity
          );
          const baseUnitCost = transactionUnitPrice / conversionFactor;

          let lot = await tx.inventoryLot.findFirst({
            where: {
              branchId: finalReceiveBranchId,
              medicineId: medicine.id,
              lotNumber: item.batchNumber,
              expiryDate: item.expiryDate,
            },
          });

          if (!lot) {
            lot = await tx.inventoryLot.create({
              data: {
                medicineId: medicine.id,
                branchId: finalReceiveBranchId,
                lotNumber: item.batchNumber,
                manufacturingDate: item.manufacturingDate || null,
                expiryDate: item.expiryDate,
                receivedDate: invoiceDate,
                supplierName: supplierName || supplierId || 'Nha cung cap',
                inboundDocumentNo: invoiceNumber,
                status: StockStatus.AVAILABLE,
                costPrice: baseUnitCost,
              },
            });
          } else {
            lot = await tx.inventoryLot.update({
              where: { id: lot.id },
              data: {
                manufacturingDate: item.manufacturingDate || lot.manufacturingDate,
                receivedDate: invoiceDate,
                supplierName: supplierName || supplierId || lot.supplierName,
                inboundDocumentNo: invoiceNumber,
                costPrice: baseUnitCost,
                status: StockStatus.AVAILABLE,
              },
            });
          }

          await createInventoryTransaction(tx, {
            medicineId: medicine.id,
            inventoryLotId: lot.id,
            branchId: finalReceiveBranchId,
            stockStatus: StockStatus.AVAILABLE,
            transactionType: InventoryTransactionType.RECEIPT,
            quantity: baseQuantity,
            referenceType: 'purchase',
            referenceId: invoiceNumber,
            referenceNumber: invoiceNumber,
            createdByUserId: req.user?.id,
            createdByUserName: req.user?.username,
            notes: `Nhap kho ${transactionQuantity} ${transactionUnit} = ${baseQuantity} ${medicine.unit}`,
          });

          receiptLines.push({
            medicineId: medicine.id,
            medicineName: medicine.name,
            transactionUnit,
            transactionQuantity,
            conversionFactor,
            baseUnit: medicine.unit,
            baseQuantity,
            unitPrice: transactionUnitPrice,
            baseUnitCost,
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate,
          });
        }

        await tx.auditLog.create({
          data: {
            userId: req.user?.id || 'system',
            userName: req.user?.username || 'warehouse',
            action: 'create',
            entityType: 'purchase_receipt',
            entityId: invoiceNumber,
            details: `Nhan hang hoa don ${invoiceNumber} tu ${supplierName || supplierId || 'nha cung cap'} voi ${items.length} dong, da quy doi ve don vi co so truoc khi ghi so kho.`,
            ipAddress: req.ip,
          },
        });

        return {
          invoiceNumber,
          receiptLines,
        };
      }, {
        maxWait: 15000,
        timeout: 30000
      });

      return res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('Khong tim thay thuoc') ||
          error.message.includes('Khong tim thay ty le quy doi')
        ) {
          return res.status(404).json({ error: error.message });
        }

        if (
          error.message.includes('phai lon hon 0') ||
          error.message.includes('Can nhap so lo') ||
          error.message.includes('Chi nhanh hien tai chua co vi tri')
        ) {
          return res.status(400).json({ error: error.message });
        }
      }

      return respondWithDatabaseAwareError(res, error, 'Internal server error receiving purchase stock');
    }
  }
);

export default router;
