import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { prisma, respondWithDatabaseAwareError } from '../lib/prisma';

const router = Router();

// 1. Lấy danh sách nhật ký kiểm toán hệ thống
router.get('/audit', authenticateJWT, requirePermission('audit.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, action, entityType, username } = req.query;

    const whereClause: any = {};

    // Tìm kiếm tương đối theo từ khóa chi tiết
    if (search) {
      whereClause.OR = [
        { userName: { contains: String(search), mode: 'insensitive' } },
        { details: { contains: String(search), mode: 'insensitive' } },
        { entityId: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (action && action !== 'all') {
      whereClause.action = String(action);
    }

    if (entityType && entityType !== 'all') {
      whereClause.entityType = String(entityType);
    }

    if (username && username !== 'all') {
      whereClause.userName = String(username);
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (err: any) {
    return respondWithDatabaseAwareError(res, err, 'Internal server error fetching audit logs');
  }
});

export default router;
