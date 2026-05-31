import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';

const router = Router();

// 1. List / Search Users
router.get('/', authenticateJWT, requirePermission(['user.manage', 'user.view']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;

    let searchFilter: any = {};
    if (search) {
      const searchStr = String(search);
      searchFilter = {
        OR: [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { username: { contains: searchStr, mode: 'insensitive' } },
          { email: { contains: searchStr, mode: 'insensitive' } },
        ]
      };
    }

    const users = await prisma.user.findMany({
      where: searchFilter,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: {
          select: { id: true, name: true }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(users);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching users');
  }
});

// 2. Get User Detail
router.get('/:id', authenticateJWT, requirePermission(['user.manage', 'user.view']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: {
          select: { id: true, name: true }
        },
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    res.json(user);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching user detail');
  }
});

// 3. Create User
router.post('/', authenticateJWT, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, name, email, role, branchId } = req.body;

    if (!username || !password || !name || !email || !role) {
      return res.status(400).json({ error: 'Tên đăng nhập, mật khẩu, họ tên, email và vai trò là bắt buộc.' });
    }

    // Check duplicate username
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại.' });
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email đã được sử dụng bởi tài khoản khác.' });
    }

    // Validate branch for branch-scoped roles
    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        return res.status(400).json({ error: 'Chi nhánh không tồn tại.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        role,
        branchId: branchId || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        createdAt: true,
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userName: req.user!.username,
        action: 'create_user',
        entityType: 'user',
        entityId: user.id,
        details: `Tạo tài khoản mới: ${user.username} (${user.role})`,
        ipAddress: req.ip,
      }
    });

    res.status(201).json(user);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating user');
  }
});

// 4. Update User
router.put('/:id', authenticateJWT, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, branchId, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // Check duplicate email if changed
    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({ where: { email } });
      if (duplicateEmail) {
        return res.status(400).json({ error: 'Email đã được sử dụng bởi tài khoản khác.' });
      }
    }

    // Validate branch
    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        return res.status(400).json({ error: 'Chi nhánh không tồn tại.' });
      }
    }

    // Build update data
    const updateData: any = {
      name: name || undefined,
      email: email || undefined,
      role: role || undefined,
      branchId: branchId === '' ? null : branchId || undefined,
    };

    // Hash new password if provided
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userName: req.user!.username,
        action: 'update_user',
        entityType: 'user',
        entityId: updatedUser.id,
        details: `Cập nhật thông tin tài khoản: ${updatedUser.username}`,
        ipAddress: req.ip,
      }
    });

    res.json(updatedUser);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating user');
  }
});

// 5. Delete User
router.delete('/:id', authenticateJWT, requirePermission('user.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    await prisma.user.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userName: req.user!.username,
        action: 'delete_user',
        entityType: 'user',
        entityId: id,
        details: `Xóa tài khoản: ${user.username} (${user.role})`,
        ipAddress: req.ip,
      }
    });

    res.json({ message: 'Xóa người dùng thành công.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting user');
  }
});

export default router;
