import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';
import { randomUUID } from 'crypto';
import { systemCache } from '../lib/cache';

const router = Router();

// 1. List / Search Promotions
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, type } = req.query;
    
    // Check if user role is allowed to view promotions
    const allowedRoles = ['ROLE_ADMIN', 'ROLE_CHAIN_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_PHARMACIST'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập thông tin khuyến mãi.' });
    }

    let filter: any = {};
    
    if (search) {
      const searchStr = String(search);
      filter.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { code: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      filter.status = String(status);
    }

    if (type && type !== 'all') {
      filter.type = String(type);
    }

    // 2. Performance: Đọc từ Cache nếu không search
    const cacheKey = `promotions_list_${status}_${type}`;
    if (!search) {
      const cachedData = systemCache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
    }

    const promotions = await prisma.promotion.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    });

    // Lưu vào Cache
    if (!search) {
      systemCache.set(cacheKey, promotions);
    }

    res.json(promotions);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching promotions');
  }
});

// 2. Get Promotion Detail
router.get('/:id', authenticateJWT, requirePermission('promotion.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const promotion = await prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin chương trình khuyến mãi.' });
    }

    res.json(promotion);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching promotion detail');
  }
});

// 3. Create Promotion
router.post('/', authenticateJWT, requirePermission('promotion.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      code,
      name,
      value,
      status,
      type,
      description,
      targetBranch,
      config,
      startDate,
      endDate,
      targetGroup,
    } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ error: 'Mã, tên và loại khuyến mãi là thông tin bắt buộc.' });
    }

    // 1. Security (Input Validation): Kiểm tra đầu vào
    const parsedValue = value ? parseFloat(value) : 0;
    if (type === 'percent' || type === 'percent_discount') {
      if (parsedValue <= 0 || parsedValue > 100) {
        return res.status(400).json({ error: 'Phần trăm giảm giá phải nằm trong khoảng từ 0 đến 100%.' });
      }
    } else if (type === 'fixed' || type === 'fixed_discount') {
      if (parsedValue <= 0) {
        return res.status(400).json({ error: 'Số tiền giảm giá phải lớn hơn 0.' });
      }
    }

    // Check duplicate code
    const existingCode = await prisma.promotion.findUnique({
      where: { code }
    });
    if (existingCode) {
      return res.status(400).json({ error: 'Mã khuyến mãi này đã được sử dụng.' });
    }

    const promotion = await prisma.promotion.create({
      data: {
        id: randomUUID(),
        code,
        name,
        value: value ? parseFloat(value) : 0,
        status: status || 'active',
        type,
        description: description || '',
        usages: 0,
        totalSavings: 0,
        targetBranch: targetBranch || 'all',
        config: config ? (typeof config === 'string' ? config : JSON.stringify(config)) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        targetGroup: targetGroup || 'all',
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'create',
        entityType: 'promotion',
        entityId: promotion.id,
        details: `Đã tạo chương trình khuyến mãi mới: "${name}" (${code}), loại: ${type}.`,
      }
    });

    // Invalidate Cache
    systemCache.clearAll();

    res.status(201).json(promotion);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error creating promotion');
  }
});

// 4. Update Promotion
router.put('/:id', authenticateJWT, requirePermission('promotion.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      value,
      status,
      type,
      description,
      targetBranch,
      config,
      startDate,
      endDate,
      targetGroup,
    } = req.body;

    const existingPromotion = await prisma.promotion.findUnique({
      where: { id }
    });

    if (!existingPromotion) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin chương trình khuyến mãi.' });
    }

    if (code && code !== existingPromotion.code) {
      const duplicateCode = await prisma.promotion.findUnique({
        where: { code }
      });
      if (duplicateCode) {
        return res.status(400).json({ error: 'Mã khuyến mãi đã tồn tại ở chương trình khác.' });
      }
    }

    // 1. Security (Input Validation): Kiểm tra đầu vào
    const checkType = type || existingPromotion.type;
    const parsedValue = value !== undefined ? parseFloat(value) : existingPromotion.value;
    
    if (checkType === 'percent' || checkType === 'percent_discount') {
      if (parsedValue <= 0 || parsedValue > 100) {
        return res.status(400).json({ error: 'Phần trăm giảm giá phải nằm trong khoảng từ 0 đến 100%.' });
      }
    } else if (checkType === 'fixed' || checkType === 'fixed_discount') {
      if (parsedValue <= 0) {
        return res.status(400).json({ error: 'Số tiền giảm giá phải lớn hơn 0.' });
      }
    }

    const updatedPromotion = await prisma.promotion.update({
      where: { id },
      data: {
        code: code || undefined,
        name: name || undefined,
        value: value !== undefined ? parseFloat(value) : undefined,
        status: status || undefined,
        type: type || undefined,
        description: description !== undefined ? description : undefined,
        targetBranch: targetBranch || undefined,
        config: config !== undefined ? (config ? (typeof config === 'string' ? config : JSON.stringify(config)) : null) : undefined,
        startDate: startDate !== undefined ? (startDate || null) : undefined,
        endDate: endDate !== undefined ? (endDate || null) : undefined,
        targetGroup: targetGroup || undefined,
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'update',
        entityType: 'promotion',
        entityId: id,
        details: `Cập nhật chương trình khuyến mãi: "${updatedPromotion.name}" (${updatedPromotion.code}).`,
      }
    });

    // Invalidate Cache
    systemCache.clearAll();

    res.json(updatedPromotion);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error updating promotion');
  }
});

// 5. Delete Promotion
router.delete('/:id', authenticateJWT, requirePermission('promotion.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const promotion = await prisma.promotion.findUnique({
      where: { id }
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin chương trình khuyến mãi.' });
    }

    // Optional: check if promotion has been used. If usages > 0, we can prevent deletion to maintain consistency.
    if (promotion.usages > 0) {
      return res.status(400).json({
        error: 'Không thể xóa chương trình khuyến mãi đã có lịch sử áp dụng cho khách hàng. Vui lòng cập nhật trạng thái ngưng hoạt động.'
      });
    }

    await prisma.promotion.delete({
      where: { id }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        userName: req.user?.username || 'system',
        action: 'delete',
        entityType: 'promotion',
        entityId: id,
        details: `Xóa chương trình khuyến mãi: "${promotion.name}" (${promotion.code}).`,
      }
    });

    // Invalidate Cache
    systemCache.clearAll();

    res.json({ message: 'Xóa chương trình khuyến mãi thành công.' });
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error deleting promotion');
  }
});

export default router;
