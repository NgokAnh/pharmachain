# Tổng hợp Phân quyền Hệ thống

## Bảng Phân quyền Tổng hợp

| Permission | Admin | Chain Manager | Branch Manager | Warehouse Staff | Pharmacist |
|-----------|-------|---------------|----------------|-----------------|------------|
| **DANH MỤC THUỐC** |
| medicine.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| medicine.create | ✓ | ✓ | ✗ | ✗ | ✗ |
| medicine.update | ✓ | ✓ | ✗ | ✗ | ✗ |
| medicine.category.manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| **NHÀ CUNG CẤP** |
| supplier.view | ✓ | ✓ | ✓ | ✓ | ✗ |
| supplier.create | ✓ | ✓ | ✗ | ✗ | ✗ |
| **NHẬP HÀNG** |
| purchasing.create | ✗ | ✓ | ✓ | ✓ | ✗ |
| purchasing.approve | ✓ | ✓ | ✗ | ✗ | ✗ |
| purchasing.receive | ✓ | ✓ | ✓ | ✓ | ✗ |
| **TỒN KHO** |
| inventory.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory.adjust | ✓ | ✗ | ✓ | ✓ | ✗ |
| **CHUYỂN KHO** |
| transfer.create | ✓ | ✗ | ✓ | ✗ | ✗ |
| transfer.approve | ✓ | ✓ | ✗ | ✗ | ✗ |
| transfer.ship | ✗ | ✗ | ✗ | ✓ | ✗ |
| transfer.receive | ✓ | ✗ | ✓ | ✗ | ✗ |
| **BÁN HÀNG** |
| sales.create | ✗ | ✗ | ✓ | ✗ | ✓ |
| sales.cancel | ✗ | ✗ | ✓ | ✗ | ✗ |
| **ĐơN THUỐC** |
| prescription.verify | ✓ | ✗ | ✓ | ✗ | ✓ |
| **KHÁCH HÀNG** |
| customer.view | ✓ | ✗ | ✓ | ✗ | ✓ |
| **BÁO CÁO** |
| report.view_branch | ✓ | ✓ | ✓ | ✗ | ✗ |
| report.view_chain | ✓ | ✓ | ✗ | ✗ | ✗ |
| **HỆ THỐNG** |
| user.manage | ✓ | ✗ | ✗ | ✗ | ✗ |
| role.manage | ✓ | ✗ | ✗ | ✗ | ✗ |
| audit.view | ✓ | ✓ | ✗ | ✗ | ✗ |

## Menu Hiển thị Theo Role

### ROLE_ADMIN
1. ✅ Tổng quan
2. ✅ Danh mục thuốc
3. ✅ Nhóm thuốc
4. ✅ Nhà cung cấp (có nút Thêm)
5. ✅ Nhập hàng (chỉ xem & duyệt)
6. ✅ Tồn kho
7. ✅ Chuyển kho
8. ✅ Đơn thuốc
9. ✅ Khách hàng
10. ✅ Báo cáo
11. ✅ Hệ thống
12. ✅ Nhật ký

**KHÔNG hiển thị:**
- ❌ Xuất nhập kho
- ❌ Bán hàng

### ROLE_CHAIN_MANAGER
1. ✅ Tổng quan
2. ✅ Danh mục thuốc
3. ✅ Nhóm thuốc
4. ✅ Nhà cung cấp (có nút Thêm)
5. ✅ Nhập hàng (có nút Tạo đơn)
6. ✅ Tồn kho
7. ✅ Chuyển kho (chỉ duyệt)
8. ✅ Báo cáo
9. ✅ Nhật ký

**KHÔNG hiển thị:**
- ❌ Xuất nhập kho
- ❌ Bán hàng
- ❌ Đơn thuốc
- ❌ Khách hàng
- ❌ Hệ thống

### ROLE_BRANCH_MANAGER
1. ✅ Tổng quan
2. ✅ Danh mục thuốc (chỉ xem)
3. ✅ Nhà cung cấp (chỉ xem, KHÔNG có nút Thêm)
4. ✅ Nhập hàng (có nút Tạo đơn)
5. ✅ Tồn kho
6. ✅ Chuyển kho (tạo & nhận)
7. ✅ Bán hàng
8. ✅ Đơn thuốc
9. ✅ Khách hàng
10. ✅ Báo cáo (chỉ chi nhánh)

**KHÔNG hiển thị:**
- ❌ Nhóm thuốc
- ❌ Xuất nhập kho
- ❌ Hệ thống
- ❌ Nhật ký

### ROLE_WAREHOUSE_STAFF
1. ✅ Tổng quan
2. ✅ Danh mục thuốc (chỉ xem)
3. ✅ Nhà cung cấp (chỉ xem, KHÔNG có nút Thêm)
4. ✅ Nhập hàng (có nút Tạo đơn)
5. ✅ Tồn kho
6. ✅ Xuất nhập kho (chuyên biệt)

**KHÔNG hiển thị:**
- ❌ Nhóm thuốc
- ❌ Chuyển kho (chỉ xuất nhập, không quản lý)
- ❌ Bán hàng
- ❌ Đơn thuốc
- ❌ Khách hàng
- ❌ Báo cáo
- ❌ Hệ thống
- ❌ Nhật ký

### ROLE_PHARMACIST
1. ✅ Tổng quan
2. ✅ Danh mục thuốc (chỉ xem)
3. ✅ Tồn kho (chỉ xem)
4. ✅ Bán hàng
5. ✅ Đơn thuốc
6. ✅ Khách hàng

**KHÔNG hiển thị:**
- ❌ Nhóm thuốc
- ❌ Nhà cung cấp
- ❌ Nhập hàng
- ❌ Chuyển kho
- ❌ Xuất nhập kho
- ❌ Báo cáo
- ❌ Hệ thống
- ❌ Nhật ký

## Quy trình Chính

### Quy trình Nhập hàng
1. **Branch Manager** tạo đơn → `pending`
2. **Chain Manager hoặc Admin** duyệt → `approved`
3. Chi nhánh đặt hàng với nhà cung cấp
4. **Branch Manager hoặc Warehouse Staff** nhận hàng → `received`

### Quy trình Chuyển kho
1. **Branch Manager** (chi nhánh A) tạo phiếu → `pending`
2. **Chain Manager hoặc Admin** phê duyệt → `approved`
3. **Warehouse Staff** (chi nhánh A) xuất kho → `in_transit`
4. **Branch Manager** (chi nhánh B) nhận hàng → `received`

## Tài khoản Test

| Username | Password | Role | Chi nhánh |
|----------|----------|------|-----------|
| admin | admin123 | ROLE_ADMIN | - |
| chain_manager | manager123 | ROLE_CHAIN_MANAGER | - |
| branch_manager | branch123 | ROLE_BRANCH_MANAGER | Quận 1 (br-1) |
| branch_manager2 | branch123 | ROLE_BRANCH_MANAGER | Hai Bà Trưng (br-3) |
| warehouse | warehouse123 | ROLE_WAREHOUSE_STAFF | Quận 1 (br-1) |
| warehouse2 | warehouse123 | ROLE_WAREHOUSE_STAFF | Hai Bà Trưng (br-3) |
| pharmacist | pharm123 | ROLE_PHARMACIST | Quận 1 (br-1) |

## Điểm Chính Cần Nhớ

### Nhà cung cấp
- ✅ **Có quyền thêm/sửa:** Admin, Chain Manager
- ❌ **Chỉ xem:** Branch Manager, Warehouse Staff
- ❌ **Không xem:** Pharmacist

### Đơn nhập hàng
- ✅ **Tạo đơn:** Branch Manager, Chain Manager, Warehouse Staff
- ✅ **Duyệt đơn:** Admin, Chain Manager
- ✅ **Nhận hàng:** Branch Manager, Chain Manager, Warehouse Staff
- ❌ **Không tham gia:** Pharmacist

### Chuyển kho
- ✅ **Tạo phiếu:** Branch Manager (chi nhánh gửi)
- ✅ **Duyệt phiếu:** Admin, Chain Manager
- ✅ **Xuất kho:** Warehouse Staff (chi nhánh gửi)
- ✅ **Nhận hàng:** Branch Manager (chi nhánh nhận)

### Bán hàng
- ✅ **Bán hàng:** Branch Manager, Pharmacist
- ❌ **Không tham gia:** Admin, Chain Manager, Warehouse Staff

## Tài liệu Chi tiết

1. **ADMIN_GUIDE.md** - Hướng dẫn chi tiết cho Admin
2. **PURCHASE_WORKFLOW.md** - Quy trình nhập hàng
3. **TRANSFER_PERMISSIONS.md** - Phân quyền chuyển kho
4. **PERMISSIONS_SUMMARY.md** - Tổng hợp phân quyền (file này)
