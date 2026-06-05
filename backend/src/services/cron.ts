import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { systemCache } from '../lib/cache';

export const initSchedulers = () => {
  // Chạy mỗi phút (Scheduler)
  cron.schedule('* * * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Tự động kích hoạt khuyến mãi khi đến ngày
      const activated = await prisma.promotion.updateMany({
        where: {
          status: 'pending',
          startDate: { lte: today },
        },
        data: { status: 'active' }
      });

      // Tự động hủy/hết hạn khuyến mãi khi qua ngày
      const expired = await prisma.promotion.updateMany({
        where: {
          status: 'active',
          endDate: { lt: today },
        },
        data: { status: 'expired' }
      });
      
      // Nếu có sự thay đổi trạng thái, xóa Cache để đồng bộ xuống chi nhánh
      if (activated.count > 0 || expired.count > 0) {
        systemCache.clear('promotions_list');
        console.log(`[Cronjob] Đã tự động kích hoạt ${activated.count} và làm hết hạn ${expired.count} chiến dịch khuyến mãi.`);
      }
    } catch (err) {
      console.error('Lỗi khi chạy Cronjob khuyến mãi:', err);
    }
  });
};
