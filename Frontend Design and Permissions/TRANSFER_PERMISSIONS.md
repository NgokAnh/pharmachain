# Hệ thống phân quyền chuyển kho

## Tổng quan

Hệ thống chuyển kho được thiết kế với quy trình phân quyền rõ ràng giữa các vai trò khác nhau trong hệ thống nhà thuốc.

## Quy trình chuyển kho

1. **Tạo phiếu chuyển** (Status: `pending`)
2. **Phê duyệt phiếu** (Status: `approved`)
3. **Xuất kho & vận chuyển** (Status: `in_transit`)
4. **Nhận hàng & nhập kho** (Status: `received`)

## Phân quyền theo vai trò

### 1. ROLE_BRANCH_MANAGER (Quản lý chi nhánh)

**Quyền hạn:**
- `transfer.create` - Tạo phiếu chuyển kho từ chi nhánh mình
- `transfer.receive` - Xác nhận nhận hàng tại chi nhánh mình

**Trách nhiệm:**
- Tạo phiếu chuyển kho khi chi nhánh cần điều chuyển hàng
- Xác nhận số lượng hàng nhận được khi là chi nhánh đích

**Ràng buộc:**
- Chỉ có thể tạo phiếu chuyển **từ** chi nhánh mình quản lý
- Chỉ có thể nhận hàng **tại** chi nhánh mình quản lý

### 2. ROLE_CHAIN_MANAGER (Quản lý chuỗi)

**Quyền hạn:**
- `transfer.approve` - Phê duyệt/từ chối phiếu chuyển kho

**Trách nhiệm:**
- Xem xét và phê duyệt các yêu cầu chuyển kho giữa các chi nhánh
- Đảm bảo việc chuyển kho hợp lý và cân đối tồn kho

**Ràng buộc:**
- Chỉ có thể phê duyệt phiếu ở trạng thái `pending`
- Có thể hủy phiếu ở trạng thái `pending` hoặc `approved`

### 3. ROLE_WAREHOUSE_STAFF (Nhân viên kho)

**Quyền hạn:**
- `transfer.ship` - Thực hiện xuất kho và bắt đầu vận chuyển

**Trách nhiệm:**
- Xuất hàng theo phiếu chuyển đã được phê duyệt
- Lấy hàng theo đúng số lô và số lượng yêu cầu
- Quét mã vạch để kiểm tra sản phẩm
- Đóng gói và giao hàng cho vận chuyển

**Giao diện làm việc:**
- Truy cập trang "Xuất nhập kho" (`/warehouse`)
- Tab "Xuất kho": Xem danh sách phiếu cần xuất từ chi nhánh mình
- Tab "Nhập kho": Xem danh sách hàng đang về chi nhánh mình
- Chức năng quét mã vạch để xác nhận sản phẩm
- Nhập số lượng thực tế đã lấy cho từng sản phẩm

**Ràng buộc:**
- Chỉ có thể xuất kho **từ** chi nhánh mình làm việc
- Chỉ có thể xử lý phiếu ở trạng thái `approved`
- Phải lấy đủ số lượng tất cả sản phẩm mới được xác nhận xuất kho

### 4. ROLE_ADMIN (Quản trị viên)

**Quyền hạn:**
- Có tất cả các quyền trên: `transfer.create`, `transfer.approve`, `transfer.ship`, `transfer.receive`

**Trách nhiệm:**
- Toàn quyền quản lý hệ thống chuyển kho
- Xử lý các trường hợp đặc biệt

## Luồng hoạt động chi tiết

### Bước 1: Tạo phiếu chuyển (ROLE_BRANCH_MANAGER)

```
Chi nhánh A cần chuyển 100 hộp Paracetamol sang Chi nhánh B
→ Quản lý Chi nhánh A tạo phiếu chuyển
→ Trạng thái: pending
```

### Bước 2: Phê duyệt phiếu (ROLE_CHAIN_MANAGER)

```
Quản lý chuỗi xem xét phiếu
→ Kiểm tra tồn kho Chi nhánh A
→ Kiểm tra nhu cầu Chi nhánh B
→ Phê duyệt hoặc từ chối
→ Nếu phê duyệt: Trạng thái → approved
```

### Bước 3: Xuất kho (ROLE_WAREHOUSE_STAFF - Chi nhánh A)

```
Nhân viên kho Chi nhánh A vào trang "Xuất nhập kho"
→ Chọn tab "Xuất kho"
→ Xem danh sách phiếu đã duyệt cần xuất từ chi nhánh A
→ Chọn "Lấy hàng" cho phiếu cần xử lý
→ Bật chế độ "Quét mã"
→ Quét mã vạch hoặc nhập tên từng sản phẩm
→ Hệ thống tự động tăng số lượng đã lấy
→ Hoặc nhập số lượng thủ công cho từng item
→ Khi đã lấy đủ hết, nhấn "Xác nhận xuất kho"
→ Trạng thái phiếu: in_transit
→ Hệ thống tự động giảm tồn kho Chi nhánh A
```

### Bước 4: Nhận hàng (ROLE_BRANCH_MANAGER - Chi nhánh B)

```
Quản lý Chi nhánh B nhận hàng
→ Kiểm tra số lượng thực tế
→ Nhập số lượng đã nhận (có thể khác yêu cầu)
→ Xác nhận nhận hàng
→ Trạng thái: received
→ Hệ thống tự động tăng tồn kho Chi nhánh B
```

## Ví dụ thực tế

### Tài khoản test:

1. **branch_manager** (password: branch123)
   - Chi nhánh: Quận 1 (br-1)
   - Có thể: Tạo phiếu từ Quận 1, Nhận hàng tại Quận 1

2. **branch_manager2** (password: branch123)
   - Chi nhánh: Hai Bà Trưng (br-3)
   - Có thể: Tạo phiếu từ Hai Bà Trưng, Nhận hàng tại Hai Bà Trưng

3. **chain_manager** (password: manager123)
   - Có thể: Phê duyệt tất cả phiếu chuyển

4. **warehouse** (password: warehouse123)
   - Chi nhánh: Quận 1 (br-1)
   - Có thể: Xuất kho từ Quận 1

5. **warehouse2** (password: warehouse123)
   - Chi nhánh: Hai Bà Trưng (br-3)
   - Có thể: Xuất kho từ Hai Bà Trưng

### Kịch bản test:

1. **Đăng nhập `branch_manager` (Quận 1)**
   - Username: `branch_manager` / Password: `branch123`
   - Vào menu "Chuyển kho" → "Tạo phiếu chuyển"
   - Chi nhánh gửi: Quận 1 (tự động, không đổi được)
   - Chọn đến chi nhánh: Hai Bà Trưng
   - Thêm sản phẩm, nhập số lượng
   - Lưu phiếu → Trạng thái: `pending`

2. **Đăng nhập `chain_manager`**
   - Username: `chain_manager` / Password: `manager123`
   - Vào menu "Chuyển kho"
   - Xem phiếu vừa tạo (trạng thái "Chờ duyệt")
   - Click vào để xem chi tiết
   - Nhấn "Phê duyệt" → Toast hiển thị → Quay về danh sách
   - Trạng thái: `approved`

3. **Đăng nhập `warehouse` (Quận 1)**
   - Username: `warehouse` / Password: `warehouse123`
   - Vào menu "Xuất nhập kho"
   - Tab "Xuất kho" → Thấy phiếu đã duyệt
   - Nhấn "Lấy hàng"
   - Bật "Quét mã" hoặc nhập số lượng thủ công
   - Đảm bảo đủ số lượng tất cả sản phẩm
   - "Xác nhận xuất kho" → Toast hiển thị → Quay về danh sách
   - Trạng thái: `in_transit`

4. **Đăng nhập `branch_manager2` (Hai Bà Trưng)**
   - Username: `branch_manager2` / Password: `branch123`
   - Vào menu "Chuyển kho"
   - Xem phiếu đang vận chuyển
   - Click vào để xem chi tiết
   - Nhập số lượng thực tế nhận được
   - "Xác nhận nhận hàng" → Toast hiển thị → Quay về danh sách
   - Trạng thái: `received`

## Lưu ý bảo mật

- Người dùng chỉ nhìn thấy các nút hành động mà họ có quyền thực hiện
- Hệ thống kiểm tra permissions ở cả frontend và backend
- Mỗi hành động phải kiểm tra cả quyền hạn và chi nhánh phù hợp
- Không cho phép bypass quy trình (ví dụ: không thể nhận hàng trước khi xuất kho)
