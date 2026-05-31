import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';

const router = Router();

// Helper to determine tier from points
function getTierFromPoints(points: number): string {
  if (points >= 2000) return 'platinum';
  if (points >= 1000) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

// 1. List / Search Customers
router.get('/', authenticateJWT, requirePermission('customer.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    
    let searchFilter: any = {};
    if (search) {
      const searchStr = String(search);
      searchFilter = {
        OR: [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
          { code: { contains: searchStr, mode: 'insensitive' } },
        ]
      };
    }

    const customers = await prisma.customer.findMany({
      where: searchFilter,
      orderBy: { code: 'asc' },
    });

    res.json(customers);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching customers');
  }
});

// 2. Get Customer Detail (with purchase and points history)
router.get('/:id', authenticateJWT, requirePermission('customer.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: {
          orderBy: { saleDate: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng.' });
    }

    // Generate Points History dynamically from SalesOrders points earned
    // Sort orders oldest first to calculate running balance
    const sortedOrders = [...customer.salesOrders].sort(
      (a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
    );
    
    let runningBalance = 0;
    const pointsHistory = sortedOrders
      .map((order) => {
        runningBalance += order.pointsEarned;
        return {
          id: `point-earn-${order.id}`,
          date: order.saleDate.toISOString().split('T')[0],
          type: 'earn',
          points: order.pointsEarned,
          description: `Mua hàng tích điểm - ${order.invoiceNumber}`,
          balance: runningBalance,
        };
      })
      .reverse(); // Newest points transactions first

    res.json({
      ...customer,
      pointsHistory
    });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching customer detail');
  }
});

// 3. Create Customer
router.post('/', authenticateJWT, requirePermission('customer.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, email, dateOfBirth, address, membershipTier, points, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Họ tên và số điện thoại là thông tin bắt buộc.' });
    }

    // Check duplicate phone
    const existingPhone = await prisma.customer.findUnique({
      where: { phone }
    });
    if (existingPhone) {
      return res.status(400).json({ error: 'Số điện thoại này đã được đăng ký bởi khách hàng khác.' });
    }

    // Auto generate code if not provided
    let customerCode = req.body.code;
    if (!customerCode) {
      const lastCustomer = await prisma.customer.findFirst({
        where: { code: { startsWith: 'CUS' } },
        orderBy: { code: 'desc' }
      });
      if (lastCustomer) {
        const lastNum = parseInt(lastCustomer.code.replace('CUS', ''), 10);
        customerCode = `CUS${String(lastNum + 1).padStart(4, '0')}`;
      } else {
        customerCode = 'CUS0001';
      }
    } else {
      const existingCode = await prisma.customer.findUnique({
        where: { code: customerCode }
      });
      if (existingCode) {
        return res.status(400).json({ error: 'Mã khách hàng đã tồn tại.' });
      }
    }

    const inputPoints = points ? parseInt(points, 10) : 0;
    const tier = membershipTier || getTierFromPoints(inputPoints);

    const customer = await prisma.customer.create({
      data: {
        code: customerCode,
        name,
        phone,
        email: email || null,
        dateOfBirth: dateOfBirth || null,
        address: address || null,
        membershipTier: tier,
        points: inputPoints,
        status: status || 'active',
        joinDate: new Date().toISOString().split('T')[0]
      }
    });

    res.status(201).json(customer);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating customer');
  }
});

// 4. Update Customer
router.put('/:id', authenticateJWT, requirePermission('customer.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, dateOfBirth, address, membershipTier, points, status } = req.body;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng.' });
    }

    if (phone && phone !== existingCustomer.phone) {
      const duplicatePhone = await prisma.customer.findUnique({
        where: { phone }
      });
      if (duplicatePhone) {
        return res.status(400).json({ error: 'Số điện thoại này đã được đăng ký bởi khách hàng khác.' });
      }
    }

    const updatedPoints = points !== undefined ? parseInt(points, 10) : existingCustomer.points;
    const tier = membershipTier || (points !== undefined ? getTierFromPoints(updatedPoints) : existingCustomer.membershipTier);

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        email: email === '' ? null : email || undefined,
        dateOfBirth: dateOfBirth === '' ? null : dateOfBirth || undefined,
        address: address === '' ? null : address || undefined,
        membershipTier: tier,
        points: updatedPoints,
        status: status || undefined,
      }
    });

    res.json(updatedCustomer);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating customer');
  }
});

// 5. Delete Customer
router.delete('/:id', authenticateJWT, requirePermission('customer.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: true,
        prescriptions: true,
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng.' });
    }

    // Check if customer has transaction history
    if (customer.salesOrders.length > 0 || customer.prescriptions.length > 0) {
      return res.status(400).json({
        error: 'Không thể xóa khách hàng đã có lịch sử giao dịch mua hàng hoặc đơn thuốc trong hệ thống. Vui lòng chuyển trạng thái sang ngưng hoạt động.'
      });
    }

    await prisma.customer.delete({
      where: { id }
    });

    res.json({ message: 'Xóa khách hàng thành công.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting customer');
  }
});

export default router;
