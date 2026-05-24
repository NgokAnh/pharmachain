# Hướng dẫn sử dụng cho Admin

## Tổng quan

Tài khoản Admin có quyền truy cập toàn bộ hệ thống để quản lý và giám sát hoạt động của toàn bộ chuỗi nhà thuốc.

## Tài khoản Admin

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: ROLE_ADMIN

## Quyền hạn và Chức năng

### 1. Tổng quan (Dashboard)
- Xem tổng quan hoạt động toàn hệ thống
- Thống kê tổng hợp từ tất cả chi nhánh

### 2. Danh mục thuốc
**Quyền hạn:**
- `medicine.view` - Xem danh sách thuốc
- `medicine.create` - Thêm thuốc mới
- `medicine.update` - Sửa thông tin thuốc
- `medicine.category.manage` - Quản lý nhóm thuốc

**Chức năng:**
- Xem, thêm, sửa thông tin thuốc
- Quản lý danh mục và phân loại thuốc
- Quản lý nhóm thuốc (menu riêng)

### 3. Nhóm thuốc
**Quyền hạn:**
- `medicine.category.manage` - Quản lý nhóm thuốc

**Chức năng:**
- Tạo, sửa, xóa nhóm thuốc
- Phân loại thuốc theo nhóm
- Xem số lượng thuốc trong mỗi nhóm

**Lưu ý:**
- Không thể xóa nhóm đang có thuốc
- Mỗi nhóm có mã riêng (CAT001, CAT002...)

### 4. Nhà cung cấp
**Quyền hạn:**
- `supplier.view` - Xem danh sách nhà cung cấp
- `supplier.create` - Thêm và sửa nhà cung cấp

**Chức năng:**
- Xem danh sách nhà cung cấp
- Thêm nhà cung cấp mới
- Sửa thông tin nhà cung cấp
- Xem chi tiết thông tin nhà cung cấp

**Lưu ý:**
- Admin quản lý tập trung danh sách nhà cung cấp
- Chỉ Admin và Chain Manager có quyền thêm/sửa nhà cung cấp
- Branch Manager và Warehouse Staff chỉ xem, không thêm/sửa

### 5. Nhập hàng
**Quyền hạn:**
- `purchasing.approve` - Phê duyệt đơn nhập hàng
- `purchasing.receive` - Xem thông tin nhận hàng

**Chức năng:**
- Xem danh sách tất cả đơn nhập hàng
- Phê duyệt hoặc từ chối đơn nhập hàng
- Xem chi tiết đơn hàng và quá trình nhận hàng
- **KHÔNG** thể tạo đơn nhập hàng mới

**Quy trình:**
1. Branch Manager tạo đơn nhập hàng
2. **Admin hoặc Chain Manager phê duyệt**
3. Chi nhánh đặt hàng với nhà cung cấp
4. Warehouse Staff/Branch Manager nhận hàng

**Lưu ý:**
- Nút "Tạo đơn nhập hàng" không hiển thị với Admin
- Admin có vai trò giám sát và phê duyệt, không tạo đơn trực tiếp

### 6. Tồn kho
**Quyền hạn:**
- `inventory.view` - Xem tồn kho
- `inventory.adjust` - Điều chỉnh tồn kho

**Chức năng:**
- Xem tồn kho theo từng chi nhánh
- Lọc và tìm kiếm theo chi nhánh
- Xem chi tiết tồn kho theo lô
- Điều chỉnh tồn kho khi cần

### 7. Chuyển kho
**Quyền hạn:**
- `transfer.create` - Tạo phiếu chuyển
- `transfer.approve` - Phê duyệt phiếu
- `transfer.receive` - Nhận hàng

**Chức năng:**
- Xem tất cả phiếu chuyển kho
- Tạo phiếu chuyển kho giữa các chi nhánh
- Phê duyệt hoặc từ chối phiếu
- Xem chi tiết lộ trình vận chuyển
- Xác nhận nhận hàng

**Lưu ý:**
- Admin có quyền tạo, phê duyệt và theo dõi chuyển kho
- KHÔNG có quyền xuất kho (chức năng này dành cho Warehouse Staff)

### 8. Đơn thuốc
**Quyền hạn:**
- `prescription.verify` - Xác minh đơn thuốc

**Chức năng:**
- Xem danh sách đơn thuốc
- Xác minh và duyệt đơn thuốc
- Xem lịch sử đơn thuốc

### 9. Khách hàng
**Quyền hạn:**
- `customer.view` - Xem thông tin khách hàng

**Chức năng:**
- Xem danh sách khách hàng
- Xem lịch sử mua hàng
- Quản lý thông tin khách hàng
- Xem điểm tích lũy

### 10. Báo cáo
**Quyền hạn:**
- `report.view_branch` - Xem báo cáo chi nhánh
- `report.view_chain` - Xem báo cáo toàn chuỗi

**Chức năng:**
- Xem báo cáo tổng hợp toàn hệ thống
- Báo cáo theo từng chi nhánh
- Xuất báo cáo
- Phân tích dữ liệu

### 11. Hệ thống
**Quyền hạn:**
- `user.manage` - Quản lý người dùng
- `role.manage` - Quản lý vai trò

**Chức năng:**
- Tạo, sửa, xóa tài khoản người dùng
- Phân quyền cho người dùng
- Quản lý vai trò trong hệ thống
- Cấu hình hệ thống

### 12. Nhật ký
**Quyền hạn:**
- `audit.view` - Xem nhật ký hệ thống

**Chức năng:**
- Xem lịch sử thao tác của người dùng
- Theo dõi các hoạt động trong hệ thống
- Kiểm tra an ninh và tuân thủ

## Các chức năng KHÔNG có với Admin

### 1. Xuất nhập kho
- Menu "Xuất nhập kho" không hiển thị với Admin
- Chức năng này dành riêng cho Warehouse Staff

### 2. Bán hàng (POS)
- Menu "Bán hàng" không hiển thị với Admin
- Chức năng này dành cho Pharmacist và Branch Manager

### 3. Thêm nhà cung cấp
- Không thể tạo nhà cung cấp mới
- Chỉ xem và quản lý nhà cung cấp hiện có

### 3. Tạo đơn nhập hàng
- Không thể tạo đơn nhập hàng mới
- Chỉ xem, duyệt và quản lý đơn hiện có

## Quy trình làm việc

### Quản lý danh mục thuốc
1. Tạo nhóm thuốc trong menu "Nhóm thuốc"
2. Thêm thuốc mới trong menu "Danh mục thuốc"
3. Phân loại thuốc vào nhóm phù hợp

### Giám sát và duyệt nhập hàng
1. Xem danh sách đơn nhập hàng
2. Phê duyệt hoặc từ chối đơn chờ duyệt
3. Kiểm tra giá cả và số lượng hợp lý
4. Theo dõi quá trình nhận hàng

### Quản lý chuyển kho
1. Xem yêu cầu chuyển kho từ các chi nhánh
2. Phê duyệt hoặc từ chối yêu cầu
3. Theo dõi quá trình vận chuyển
4. Kiểm tra tình trạng nhận hàng

### Quản lý tồn kho
1. Xem tồn kho theo từng chi nhánh
2. Phân tích hàng tồn kho
3. Điều chỉnh khi cần thiết
4. Theo dõi hàng sắp hết hạn

## Lưu ý quan trọng

1. **Phân quyền rõ ràng**: Admin có quyền cao nhất nhưng một số chức năng nghiệp vụ được giao cho các role chuyên môn
2. **Không tạo đơn trực tiếp**: Admin giám sát, các đơn hàng và giao dịch do chi nhánh thực hiện
3. **Tập trung quản lý**: Admin tập trung vào quản lý danh mục, phê duyệt, giám sát và báo cáo
4. **Bảo mật**: Thường xuyên kiểm tra nhật ký hệ thống để đảm bảo an toàn

## So sánh với các Role khác

| Chức năng | Admin | Chain Manager | Branch Manager | Warehouse Staff | Pharmacist |
|-----------|-------|---------------|----------------|-----------------|------------|
| Quản lý nhóm thuốc | ✓ | ✓ | ✗ | ✗ | ✗ |
| Thêm/sửa nhà cung cấp | ✓ | ✓ | ✗ | ✗ | ✗ |
| Tạo đơn nhập hàng | ✗ | ✓ | ✓ | ✓ | ✗ |
| Duyệt đơn nhập hàng | ✓ | ✓ | ✗ | ✗ | ✗ |
| Phê duyệt chuyển kho | ✓ | ✓ | ✗ | ✗ | ✗ |
| Xuất kho | ✗ | ✗ | ✗ | ✓ | ✗ |
| Bán hàng | ✗ | ✗ | ✓ | ✗ | ✓ |
| Quản lý user | ✓ | ✗ | ✗ | ✗ | ✗ |
| Xem báo cáo toàn chuỗi | ✓ | ✓ | ✗ | ✗ | ✗ |
| Xác minh đơn thuốc | ✓ | ✗ | ✓ | ✗ | ✓ |
