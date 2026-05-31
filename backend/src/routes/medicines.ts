import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';
import { buildInventorySnapshot } from '../services/inventory';
import { fuzzyFilter, applyTallManLettering } from '../lib/lasa';

const router = Router();

router.get('/medicines', authenticateJWT, requirePermission('medicine.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const searchQuery = req.query.search as string;

    const medicines = await prisma.medicine.findMany({
      include: {
        category: true,
        supplier: true,
        unitConversions: true,
        priceHistories: {
          orderBy: { effectiveFrom: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    let filteredMedicines = medicines;
    if (searchQuery) {
      filteredMedicines = fuzzyFilter(medicines, searchQuery, (med) => med.name);
    }

    res.json(
      filteredMedicines.map((medicine) => ({
        ...medicine,
        sku: medicine.code,
        tradeName: applyTallManLettering(medicine.name),
        category: medicine.category ? medicine.category.name : 'Khác',
        supplierName: medicine.supplier ? medicine.supplier.name : 'Chưa có',
      }))
    );
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching medicines');
  }
});

// 2. Lấy danh sách tồn kho theo lô (Inventory Lots)
router.get('/inventory', authenticateJWT, requirePermission('inventory.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userBranchId = req.user?.branchId;
    let branchFilter: string | undefined;

    // Nếu không phải là Admin hoặc Chain Manager, chỉ hiển thị tồn kho của chi nhánh đang trực thuộc!
    if (userRole !== 'ROLE_ADMIN' && userRole !== 'ROLE_CHAIN_MANAGER') {
      if (!userBranchId) {
        return res.status(403).json({ error: 'User does not belong to any branch' });
      }
      branchFilter = userBranchId;
    } else {
      // Đối với Admin và Chain Manager, nếu họ truyền query.branchId, ta lọc theo chi nhánh đó
      if (req.query.branchId && req.query.branchId !== 'all') {
        branchFilter = String(req.query.branchId);
      }
    }

    const snapshot = await buildInventorySnapshot(prisma, branchFilter);
    res.json(snapshot);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching inventory');
  }
});

// 3. Lấy danh sách Chi nhánh (Branches)
router.get('/branches', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' }
    });
    res.json(branches);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching branches');
  }
});

// 3.5. Lấy dữ liệu thống kê cho Dashboard (Dashboard stats)
router.get('/dashboard/stats', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
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

    // A. Doanh thu & số lượng đơn hàng hôm nay và hôm qua
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const salesFilterToday: any = {
      status: 'completed',
      saleDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    };
    if (branchFilter) {
      salesFilterToday.branchId = branchFilter;
    }

    const salesFilterYesterday: any = {
      status: 'completed',
      saleDate: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    };
    if (branchFilter) {
      salesFilterYesterday.branchId = branchFilter;
    }

    const salesToday = await prisma.salesOrder.findMany({
      where: salesFilterToday,
      select: { total: true }
    });

    const salesYesterday = await prisma.salesOrder.findMany({
      where: salesFilterYesterday,
      select: { total: true }
    });

    const revenueToday = salesToday.reduce((sum, order) => sum + order.total, 0);
    const revenueYesterday = salesYesterday.reduce((sum, order) => sum + order.total, 0);
    const ordersToday = salesToday.length;
    const ordersYesterday = salesYesterday.length;

    const revenueGrowth = revenueYesterday > 0
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
      : (revenueToday > 0 ? 100 : 0);

    const ordersGrowth = ordersYesterday > 0
      ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100
      : (ordersToday > 0 ? 100 : 0);

    // B. Thống kê xu hướng bán lẻ 7 ngày gần nhất
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesFilterLast7Days: any = {
      status: 'completed',
      saleDate: {
        gte: sevenDaysAgo,
      },
    };
    if (branchFilter) {
      salesFilterLast7Days.branchId = branchFilter;
    }

    const last7DaysOrders = await prisma.salesOrder.findMany({
      where: salesFilterLast7Days,
      select: { total: true, saleDate: true },
      orderBy: { saleDate: 'asc' }
    });

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesTrendMap = new Map<string, { id: string, name: string, sales: number, orders: number }>();
    
    // Khởi tạo 7 ngày qua
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesTrendMap.set(dateStr, {
        id: dateStr,
        name: weekdayNames[d.getDay()],
        sales: 0,
        orders: 0
      });
    }

    // Cộng dồn hóa đơn thực tế vào map
    for (const order of last7DaysOrders) {
      const dateStr = order.saleDate.toISOString().split('T')[0];
      if (salesTrendMap.has(dateStr)) {
        const current = salesTrendMap.get(dateStr)!;
        current.sales += order.total;
        current.orders += 1;
      }
    }

    const salesTrendData = Array.from(salesTrendMap.values());

    // C. Cảnh báo tồn kho thấp (tổng AVAILABLE < 100)
    const inventorySnapshot = await buildInventorySnapshot(prisma, branchFilter);
    const medicineStockMap = new Map<string, { name: string, stock: number, minStock: number }>();
    
    for (const lot of inventorySnapshot) {
      if (lot.stockStatus === 'AVAILABLE') {
        const current = medicineStockMap.get(lot.medicineId) || { name: lot.medicineName, stock: 0, minStock: 100 };
        current.stock += lot.quantity;
        medicineStockMap.set(lot.medicineId, current);
      }
    }

    const lowStockItems: any[] = [];
    for (const [, item] of medicineStockMap) {
      if (item.stock < item.minStock) {
        lowStockItems.push({
          name: item.name,
          stock: item.stock,
          minStock: item.minStock,
          status: item.stock < 20 ? 'danger' : 'warning'
        });
      }
    }

    // D. Cảnh báo hàng sắp hết hạn trong 90 ngày tới
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiringLotsFilter: any = {
      expiryDate: {
        gte: new Date().toISOString().split('T')[0],
        lte: ninetyDaysFromNow.toISOString().split('T')[0]
      }
    };
    if (branchFilter) {
      expiringLotsFilter.branchId = branchFilter;
    }

    const expiringLots = await prisma.inventoryLot.findMany({
      where: expiringLotsFilter,
      include: {
        medicine: true,
        inventoryTransactions: true
      },
      orderBy: { expiryDate: 'asc' }
    });

    const expiringItems = expiringLots
      .map(lot => {
        const totalQty = lot.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
        const daysLeft = Math.ceil((new Date(lot.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return {
          name: lot.medicine.name,
          lot: lot.lotNumber,
          expiryDate: lot.expiryDate,
          daysLeft: Math.max(0, daysLeft),
          quantity: totalQty
        };
      })
      .filter(item => item.quantity > 0);

    // E. Top 5 sản phẩm bán chạy nhất trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderFilter30Days: any = {
      status: 'completed',
      saleDate: { gte: thirtyDaysAgo }
    };
    if (branchFilter) {
      orderFilter30Days.branchId = branchFilter;
    }

    const recentOrderItems = await prisma.salesOrderItem.findMany({
      where: {
        salesOrder: orderFilter30Days
      },
      select: {
        medicineName: true,
        quantity: true,
        totalPrice: true
      }
    });

    const productSalesMap = new Map<string, { name: string, sold: number, revenue: number }>();
    for (const item of recentOrderItems) {
      const current = productSalesMap.get(item.medicineName) || { name: item.medicineName, sold: 0, revenue: 0 };
      current.sold += item.quantity;
      current.revenue += item.totalPrice;
      productSalesMap.set(item.medicineName, current);
    }

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    res.json({
      metrics: {
        revenueToday,
        revenueYesterday,
        revenueGrowth,
        ordersToday,
        ordersYesterday,
        ordersGrowth,
        lowStockCount: lowStockItems.length,
        expiringCount: expiringItems.length
      },
      salesTrend: salesTrendData,
      topProducts,
      lowStockItems: lowStockItems.slice(0, 5),
      expiringItems: expiringItems.slice(0, 5)
    });

  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching dashboard stats');
  }
});

// 4. Lấy chi tiết một loại thuốc (Medicine details)
router.get('/medicines/:id', authenticateJWT, requirePermission('medicine.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        unitConversions: true,
        priceHistories: {
          include: {
            branch: true
          },
          orderBy: { effectiveFrom: 'desc' }
        },
        inventoryTransactions: {
          include: {
            branch: true,
            inventoryLot: true
          },
          orderBy: { transactedAt: 'desc' },
          take: 100
        }
      }
    });
    if (!medicine) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin thuốc.' });
    }
    res.json({
      ...medicine,
      sku: medicine.code,
      tradeName: medicine.name,
      category: medicine.category ? medicine.category.name : 'Khác',
      supplierName: medicine.supplier ? medicine.supplier.name : 'Chưa có',
      priceHistories: medicine.priceHistories.map((ph) => ({
        ...ph,
        branchName: ph.branch ? ph.branch.name : 'Toàn chuỗi'
      }))
    });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching medicine details');
  }
});

// 5. Thêm thuốc mới vào Danh mục (Create medicine)
router.post('/medicines', authenticateJWT, requirePermission('medicine.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const {
      code,
      registrationNumber,
      name,
      category,
      activeIngredient,
      strength,
      dosageForm,
      packagingSpec,
      unit,
      unitConversionNote,
      barcode,
      manufacturer,
      countryOfOrigin,
      description,
      status,
      saleCategory,
      isPrescriptionRequired,
      sellPrice,
      defaultCostPrice,
      packageQuantity,
      packageUnit,
      baseUnitQuantity,
      supplierId,
    } = data;

    let finalCode = code;
    if (!finalCode) {
      // Tự động tạo mã thuốc tiếp theo
      const existingMedicines = await prisma.medicine.findMany({
        select: { code: true }
      });
      let maxNum = 0;
      for (const med of existingMedicines) {
        const match = med.code.match(/^MED(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      finalCode = `MED${String(maxNum + 1).padStart(4, '0')}`;
    }

    if (!name || !activeIngredient || !strength || !dosageForm || !unit || sellPrice === undefined) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.' });
    }

    const existing = await prisma.medicine.findUnique({ where: { code: finalCode } });
    if (existing) {
      return res.status(400).json({ error: `Thuốc có mã ${finalCode} đã tồn tại trong danh mục.` });
    }



    let finalCategoryId = data.categoryId;

    if (!finalCategoryId && category) {
      let dbCategory = await prisma.category.findUnique({ where: { name: category } });
      if (!dbCategory) {
        const existingCategories = await prisma.category.findMany({ select: { code: true } });
        let maxNum = 0;
        for (const cat of existingCategories) {
          const match = cat.code.match(/^CAT(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        const catCode = `CAT${String(maxNum + 1).padStart(3, '0')}`;
        dbCategory = await prisma.category.create({
          data: {
            code: catCode,
            name: category,
            description: `Nhóm thuốc ${category} được tạo tự động.`
          }
        });
      }
      finalCategoryId = dbCategory.id;
    }

    const created = await prisma.medicine.create({
      data: {
        code: finalCode,
        registrationNumber,
        name,
        categoryId: finalCategoryId || null,
        supplierId: supplierId || null,
        activeIngredient,
        strength,
        dosageForm,
        packagingSpec: packagingSpec || `${packageQuantity || 1} ${packageUnit || unit}`,
        unit,
        unitConversionNote: unitConversionNote || `1 ${packageUnit || unit} = ${baseUnitQuantity || 1} ${unit}`,
        barcode: barcode || null,
        manufacturer,
        countryOfOrigin,
        description,
        status: status || 'active',
        saleCategory: saleCategory || 'OTC',
        isPrescriptionRequired: isPrescriptionRequired === 'true' || isPrescriptionRequired === true,
        sellPrice: Number(sellPrice),
        defaultCostPrice: defaultCostPrice ? Number(defaultCostPrice) : null,
      }
    });

    if (packageUnit && packageQuantity && baseUnitQuantity) {
      await prisma.medicineUnitConversion.create({
        data: {
          medicineId: created.id,
          fromUnit: packageUnit,
          toUnit: unit,
          conversionRate: Number(baseUnitQuantity) / Number(packageQuantity),
          notes: `Tạo tự động từ quy đổi`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'create',
        entityType: 'medicine',
        entityId: created.id,
        details: `Thêm thuốc mới: ${created.name} (${created.code})`,
        ipAddress: req.ip,
      }
    });

    res.status(201).json(created);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating medicine');
  }
});

// 6. Cập nhật thuốc trong Danh mục (Update medicine)
router.put('/medicines/:id', authenticateJWT, requirePermission('medicine.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) {
      return res.status(404).json({ error: 'Không tìm thấy thuốc cần cập nhật.' });
    }

    const {
      name,
      category,
      activeIngredient,
      strength,
      dosageForm,
      packagingSpec,
      unit,
      unitConversionNote,
      barcode,
      manufacturer,
      countryOfOrigin,
      description,
      status,
      saleCategory,
      isPrescriptionRequired,
      sellPrice,
      defaultCostPrice,
      supplierId,
    } = data;



    let finalCategoryId = data.categoryId;

    if (finalCategoryId === undefined && category !== undefined) {
      let dbCategory = await prisma.category.findUnique({ where: { name: category } });
      if (!dbCategory && category) {
        const existingCategories = await prisma.category.findMany({ select: { code: true } });
        let maxNum = 0;
        for (const cat of existingCategories) {
          const match = cat.code.match(/^CAT(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        const catCode = `CAT${String(maxNum + 1).padStart(3, '0')}`;
        dbCategory = await prisma.category.create({
          data: {
            code: catCode,
            name: category,
            description: `Nhóm thuốc ${category} được tạo tự động.`
          }
        });
      }
      finalCategoryId = dbCategory ? dbCategory.id : null;
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        name: name !== undefined ? name : medicine.name,
        categoryId: finalCategoryId !== undefined ? finalCategoryId : medicine.categoryId,
        supplierId: supplierId !== undefined ? (supplierId || null) : medicine.supplierId,
        activeIngredient: activeIngredient !== undefined ? activeIngredient : medicine.activeIngredient,
        strength: strength !== undefined ? strength : medicine.strength,
        dosageForm: dosageForm !== undefined ? dosageForm : medicine.dosageForm,
        packagingSpec: packagingSpec !== undefined ? packagingSpec : medicine.packagingSpec,
        unit: unit !== undefined ? unit : medicine.unit,
        unitConversionNote: unitConversionNote !== undefined ? unitConversionNote : medicine.unitConversionNote,
        barcode: barcode !== undefined ? (barcode || null) : medicine.barcode,
        manufacturer: manufacturer !== undefined ? manufacturer : medicine.manufacturer,
        countryOfOrigin: countryOfOrigin !== undefined ? countryOfOrigin : medicine.countryOfOrigin,
        description: description !== undefined ? description : medicine.description,
        status: status !== undefined ? status : medicine.status,
        saleCategory: saleCategory !== undefined ? saleCategory : medicine.saleCategory,
        isPrescriptionRequired: isPrescriptionRequired !== undefined ? (isPrescriptionRequired === 'true' || isPrescriptionRequired === true) : medicine.isPrescriptionRequired,
        sellPrice: sellPrice !== undefined ? Number(sellPrice) : medicine.sellPrice,
        defaultCostPrice: defaultCostPrice !== undefined ? (defaultCostPrice ? Number(defaultCostPrice) : null) : medicine.defaultCostPrice,
      }
    });

    if (data.packageUnit && data.packageQuantity && data.baseUnitQuantity) {
      await prisma.medicineUnitConversion.deleteMany({ where: { medicineId: id } });
      await prisma.medicineUnitConversion.create({
        data: {
          medicineId: id,
          fromUnit: data.packageUnit,
          toUnit: unit || medicine.unit,
          conversionRate: Number(data.baseUnitQuantity) / Number(data.packageQuantity),
          notes: `Cập nhật tự động từ quy đổi`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'update',
        entityType: 'medicine',
        entityId: id,
        details: `Cập nhật thông tin thuốc: ${updated.name} (${updated.code})`,
        ipAddress: req.ip,
      }
    });

    res.json(updated);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating medicine');
  }
});

// 7. Xóa thuốc khỏi Danh mục (Delete medicine)
router.delete('/medicines/:id', authenticateJWT, requirePermission('medicine.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) {
      return res.status(404).json({ error: 'Không tìm thấy thuốc cần xóa.' });
    }

    const lotCount = await prisma.inventoryLot.count({ where: { medicineId: id } });
    if (lotCount > 0) {
      return res.status(400).json({ error: 'Không thể xóa thuốc này vì đang có lô tồn kho thực tế trong hệ thống.' });
    }

    const txCount = await prisma.inventoryTransaction.count({ where: { medicineId: id } });
    if (txCount > 0) {
      return res.status(400).json({ error: 'Không thể xóa thuốc này vì có phát sinh giao dịch lịch sử kho.' });
    }

    await prisma.medicineUnitConversion.deleteMany({ where: { medicineId: id } });
    await prisma.medicinePrice.deleteMany({ where: { medicineId: id } });
    await prisma.medicine.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'delete',
        entityType: 'medicine',
        entityId: id,
        details: `Xóa thuốc khỏi danh mục: ${medicine.name} (${medicine.code})`,
        ipAddress: req.ip,
      }
    });

    res.json({ success: true, message: 'Đã xóa thuốc khỏi hệ thống.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting medicine');
  }
});

// ==========================================
// CATEGORY CRUD ENDPOINTS (BẢNG DỮ LIỆU RIÊNG)
// ==========================================

// 8. Lấy danh sách Nhóm thuốc (List categories)
router.get('/categories', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { medicines: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(
      categories.map((c) => ({
        ...c,
        medicineCount: c._count.medicines,
      }))
    );
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching categories');
  }
});

// 9. Thêm Nhóm thuốc mới (Create category)
router.post('/categories', authenticateJWT, requirePermission('medicine.category.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, description, status } = req.body;
    let finalCode = code;
    if (!finalCode) {
      const existingCategories = await prisma.category.findMany({ select: { code: true } });
      let maxNum = 0;
      for (const cat of existingCategories) {
        const match = cat.code.match(/^CAT(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      finalCode = `CAT${String(maxNum + 1).padStart(3, '0')}`;
    }

    if (!name) {
      return res.status(400).json({ error: 'Tên nhóm là bắt buộc.' });
    }

    const existingCode = await prisma.category.findUnique({ where: { code: finalCode } });
    if (existingCode) {
      return res.status(400).json({ error: `Mã nhóm ${finalCode} đã tồn tại.` });
    }
    const existingName = await prisma.category.findUnique({ where: { name } });
    if (existingName) {
      return res.status(400).json({ error: `Tên nhóm "${name}" đã tồn tại.` });
    }

    const created = await prisma.category.create({
      data: {
        code: finalCode,
        name,
        description,
        status: status || 'active',
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'create',
        entityType: 'category',
        entityId: created.id,
        details: `Tạo nhóm thuốc mới: ${created.name} (${created.code})`,
        ipAddress: req.ip,
      }
    });

    res.status(201).json(created);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating category');
  }
});

// 10. Cập nhật Nhóm thuốc (Update category)
router.put('/categories/:id', authenticateJWT, requirePermission('medicine.category.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, description, status } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy nhóm thuốc.' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        code: code !== undefined ? code : category.code,
        name: name !== undefined ? name : category.name,
        description: description !== undefined ? description : category.description,
        status: status !== undefined ? status : category.status,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'update',
        entityType: 'category',
        entityId: id,
        details: `Cập nhật nhóm thuốc: ${updated.name} (${updated.code})`,
        ipAddress: req.ip,
      }
    });

    res.json(updated);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating category');
  }
});

// 11. Xóa Nhóm thuốc (Delete category)
router.delete('/categories/:id', authenticateJWT, requirePermission('medicine.category.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { medicines: true }
        }
      }
    });
    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy nhóm thuốc.' });
    }

    if (category._count.medicines > 0) {
      return res.status(400).json({ error: `Không thể xóa nhóm "${category.name}" vì đang có ${category._count.medicines} thuốc trực thuộc.` });
    }

    await prisma.category.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'delete',
        entityType: 'category',
        entityId: id,
        details: `Xóa nhóm thuốc: ${category.name} (${category.code})`,
        ipAddress: req.ip,
      }
    });

    res.json({ success: true, message: 'Đã xóa nhóm thuốc.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting category');
  }
});

// ==========================================
// SUPPLIER CRUD ENDPOINTS (BẢNG DỮ LIỆU RIÊNG)
// ==========================================

// 12. Lấy danh sách Nhà cung cấp (List suppliers)
router.get('/suppliers', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { medicines: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(
      suppliers.map((s) => ({
        ...s,
        medicineCount: s._count.medicines,
      }))
    );
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching suppliers');
  }
});

// 13. Lấy chi tiết Nhà cung cấp (Get supplier by ID)
router.get('/suppliers/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        medicines: true
      }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp.' });
    }
    res.json(supplier);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching supplier details');
  }
});

// 14. Thêm Nhà cung cấp mới (Create supplier)
router.post('/suppliers', authenticateJWT, requirePermission('supplier.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, contactPerson, phone, email, address, status } = req.body;
    
    let finalCode = code;
    if (!finalCode) {
      const existing = await prisma.supplier.findMany({ select: { code: true } });
      let maxNum = 0;
      for (const s of existing) {
        const match = s.code.match(/^SUP(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      finalCode = `SUP${String(maxNum + 1).padStart(4, '0')}`;
    }

    if (!name || !contactPerson || !phone || !email || !address) {
      return res.status(400).json({ error: 'Tên nhà cung cấp, người liên hệ, số điện thoại, email và địa chỉ là bắt buộc.' });
    }

    const existingCode = await prisma.supplier.findUnique({ where: { code: finalCode } });
    if (existingCode) {
      return res.status(400).json({ error: `Mã nhà cung cấp ${finalCode} đã tồn tại.` });
    }
    const existingName = await prisma.supplier.findUnique({ where: { name } });
    if (existingName) {
      return res.status(400).json({ error: `Tên nhà cung cấp "${name}" đã tồn tại.` });
    }

    const created = await prisma.supplier.create({
      data: {
        code: finalCode,
        name,
        contactPerson,
        phone,
        email,
        address,
        status: status || 'active',
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'create',
        entityType: 'supplier',
        entityId: created.id,
        details: `Tạo nhà cung cấp mới: ${created.name} (${created.code})`,
        ipAddress: req.ip,
      }
    });

    res.status(201).json(created);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating supplier');
  }
});

// 15. Cập nhật Nhà cung cấp (Update supplier)
router.put('/suppliers/:id', authenticateJWT, requirePermission('supplier.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, contactPerson, phone, email, address, status } = req.body;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp.' });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        code: code !== undefined ? code : supplier.code,
        name: name !== undefined ? name : supplier.name,
        contactPerson: contactPerson !== undefined ? contactPerson : supplier.contactPerson,
        phone: phone !== undefined ? phone : supplier.phone,
        email: email !== undefined ? email : supplier.email,
        address: address !== undefined ? address : supplier.address,
        status: status !== undefined ? status : supplier.status,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'update',
        entityType: 'supplier',
        entityId: id,
        details: `Cập nhật nhà cung cấp: ${updated.name} (${updated.code})`,
        ipAddress: req.ip,
      }
    });

    res.json(updated);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating supplier');
  }
});

// 16. Xóa Nhà cung cấp (Delete supplier)
router.delete('/suppliers/:id', authenticateJWT, requirePermission('supplier.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { medicines: true }
        }
      }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp.' });
    }

    if (supplier._count.medicines > 0) {
      return res.status(400).json({ error: `Không thể xóa nhà cung cấp "${supplier.name}" vì đang có liên kết với ${supplier._count.medicines} mặt hàng thuốc.` });
    }

    await prisma.supplier.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'delete',
        entityType: 'supplier',
        entityId: id,
        details: `Xóa nhà cung cấp: ${supplier.name} (${supplier.code})`,
        ipAddress: req.ip,
      }
    });

    res.json({ success: true, message: 'Đã xóa nhà cung cấp.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting supplier');
  }
});

export default router;
