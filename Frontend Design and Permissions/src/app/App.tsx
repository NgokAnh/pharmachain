import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { MedicineList } from '../pages/medicines/MedicineList';
import { MedicineDetail } from '../pages/medicines/MedicineDetail';
import { MedicineForm } from '../pages/medicines/MedicineForm';
import { CategoryList } from '../pages/medicines/CategoryList';
import { SupplierList } from '../pages/suppliers/SupplierList';
import { SupplierDetail } from '../pages/suppliers/SupplierDetail';
import { SupplierForm } from '../pages/suppliers/SupplierForm';
import { PurchaseList } from '../pages/purchases/PurchaseList';
import { PurchaseForm } from '../pages/purchases/PurchaseForm';
import { Inventory } from '../pages/inventory/Inventory';
import { InventoryCheckList } from '../pages/inventory/InventoryCheckList';
import { InventoryCheckForm } from '../pages/inventory/InventoryCheckForm';
import { InventoryCheckDetail } from '../pages/inventory/InventoryCheckDetail';
import { TransferList } from '../pages/transfers/TransferList';
import { TransferForm } from '../pages/transfers/TransferForm';
import { TransferDetail } from '../pages/transfers/TransferDetail';
import { WarehouseOperations } from '../pages/warehouse/WarehouseOperations';
import { POS } from '../pages/pos/POS';
import { InvoiceList } from '../pages/invoices/InvoiceList';
import { CustomerList } from '../pages/customers/CustomerList';
import { CustomerDetail } from '../pages/customers/CustomerDetail';
import { CustomerForm } from '../pages/customers/CustomerForm';
import { Reports } from '../pages/reports/Reports';
import { UserManagement } from '../pages/system/UserManagement';
import { UserForm } from '../pages/system/UserForm';
import { BranchManagement } from '../pages/system/BranchManagement';
import { AuditLog } from '../pages/audit/AuditLog';
import { PromotionList } from '../pages/promotions/PromotionList';
import { PromotionForm } from '../pages/promotions/PromotionForm';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route
                      path="/medicines"
                      element={
                        <ProtectedRoute permissions={['medicine.view']}>
                          <MedicineList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/medicines/new"
                      element={
                        <ProtectedRoute permissions={['medicine.create']}>
                          <MedicineForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/medicines/:id"
                      element={
                        <ProtectedRoute permissions={['medicine.view']}>
                          <MedicineDetail />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/medicines/:id/edit"
                      element={
                        <ProtectedRoute permissions={['medicine.update']}>
                          <MedicineForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/medicines/categories"
                      element={
                        <ProtectedRoute permissions={['medicine.category.manage']}>
                          <CategoryList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/suppliers"
                      element={
                        <ProtectedRoute permissions={['supplier.view']}>
                          <SupplierList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/suppliers/new"
                      element={
                        <ProtectedRoute permissions={['supplier.create']}>
                          <SupplierForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/suppliers/:id"
                      element={
                        <ProtectedRoute permissions={['supplier.view']}>
                          <SupplierDetail />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/suppliers/:id/edit"
                      element={
                        <ProtectedRoute permissions={['supplier.create']}>
                          <SupplierForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/purchases"
                      element={
                        <ProtectedRoute permissions={['purchasing.create', 'purchasing.receive']}>
                          <PurchaseList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/purchases/new"
                      element={
                        <ProtectedRoute permissions={['purchasing.create']}>
                          <PurchaseForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/inventory"
                      element={
                        <ProtectedRoute permissions={['inventory.view']}>
                          <Inventory />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/inventory/checks"
                      element={
                        <ProtectedRoute permissions={['inventory.stocktake', 'inventory.adjust']}>
                          <InventoryCheckList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/inventory/checks/new"
                      element={
                        <ProtectedRoute permissions={['inventory.stocktake']}>
                          <InventoryCheckForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/inventory/checks/:id"
                      element={
                        <ProtectedRoute permissions={['inventory.stocktake', 'inventory.adjust']}>
                          <InventoryCheckDetail />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/transfers"
                      element={
                        <ProtectedRoute permissions={['transfer.create', 'transfer.approve', 'transfer.ship', 'transfer.receive']}>
                          <TransferList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/transfers/new"
                      element={
                        <ProtectedRoute permissions={['transfer.create']}>
                          <TransferForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/transfers/:id"
                      element={
                        <ProtectedRoute permissions={['transfer.create', 'transfer.approve', 'transfer.ship', 'transfer.receive']}>
                          <TransferDetail />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/warehouse"
                      element={
                        <ProtectedRoute permissions={['transfer.ship']}>
                          <WarehouseOperations />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/pos"
                      element={
                        <ProtectedRoute permissions={['sales.create']}>
                          <POS />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/invoices"
                      element={
                        <ProtectedRoute permissions={['sales.view']}>
                          <InvoiceList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/customers"
                      element={
                        <ProtectedRoute permissions={['customer.view']}>
                          <CustomerList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/customers/new"
                      element={
                        <ProtectedRoute permissions={['customer.manage']}>
                          <CustomerForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/customers/:id"
                      element={
                        <ProtectedRoute permissions={['customer.view']}>
                          <CustomerDetail />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/customers/:id/edit"
                      element={
                        <ProtectedRoute permissions={['customer.manage']}>
                          <CustomerForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/promotions"
                      element={
                        <ProtectedRoute permissions={['promotion.view']}>
                          <PromotionList />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/promotions/new"
                      element={
                        <ProtectedRoute permissions={['promotion.manage']}>
                          <PromotionForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/promotions/:id/edit"
                      element={
                        <ProtectedRoute permissions={['promotion.manage']}>
                          <PromotionForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/reports"
                      element={
                        <ProtectedRoute permissions={['report.view_branch', 'report.view_chain']}>
                          <Reports />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/system"
                      element={
                        <ProtectedRoute permissions={['user.manage', 'role.manage']}>
                          <UserManagement />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/system/users/new"
                      element={
                        <ProtectedRoute permissions={['user.manage']}>
                          <UserForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/system/users/:id/edit"
                      element={
                        <ProtectedRoute permissions={['user.manage']}>
                          <UserForm />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/system/branches"
                      element={
                        <ProtectedRoute permissions={['branch.manage']}>
                          <BranchManagement />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/audit"
                      element={
                        <ProtectedRoute permissions={['audit.view']}>
                          <AuditLog />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}