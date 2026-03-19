# 📱 Báo cáo Bài tập A08

## Các tính năng mới được bổ sung so với A07

---

## 🔔 1. Hệ thống Thông báo Real-time (Socket.IO)

### 1.1 Kiến trúc tổng quan

Hệ thống thông báo được xây dựng theo mô hình **Socket.IO + Lưu DB**, đảm bảo:
- Thông báo real-time khi app đang mở
- Lưu lịch sử thông báo vào MongoDB
- Không mất thông báo khi mất kết nối
```
App kết nối Socket → Join room theo userId
Server có sự kiện → Lưu DB + Emit socket vào room
App nhận event → Cập nhật Redux + Hiển thị badge
```

### 1.2 Backend (Server)

**Model `Notification`** — Lưu các trường:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `userId` | ObjectId | Người nhận thông báo |
| `type` | String | `order_status` / `new_review` / `points_received` |
| `title` | String | Tiêu đề thông báo |
| `body` | String | Nội dung chi tiết |
| `isRead` | Boolean | Trạng thái đã đọc (mặc định `false`) |
| `data.orderId` | String | ID đơn hàng (cho `order_status`) |
| `data.status` | Number | Trạng thái đơn hàng |
| `data.productId` | String | ID sản phẩm (cho `new_review`, `points_received`) |
| `data.rating` | Number | Số sao đánh giá |
| `data.reviewerName` | String | Tên người đánh giá |
| `data.pointsReceived` | Number | Số điểm vừa nhận |
| `data.totalPoints` | Number | Tổng điểm hiện tại |

**Cấu hình `server.js`:**
- Chuyển từ `app.listen` sang `http.createServer` + `Socket.IO`
- Export `global.io` để các controller sử dụng
- Client kết nối → emit `join(userId)` → server cho join room riêng

**API Notification:**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/notifications` | Lấy danh sách + số chưa đọc |
| `PUT` | `/api/notifications/:id/read` | Đánh dấu 1 thông báo đã đọc |
| `PUT` | `/api/notifications/read-all` | Đánh dấu tất cả đã đọc |
| `DELETE` | `/api/notifications/:id` | Xóa 1 thông báo |

**Tích hợp emit vào các Controller hiện có:**

`reviewController.js` — Sau khi tạo review thành công:
- Emit `points_received` cho chính user vừa đánh giá → thông báo số điểm nhận được và tổng điểm hiện tại
- Tìm tất cả Wishlist có chứa sản phẩm vừa được đánh giá → emit `new_review` cho từng user đó (trừ người vừa đánh giá)

`orderController.js` — Khi trạng thái đơn hàng thay đổi:
- Tự động chuyển status 1 → 2 sau 30 phút → emit `order_status`
- Hủy đơn hàng → emit `order_status`

### 1.3 Frontend (React Native)

**`socket.ts`** — Quản lý kết nối Socket:
- `connectSocket(userId)` — kết nối và join room
- `getSocket()` — lấy instance để lắng nghe event
- `disconnectSocket()` — ngắt kết nối khi logout

**`App.tsx`** — Tích hợp Socket vào vòng đời app:
- Đăng nhập → `connectSocket(user.id)`
- Lắng nghe event `notification` → `dispatch(addNewNotification(notif))`
- Đăng xuất → `disconnectSocket()`

**Redux slice `notificationSlice`:**

| Action | Mô tả |
|--------|-------|
| `fetchNotifications` | Gọi API lấy danh sách + `unreadCount` |
| `markAsRead(id)` | Đánh dấu 1 thông báo đã đọc |
| `markAllAsRead` | Đánh dấu tất cả đã đọc |
| `deleteNotification(id)` | Xóa 1 thông báo |
| `addNewNotification(notif)` | Nhận thông báo mới real-time từ socket |

**Màn hình `NotificationScreen`:**
- Danh sách thông báo, thông báo chưa đọc có nền xanh nhạt + viền trái xanh
- **Bấm vào thông báo** → mở rộng nội dung đầy đủ (không navigate ngay)
- **Bấm "Xem nội dung được nhắc đến"** → navigate đến màn hình liên quan:
  - `order_status` → `OrderHistoryScreen`
  - `new_review` → Fetch product từ API → `ProductDetailScreen`
  - `points_received` → `ProfileScreen`
- Nút **"Đọc tất cả"** ở header
- Nút xóa từng thông báo

**Badge thông báo trên `HomeScreen`:**
- Icon 🔔 ở header bên cạnh avatar
- Badge số đỏ hiển thị `unreadCount` (hiện `99+` nếu > 99)
- Bấm vào → navigate sang `NotificationScreen`

### 1.4 Các loại thông báo

| Loại | Icon | Màu | Khi nào gửi | Người nhận |
|------|------|-----|-------------|-----------|
| `order_status` | 📦 | Xanh dương | Đơn hàng đổi trạng thái | Chủ đơn hàng |
| `new_review` | ⭐ | Vàng | Có đánh giá mới trên sản phẩm | User có SP trong Wishlist |
| `points_received` | 🎁 | Cam | Sau khi đánh giá sản phẩm thành công | Người vừa đánh giá |

---

## 📊 2. Thống kê Chi tiêu Hàng tháng

### 2.1 Tổng quan

Tính năng thống kê hoạt động hoàn toàn **client-side**, không cần thêm API mới. Dữ liệu được lấy từ API đơn hàng có sẵn (`GET /orders`) và xử lý tại app.

### 2.2 Cách truy cập

`ProfileScreen` → Nút **"Thống kê chi tiêu"** → `SpendingStatsScreen`

### 2.3 Tính năng Dropdown chọn tháng

- Tự động tạo danh sách **6 tháng gần nhất** tính từ thời điểm mở màn hình
- Mặc định hiển thị **tháng hiện tại**
- Khi sang tháng mới, danh sách tự cập nhật (tháng cũ nhất tự biến mất, tháng mới xuất hiện)
- Không cần cấu hình hay cập nhật thủ công
```typescript
// Tạo danh sách 6 tháng gần nhất — hoàn toàn tự động
const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: `Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`,
                  month: d.getMonth(), year: d.getFullYear() });
  }
  return months;
};
```

### 2.4 Nội dung thống kê

Sau khi chọn tháng, màn hình hiển thị:

| Mục | Trạng thái đơn | Nội dung hiển thị |
|-----|---------------|-------------------|
| Chờ xác nhận | Status 1, 2 | Số đơn + Tổng tiền |
| Đang giao hàng | Status 3 | Số đơn + Tổng tiền |
| Đã giao thành công | Status 4 | Số đơn + Tổng tiền (màu xanh) |
| Đã hủy | Status 5 | Số đơn + Tổng tiền (màu đỏ) |
| **Tổng chi tiêu** | Status 4 | **Chỉ tính đơn đã giao thành công** |

**Tổng chi tiêu** được tính theo công thức:
```
Tổng chi tiêu = Σ totalPrice của các đơn có status = 4 trong tháng được chọn
```

> Lý do chỉ tính đơn status 4: Đây là số tiền thực tế người dùng đã chi, không tính các đơn chưa hoàn tất hoặc đã hủy.

### 2.5 Các file liên quan

| File | Thao tác |
|------|----------|
| `screens/Profile/SpendingStatsScreen.tsx` | Tạo mới — màn hình thống kê chính |
| `screens/Profile/ProfileScreen.tsx` | Thêm nút "Thống kê chi tiêu" |
| `navigation/AppNavigator.tsx` | Đăng ký route `SpendingStats` |

---

## 🛠️ Thư viện bổ sung

| Thư viện | Dùng cho |
|----------|----------|
| `socket.io` (Server) | Tạo Socket.IO server |
| `socket.io-client` (App) | Kết nối Socket từ React Native |

---

## 📁 Cấu trúc thư mục bổ sung
```
Server/
├── models/
│   └── Notification.js          ← Model thông báo (MỚI)
├── controllers/
│   ├── notificationController.js ← CRUD thông báo (MỚI)
│   ├── reviewController.js       ← Cập nhật: emit socket
│   └── orderController.js        ← Cập nhật: emit socket
├── routes/
│   └── notificationRoutes.js     ← Route thông báo (MỚI)
└── server.js                     ← Cập nhật: tích hợp Socket.IO

BaiTapA08/src/
├── utils/
│   └── socket.ts                 ← Quản lý kết nối socket (MỚI)
├── store/slices/
│   └── notificationSlice.ts      ← Redux slice thông báo (MỚI)
├── screens/
│   ├── Notification/
│   │   └── NotificationScreen.tsx ← Màn hình thông báo (MỚI)
│   └── Profile/
│       ├── ProfileScreen.tsx      ← Cập nhật: thêm nút thống kê
│       └── SpendingStatsScreen.tsx ← Màn hình thống kê (MỚI)
├── navigation/
│   └── AppNavigator.tsx           ← Cập nhật: thêm 2 route mới
└── App.tsx                        ← Cập nhật: kết nối socket
```
