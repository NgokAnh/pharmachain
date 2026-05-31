# Hướng dẫn Cài đặt và Khởi chạy dự án PharmaChain trên Máy tính mới

Dự án **PharmaChain** là hệ thống quản lý chuỗi nhà thuốc thông minh bao gồm hai thành phần chính:
1. **Backend API**: Xây dựng bằng Node.js, Express, TypeScript, kết nối cơ sở dữ liệu qua Prisma ORM và hệ quản trị cơ sở dữ liệu PostgreSQL.
2. **Frontend App**: Xây dựng bằng React, phát triển với Vite, tối ưu hóa giao diện bằng TailwindCSS v4, Radix UI và Shadcn Theme.

---

## I. Yêu cầu Hệ thống (Prerequisites)

Trước khi bắt đầu cài đặt, hãy đảm bảo máy tính mới đã cài đặt đầy đủ các công cụ sau:
- **Node.js**: Phiên bản LTS mới nhất (Khuyến nghị **v18.x** hoặc **v20.x** trở lên).
- **npm** (thường tự động đi kèm khi bạn cài đặt Node.js).
- **PostgreSQL Database**:
  - Bạn có thể cài đặt PostgreSQL trực tiếp trên máy cục bộ (cổng mặc định `5432`).
  - Hoặc sử dụng Docker để chạy container PostgreSQL nhanh chóng.
  - Hoặc sử dụng một dịch vụ Cloud Database PostgreSQL miễn phí/trả phí như [Neon.tech](https://neon.tech/) hoặc [Supabase](https://supabase.com/) (Dự án hiện đang cấu hình mặc định dùng Neon.tech).

---

## II. Các bước Cài đặt và Cấu hình chi tiết

### Bước 1: Sao chép Mã nguồn (Clone Project)
Sao chép hoặc tải toàn bộ thư mục dự án này về máy tính mới.

---

### Bước 2: Cài đặt và Khởi chạy Backend

Thư mục backend đảm nhận vai trò cung cấp API, xác thực và lưu trữ dữ liệu.

1. **Di chuyển vào thư mục backend:**
   ```bash
   cd backend
   ```

2. **Cấu hình biến môi trường (`.env`):**
   Trong thư mục `backend/`, tạo một tệp tin mới tên là `.env` (nếu chưa có) và khai báo các thông tin sau:
   ```env
   # URL kết nối tới cơ sở dữ liệu PostgreSQL của bạn
   DATABASE_URL="postgresql://username:password@localhost:5432/pharmachain?schema=public"
   
   # Cổng hoạt động của API Backend
   PORT=3000
   
   # Khóa bí mật dùng ký tên mã xác thực JWT
   JWT_SECRET="pharmachain_super_secret_jwt_signature_key_2026"
   ```
   *(Lưu ý: Bạn hãy thay đổi `DATABASE_URL` cho đúng với cấu hình tài khoản PostgreSQL trên máy mới của bạn)*

3. **Cài đặt thư viện dependencies:**
   ```bash
   npm install
   ```

4. **Đồng bộ hóa Database & Nạp Dữ liệu mẫu (Seed):**
   Chạy lệnh sau để Prisma tự động phân tích schema và tạo các bảng cần thiết trong cơ sở dữ liệu PostgreSQL của bạn:
   ```bash
   npm run prisma:push
   ```
   
   Tiến hành nạp dữ liệu mẫu ban đầu (bao gồm các chi nhánh, vị trí kho, danh mục thuốc, nhà cung cấp, và tài khoản người dùng kiểm thử):
   ```bash
   npm run prisma:seed
   ```
   *Lưu ý an toàn dữ liệu:* 
   - Tệp seed hiện tại đã được nâng cấp cơ chế **an toàn chống ghi đè**. Nếu cơ sở dữ liệu của bạn **đã có tài khoản người dùng**, lệnh seed sẽ tự động bỏ qua (không ghi đè hay xóa dữ liệu hiện có).
   - Nếu bạn thực sự muốn dọn sạch toàn bộ database và nạp lại từ đầu dữ liệu mẫu, hãy dùng cờ `--force`:
     ```bash
     npm run prisma:seed -- --force
     ```

5. **Khởi động Backend ở chế độ phát triển (Development Mode):**
   ```bash
   npm run dev
   ```
   Backend sẽ bắt đầu lắng nghe tại cổng `3000` (địa chỉ `http://localhost:3000`). Bạn có thể mở trình duyệt truy cập: `http://localhost:3000/health` để kiểm tra trạng thái kết nối cơ sở dữ liệu.

---

### Bước 3: Cài đặt và Khởi chạy Frontend

Thư mục frontend chứa giao diện người dùng (React SPA).

1. **Mở một cửa sổ Terminal mới (giữ nguyên terminal chạy Backend) và di chuyển vào thư mục Frontend:**
   ```bash
   cd "Frontend Design and Permissions"
   ```

2. **Cài đặt thư viện dependencies:**
   ```bash
   npm install
   ```

3. **Khởi động Frontend ở chế độ phát triển:**
   ```bash
   npm run dev
   ```
   Vite sẽ biên dịch và chạy ứng dụng cục bộ tại địa chỉ mặc định `http://localhost:5173`. Hãy nhấp vào liên kết trên terminal hoặc mở trình duyệt web truy cập địa chỉ này để bắt đầu trải nghiệm giao diện quản trị chuỗi nhà thuốc.

---

## III. Danh sách Tài khoản Kiểm thử (Seeded Users)

Sau khi chạy tiến trình `npm run prisma:seed` ở Backend, cơ sở dữ liệu của bạn sẽ được trang bị sẵn các tài khoản kiểm thử tương ứng với nhiều phân quyền khác nhau. Hãy dùng các thông tin dưới đây để đăng nhập:

| Tên đăng nhập (Username) | Mật khẩu (Password) | Vai trò hệ thống (Role) | Mô tả quyền hạn hành động | Chi nhánh quản lý mặc định |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | `ROLE_ADMIN` | Toàn quyền kiểm soát và quản trị | Toàn hệ thống chuỗi |
| **`chain_manager`** | `manager123` | `ROLE_CHAIN_MANAGER` | Quản trị viên cấp cao của chuỗi | Toàn hệ thống chuỗi |
| **`branch_manager`** | `branch123` | `ROLE_BRANCH_MANAGER` | Quản lý cửa hàng / chi nhánh | Chi nhánh Quận 1 (`br-1`) |
| **`pharmacist`** | `pharm123` | `ROLE_PHARMACIST` | Dược sĩ (bán lẻ tại quầy, xuất đơn) | Chi nhánh Quận 1 (`br-1`) |
| **`warehouse`** | `warehouse123` | `ROLE_WAREHOUSE_STAFF` | Nhân viên kho (quản lý nhập/xuất) | Chi nhánh Quận 1 (`br-1`) |
| **`branch_manager3`** | `branch123` | `ROLE_BRANCH_MANAGER` | Quản lý cửa hàng / chi nhánh | Chi nhánh Quận 3 (`br-2`) |
| **`pharmacist3`** | `pharm123` | `ROLE_PHARMACIST` | Dược sĩ bán thuốc, kê đơn | Chi nhánh Quận 3 (`br-2`) |
| **`warehouse3`** | `warehouse123` | `ROLE_WAREHOUSE_STAFF` | Nhân viên kho, nhập/xuất kho | Chi nhánh Quận 3 (`br-2`) |
| **`branch_manager2`** | `branch123` | `ROLE_BRANCH_MANAGER` | Quản lý cửa hàng / chi nhánh | Chi nhánh Hải Bà Trưng (`br-3`) |
| **`pharmacist2`** | `pharm123` | `ROLE_PHARMACIST` | Dược sĩ bán thuốc, kê đơn | Chi nhánh Hải Bà Trưng (`br-3`) |
| **`warehouse2`** | `warehouse123` | `ROLE_WAREHOUSE_STAFF` | Nhân viên kho, nhập/xuất kho | Chi nhánh Hải Bà Trưng (`br-3`) |

---

## IV. Một số Lỗi thường gặp và Hướng giải quyết

1. **Lỗi: `Khong ket noi duoc co so du lieu...`**
   - Đảm bảo dịch vụ PostgreSQL trên máy tính mới đã khởi chạy thành công.
   - Kiểm tra độ chính xác của tài khoản và mật khẩu truy cập PostgreSQL trong tệp `.env` (`DATABASE_URL`).
   - Nếu kết nối tới Neon.tech bị chặn, hãy kiểm tra lại kết nối internet hoặc tường lửa của mạng nội bộ.

2. **Lỗi: `npm install` bị treo hoặc lỗi phiên bản**
   - Dự án sử dụng nhiều thư viện hiện đại như Vite v6 và React 18, yêu cầu cài đặt Node.js tối thiểu là phiên bản 18.x.
   - Thử chạy lệnh dọn dẹp bộ nhớ đệm: `npm cache clean --force`, xóa thư mục `node_modules` và tệp `package-lock.json` hiện tại rồi thử `npm install` lại.

3. **Lỗi: Giao diện hiển thị trống, không thể tải dữ liệu**
   - Đảm bảo Backend đã khởi chạy thành công tại địa chỉ `http://localhost:3000`.
   - Kiểm tra xem cổng kết nối API mặc định trong Frontend có bị thay đổi không. Theo mặc định, Frontend sẽ gọi trực tiếp đến `http://localhost:3000/api/...`.

---

*Chúc các nhà phát triển cài đặt và triển khai thành công hệ thống quản lý PharmaChain!*
