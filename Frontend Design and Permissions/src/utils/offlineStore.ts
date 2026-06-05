/**
 * Cấu hình IndexedDB cho lưu trữ ngoại tuyến (offline).
 * Module này cung cấp các hàm để lưu, truy xuất và quản lý các đơn hàng POS
 * ở local khi ứng dụng bị mất kết nối mạng hoặc server không phản hồi.
 */
const DB_NAME = 'PharmachainOfflineDB';
const STORE_NAME = 'offline_orders';
const DB_VERSION = 1;

export interface OfflineOrder {
  id: string; // unique offline order ID
  timestamp: number;
  payload: any; // The JSON payload for POST /api/pos/checkout
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Khởi tạo và mở kết nối đến database IndexedDB.
 * Tự động tạo object store (bảng) nếu nó chưa tồn tại.
 * Sử dụng pattern Singleton để tránh việc mở quá nhiều kết nối trùng lặp.
 * 
 * @returns {Promise<IDBDatabase>} Promise trả về instance của database IndexedDB.
 */
const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
};

/**
 * Lưu một đơn hàng POS mới vào IndexedDB ở local.
 * Hàm này được gọi khi đơn hàng không thể đồng bộ lên server (ví dụ: mất mạng).
 * 
 * @param {any} payload - Toàn bộ dữ liệu của đơn hàng dự kiến gửi lên API.
 * @returns {Promise<void>} Hoàn tất khi đơn hàng được lưu thành công.
 */
export const saveOfflineOrder = async (payload: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const order: OfflineOrder = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      payload,
    };

    const request = store.add(order);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Lấy danh sách toàn bộ các đơn hàng offline đã lưu trong database.
 * Danh sách được sắp xếp theo thời gian tăng dần (cũ nhất xếp trước)
 * để đảm bảo khi có mạng lại, các đơn hàng sẽ được đồng bộ đúng theo thứ tự đã tạo.
 * 
 * @returns {Promise<OfflineOrder[]>} Promise trả về danh sách các đơn hàng offline.
 */
export const getOfflineOrders = async (): Promise<OfflineOrder[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp ascending (oldest first)
      const orders = request.result as OfflineOrder[];
      resolve(orders.sort((a, b) => a.timestamp - b.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Xóa một đơn hàng offline cụ thể khỏi database.
 * Hàm này cần được gọi ngay lập tức sau khi đơn hàng offline đã đồng bộ thành công lên server
 * để tránh việc gửi trùng lặp đơn hàng.
 * 
 * @param {string} id - ID duy nhất của đơn hàng offline cần xóa.
 * @returns {Promise<void>} Hoàn tất khi thao tác xóa thành công.
 */
export const removeOfflineOrder = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Đếm tổng số lượng đơn hàng offline đang chờ đồng bộ.
 * Rất hữu ích để hiển thị badge (số đếm) hoặc cảnh báo trên giao diện UI 
 * nhằm thông báo cho người dùng biết hệ thống còn dữ liệu chưa đồng bộ.
 * 
 * @returns {Promise<number>} Promise trả về số lượng đơn hàng đang chờ.
 */
export const getOfflineOrdersCount = async (): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
