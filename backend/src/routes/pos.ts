import { Router, Response } from 'express';
import { InventoryTransactionType, StockStatus } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';
import {
  PromotionCalculator,
  PercentDiscountStrategy,
  FixedAmountStrategy,
  ComboStrategy,
  PointRewardStrategy,
  DefaultStrategy,
  BuyGiftStrategy,
  ConditionFixedDiscountStrategy,
  TierPercentDiscountStrategy,
  Order as PromoOrder,
} from '../strategies/promotions';
import {
  buildShortageGuidance,
  createInventoryTransaction,
  pickBatchFefo,
} from '../services/inventory';

const router = Router();

// 1. POS Checkout API - Áp dụng Strategy Pattern & Đối soát an toàn trừ tồn kho
router.post('/checkout', authenticateJWT, requirePermission('sales.create'), async (req: AuthenticatedRequest, res: Response) => {
  const { cart, customerId, customerTier, promoType, promoValue, paymentMethod, prescriptionId, capturedImage } = req.body;
  const userBranchId = req.user?.branchId;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  let checkoutBranchId = userBranchId;
  const userRole = req.user?.role;

  if (!checkoutBranchId) {
    if (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_CHAIN_MANAGER') {
      if (req.body.branchId) {
        checkoutBranchId = req.body.branchId;
      } else {
        return res.status(400).json({ error: 'Quản trị viên/Quản lý chuỗi cần chọn chi nhánh để thực hiện bán hàng' });
      }
    } else {
      return res.status(403).json({ error: 'Tài khoản không thuộc chi nhánh nào để bán hàng' });
    }
  }

  const finalCheckoutBranchId = checkoutBranchId as string;

  try {
    // Look up real customer details
    let customer = null;
    let computedTier: 'normal' | 'silver' | 'gold' | 'platinum' = 'normal';

    if (customerId && customerId !== 'Khách lẻ' && customerId !== 'Khách vãng lai') {
      customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });
      if (customer) {
        computedTier = customer.membershipTier === 'bronze' ? 'normal' : customer.membershipTier as any;
      }
    } else if (customerTier) {
      computedTier = customerTier === 'bronze' ? 'normal' : customerTier;
    }

    // A. Tính toán giá tiền và khuyến mãi ở phía Server sử dụng Strategy Pattern
    const subtotal = cart.reduce(
      (sum: number, item: any) => sum + Number(item.total ?? item.price * item.quantity),
      0
    );
    const orderData: PromoOrder = {
      subtotal,
      items: cart.map((i: any) => ({
        medicineId: i.medicineId,
        name: i.name,
        price: Number(i.total ?? i.price * i.quantity),
        quantity: Number(i.quantity),
      })),
      customerTier: computedTier,
    };

    let discountAmount = 0;
    let rewardPoints = Math.floor(subtotal / 10); // default base points
    
    let dbPromoApplied = false;
    if (promoType && promoType !== 'default') {
      try {
        const promotion = await prisma.promotion.findUnique({
          where: { id: promoType }
        });
        
        if (promotion && promotion.status === 'active') {
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
          if (promotion.startDate && todayStr < promotion.startDate) {
            return res.status(400).json({ error: `Chương trình khuyến mãi chưa bắt đầu. Thời hạn áp dụng từ: ${promotion.startDate}` });
          }
          if (promotion.endDate && todayStr > promotion.endDate) {
            return res.status(400).json({ error: `Chương trình khuyến mãi đã hết hạn sử dụng ngày: ${promotion.endDate}` });
          }
          if (promotion.targetGroup && promotion.targetGroup !== 'all') {
            const allowedTiers = promotion.targetGroup.split(',').map(t => t.trim().toLowerCase());
            if (!allowedTiers.includes(computedTier.toLowerCase())) {
              return res.status(400).json({ error: `Khuyến mãi chỉ áp dụng cho nhóm khách hàng: ${promotion.targetGroup.toUpperCase()}` });
            }
          }

          const config = promotion.config ? JSON.parse(promotion.config) : {};
          dbPromoApplied = true;
          
          switch (promotion.type) {
            case 'percent':
            case 'percent_discount': {
              const minOrder = Number(config.minOrderValue || 0);
              const pct = Number(promotion.value || config.percent || 0);
              if (subtotal >= minOrder) {
                discountAmount = subtotal * (pct / 100);
              }
              break;
            }
            case 'fixed':
            case 'fixed_discount': {
              const minOrder = Number(config.minOrderValue || 0);
              const amt = Number(promotion.value || config.amount || 0);
              if (subtotal >= minOrder) {
                discountAmount = Math.min(amt, subtotal);
              }
              break;
            }
            case 'combo':
            case 'buy_gift': {
              const buyMedId = config.buyMedicineId;
              const giftMedId = config.giftMedicineId;
              const buyQty = Number(config.buyQuantity || 1);
              const giftQty = Number(config.giftQuantity || 1);
              const buyUnit = config.buyUnit;
              const giftUnit = config.giftUnit;
              
              if (buyMedId && giftMedId) {
                const buyItem = cart.find((i: any) => 
                  i.medicineId === buyMedId &&
                  (!buyUnit || i.selectedUnit === buyUnit)
                );
                if (buyItem && buyItem.quantity >= buyQty) {
                  const giftItem = cart.find((i: any) => 
                    i.medicineId === giftMedId &&
                    (!giftUnit || i.selectedUnit === giftUnit)
                  );
                  if (giftItem) {
                    const applicableGiftQty = Math.min(giftItem.quantity, giftQty * Math.floor(buyItem.quantity / buyQty));
                    const giftUnitPrice = Number(giftItem.price || (giftItem.total / giftItem.quantity));
                    discountAmount = giftUnitPrice * applicableGiftQty;
                  }
                }
              }
              break;
            }
            case 'loyalty':
            case 'loyalty_points': {
              let multiplier = 1.0;
              const silverMult = Number(config.silverMultiplier ?? 1.2);
              const goldMult = Number(config.goldMultiplier ?? 1.5);
              const platMult = Number(config.platinumMultiplier ?? 2.0);
              
              if (computedTier === 'silver') multiplier = silverMult;
              if (computedTier === 'gold') multiplier = goldMult;
              if (computedTier === 'platinum') multiplier = platMult;
              
              const finalTotal = Math.max(0, subtotal - discountAmount);
              const basePoints = Math.floor(finalTotal / 10);
              rewardPoints = Math.floor(basePoints * multiplier);
              break;
            }
            case 'category_voucher': {
              const catId = config.categoryId;
              const discType = config.discountType || 'percent';
              const discVal = Number(config.discountValue || promotion.value || 0);
              
              if (catId) {
                const medIds = cart.map((i: any) => i.medicineId);
                const dbMedicines = await prisma.medicine.findMany({
                  where: { id: { in: medIds } },
                  select: { id: true, categoryId: true }
                });
                
                const medicinesInCat = dbMedicines
                  .filter(m => m.categoryId === catId)
                  .map(m => m.id);
                  
                const catSubtotal = cart
                  .filter((i: any) => medicinesInCat.includes(i.medicineId))
                  .reduce((sum: number, i: any) => sum + Number(i.total ?? i.price * i.quantity), 0);
                  
                if (catSubtotal > 0) {
                  if (discType === 'percent') {
                    discountAmount = catSubtotal * (discVal / 100);
                  } else {
                    discountAmount = Math.min(discVal, catSubtotal);
                  }
                }
              }
              break;
            }
            default:
              dbPromoApplied = false;
              break;
          }
        }
      } catch (err) {
        console.error('Error calculating database promotion:', err);
      }
    }

    if (!dbPromoApplied) {
      // Fallback Strategy calculation for backward compatibility (Hardcoded presets)
      const customPromoValue = promoValue !== undefined ? Number(promoValue) : null;
      const calculator = new PromotionCalculator();
      switch (promoType) {
        case 'percent_10':
          calculator.setStrategy(new PercentDiscountStrategy(customPromoValue ?? 10));
          break;
        case 'fixed_20':
          calculator.setStrategy(new FixedAmountStrategy(customPromoValue ?? 20));
          break;
        case 'combo_para':
          const DHG = await prisma.medicine.findFirst({ where: { code: 'MED0001' } });
          calculator.setStrategy(new ComboStrategy(DHG?.id || 'med-1', customPromoValue ?? 5));
          break;
        case 'vip_points':
          calculator.setStrategy(new PointRewardStrategy());
          break;
        case 'buy_1_get_1':
          const giftMed = await prisma.medicine.findFirst({ where: { code: 'MED0001' } });
          calculator.setStrategy(new BuyGiftStrategy(giftMed?.id || 'med-1', 1, giftMed?.id || 'med-1', 1));
          break;
        case 'min_order_50':
          calculator.setStrategy(new ConditionFixedDiscountStrategy(50, customPromoValue ?? 10));
          break;
        case 'platinum_15':
          calculator.setStrategy(new TierPercentDiscountStrategy('platinum', customPromoValue ?? 15));
          break;
        default:
          calculator.setStrategy(new DefaultStrategy());
          break;
      }
      discountAmount = calculator.calculateDiscount(orderData);
      rewardPoints = calculator.calculatePoints(orderData);
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    const invoiceNumber = `INV${Date.now()}`;
    const prescriptionCode = prescriptionId || `TOA-${Date.now().toString().slice(-6)}`;

    // B. Transaction ngắn gọn — chỉ xử lý các thao tác tài chính quan trọng (SalesOrder + Inventory ledger)
    const result = await prisma.$transaction(async (tx) => {
      const preparedItems = await Promise.all(
        cart.map(async (item: any) => {
          const baseQuantity = Number(item.baseQuantity ?? item.quantity);
          if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) {
            throw new Error(`So luong quy doi cua ${item.name} khong hop le.`);
          }

          const allocation = await pickBatchFefo(tx, item.medicineId, finalCheckoutBranchId, baseQuantity);

          if (allocation.shortage > 0) {
            const guidance = await buildShortageGuidance(tx, item.medicineId, finalCheckoutBranchId);
            throw new Error(
              `Khong du ton FEFO cho ${item.name}. Thieu ${allocation.shortage} don vi sau khi loc cac lo can ban. ${guidance}`
            );
          }

          return {
            item,
            baseQuantity,
            baseUnitPrice: Number(item.baseUnitPrice ?? item.price),
            allocations: allocation.allocations,
          };
        })
      );

      // 1. Tạo bản ghi SalesOrder
      const salesOrder = await tx.salesOrder.create({
        data: {
          invoiceNumber,
          branchId: finalCheckoutBranchId,
          customerId: customer ? customer.id : null,
          cashierId: req.user?.id || 'system',
          cashierName: req.user?.username || 'system',
          subtotal,
          discount: discountAmount,
          total: totalAmount,
          paymentMethod,
          status: 'completed',
          prescriptionId: cart.some((i: any) => i.isPrescriptionRequired) ? prescriptionCode : null,
          pointsEarned: rewardPoints,
        }
      });

      // Update promotion usages and total savings
      if (dbPromoApplied && promoType && promoType !== 'default') {
        const existingPromo = await tx.promotion.findUnique({
          where: { id: promoType }
        });
        if (existingPromo) {
          await tx.promotion.update({
            where: { id: promoType },
            data: {
              usages: { increment: 1 },
              totalSavings: { increment: discountAmount }
            }
          });
        }
      }

      // Update customer points and auto-tier upgrade
      if (customer) {
        const nextPoints = customer.points + rewardPoints;
        
        // Auto-upgrade logic
        let nextTier = customer.membershipTier;
        if (nextPoints >= 2000) nextTier = 'platinum';
        else if (nextPoints >= 1000) nextTier = 'gold';
        else if (nextPoints >= 500) nextTier = 'silver';
        else nextTier = 'bronze';

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            points: nextPoints,
            membershipTier: nextTier,
          }
        });
      }

      // 2. Tạo SalesOrderItems và ghi ledger xuất kho theo FEFO
      for (const prepared of preparedItems) {
        for (const allocation of prepared.allocations) {
          await tx.salesOrderItem.create({
            data: {
              salesOrderId: salesOrder.id,
              medicineId: prepared.item.medicineId,
              medicineName: prepared.item.name,
              lotNumber: allocation.lotNumber,
              quantity: allocation.quantity,
              unitPrice: prepared.baseUnitPrice,
              discount: 0,
              totalPrice: prepared.baseUnitPrice * allocation.quantity,
              dosage: prepared.item.dosage || null,
              frequency: prepared.item.frequency || null,
              duration: prepared.item.duration || null,
            }
          });

          await createInventoryTransaction(tx, {
            medicineId: prepared.item.medicineId,
            inventoryLotId: allocation.inventoryLotId,
            branchId: finalCheckoutBranchId,
            stockStatus: StockStatus.AVAILABLE,
            transactionType: InventoryTransactionType.SALE,
            quantity: -allocation.quantity,
            referenceType: 'sale',
            referenceId: salesOrder.id,
            referenceNumber: invoiceNumber,
            createdByUserId: req.user?.id || 'system',
            createdByUserName: req.user?.username || 'system',
            notes: prepared.item.selectedUnit
              ? `Xuat kho FEFO cho don POS ${invoiceNumber}: ${prepared.item.quantity} ${prepared.item.selectedUnit} = ${prepared.baseQuantity} don vi co so`
              : `Xuat kho FEFO cho don POS ${invoiceNumber}`
          });
        }
      }

      return { salesOrderId: salesOrder.id, invoiceNumber, rewardPoints };
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    // C. Lưu ảnh toa thuốc và Audit Log SAU KHI transaction tài chính đã commit thành công
    const postCommitTasks: Promise<any>[] = [];

    if (cart.some((i: any) => i.isPrescriptionRequired) && capturedImage) {
      postCommitTasks.push(
        prisma.prescription.create({
          data: {
            prescriptionNumber: prescriptionCode,
            customerId: customer ? customer.id : null,
            doctorName: 'Bác sĩ điều trị quầy POS',
            prescriptionDate: new Date().toISOString().split('T')[0],
            imageUrl: capturedImage,
            status: 'dispensed',
            verifiedBy: req.user?.username || 'system',
            verifiedDate: new Date().toISOString()
          }
        }).then(async (dbPres) => {
          await Promise.all(
            cart
              .filter((i: any) => i.isPrescriptionRequired)
              .map((item: any) =>
                prisma.prescriptionItem.create({
                  data: {
                    prescriptionId: dbPres.id,
                    medicineName: item.name,
                    quantity: item.quantity,
                    dosage: item.dosage || 'Uống sau ăn',
                    frequency: item.frequency || '2 lần / ngày',
                    duration: item.duration || '7 ngày'
                  }
                })
              )
          );
        })
      );
    }

    postCommitTasks.push(
      prisma.auditLog.create({
        data: {
          userId: req.user?.id || 'system',
          userName: req.user?.username || 'pharmacist',
          action: 'create',
          entityType: 'sale',
          entityId: result.salesOrderId,
          details: `Dược sĩ đã xuất bán hóa đơn lẻ ${invoiceNumber} trị giá $${totalAmount.toFixed(2)} theo FEFO. ${
            cart.some((i: any) => i.isPrescriptionRequired) ? `Lưu ảnh chụp camera toa thuốc kê đơn ${prescriptionCode}.` : ''
          } Áp dụng Strategy Khuyến mãi: ${promoType.toUpperCase()} (+${rewardPoints} Điểm thưởng).`,
          ipAddress: req.ip
        }
      })
    );

    await Promise.all(postCommitTasks);

    res.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      rewardPoints: result.rewardPoints,
      discountAmount,
      totalAmount
    });

  } catch (err: any) {
    if (err instanceof Error) {
      if (err.message.startsWith('Khong du ton FEFO')) {
        return res.status(409).json({ error: err.message });
      }

      if (err.message.startsWith('Không tìm thấy SKU thuốc')) {
        return res.status(404).json({ error: err.message });
      }

      if (err.message.includes('khong hop le')) {
        return res.status(400).json({ error: err.message });
      }
    }

    return respondWithDatabaseAwareError(res, err, 'Internal server error during checkout');
  }
});

// 2. Lấy danh sách lịch sử Toa thuốc (Prescriptions)
router.get('/prescriptions', authenticateJWT, requirePermission('prescription.verify'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(prescriptions);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching prescriptions');
  }
});

// 3. Lấy danh sách lịch sử Hóa đơn (SalesOrders) kèm chi tiết và đơn thuốc đối chiếu
router.get('/invoices', authenticateJWT, requirePermission('sales.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId, startDate, endDate, search } = req.query;
    const userRole = req.user?.role;
    const userBranchId = req.user?.branchId;

    // Phân quyền theo chi nhánh
    let branchFilter: any = {};
    if (userRole !== 'ROLE_ADMIN' && userRole !== 'ROLE_CHAIN_MANAGER') {
      if (!userBranchId) {
        return res.status(403).json({ error: 'User does not belong to any branch to view invoices' });
      }
      branchFilter = { branchId: userBranchId };
    } else if (branchId && branchId !== 'all') {
      branchFilter = { branchId: String(branchId) };
    }

    // Lọc theo ngày
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.saleDate = {};
      if (startDate) {
        dateFilter.saleDate.gte = new Date(String(startDate));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        dateFilter.saleDate.lte = end;
      }
    }

    // Tìm kiếm nhanh (Invoice Number, Customer name/phone/code, Cashier)
    let searchFilter: any = {};
    if (search) {
      const searchStr = String(search);
      searchFilter = {
        OR: [
          { invoiceNumber: { contains: searchStr, mode: 'insensitive' } },
          { customer: { name: { contains: searchStr, mode: 'insensitive' } } },
          { customer: { phone: { contains: searchStr, mode: 'insensitive' } } },
          { customer: { code: { contains: searchStr, mode: 'insensitive' } } },
          { cashierName: { contains: searchStr, mode: 'insensitive' } },
        ]
      };
    }

    const invoices = await prisma.salesOrder.findMany({
      where: {
        ...branchFilter,
        ...dateFilter,
        ...searchFilter,
      },
      include: {
        items: true,
        customer: true,
        branch: {
          select: {
            name: true,
            code: true,
          }
        }
      },
      orderBy: { saleDate: 'desc' }
    });

    // Đối với mỗi hóa đơn có prescriptionId, chúng ta nạp thêm thông tin Prescription
    const invoicesWithPrescriptions = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.prescriptionId) {
          const prescription = await prisma.prescription.findUnique({
            where: { prescriptionNumber: invoice.prescriptionId },
            include: { items: true }
          });
          return {
            ...invoice,
            prescription
          };
        }
        return invoice;
      })
    );

    res.json(invoicesWithPrescriptions);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching invoices');
  }
});

// 4. Lấy chi tiết một Hóa đơn (SalesOrder) theo ID
router.get('/invoices/:id', authenticateJWT, requirePermission('sales.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userBranchId = req.user?.branchId;

    const invoice = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        branch: {
          select: {
            name: true,
            code: true,
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Không tìm thấy hóa đơn này.' });
    }

    // Kiểm tra quyền truy cập theo chi nhánh
    if (userRole !== 'ROLE_ADMIN' && userRole !== 'ROLE_CHAIN_MANAGER' && invoice.branchId !== userBranchId) {
      return res.status(403).json({ error: 'Bạn không có quyền xem hóa đơn của chi nhánh khác.' });
    }

    // Nếu có đơn thuốc kèm theo, nạp đầy đủ thông tin Prescription
    let prescription = null;
    if (invoice.prescriptionId) {
      prescription = await prisma.prescription.findUnique({
        where: { prescriptionNumber: invoice.prescriptionId },
        include: { items: true }
      });
    }

    res.json({
      ...invoice,
      prescription
    });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching invoice detail');
  }
});

export default router;
