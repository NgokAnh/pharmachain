import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';

const router = Router();

// 1. Lấy danh sách Chi nhánh (List branches)
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { code: 'asc' },
    });
    res.json(branches);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching branches');
  }
});

// 2. Lấy chi tiết Chi nhánh (Get branch by ID)
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          }
        },
        inventoryLots: {
          include: {
            medicine: {
              select: {
                name: true,
                code: true,
                unit: true,
                sellPrice: true,
              }
            },
            inventoryTransactions: {
              where: { stockStatus: 'AVAILABLE' },
              select: { quantity: true }
            }
          }
        },
        salesOrders: {
          include: {
            items: true
          },
          orderBy: {
            saleDate: 'desc'
          }
        }
      }
    });
    if (!branch) {
      return res.status(404).json({ error: 'Không tìm thấy chi nhánh.' });
    }

    // Tính toán số lượng tồn kho theo lô
    const formattedBranch = {
      ...branch,
      inventoryLots: branch.inventoryLots.map((lot) => {
        const quantity = lot.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
        const { inventoryTransactions, ...rest } = lot;
        return {
          ...rest,
          quantity
        };
      })
    };

    res.json(formattedBranch);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching branch details');
  }
});

// 3. Tạo mới Chi nhánh (Create branch)
router.post('/', authenticateJWT, requirePermission('branch.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, address, phone, email, status } = req.body;

    if (!code || !name || !address || !phone || !email) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.' });
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { code },
    });

    if (existingBranch) {
      return res.status(400).json({ error: 'Mã chi nhánh đã tồn tại.' });
    }

    const branch = await prisma.branch.create({
      data: {
        code,
        name,
        address,
        phone,
        email,
        status: status || 'active',
      },
    });

    res.status(201).json(branch);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating branch');
  }
});

// 4. Cập nhật Chi nhánh (Update branch)
router.put('/:id', authenticateJWT, requirePermission('branch.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, address, phone, email, status } = req.body;

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return res.status(404).json({ error: 'Không tìm thấy chi nhánh.' });
    }

    if (code && code !== existingBranch.code) {
      const codeDuplicate = await prisma.branch.findUnique({
        where: { code },
      });
      if (codeDuplicate) {
        return res.status(400).json({ error: 'Mã chi nhánh đã tồn tại.' });
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        code: code || undefined,
        name: name || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        status: status || undefined,
      },
    });

    res.json(updatedBranch);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating branch');
  }
});

// 5. Xóa Chi nhánh (Delete branch)
router.delete('/:id', authenticateJWT, requirePermission('branch.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: true,
        inventoryLots: true,
      },
    });

    if (!existingBranch) {
      return res.status(404).json({ error: 'Không tìm thấy chi nhánh.' });
    }

    // Không được xóa nếu chi nhánh có nhân viên hoặc hàng tồn kho gắn liền
    if (existingBranch.users.length > 0) {
      return res.status(400).json({ error: 'Không thể xóa chi nhánh có tài khoản nhân viên đang hoạt động.' });
    }

    if (existingBranch.inventoryLots.length > 0) {
      return res.status(400).json({ error: 'Không thể xóa chi nhánh còn hàng tồn kho.' });
    }

    await prisma.branch.delete({
      where: { id },
    });

    res.json({ message: 'Đã xóa chi nhánh thành công.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting branch');
  }
});

export default router;
