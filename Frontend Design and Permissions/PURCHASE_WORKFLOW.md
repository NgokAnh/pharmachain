# Quy trình Nhập hàng

## Tổng quan

Quy trình nhập hàng được thiết kế với sự phân quyền rõ ràng giữa các vai trò để đảm bảo kiểm soát chặt chẽ việc mua hàng và chi phí.

## Quy trình Nhập hàng

1. **Tạo đơn nhập hàng** (Status: `draft` hoặc `pending`)
2. **Phê duyệt đơn** (Status: `approved`) 
3. **Nhận hàng** (Status: `received`)

## Phân quyền theo vai trò

### 1. ROLE_BRANCH_MANAGER (Quản lý chi nhánh)

**Quyền hạn:**
- `purchasing.create` - Tạo đơn nhập hàng cho chi nhánh
- `purchasing.receive` - Nhận hàng vào kho
- `supplier.view` - **CHỈ XEM** nhà cung cấp (KHÔNG được thêm/sửa)

**Trách nhiệm:**
- Tạo đơn nhập hàng khi chi nhánh cần bổ sung thuốc
- Gửi đơn cho Chain Manager phê duyệt
- Nhận hàng và xác nhận khi hàng về

**Ràng buộc:**
- Chỉ tạo đơn cho chi nhánh mình quản lý
- KHÔNG có quyền thêm hoặc sửa thông tin nhà cung cấp
- Phải chờ Chain Manager duyệt mới được đặt hàng

### 2. ROLE_CHAIN_MANAGER (Quản lý chuỗi)

**Quyền hạn:**
- `purchasing.create` - Tạo đơn nhập hàng
- `purchasing.approve` - Phê duyệt/từ chối đơn nhập hàng
- `purchasing.receive` - Nhận hàng
- `supplier.create` - Thêm và sửa nhà cung cấp

**Trách nhiệm:**
- Xem xét và phê duyệt đơn nhập hàng từ các chi nhánh
- Đảm bảo đơn hàng hợp lý về giá cả và số lượng
- Quản lý danh sách nhà cung cấp (thêm mới, cập nhật)

**Ràng buộc:**
- Chỉ phê duyệt đơn ở trạng thái `pending`
- Có thể hủy hoặc từ chối đơn nếu không hợp lý

### 3. ROLE_WAREHOUSE_STAFF (Nhân viên kho)

**Quyền hạn:**
- `purchasing.create` - Tạo đơn nhập hàng
- `purchasing.receive` - Nhận hàng vào kho
- `supplier.view` - Xem nhà cung cấp

**Trách nhiệm:**
- Tạo đơn nhập hàng khi cần bổ sung
- Nhận hàng và kiểm tra số lượng, chất lượng
- **KHÔNG** có quyền thêm/sửa nhà cung cấp

### 4. ROLE_ADMIN (Quản trị viên)

**Quyền hạn:**
- `purchasing.approve` - Phê duyệt đơn (quyền giám sát)
- `purchasing.receive` - Xem thông tin nhận hàng
- `supplier.view` - Xem nhà cung cấp
- `supplier.create` - Thêm và sửa nhà cung cấp

**Trách nhiệm:**
- Giám sát quy trình nhập hàng
- Phê duyệt đơn nhập hàng
- Quản lý danh sách nhà cung cấp (thêm mới, cập nhật)
- **KHÔNG** tạo đơn nhập hàng mới

## Luồng hoạt động chi tiết

### Bước 1: Tạo đơn nhập hàng (ROLE_BRANCH_MANAGER)

```
Branch Manager kiểm tra tồn kho chi nhánh
→ Thấy cần bổ sung thuốc
→ Vào menu "Nhập hàng" → "Tạo đơn nhập hàng"
→ Chọn nhà cung cấp (từ danh sách có sẵn)
→ Thêm các sản phẩm cần nhập
→ Nhập số lượng, đơn giá
→ Lưu đơn → Trạng thái: pending
→ Đơn tự động gửi cho Chain Manager
```

**Lưu ý:**
- Branch Manager KHÔNG thể tự thêm nhà cung cấp mới
- Nếu cần nhà cung cấp mới → Liên hệ Chain Manager

### Bước 2: Phê duyệt đơn (ROLE_CHAIN_MANAGER)

```
Chain Manager xem danh sách đơn chờ duyệt
→ Kiểm tra thông tin đơn hàng
→ Xác nhận giá cả hợp lý
→ Xác nhận nhà cung cấp uy tín
→ Xác nhận số lượng phù hợp với nhu cầu
→ Phê duyệt hoặc Từ chối
→ Nếu phê duyệt: Trạng thái → approved
→ Chi nhánh có thể liên hệ nhà cung cấp đặt hàng
```

**Tiêu chí phê duyệt:**
- Giá cả hợp lý so với thị trường
- Số lượng phù hợp với nhu cầu thực tế
- Nhà cung cấp có uy tín
- Không trùng lặp với đơn hàng khác

### Bước 3: Đặt hàng và chờ nhận

```
Sau khi được duyệt
→ Branch Manager liên hệ nhà cung cấp
→ Xác nhận đặt hàng theo đơn đã duyệt
→ Chờ hàng về
```

### Bước 4: Nhận hàng (ROLE_BRANCH_MANAGER hoặc ROLE_WAREHOUSE_STAFF)

```
Hàng về chi nhánh
→ Nhân viên kho hoặc Branch Manager vào đơn
→ Kiểm tra hàng hóa
→ Xác nhận số lượng thực tế nhận được
→ Nhập số lô, hạn sử dụng
→ Xác nhận nhận hàng
→ Trạng thái: received
→ Hệ thống tự động cập nhật tồn kho
```

## Quyền quản lý nhà cung cấp

### Ai có quyền thêm/sửa nhà cung cấp?

**Có quyền:**
- ✅ ROLE_ADMIN - Quản lý tập trung nhà cung cấp
- ✅ ROLE_CHAIN_MANAGER - Quản lý chuỗi cung ứng

**KHÔNG có quyền:**
- ❌ ROLE_BRANCH_MANAGER - Chỉ xem danh sách, không thêm/sửa
- ❌ ROLE_WAREHOUSE_STAFF - Chỉ xem danh sách, không thêm/sửa
- ❌ ROLE_PHARMACIST - Chỉ xem

### Lý do phân quyền này:

1. **Admin**: Quản lý tập trung hệ thống, có quyền kiểm soát danh sách nhà cung cấp toàn chuỗi
2. **Chain Manager**: Quản lý toàn bộ chuỗi cung ứng, có quyền quyết định nhà cung cấp chiến lược
3. **Branch Manager**: Tập trung vào quản lý chi nhánh, không cần can thiệp vào việc chọn nhà cung cấp
4. **Warehouse Staff**: Chỉ thực hiện nghiệp vụ nhận hàng, không tham gia quyết định nhà cung cấp

## Kịch bản thực tế

### Kịch bản 1: Nhập hàng bình thường

1. **Branch Manager (Chi nhánh Quận 1):**
   - Username: `branch_manager`
   - Tạo đơn nhập 500 hộp Paracetamol
   - Chọn nhà cung cấp: "Công ty TNHH Dược phẩm ABC"
   - Lưu đơn

2. **Chain Manager:**
   - Username: `chain_manager`
   - Xem đơn chờ duyệt
   - Kiểm tra giá: 15,000đ/hộp (hợp lý)
   - Phê duyệt đơn

3. **Branch Manager:**
   - Liên hệ nhà cung cấp đặt hàng
   - Hàng về sau 3 ngày
   - Nhận hàng và xác nhận trong hệ thống

### Kịch bản 2: Cần nhà cung cấp mới

1. **Branch Manager:**
   - Muốn nhập từ nhà cung cấp mới
   - KHÔNG thể tự thêm
   - Liên hệ Chain Manager hoặc Admin

2. **Admin hoặc Chain Manager:**
   - Đánh giá nhà cung cấp mới
   - Kiểm tra uy tín, giá cả
   - Thêm vào hệ thống nếu phù hợp
   - Thông báo Branch Manager

3. **Branch Manager:**
   - Tạo đơn với nhà cung cấp mới
   - Tiếp tục quy trình bình thường

### Kịch bản 3: Đơn không hợp lý

1. **Branch Manager:**
   - Tạo đơn nhập 10,000 hộp thuốc
   - Số lượng quá lớn so với nhu cầu

2. **Chain Manager:**
   - Xem đơn
   - Nhận thấy số lượng bất thường
   - **Từ chối** đơn với ghi chú: "Số lượng vượt quá nhu cầu thực tế"

3. **Branch Manager:**
   - Nhận thông báo đơn bị từ chối
   - Tạo lại đơn với số lượng hợp lý

## Lưu ý quan trọng

1. **Phân quyền rõ ràng**: Branch Manager tạo, Chain Manager duyệt
2. **Kiểm soát chi phí**: Mọi đơn hàng phải được phê duyệt
3. **Quản lý nhà cung cấp tập trung**: Tránh tình trạng mỗi chi nhánh tự thêm nhà cung cấp
4. **Minh bạch**: Mọi hành động đều được ghi log trong hệ thống

## So sánh quyền hạn

| Chức năng | Branch Manager | Chain Manager | Warehouse Staff | Admin |
|-----------|----------------|---------------|-----------------|-------|
| Xem nhà cung cấp | ✓ | ✓ | ✓ | ✓ |
| Thêm nhà cung cấp | ✗ | ✓ | ✗ | ✓ |
| Sửa nhà cung cấp | ✗ | ✓ | ✗ | ✓ |
| Tạo đơn nhập | ✓ | ✓ | ✓ | ✗ |
| Duyệt đơn nhập | ✗ | ✓ | ✗ | ✓ |
| Nhận hàng | ✓ | ✓ | ✓ | ✗ |
