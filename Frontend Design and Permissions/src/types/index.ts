// User and Authentication Types
export type UserRole =
  | 'ROLE_ADMIN'
  | 'ROLE_CHAIN_MANAGER'
  | 'ROLE_BRANCH_MANAGER'
  | 'ROLE_PHARMACIST'
  | 'ROLE_WAREHOUSE_STAFF';

export type Permission =
  | 'medicine.view'
  | 'medicine.create'
  | 'medicine.update'
  | 'medicine.category.manage'
  | 'supplier.view'
  | 'supplier.create'
  | 'supplier.update'
  | 'purchasing.create'
  | 'purchasing.approve'
  | 'purchasing.receive'
  | 'inventory.view'
  | 'inventory.stocktake'
  | 'inventory.adjust'
  | 'inventory.batch.manage'
  | 'transfer.create'
  | 'transfer.approve'
  | 'transfer.ship'
  | 'transfer.receive'
  | 'sales.view'
  | 'sales.create'
  | 'sales.cancel'
  | 'prescription.verify'
  | 'customer.view'
  | 'customer.manage'
  | 'report.view_branch'
  | 'report.view_chain'
  | 'branch.manage'
  | 'user.manage'
  | 'role.manage'
  | 'audit.view'
  | 'promotion.view'
  | 'promotion.manage';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  permissions: Permission[];
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, branchId?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
}

export type MedicineSaleCategory = 'PRESCRIPTION' | 'OTC' | 'NON_DRUG';

export type StockStatus =
  | 'QUARANTINE'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_TRANSIT'
  | 'BLOCKED'
  | 'RECALLED'
  | 'EXPIRED'
  | 'DAMAGED'
  | 'DESTROYED'
  | 'RETURNED_SUPPLIER';

// Medicine Types
export interface Medicine {
  id: string;
  code: string;
  registrationNumber?: string | null;
  name: string;
  category: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packagingSpec: string;
  unit: string;
  unitConversionNote?: string | null;
  barcode?: string | null;
  manufacturer: string;
  countryOfOrigin: string;
  description?: string;
  status: 'active' | 'inactive';
  saleCategory: MedicineSaleCategory;
  sellPrice: number;
  defaultCostPrice?: number | null;
  isPrescriptionRequired: boolean;
  unitConversions?: UnitConversion[];
  priceHistories?: MedicinePriceHistory[];
  inventoryTransactions?: any[];
  supplierId?: string | null;
  supplierName?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface UnitConversion {
  id: string;
  fromUnit: string;
  toUnit: string;
  conversionRate: number;
  notes?: string | null;
}

export interface MedicinePriceHistory {
  id: string;
  branchId?: string | null;
  channel: 'POS' | 'ONLINE' | 'WHOLESALE';
  price: number;
  priceProgram?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeReason?: string | null;
  changedBy?: string | null;
}

// Tồn kho theo ledger/status line
export interface InventoryLine {
  id: string;
  medicineId: string;
  medicineName: string;
  branchId: string;
  branchName: string;
  locationId: string;
  locationName: string;
  medicineCode: string;
  registrationNumber?: string | null;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packagingSpec: string;
  lotNumber: string;
  manufacturingDate?: string | null;
  expiryDate: string;
  quantity: number;
  stockStatus: StockStatus;
  stockStatusLabel: string;
  lotStatus: StockStatus;
  onHand: number;
  availableStock: number;
  reserved: number;
  quarantine: number;
  blocked: number;
  recalled: number;
  expired: number;
  damaged: number;
  inTransit: number;
  costPrice: number;
  sellPrice: number;
  receivedDate: string;
  supplierName: string;
  inboundDocumentNo?: string | null;
  saleCategory: MedicineSaleCategory;
  isPrescriptionRequired: boolean;
  unit: string;
  unitConversions?: UnitConversion[];
  barcode?: string | null;
}

export type MedicineLot = InventoryLine;

// Lịch sử nhập/xuất/chuyển kho
export interface StockMovement {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  branchId: string;
  branchName: string;
  movementType: 'in' | 'out' | 'return' | 'transfer_in' | 'transfer_out' | 'adjustment';
  quantity: number;
  referenceType: 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'return';
  referenceId: string;
  referenceNumber: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
}

// Lịch sử nhập hàng theo thuốc
export interface MedicinePurchaseHistory {
  id: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  receivedDate: string;
  lotNumber: string;
  expiryDate: string;
  quantityOrdered: number;
  quantityReceived: number;
  costPrice: number;
  totalCost: number;
  branchId: string;
  branchName: string;
}

// Supplier Types
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
}

// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  branchId: string;
  orderDate: string;
  expectedDate?: string;
  status: 'draft' | 'pending' | 'received' | 'cancelled';
  totalAmount: number;
  items: PurchaseOrderItem[];
  notes?: string;
}

export interface PurchaseOrderItem {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
  lotNumber?: string;
  expiryDate?: string;
}

// Sales Types
export interface SalesOrder {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId?: string;
  cashierId: string;
  cashierName: string;
  saleDate: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  status: 'completed' | 'cancelled' | 'returned';
  prescriptionId?: string;
}

export interface SalesOrderItem {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

// Customer Types
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  membershipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  joinDate: string;
}

// Prescription Types
export interface Prescription {
  id: string;
  prescriptionNumber: string;
  customerId?: string;
  doctorName: string;
  hospitalName?: string;
  prescriptionDate: string;
  imageUrl?: string;
  status: 'pending' | 'verified' | 'dispensed';
  verifiedBy?: string;
  verifiedDate?: string;
  items: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  notes?: string;
}

// Branch Types
export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
}

// Transfer Types
export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  items: StockTransferItem[];
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
}

export interface StockTransferItem {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  quantity: number;
  receivedQuantity?: number;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

// Pagination Types
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  size: number;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  value: number;
  status: 'active' | 'inactive' | 'expired';
  type: string;
  description: string;
  usages: number;
  totalSavings: number;
  targetBranch: string;
  config?: string;
  startDate?: string | null;
  endDate?: string | null;
  targetGroup: string;
  createdAt: string;
  updatedAt: string;
}
