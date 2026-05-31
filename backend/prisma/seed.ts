import {
  InventoryTransactionType,
  MedicineSaleCategory,
  PrismaClient,
  StockStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedLotWithTransactions(input: {
  medicineId: string;
  branchId: string;
  lotNumber: string;
  manufacturingDate?: string;
  expiryDate: string;
  receivedDate: string;
  supplierName: string;
  inboundDocumentNo: string;
  status: StockStatus;
  costPrice: number;
  transactions: Array<{
    stockStatus: StockStatus;
    transactionType: InventoryTransactionType;
    quantity: number;
    referenceType: string;
    referenceNumber: string;
    notes?: string;
  }>;
}) {
  const lot = await prisma.inventoryLot.create({
    data: {
      medicineId: input.medicineId,
      branchId: input.branchId,
      
      lotNumber: input.lotNumber,
      manufacturingDate: input.manufacturingDate,
      expiryDate: input.expiryDate,
      receivedDate: input.receivedDate,
      supplierName: input.supplierName,
      inboundDocumentNo: input.inboundDocumentNo,
      status: input.status,
      costPrice: input.costPrice,
    },
  });

  await prisma.inventoryTransaction.createMany({
    data: input.transactions.map((transaction) => ({
      medicineId: input.medicineId,
      inventoryLotId: lot.id,
      branchId: input.branchId,
      
      stockStatus: transaction.stockStatus,
      transactionType: transaction.transactionType,
      quantity: transaction.quantity,
      referenceType: transaction.referenceType,
      referenceNumber: transaction.referenceNumber,
      createdByUserName: 'seed',
      notes: transaction.notes,
    })),
  });

  return lot;
}

async function main() {
  const force = process.env.FORCE_SEED === 'true' || process.argv.includes('--force');
  
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch (error) {
    console.log('Chua the dem so luong User. Co the cac bang chua duoc tao.');
  }

  if (userCount > 0 && !force) {
    console.log('==================================================');
    console.log('⚠️  Database đã có dữ liệu (User count > 0).');
    console.log('👉 Bỏ qua việc nạp dữ liệu mẫu (seed) để tránh làm mất dữ liệu hiện tại.');
    console.log('💡 Nếu bạn thực sự muốn làm trống và nạp lại toàn bộ dữ liệu mẫu, hãy chạy:');
    console.log('   npm run prisma:seed -- --force');
    console.log('==================================================');
    return;
  }

  if (force) {
    console.log('🔄 Đang thực hiện RESET TOÀN BỘ cơ sở dữ liệu...');
    console.log('Bat dau don dep co so du lieu...');
    await prisma.auditLog.deleteMany({});
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.prescriptionItem.deleteMany({});
    await prisma.prescription.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.stockTransferItem.deleteMany({});
    await prisma.stockTransfer.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventoryLot.deleteMany({});
    await prisma.medicinePrice.deleteMany({});
    await prisma.medicineUnitConversion.deleteMany({});
    await prisma.user.deleteMany({});
    
    await prisma.medicine.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.branch.deleteMany({});
  } else {
    console.log('🌱 Database đang trống. Bắt đầu nạp dữ liệu mẫu đầu tiên...');
  }

  console.log('Tao chi nhanh va vi tri luu tru...');
  const br1 = await prisma.branch.create({
    data: {
      code: 'br-1',
      name: 'Chi nhanh Quan 1',
      address: '120 Nguyen Hue, Quan 1, TP HCM',
      phone: '02838221234',
      email: 'q1@pharmachain.com',
    },
  });

  const br2 = await prisma.branch.create({
    data: {
      code: 'br-2',
      name: 'Chi nhanh Quan 3',
      address: '45 Vo Van Tan, Quan 3, TP HCM',
      phone: '02838334567',
      email: 'q3@pharmachain.com',
    },
  });

  const br3 = await prisma.branch.create({
    data: {
      code: 'br-3',
      name: 'Chi nhanh Hai Ba Trung',
      address: '22 Hai Ba Trung, Hoan Kiem, Ha Noi',
      phone: '02439339999',
      email: 'hbt@pharmachain.com',
    },
  });

  

  console.log('Tao tai khoan nguoi dung...');
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
      // Chi nhánh Quận 1 (br1)
      { username: 'branch_manager', password: branchPassword, name: 'Jane Branch', email: 'jane@pharmacy.com', role: 'ROLE_BRANCH_MANAGER', branchId: br1.id },
      { username: 'warehouse', password: warehousePassword, name: 'Bob Warehouse', email: 'bob@pharmacy.com', role: 'ROLE_WAREHOUSE_STAFF', branchId: br1.id },
      { username: 'pharmacist', password: pharmPassword, name: 'Mary Pharmacist', email: 'mary@pharmacy.com', role: 'ROLE_PHARMACIST', branchId: br1.id },
      // Chi nhánh Quận 3 (br2)
      { username: 'branch_manager3', password: branchPassword, name: 'Le Thi Lan', email: 'lan@pharmacy.com', role: 'ROLE_BRANCH_MANAGER', branchId: br2.id },
      { username: 'warehouse3', password: warehousePassword, name: 'Pham Van Hung', email: 'hung@pharmacy.com', role: 'ROLE_WAREHOUSE_STAFF', branchId: br2.id },
      { username: 'pharmacist3', password: pharmPassword, name: 'Tran Thi Hoa', email: 'hoa@pharmacy.com', role: 'ROLE_PHARMACIST', branchId: br2.id },
      // Chi nhánh Hải Bà Trưng (br3)
      { username: 'branch_manager2', password: branchPassword, name: 'Nguyen Van B', email: 'nguyenb@pharmacy.com', role: 'ROLE_BRANCH_MANAGER', branchId: br3.id },
      { username: 'warehouse2', password: warehousePassword, name: 'Tran Van Kho', email: 'trankho@pharmacy.com', role: 'ROLE_WAREHOUSE_STAFF', branchId: br3.id },
      { username: 'pharmacist2', password: pharmPassword, name: 'Nguyen Van Duoc', email: 'duoc@pharmacy.com', role: 'ROLE_PHARMACIST', branchId: br3.id },
    ],
  });

  console.log('Tao danh muc nhom thuoc...');
  const [catPain, catAntibiotic, catHormone, catPsycho, catCare] = await Promise.all([
    prisma.category.create({
      data: {
        code: 'CAT001',
        name: 'Thuốc hạ sốt, giảm đau',
        description: 'Nhóm thuốc giảm đau, hạ sốt, chống viêm',
      }
    }),
    prisma.category.create({
      data: {
        code: 'CAT002',
        name: 'Thuốc kháng sinh',
        description: 'Nhóm thuốc kháng sinh các loại',
      }
    }),
    prisma.category.create({
      data: {
        code: 'CAT003',
        name: 'Thuốc nội tiết',
        description: 'Thuốc nội tiết và đái tháo đường',
      }
    }),
    prisma.category.create({
      data: {
        code: 'CAT004',
        name: 'Hướng thần',
        description: 'Thuốc kiểm soát đặc biệt hướng thần',
      }
    }),
    prisma.category.create({
      data: {
        code: 'CAT005',
        name: 'Hàng chăm sóc không phải thuốc',
        description: 'Nước muối sinh lý, bông băng, thiết bị y tế',
      }
    }),
  ]);

  console.log('Tao danh muc nha cung cap...');
  const [supDHG, supImex, supSanofi, supMeko, supBidi] = await Promise.all([
    prisma.supplier.create({
      data: {
        code: 'SUP0001',
        name: 'Công ty Cổ phần Dược Hậu Giang',
        contactPerson: 'Nguyễn Văn A',
        phone: '02923891433',
        email: 'dhgpharma@dhgpharma.com.vn',
        address: '288 Nguyễn Văn Cừ, An Hòa, Ninh Kiều, Cần Thơ',
      }
    }),
    prisma.supplier.create({
      data: {
        code: 'SUP0002',
        name: 'Công ty Cổ phần Dược phẩm Imexpharm',
        contactPerson: 'Trần Thị B',
        phone: '02773851941',
        email: 'imexpharm@imexpharm.com',
        address: '04 Lý Thường Kiệt, Phường 1, TP. Cao Lãnh, Đồng Tháp',
      }
    }),
    prisma.supplier.create({
      data: {
        code: 'SUP0003',
        name: 'Công ty TNHH Sanofi-Aventis Việt Nam',
        contactPerson: 'Lê Văn C',
        phone: '02838298526',
        email: 'vietnam.info@sanofi.com',
        address: '10 Hàm Nghi, Quận 1, TP. Hồ Chí Minh',
      }
    }),
    prisma.supplier.create({
      data: {
        code: 'SUP0004',
        name: 'Công ty Cổ phần Hóa - Dược phẩm Mekophar',
        contactPerson: 'Phạm Thị D',
        phone: '02838650258',
        email: 'info@mekophar.com',
        address: '297/5 Lý Thường Kiệt, Phường 15, Quận 11, TP. Hồ Chí Minh',
      }
    }),
    prisma.supplier.create({
      data: {
        code: 'SUP0005',
        name: 'Công ty Cổ phần Dược - Trang thiết bị y tế Bình Định (Bidiphar)',
        contactPerson: 'Hoàng Văn E',
        phone: '02563846500',
        email: 'info@bidiphar.com',
        address: '498 Nguyễn Thái Học, Quang Trung, Quy Nhơn, Bình Định',
      }
    }),
  ]);

  console.log('Tao danh sach khach hang than thiet...');
  const customersToCreate = Array.from({ length: 35 }, (_, i) => ({
    id: `cust-${i + 1}`,
    code: `CUS${String(i + 1).padStart(4, '0')}`,
    name: ['Nguyễn Văn A', 'Jane Smith', 'John Doe', 'Alice Brown', 'Charlie Wilson'][i % 5] + ` ${i}`,
    phone: i === 0 ? '0928123456' : i === 1 ? '0987654321' : i === 2 ? '0123456789' : `0555${String(1000 + i).padStart(4, '0')}`,
    email: `customer${i + 1}@email.com`,
    membershipTier: ['bronze', 'silver', 'gold', 'platinum'][i % 4],
    points: i === 0 ? 850 : Math.floor(Math.random() * 1200),
    joinDate: new Date(2024, i % 12, (i % 28) + 1).toISOString().split('T')[0],
    address: `Số ${i + 1} Đường ABC, Quận ${1 + (i % 12)}, TP.HCM`,
    dateOfBirth: new Date(1980 + (i % 25), i % 12, (i % 28) + 1).toISOString().split('T')[0],
    status: 'active'
  }));

  await prisma.customer.createMany({ data: customersToCreate });

  console.log('Tao master data thuoc...');
  const [med1, med2, med3, med4, med5, med6, med7] = await Promise.all([
    prisma.medicine.create({
      data: {
        code: 'MED0001',
        registrationNumber: 'VD-12345-24',
        name: 'Paracetamol Hapacol 500mg',
        categoryId: catPain.id,
        supplierId: supDHG.id,
        activeIngredient: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'Vien nen',
        packagingSpec: '10 vi x 10 vien',
        unit: 'vien',
        unitConversionNote: '1 hop = 10 vi = 100 vien',
        barcode: '8934567000018',
        manufacturer: 'Duoc Hau Giang',
        countryOfOrigin: 'Viet Nam',
        description: 'Giam dau, ha sot nhanh cho cac truong hop thong thuong.',
        saleCategory: MedicineSaleCategory.OTC,
        isPrescriptionRequired: false,
        sellPrice: 12,
        defaultCostPrice: 8,
      },
    }),
    prisma.medicine.create({
      data: {
        code: 'MED0002',
        registrationNumber: 'VD-82763-23',
        name: 'Amoxicillin 500mg Imexpharm',
        categoryId: catAntibiotic.id,
        supplierId: supImex.id,
        activeIngredient: 'Amoxicillin',
        strength: '500mg',
        dosageForm: 'Vien nang',
        packagingSpec: '10 vi x 10 vien',
        unit: 'vien',
        unitConversionNote: '1 hop = 10 vi = 100 vien',
        barcode: '8934567000025',
        manufacturer: 'Imexpharm',
        countryOfOrigin: 'Viet Nam',
        description: 'Khang sinh beta-lactam, can theo don bac si.',
        saleCategory: MedicineSaleCategory.PRESCRIPTION,
        isPrescriptionRequired: true,
        sellPrice: 150,
        defaultCostPrice: 110,
      },
    }),
    prisma.medicine.create({
      data: {
        code: 'MED0003',
        registrationNumber: 'QLSP-55671-22',
        name: 'Insulin Glargine Solostar',
        categoryId: catHormone.id,
        supplierId: supSanofi.id,
        activeIngredient: 'Insulin glargine',
        strength: '100IU/mL',
        dosageForm: 'But tien nap',
        packagingSpec: 'Hop 5 but x 3mL',
        unit: 'but',
        unitConversionNote: '1 hop = 5 but',
        barcode: '8934567000032',
        manufacturer: 'Sanofi',
        countryOfOrigin: 'France',
        description: 'Thuoc lanh, can bao quan 2-8C va cap phat theo FEFO.',
        saleCategory: MedicineSaleCategory.PRESCRIPTION,
        isPrescriptionRequired: true,
        sellPrice: 420,
        defaultCostPrice: 310,
      },
    }),
    prisma.medicine.create({
      data: {
        code: 'MED0004',
        registrationNumber: 'KSDB-0045-21',
        name: 'Diazepam 5mg',
        categoryId: catPsycho.id,
        supplierId: supMeko.id,
        activeIngredient: 'Diazepam',
        strength: '5mg',
        dosageForm: 'Vien nen',
        packagingSpec: '10 vi x 10 vien',
        unit: 'vien',
        unitConversionNote: '1 hop = 10 vi = 100 vien',
        barcode: '8934567000049',
        manufacturer: 'Mekophar',
        countryOfOrigin: 'Viet Nam',
        description: 'Thuoc kiem soat dac biet, can ghi so va duoc si duyet.',
        saleCategory: MedicineSaleCategory.PRESCRIPTION,
        isPrescriptionRequired: true,
        sellPrice: 65,
        defaultCostPrice: 40,
      },
    }),
    prisma.medicine.create({
      data: {
        code: 'MED0005',
        registrationNumber: 'TPCN-0088-25',
        name: 'Nuoc muoi sinh ly 0.9%',
        categoryId: catCare.id,
        supplierId: supBidi.id,
        activeIngredient: 'Sodium chloride',
        strength: '0.9%',
        dosageForm: 'Dung dich',
        packagingSpec: 'Chai 500mL',
        unit: 'chai',
        unitConversionNote: '1 thung = 24 chai',
        barcode: '8934567000056',
        manufacturer: 'Bidiphar',
        countryOfOrigin: 'Viet Nam',
        description: 'Hang khong phai thuoc, co the ban online theo gia kenh.',
        saleCategory: MedicineSaleCategory.OTC,
        isPrescriptionRequired: false,
        sellPrice: 18,
        defaultCostPrice: 9,
      },
    }),
    prisma.medicine.create({
      data: {
        code: 'MED0006',
        registrationNumber: 'VD-88990-24',
        name: 'Tramadol 50mg',
        categoryId: catPain.id,
        supplierId: supDHG.id,
        activeIngredient: 'Tramadol',
        strength: '50mg',
        dosageForm: 'Vien nang',
        packagingSpec: '10 vi x 10 vien',
        unit: 'vien',
        unitConversionNote: '1 hop = 10 vi = 100 vien',
        barcode: '8934567000063',
        manufacturer: 'Duoc Hau Giang',
        countryOfOrigin: 'Viet Nam',
        description: 'Thuoc giam dau opioid, LASA voi Trazodone.',
        saleCategory: MedicineSaleCategory.PRESCRIPTION,
        isPrescriptionRequired: true,
        sellPrice: 20,
        defaultCostPrice: 15,
      },
    }),
    prisma.medicine.create({
      data: {
        code: 'MED0007',
        registrationNumber: 'VD-88991-24',
        name: 'Trazodone 50mg',
        categoryId: catPsycho.id,
        supplierId: supDHG.id,
        activeIngredient: 'Trazodone',
        strength: '50mg',
        dosageForm: 'Vien nen',
        packagingSpec: '10 vi x 10 vien',
        unit: 'vien',
        unitConversionNote: '1 hop = 10 vi = 100 vien',
        barcode: '8934567000070',
        manufacturer: 'Duoc Hau Giang',
        countryOfOrigin: 'Viet Nam',
        description: 'Thuoc chong tram cam, LASA voi Tramadol.',
        saleCategory: MedicineSaleCategory.PRESCRIPTION,
        isPrescriptionRequired: true,
        sellPrice: 25,
        defaultCostPrice: 18,
      },
    }),
  ]);

  await prisma.medicineUnitConversion.createMany({
    data: [
      { medicineId: med1.id, fromUnit: 'hop', toUnit: 'vi', conversionRate: 10 },
      { medicineId: med1.id, fromUnit: 'vi', toUnit: 'vien', conversionRate: 10 },
      { medicineId: med2.id, fromUnit: 'hop', toUnit: 'vi', conversionRate: 10 },
      { medicineId: med2.id, fromUnit: 'vi', toUnit: 'vien', conversionRate: 10 },
      { medicineId: med3.id, fromUnit: 'hop', toUnit: 'but', conversionRate: 5 },
      { medicineId: med4.id, fromUnit: 'hop', toUnit: 'vi', conversionRate: 10 },
      { medicineId: med4.id, fromUnit: 'vi', toUnit: 'vien', conversionRate: 10 },
      { medicineId: med5.id, fromUnit: 'thung', toUnit: 'chai', conversionRate: 24 },
      { medicineId: med6.id, fromUnit: 'hop', toUnit: 'vi', conversionRate: 10 },
      { medicineId: med6.id, fromUnit: 'vi', toUnit: 'vien', conversionRate: 10 },
      { medicineId: med7.id, fromUnit: 'hop', toUnit: 'vi', conversionRate: 10 },
      { medicineId: med7.id, fromUnit: 'vi', toUnit: 'vien', conversionRate: 10 },
    ],
  });

  await prisma.medicinePrice.createMany({
    data: [
      { medicineId: med1.id, branchId: null, channel: 'POS', price: 12, priceProgram: 'Gia niem yet toan chuoi', effectiveFrom: '2026-01-01', changedBy: 'seed' },
      { medicineId: med1.id, branchId: br1.id, channel: 'ONLINE', price: 11.5, priceProgram: 'Online launch', effectiveFrom: '2026-03-01', changedBy: 'seed' },
      { medicineId: med2.id, branchId: null, channel: 'POS', price: 150, priceProgram: 'Gia khang sinh toan chuoi', effectiveFrom: '2026-01-01', changedBy: 'seed' },
      { medicineId: med2.id, branchId: br1.id, channel: 'POS', price: 148, priceProgram: 'Chuong trinh chi nhanh Quan 1', effectiveFrom: '2026-04-01', changedBy: 'seed' },
      { medicineId: med3.id, branchId: null, channel: 'POS', price: 420, priceProgram: 'Gia thuoc lanh', effectiveFrom: '2026-01-01', changedBy: 'seed' },
      { medicineId: med4.id, branchId: null, channel: 'POS', price: 65, priceProgram: 'Gia thuoc kiem soat', effectiveFrom: '2026-01-01', changedBy: 'seed' },
      { medicineId: med5.id, branchId: null, channel: 'POS', price: 18, priceProgram: 'Gia hang cham soc', effectiveFrom: '2026-01-01', changedBy: 'seed' },
      { medicineId: med5.id, branchId: null, channel: 'ONLINE', price: 17, priceProgram: 'Gia online', effectiveFrom: '2026-02-01', changedBy: 'seed' },
      { medicineId: med6.id, branchId: null, channel: 'POS', price: 20, priceProgram: 'Gia ban', effectiveFrom: '2026-01-01', changedBy: 'seed' },
      { medicineId: med7.id, branchId: null, channel: 'POS', price: 25, priceProgram: 'Gia ban', effectiveFrom: '2026-01-01', changedBy: 'seed' },
    ],
  });

  console.log('Tao lo thuoc va so giao dich kho...');
  await seedLotWithTransactions({
    medicineId: med1.id,
    branchId: br1.id,
    
    lotNumber: 'PARA-Q1-2401',
    manufacturingDate: '2026-01-10',
    expiryDate: '2027-06-30',
    receivedDate: '2026-02-01',
    supplierName: 'Duoc pham Ben Tre',
    inboundDocumentNo: 'PNK-Q1-0001',
    status: StockStatus.AVAILABLE,
    costPrice: 8,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 250, referenceType: 'purchase', referenceNumber: 'PO-Q1-0001' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RESERVE, quantity: -10, referenceType: 'reservation', referenceNumber: 'RSV-Q1-0001', notes: 'Giu cho don dang xu ly' },
      { stockStatus: StockStatus.RESERVED, transactionType: InventoryTransactionType.RESERVE, quantity: 10, referenceType: 'reservation', referenceNumber: 'RSV-Q1-0001' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.DAMAGE, quantity: -5, referenceType: 'damage', referenceNumber: 'DMG-Q1-0001' },
      { stockStatus: StockStatus.DAMAGED, transactionType: InventoryTransactionType.DAMAGE, quantity: 5, referenceType: 'damage', referenceNumber: 'DMG-Q1-0001', notes: 'Vo vo hop khi van chuyen noi bo' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med1.id,
    branchId: br1.id,
    
    lotNumber: 'PARA-Q1-2402',
    manufacturingDate: '2026-03-18',
    expiryDate: '2027-12-31',
    receivedDate: '2026-04-02',
    supplierName: 'Duoc pham Ben Tre',
    inboundDocumentNo: 'PNK-Q1-0017',
    status: StockStatus.AVAILABLE,
    costPrice: 8.2,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 300, referenceType: 'purchase', referenceNumber: 'PO-Q1-0017' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med2.id,
    branchId: br1.id,
    
    lotNumber: 'AMOX-Q1-2401',
    manufacturingDate: '2026-02-12',
    expiryDate: '2027-05-15',
    receivedDate: '2026-02-20',
    supplierName: 'Duoc pham Trung Uong 1',
    inboundDocumentNo: 'PNK-Q1-0003',
    status: StockStatus.AVAILABLE,
    costPrice: 110,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 180, referenceType: 'purchase', referenceNumber: 'PO-Q1-0003' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.STATUS_TRANSFER, quantity: -20, referenceType: 'quality_check', referenceNumber: 'QC-Q1-0003' },
      { stockStatus: StockStatus.QUARANTINE, transactionType: InventoryTransactionType.STATUS_TRANSFER, quantity: 20, referenceType: 'quality_check', referenceNumber: 'QC-Q1-0003', notes: 'Cho kiem tra ho so sau nhap' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med2.id,
    branchId: br3.id,
    
    lotNumber: 'AMOX-HBT-2401',
    manufacturingDate: '2026-02-28',
    expiryDate: '2027-09-01',
    receivedDate: '2026-03-12',
    supplierName: 'Duoc pham Trung Uong 1',
    inboundDocumentNo: 'PNK-HBT-0002',
    status: StockStatus.AVAILABLE,
    costPrice: 108,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 150, referenceType: 'purchase', referenceNumber: 'PO-HBT-0002' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med3.id,
    branchId: br1.id,
    
    lotNumber: 'INS-Q1-2401',
    manufacturingDate: '2026-01-05',
    expiryDate: '2026-12-15',
    receivedDate: '2026-01-22',
    supplierName: 'Zuellig Pharma',
    inboundDocumentNo: 'PNK-LANH-0001',
    status: StockStatus.AVAILABLE,
    costPrice: 310,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 50, referenceType: 'purchase', referenceNumber: 'PO-LANH-0001' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.TRANSFER_OUT, quantity: -10, referenceType: 'transfer', referenceNumber: 'TR-Q1-HBT-0001' },
      { stockStatus: StockStatus.IN_TRANSIT, transactionType: InventoryTransactionType.TRANSFER_OUT, quantity: 10, referenceType: 'transfer', referenceNumber: 'TR-Q1-HBT-0001', notes: 'Dang dieu chuyen sang HBT' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med4.id,
    branchId: br1.id,
    
    lotNumber: 'DIA-Q1-2401',
    manufacturingDate: '2026-01-15',
    expiryDate: '2027-03-30',
    receivedDate: '2026-02-03',
    supplierName: 'Mekophar',
    inboundDocumentNo: 'PNK-Q1-0005',
    status: StockStatus.RESERVED,
    costPrice: 40,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 100, referenceType: 'purchase', referenceNumber: 'PO-Q1-0005' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RESERVE, quantity: -20, referenceType: 'reservation', referenceNumber: 'RSV-Q1-0004' },
      { stockStatus: StockStatus.RESERVED, transactionType: InventoryTransactionType.RESERVE, quantity: 20, referenceType: 'reservation', referenceNumber: 'RSV-Q1-0004', notes: 'Thuoc kiem soat giu cho benh nhan noi tru' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med5.id,
    branchId: br1.id,
    
    lotNumber: 'SAL-Q1-2401',
    manufacturingDate: '2026-02-20',
    expiryDate: '2028-01-01',
    receivedDate: '2026-03-01',
    supplierName: 'Bidiphar',
    inboundDocumentNo: 'PNK-Q1-0010',
    status: StockStatus.BLOCKED,
    costPrice: 9,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 300, referenceType: 'purchase', referenceNumber: 'PO-Q1-0010' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.STATUS_TRANSFER, quantity: -15, referenceType: 'quality_hold', referenceNumber: 'QH-Q1-0010' },
      { stockStatus: StockStatus.BLOCKED, transactionType: InventoryTransactionType.STATUS_TRANSFER, quantity: 15, referenceType: 'quality_hold', referenceNumber: 'QH-Q1-0010', notes: 'Tam khoa do nghi ngo chat luong bao bi' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med5.id,
    branchId: br1.id,
    
    lotNumber: 'SAL-Q1-2309',
    manufacturingDate: '2025-06-01',
    expiryDate: '2025-12-31',
    receivedDate: '2025-06-15',
    supplierName: 'Bidiphar',
    inboundDocumentNo: 'PNK-Q1-OLD1',
    status: StockStatus.EXPIRED,
    costPrice: 8.5,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 50, referenceType: 'purchase', referenceNumber: 'PO-Q1-OLD1' },
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.EXPIRE, quantity: -50, referenceType: 'expiry', referenceNumber: 'EXP-Q1-0001' },
      { stockStatus: StockStatus.EXPIRED, transactionType: InventoryTransactionType.EXPIRE, quantity: 50, referenceType: 'expiry', referenceNumber: 'EXP-Q1-0001', notes: 'Da het han, cho xu ly tieu huy' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med1.id,
    branchId: br2.id,
    
    lotNumber: 'PARA-Q3-2401',
    manufacturingDate: '2026-02-01',
    expiryDate: '2027-08-31',
    receivedDate: '2026-02-28',
    supplierName: 'Duoc pham Ben Tre',
    inboundDocumentNo: 'PNK-Q3-0001',
    status: StockStatus.AVAILABLE,
    costPrice: 8.1,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 180, referenceType: 'purchase', referenceNumber: 'PO-Q3-0001' },
    ],
  });

  // Bổ sung thêm lô tồn kho cho Chi nhánh Quận 3 (br2)
  await seedLotWithTransactions({
    medicineId: med2.id,
    branchId: br2.id,
    
    lotNumber: 'AMOX-Q3-2401',
    manufacturingDate: '2026-03-01',
    expiryDate: '2027-10-31',
    receivedDate: '2026-03-15',
    supplierName: 'Duoc pham Trung Uong 1',
    inboundDocumentNo: 'PNK-Q3-0002',
    status: StockStatus.AVAILABLE,
    costPrice: 109,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 120, referenceType: 'purchase', referenceNumber: 'PO-Q3-0002' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med5.id,
    branchId: br2.id,
    
    lotNumber: 'SAL-Q3-2401',
    manufacturingDate: '2026-03-10',
    expiryDate: '2028-03-31',
    receivedDate: '2026-04-01',
    supplierName: 'Bidiphar',
    inboundDocumentNo: 'PNK-Q3-0003',
    status: StockStatus.AVAILABLE,
    costPrice: 9,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 200, referenceType: 'purchase', referenceNumber: 'PO-Q3-0003' },
    ],
  });

  // Bổ sung thêm lô tồn kho cho Chi nhánh Hải Bà Trưng (br3)
  await seedLotWithTransactions({
    medicineId: med1.id,
    branchId: br3.id,
    
    lotNumber: 'PARA-HBT-2401',
    manufacturingDate: '2026-02-15',
    expiryDate: '2027-09-30',
    receivedDate: '2026-03-05',
    supplierName: 'Duoc pham Ben Tre',
    inboundDocumentNo: 'PNK-HBT-0001',
    status: StockStatus.AVAILABLE,
    costPrice: 8.0,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 220, referenceType: 'purchase', referenceNumber: 'PO-HBT-0001' },
    ],
  });

  await seedLotWithTransactions({
    medicineId: med5.id,
    branchId: br3.id,
    
    lotNumber: 'SAL-HBT-2401',
    manufacturingDate: '2026-04-01',
    expiryDate: '2028-06-30',
    receivedDate: '2026-04-20',
    supplierName: 'Bidiphar',
    inboundDocumentNo: 'PNK-HBT-0003',
    status: StockStatus.AVAILABLE,
    costPrice: 9,
    transactions: [
      { stockStatus: StockStatus.AVAILABLE, transactionType: InventoryTransactionType.RECEIPT, quantity: 150, referenceType: 'purchase', referenceNumber: 'PO-HBT-0003' },
    ],
  });

  console.log('Tao don thuoc mau...');
  const pres1 = await prisma.prescription.create({
    data: {
      prescriptionNumber: 'TOA-884021',
      customerId: 'cust-1',
      doctorName: 'Bac si Nguyen Huu B',
      prescriptionDate: '2026-05-24',
      status: 'dispensed',
      verifiedBy: 'Mary Pharmacist',
      verifiedDate: new Date().toISOString(),
    },
  });

  await prisma.prescriptionItem.createMany({
    data: [
      {
        prescriptionId: pres1.id,
        medicineName: 'Amoxicillin 500mg Imexpharm',
        quantity: 14,
        dosage: 'Uong sau an',
        frequency: '2 lan / ngay',
        duration: '7 ngay',
      },
      {
        prescriptionId: pres1.id,
        medicineName: 'Paracetamol Hapacol 500mg',
        quantity: 10,
        dosage: 'Khi sot tren 38.5 do',
        frequency: '3 lan / ngay',
        duration: '3 ngay',
      },
    ],
  });

  console.log('Tao hoa don ban le mau (SalesOrder)...');
  const salesOrdersToCreate: any[] = [];
  const salesOrderItemsToCreate: any[] = [];

  const medicinesList = [
    { id: med1.id, name: med1.name, price: 12 },
    { id: med2.id, name: med2.name, price: 150 },
    { id: med3.id, name: med3.name, price: 420 },
    { id: med4.id, name: med4.name, price: 65 },
    { id: med5.id, name: med5.name, price: 18 }
  ];

  // Helper: tạo hóa đơn cho 1 chi nhánh trong vòng N ngày
  const seedOrdersForBranch = (
    branchId: string,
    prefix: string,
    cashierName: string,
    days: number,
    ordersPerDay: number,
    offset: number,
  ) => {
    for (let i = days - 1; i >= 0; i--) {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - i);
      saleDate.setHours(8 + ((i + offset) % 4) * 2, 10 + (i * 11) % 50, 0, 0);

      const numOrders = ordersPerDay + (i % 2);
      for (let j = 0; j < numOrders; j++) {
        const orderId = `${prefix}-${i}-${j}`;
        const dateStr = `${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleDate.getDate()).padStart(2, '0')}`;
        const invNo = `INV-${prefix.toUpperCase()}-${dateStr}-${i}${j}`;

        const itemsCount = 1 + ((i + j + offset) % 3);
        let subtotal = 0;
        const orderItems: any[] = [];

        for (let k = 0; k < itemsCount; k++) {
          const med = medicinesList[(i + j + k + offset) % medicinesList.length];
          const quantity = 2 + (k % 3);
          const totalPrice = med.price * quantity;
          subtotal += totalPrice;

          orderItems.push({
            salesOrderId: orderId,
            medicineId: med.id,
            medicineName: med.name,
            lotNumber: 'LÔ-SEED',
            quantity,
            unitPrice: med.price,
            discount: 0,
            totalPrice,
          });
        }

        const discount = subtotal > 200 ? 15 : subtotal > 100 ? 10 : 0;
        const total = subtotal - discount;

        const isWalkIn = (i + j) % 3 === 0;
        const customerId = isWalkIn ? null : `cust-${1 + ((i + j) % 35)}`;
        const pointsEarned = isWalkIn ? 0 : Math.floor(total / 10);

        salesOrdersToCreate.push({
          id: orderId,
          invoiceNumber: invNo,
          branchId,
          customerId,
          cashierId: 'seed',
          cashierName,
          saleDate,
          subtotal,
          discount,
          total,
          paymentMethod: ['cash', 'card', 'transfer'][(i + j + offset) % 3],
          status: 'completed',
          pointsEarned,
        });

        salesOrderItemsToCreate.push(...orderItems);
      }
    }
  };

  // Chi nhánh Quận 1: 7 ngày, ~3-4 đơn/ngày
  seedOrdersForBranch(br1.id, 'ord-q1', 'Jane Branch', 7, 3, 0);

  // Chi nhánh Quận 3: 7 ngày, ~2-3 đơn/ngày
  seedOrdersForBranch(br2.id, 'ord-q3', 'Le Thi Lan', 7, 2, 2);

  // Chi nhánh Hải Bà Trưng: 7 ngày, ~2-3 đơn/ngày
  seedOrdersForBranch(br3.id, 'ord-hbt', 'Nguyen Van Duoc', 7, 2, 4);

  await prisma.salesOrder.createMany({ data: salesOrdersToCreate });
  await prisma.salesOrderItem.createMany({ data: salesOrderItemsToCreate });

  console.log('Tao phieu chuyen kho mau (StockTransfer)...');

  // Phiếu 1: Chờ duyệt - br1 → br2
  const tf1 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-SEED-0001',
      fromBranchId: br1.id,
      toBranchId: br2.id,
      requestDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      requestedBy: 'branch_manager',
      notes: 'Chuyển kho bổ sung Paracetamol cho Quận 3',
      items: {
        create: [
          { medicineId: med1.id, medicineName: 'Paracetamol Hapacol 500mg', lotNumber: 'PARA-Q1-2401', quantity: 50 },
          { medicineId: med5.id, medicineName: 'Nuoc muoi sinh ly 0.9%',   lotNumber: 'SAL-Q1-2401',  quantity: 30 },
        ],
      },
    },
  });

  // Phiếu 2: Đã duyệt - br1 → br3
  const tf2 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-SEED-0002',
      fromBranchId: br1.id,
      toBranchId: br3.id,
      requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'approved',
      requestedBy: 'branch_manager',
      approvedBy: 'chain_manager',
      notes: 'Bổ sung Amoxicillin theo yêu cầu chi nhánh Hải Bà Trưng',
      items: {
        create: [
          { medicineId: med2.id, medicineName: 'Amoxicillin 500mg Imexpharm', lotNumber: 'AMOX-Q1-2401', quantity: 40 },
        ],
      },
    },
  });

  // Phiếu 3: Đang vận chuyển - br3 → br2
  // Cần: lô AMOX-HBT-2401 tại br3 xuất 30 AVAILABLE, ghi 30 IN_TRANSIT
  const lotAmoxHbt = await prisma.inventoryLot.findFirst({
    where: { branchId: br3.id, lotNumber: 'AMOX-HBT-2401' },
  });

  const tf3 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-SEED-0003',
      fromBranchId: br3.id,
      toBranchId: br2.id,
      requestDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'in_transit',
      requestedBy: 'branch_manager2',
      approvedBy: 'chain_manager',
      notes: 'Điều phối Amoxicillin từ HBT sang Quận 3',
      items: {
        create: [
          { medicineId: med2.id, medicineName: 'Amoxicillin 500mg Imexpharm', lotNumber: 'AMOX-HBT-2401', quantity: 30 },
        ],
      },
    },
  });

  // Ghi giao dịch tồn kho cho phiếu in_transit (giống logic /ship)
  if (lotAmoxHbt) {
    await prisma.inventoryTransaction.createMany({
      data: [
        {
          medicineId: med2.id,
          inventoryLotId: lotAmoxHbt.id,
          branchId: br3.id,
          
          stockStatus: 'AVAILABLE',
          transactionType: 'TRANSFER_OUT',
          quantity: -30,
          referenceType: 'transfer',
          referenceId: tf3.id,
          referenceNumber: 'TRF-SEED-0003',
          createdByUserName: 'seed',
          notes: 'Xuat kho chuyen hang TRF-SEED-0003',
        },
        {
          medicineId: med2.id,
          inventoryLotId: lotAmoxHbt.id,
          branchId: br3.id,
          
          stockStatus: 'IN_TRANSIT',
          transactionType: 'TRANSFER_OUT',
          quantity: 30,
          referenceType: 'transfer',
          referenceId: tf3.id,
          referenceNumber: 'TRF-SEED-0003',
          createdByUserName: 'seed',
          notes: 'Chuyen AVAILABLE -> IN_TRANSIT cho TRF-SEED-0003',
        },
      ],
    });
  }

  // Phiếu 4: Đã nhận - br2 → br3 (Paracetamol 60 viên)
  // Cần: lô PARA-Q3-2401 tại br2 đã xuất 60, br3 nhận 60 AVAILABLE
  const lotParaQ3 = await prisma.inventoryLot.findFirst({
    where: { branchId: br2.id, lotNumber: 'PARA-Q3-2401' },
  });
  

  const tf4 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-SEED-0004',
      fromBranchId: br2.id,
      toBranchId: br3.id,
      requestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'received',
      requestedBy: 'branch_manager3',
      approvedBy: 'chain_manager',
      notes: 'Đã hoàn thành chuyển Paracetamol từ Quận 3 sang HBT',
      items: {
        create: [
          { medicineId: med1.id, medicineName: 'Paracetamol Hapacol 500mg', lotNumber: 'PARA-Q3-2401', quantity: 60, receivedQuantity: 60 },
        ],
      },
    },
  });

  // Ghi giao dịch tồn kho cho phiếu received (giống logic /ship + /receive)
  if (lotParaQ3) {
    // Bước ship: br2 xuất AVAILABLE -60, ghi IN_TRANSIT +60
    await prisma.inventoryTransaction.createMany({
      data: [
        {
          medicineId: med1.id,
          inventoryLotId: lotParaQ3.id,
          branchId: br2.id,
          
          stockStatus: 'AVAILABLE',
          transactionType: 'TRANSFER_OUT',
          quantity: -60,
          referenceType: 'transfer',
          referenceId: tf4.id,
          referenceNumber: 'TRF-SEED-0004',
          createdByUserName: 'seed',
          notes: 'Xuat kho chuyen hang TRF-SEED-0004',
        },
        {
          medicineId: med1.id,
          inventoryLotId: lotParaQ3.id,
          branchId: br2.id,
          
          stockStatus: 'IN_TRANSIT',
          transactionType: 'TRANSFER_OUT',
          quantity: 60,
          referenceType: 'transfer',
          referenceId: tf4.id,
          referenceNumber: 'TRF-SEED-0004',
          createdByUserName: 'seed',
          notes: 'Chuyen AVAILABLE -> IN_TRANSIT cho TRF-SEED-0004',
        },
      ],
    });

    // Bước receive: giảm IN_TRANSIT tại br2, tạo/tăng AVAILABLE tại br3
    await prisma.inventoryTransaction.create({
      data: {
        medicineId: med1.id,
        inventoryLotId: lotParaQ3.id,
        branchId: br2.id,
        
        stockStatus: 'IN_TRANSIT',
        transactionType: 'TRANSFER_IN',
        quantity: -60,
        referenceType: 'transfer',
        referenceId: tf4.id,
        referenceNumber: 'TRF-SEED-0004',
        createdByUserName: 'seed',
        notes: 'Giam IN_TRANSIT khi chi nhanh nhan xac nhan TRF-SEED-0004',
      },
    });

    // Tạo lô tại chi nhánh nhận (br3) nếu chưa có, rồi ghi AVAILABLE +60
    let toLotBr3 = await prisma.inventoryLot.findFirst({
      where: { branchId: br3.id, medicineId: med1.id, lotNumber: 'PARA-Q3-2401' },
    });
    if (!toLotBr3) {
      toLotBr3 = await prisma.inventoryLot.create({
        data: {
          medicineId: med1.id,
          branchId: br3.id,
          
          lotNumber: 'PARA-Q3-2401',
          manufacturingDate: lotParaQ3.manufacturingDate,
          expiryDate: lotParaQ3.expiryDate || '2027-08-31',
          costPrice: lotParaQ3.costPrice,
          receivedDate: new Date().toISOString().split('T')[0],
          supplierName: lotParaQ3.supplierName,
          inboundDocumentNo: 'TRF-SEED-0004',
          status: 'AVAILABLE',
        },
      });
    }
    await prisma.inventoryTransaction.create({
      data: {
        medicineId: med1.id,
        inventoryLotId: toLotBr3.id,
        branchId: br3.id,
        
        stockStatus: 'AVAILABLE',
        transactionType: 'TRANSFER_IN',
        quantity: 60,
        referenceType: 'transfer',
        referenceId: tf4.id,
        referenceNumber: 'TRF-SEED-0004',
        createdByUserName: 'seed',
        notes: 'Nhap kho nhan hang tu TRF-SEED-0004 (br2 -> br3)',
      },
    });
  }

  console.log(`Da tao ${[tf1, tf2, tf3, tf4].length} phieu chuyen kho mau voi giao dich ton kho dong bo.`);

  console.log('Tao audit log...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: 'system',
        userName: 'system',
        action: 'seed',
        entityType: 'database',
        entityId: 'postgres',
        details: 'Khoi tao co so du lieu mau voi ledger ton kho, FEFO va master data thuoc.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: 'admin',
        userName: 'admin',
        action: 'login',
        entityType: 'user',
        entityId: 'admin',
        details: 'Admin dang nhap he thong.',
        ipAddress: '192.168.1.1',
      },
    ],
  });

  console.log('Tao promotion mau...');
  const existingPromotions = await prisma.promotion.findMany();
  if (existingPromotions.length === 0) {
    await prisma.promotion.createMany({
      data: [
        {
          id: 'default',
          code: 'default',
          name: 'VIP tích điểm thưởng mặc định',
          value: 0,
          status: 'active',
          type: 'default',
          description: 'Không chiết khấu hóa đơn, tích lũy điểm thưởng theo tỷ lệ 1% cơ bản ($10 = 1 điểm).',
          usages: 124,
          totalSavings: 0,
          targetBranch: 'all'
        },
        {
          id: 'percent_10',
          code: 'percent_10',
          name: 'Chiết khấu 10% tổng hóa đơn',
          value: 10,
          status: 'active',
          type: 'percent',
          description: 'Giảm trừ trực tiếp 10% trên tổng giá trị giỏ hàng trước thuế khi checkout lẻ.',
          usages: 87,
          totalSavings: 450,
          targetBranch: 'all'
        },
        {
          id: 'fixed_20',
          code: 'fixed_20',
          name: 'Giảm thẳng $20 trực tiếp',
          value: 20,
          status: 'active',
          type: 'fixed',
          description: 'Khấu trừ cố định $20 tiền mặt cho mọi đơn hàng POS bất kể trị giá.',
          usages: 52,
          totalSavings: 1040,
          targetBranch: 'all'
        },
        {
          id: 'combo_para',
          code: 'combo_para',
          name: 'Combo Paracetamol (Giảm thêm $5)',
          value: 5,
          status: 'active',
          type: 'combo',
          description: 'Ưu đãi kích cầu: Khấu trừ $5 trực tiếp khi đơn hàng POS có chứa thuốc Paracetamol Hapacol.',
          usages: 63,
          totalSavings: 315,
          targetBranch: 'all'
        },
        {
          id: 'vip_points',
          code: 'vip_points',
          name: 'Nhân hệ số điểm VIP (Bạc/Vàng/Bạch Kim)',
          value: 2,
          status: 'active',
          type: 'loyalty',
          description: 'Áp dụng nhân đôi (x2) điểm tích lũy cho khách hàng VIP đạt thứ hạng thẻ Bạc, Vàng, Bạch Kim.',
          usages: 114,
          totalSavings: 0,
          targetBranch: 'all'
        }
      ]
    });
    console.log('Da tao 5 chuong trinh khuyen mai mau!');
  }

  console.log('=== SEEDING CO SO DU LIEU HOAN TAT ===');
}

main()
  .catch((e) => {
    console.error('Loi khi seeding du lieu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
