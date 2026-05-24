import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pharmachain_super_secret_jwt_signature_key_2026';

// Role to Permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ROLE_ADMIN: [
    'medicine.view', 'medicine.create', 'medicine.update', 'medicine.category.manage',
    'supplier.view', 'supplier.create', 'supplier.update',
    'purchasing.create', 'purchasing.approve', 'purchasing.receive',
    'inventory.view', 'inventory.stocktake', 'inventory.adjust', 'inventory.batch.manage',
    'transfer.create', 'transfer.approve', 'transfer.ship', 'transfer.receive',
    'sales.view', 'sales.create', 'sales.cancel',
    'prescription.verify', 'customer.view', 'customer.manage',
    'report.view_branch', 'report.view_chain', 'branch.manage',
    'user.manage', 'role.manage', 'audit.view', 'promotion.view', 'promotion.manage'
  ],
  ROLE_CHAIN_MANAGER: [
    'medicine.view', 'medicine.create', 'medicine.update', 'medicine.category.manage',
    'supplier.view', 'supplier.create', 'supplier.update',
    'purchasing.create', 'purchasing.approve', 'purchasing.receive',
    'inventory.view', 'inventory.stocktake', 'inventory.adjust', 'inventory.batch.manage',
    'transfer.create', 'transfer.approve', 'sales.view', 'sales.cancel',
    'customer.view', 'customer.manage', 'report.view_branch', 'report.view_chain', 'audit.view',
    'promotion.view', 'promotion.manage'
  ],
  ROLE_BRANCH_MANAGER: [
    'medicine.view', 'supplier.view', 'purchasing.create', 'purchasing.receive',
    'inventory.view', 'inventory.stocktake', 'inventory.adjust', 'inventory.batch.manage',
    'transfer.create', 'transfer.ship', 'transfer.receive',
    'sales.view', 'sales.create', 'sales.cancel',
    'prescription.verify', 'customer.view', 'customer.manage', 'report.view_branch', 'promotion.view'
  ],
  ROLE_PHARMACIST: [
    'medicine.view', 'inventory.view', 'sales.view', 'sales.create',
    'prescription.verify', 'customer.view', 'customer.manage'
  ],
  ROLE_WAREHOUSE_STAFF: [
    'medicine.view', 'supplier.view', 'purchasing.create', 'purchasing.receive',
    'inventory.view', 'inventory.stocktake', 'inventory.batch.manage',
    'transfer.ship', 'transfer.receive'
  ]
};

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác!' });
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
        permissions
      }
    });

    // Log the successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.username,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        details: `Người dùng ${user.name} đăng nhập thành công vào hệ thống.`,
        ipAddress: req.ip
      }
    });

  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error during login');
  }
});

export default router;
