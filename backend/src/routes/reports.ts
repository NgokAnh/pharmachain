import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';

const router = Router();

// Reports Dashboard — aggregated summary
router.get('/summary', authenticateJWT, requirePermission('report.view_branch'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userBranchId = req.user?.branchId;

    // Branch filter — branch-level users see only their branch
    const branchFilter = userBranchId ? { branchId: userBranchId } : {};

    // Total revenue, orders, discount
    const salesAgg = await prisma.salesOrder.aggregate({
      where: branchFilter,
      _sum: { total: true, discount: true, subtotal: true },
      _count: { id: true },
    });

    const totalRevenue = salesAgg._sum.total || 0;
    const totalOrders = salesAgg._count.id || 0;
    const totalDiscount = salesAgg._sum.discount || 0;
    const totalSubtotal = salesAgg._sum.subtotal || 0;
    const profitMargin = totalSubtotal > 0 ? ((totalSubtotal - totalDiscount) / totalSubtotal * 100) : 0;

    // Total customers
    const totalCustomers = await prisma.customer.count();

    // Total inventory items — sum all transaction quantities per lot (net stock)
    const inventoryTxns = await prisma.inventoryTransaction.aggregate({
      where: branchFilter,
      _sum: { quantity: true },
    });
    const totalInventoryItems = inventoryTxns._sum.quantity || 0;

    // Low stock — find lots with net stock between 1 and 10
    const allLots = await prisma.inventoryLot.findMany({
      where: {
        ...branchFilter,
        status: 'AVAILABLE',
      },
      select: {
        id: true,
        expiryDate: true,
        inventoryTransactions: {
          select: { quantity: true },
        },
      },
    });

    let lowStockCount = 0;
    let expiringSoonCount = 0;
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const nowStr = now.toISOString().slice(0, 10);
    const in90Str = in90Days.toISOString().slice(0, 10);

    allLots.forEach((lot) => {
      const netQty = lot.inventoryTransactions.reduce((sum, t) => sum + t.quantity, 0);
      if (netQty > 0 && netQty <= 10) lowStockCount++;
      if (netQty > 0 && lot.expiryDate >= nowStr && lot.expiryDate <= in90Str) expiringSoonCount++;
    });

    res.json({
      totalRevenue,
      totalOrders,
      totalDiscount,
      profitMargin: Math.round(profitMargin * 10) / 10,
      totalCustomers,
      totalInventoryItems,
      lowStockCount,
      expiringSoonCount,
    });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching report summary');
  }
});

// Sales trend data — grouped by month
router.get('/sales-trend', authenticateJWT, requirePermission('report.view_branch'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userBranchId = req.user?.branchId;
    const branchFilter = userBranchId ? { branchId: userBranchId } : {};

    const orders = await prisma.salesOrder.findMany({
      where: branchFilter,
      select: {
        saleDate: true,
        total: true,
        discount: true,
        subtotal: true,
      },
      orderBy: { saleDate: 'asc' },
    });

    // Group by month
    const monthMap: Record<string, { revenue: number; orders: number; profit: number }> = {};
    const monthLabels: Record<string, string> = {
      '01': 'Th1', '02': 'Th2', '03': 'Th3', '04': 'Th4',
      '05': 'Th5', '06': 'Th6', '07': 'Th7', '08': 'Th8',
      '09': 'Th9', '10': 'Th10', '11': 'Th11', '12': 'Th12',
    };

    orders.forEach((order) => {
      const date = new Date(order.saleDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { revenue: 0, orders: 0, profit: 0 };
      }
      monthMap[key].revenue += order.total;
      monthMap[key].orders += 1;
      monthMap[key].profit += (order.total - (order.discount || 0));
    });

    const salesTrend = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        return {
          id: key,
          month: `${monthLabels[month]} ${year}`,
          revenue: Math.round(data.revenue),
          orders: data.orders,
          profit: Math.round(data.profit),
        };
      });

    res.json(salesTrend);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching sales trend');
  }
});

// Top selling medicines
router.get('/top-medicines', authenticateJWT, requirePermission('report.view_branch'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userBranchId = req.user?.branchId;
    const branchFilter = userBranchId ? { salesOrder: { branchId: userBranchId } } : {};

    const items = await prisma.salesOrderItem.findMany({
      where: branchFilter,
      select: {
        medicineName: true,
        quantity: true,
        totalPrice: true,
      },
    });

    // Aggregate by medicine name
    const medMap: Record<string, { quantity: number; revenue: number }> = {};
    items.forEach((item) => {
      if (!medMap[item.medicineName]) {
        medMap[item.medicineName] = { quantity: 0, revenue: 0 };
      }
      medMap[item.medicineName].quantity += item.quantity;
      medMap[item.medicineName].revenue += item.totalPrice;
    });

    const topMedicines = Object.entries(medMap)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: Math.round(data.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json(topMedicines);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching top medicines');
  }
});

// Customer tier distribution
router.get('/customer-stats', authenticateJWT, requirePermission('report.view_branch'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = await prisma.customer.groupBy({
      by: ['membershipTier'],
      _count: { id: true },
    });

    const tierLabels: Record<string, string> = {
      bronze: 'Đồng',
      silver: 'Bạc',
      gold: 'Vàng',
      platinum: 'Bạch kim',
    };

    const customerStats = customers.map((c) => ({
      tier: c.membershipTier,
      label: tierLabels[c.membershipTier] || c.membershipTier,
      count: c._count.id,
    }));

    // Top customers by spending
    const topCustomers = await prisma.customer.findMany({
      orderBy: { points: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        name: true,
        membershipTier: true,
        points: true,
        _count: { select: { salesOrders: true } },
      },
    });

    res.json({
      tierDistribution: customerStats,
      topCustomers: topCustomers.map((c) => ({
        ...c,
        totalOrders: c._count.salesOrders,
      })),
    });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching customer stats');
  }
});

export default router;
