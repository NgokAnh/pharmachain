import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pharmachain_super_secret_jwt_signature_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    branchId?: string;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token signature is invalid or expired' });
      }
      req.user = decoded as AuthenticatedRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing' });
  }
}

// Role-based permission map (identical to frontend)
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
    'customer.view', 'customer.manage', 'report.view_branch', 'report.view_chain', 'user.view',
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

export function requirePermission(permission: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    const hasPermission = Array.isArray(permission)
      ? permission.some(p => permissions.includes(p))
      : permissions.includes(permission);

    if (hasPermission) {
      next();
    } else {
      res.status(403).json({ error: `User does not have required permission: ${permission}` });
    }
  };
}
