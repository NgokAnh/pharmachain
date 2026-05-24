import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu dọn dẹp cơ sở dữ liệu...');
  // Clean up existing data to ensure idempotent seeding
  await prisma.auditLog.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.prescriptionItem.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.inventoryLot.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.branch.deleteMany({});

  console.log('Bắt đầu tạo dữ liệu Chi nhánh...');
  const br1 = await prisma.branch.create({
    data: { code: 'br-1', name: 'Chi nhánh Quận 1', address: '120 Nguyễn Huệ, Quận 1, TP. HCM', phone: '02838221234', email: 'q1@pharmachain.com' }
  });

  const br2 = await prisma.branch.create({
    data: { code: 'br-2', name: 'Chi nhánh Quận 3', address: '45 Võ Văn Tần, Quận 3, TP. HCM', phone: '02838334567', email: 'q3@pharmachain.com' }
  });

  const br3 = await prisma.branch.create({
    data: { code: 'br-3', name: 'Chi nhánh Hai Bà Trưng', address: '22 Hai Bà Trưng, Hoàn Kiếm, Hà Nội', phone: '02439339999', email: 'hbt@pharmachain.com' }
  });

  console.log('Bắt đầu tạo tài khoản người dùng...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const managerPassword = await bcrypt.hash('manager123', salt);
  const branchPassword = await bcrypt.hash('branch123', salt);
  const warehousePassword = await bcrypt.hash('warehouse123', salt);
  const pharmPassword = await bcrypt.hash('pharm123', salt);

  await prisma.user.createMany({
    data: [
      { username: 'admin', password: adminPassword, name: 'System Admin', email: 'admin@pharmacy.com', role: 'ROLE_ADMIN' },
      { username: 'chain_manager', password: managerPassword, name: 'John Chain', email: 'john@pharmacy.com', role: 'ROLE_CHAIN_MANAGER' },
      { username: 'branch_manager', password: branchPassword, name: 'Jane Branch', email: 'jane@pharmacy.com', role: 'ROLE_BRANCH_MANAGER', branchId: br1.id },
      { username: 'branch_manager2', password: branchPassword, name: 'Nguyễn Văn B', email: 'nguyenb@pharmacy.com', role: 'ROLE_BRANCH_MANAGER', branchId: br3.id },
      { username: 'warehouse', password: warehousePassword, name: 'Bob Warehouse', email: 'bob@pharmacy.com', role: 'ROLE_WAREHOUSE_STAFF', branchId: br1.id },
      { username: 'warehouse2', password: warehousePassword, name: 'Trần Văn Kho', email: 'trankho@pharmacy.com', role: 'ROLE_WAREHOUSE_STAFF', branchId: br3.id },
      { username: 'pharmacist', password: pharmPassword, name: 'Mary Pharmacist', email: 'mary@pharmacy.com', role: 'ROLE_PHARMACIST', branchId: br1.id },
      { username: 'pharmacist2', password: pharmPassword, name: 'Nguyễn Văn Dược', email: 'duoc@pharmacy.com', role: 'ROLE_PHARMACIST', branchId: br3.id }
    ]
  });

  console.log('Bắt đầu tạo Danh mục thuốc...');
  const med1 = await prisma.medicine.create({
    data: { code: 'MED0001', name: 'Paracetamol 500mg', category: 'Thuốc hạ sốt, giảm đau', activeIngredient: 'Paracetamol', unit: 'Viên', barcode: '8934567000018', manufacturer: 'Dược Hậu Giang', sellPrice: 12, isPrescriptionRequired: false, description: 'Giảm đau, hạ sốt nhanh chóng' }
  });

  const med2 = await prisma.medicine.create({
    data: { code: 'MED0002', name: 'Amoxicillin 500mg', category: 'Thuốc kháng sinh', activeIngredient: 'Amoxicillin', unit: 'Viên', barcode: '8934567000025', manufacturer: 'Imexpharm', sellPrice: 150, isPrescriptionRequired: true, description: 'Điều trị nhiễm khuẩn nhạy cảm' }
  });

  const med3 = await prisma.medicine.create({
    data: { code: 'MED0003', name: 'Vitamin C 1000mg', category: 'Thực phẩm chức năng', activeIngredient: 'Vitamin C', unit: 'Viên sủi', barcode: '8934567000032', manufacturer: 'Roche', sellPrice: 50, isPrescriptionRequired: false, description: 'Tăng cường sức đề kháng' }
  });

  const med4 = await prisma.medicine.create({
    data: { code: 'MED0004', name: 'Ibuprofen 400mg', category: 'Thuốc giảm đau kháng viêm', activeIngredient: 'Ibuprofen', unit: 'Viên', barcode: '8934567000049', manufacturer: 'Domesco', sellPrice: 80, isPrescriptionRequired: false, description: 'Giảm đau khớp, kháng viêm nhẹ' }
  });

  console.log('Bắt đầu tạo Tồn kho chi tiết theo lô...');
  await prisma.inventoryLot.createMany({
    data: [
      { medicineId: med1.id, branchId: br1.id, lotNumber: 'LOT001', expiryDate: '2027-12-31', quantity: 250, costPrice: 8, receivedDate: '2026-01-10', supplierName: 'Dược phẩm Bến Tre' },
      { medicineId: med2.id, branchId: br1.id, lotNumber: 'LOT002', expiryDate: '2027-06-15', quantity: 180, costPrice: 110, receivedDate: '2026-02-15', supplierName: 'Dược phẩm Trung Ương 1' },
      { medicineId: med3.id, branchId: br1.id, lotNumber: 'LOT003', expiryDate: '2028-01-01', quantity: 300, costPrice: 35, receivedDate: '2026-03-20', supplierName: 'Zuellig Pharma' },
      { medicineId: med4.id, branchId: br1.id, lotNumber: 'LOT004', expiryDate: '2027-09-30', quantity: 120, costPrice: 55, receivedDate: '2026-04-12', supplierName: 'Dược phẩm Sanofi' },
      
      // Stock for branch 3 (Hai Bà Trưng)
      { medicineId: med1.id, branchId: br3.id, lotNumber: 'LOT001', expiryDate: '2027-12-31', quantity: 400, costPrice: 8, receivedDate: '2026-01-10', supplierName: 'Dược phẩm Bến Tre' },
      { medicineId: med2.id, branchId: br3.id, lotNumber: 'LOT002', expiryDate: '2027-06-15', quantity: 150, costPrice: 110, receivedDate: '2026-02-15', supplierName: 'Dược phẩm Trung Ương 1' }
    ]
  });

  console.log('Bắt đầu tạo Đơn thuốc mẫu...');
  const pres1 = await prisma.prescription.create({
    data: {
      prescriptionNumber: 'TOA-884021',
      customerId: 'KH-0928 (Nguyễn Văn A)',
      doctorName: 'Bác sĩ Nguyễn Hữu B',
      prescriptionDate: '2026-05-24',
      status: 'dispensed',
      verifiedBy: 'Mary Pharmacist',
      verifiedDate: new Date().toISOString()
    }
  });

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: pres1.id,
      medicineName: 'Amoxicillin 500mg',
      quantity: 14,
      dosage: 'Uống sau ăn',
      frequency: '2 lần / ngày',
      duration: '7 ngày'
    }
  });

  console.log('Bắt đầu tạo Lịch sử hoạt động (Audit logs)...');
  await prisma.auditLog.createMany({
    data: [
      { userId: 'system', userName: 'system', action: 'seed', entityType: 'database', entityId: 'neon-postgres', details: 'Khởi tạo cơ sở dữ liệu mẫu thành công lên Neon PostgreSQL', ipAddress: '127.0.0.1' },
      { userId: '1', userName: 'admin', action: 'login', entityType: 'user', entityId: '1', details: 'Admin đăng nhập hệ thống', ipAddress: '192.168.1.1' }
    ]
  });

  console.log('=== SEEDING CƠ SỞ DỮ LIỆU HOÀN TẤT THÀNH CÔNG ===');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seeding dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
