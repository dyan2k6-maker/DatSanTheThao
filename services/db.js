import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection as fsCollection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { firestore, isDemoMode } from './firebase';
import {
  SEED_VERSION,
  SEED_USERS,
  SEED_COURTS,
  SEED_BOOKINGS,
  SEED_BLOCKED_SLOTS,
  SEED_REVIEWS,
  SEED_TOURNAMENTS,
  SEED_VOUCHERS,
  SEED_NOTIFICATIONS,
  SEED_COMPLAINTS,
} from '../data/seed';

const SEED_VERSION_KEY = '@datsan_seed_version';
let isVersionChecked = false;

const SEED_MAP = {
  users: SEED_USERS,
  courts: SEED_COURTS,
  bookings: SEED_BOOKINGS,
  blockedSlots: SEED_BLOCKED_SLOTS,
  reviews: SEED_REVIEWS,
  tournaments: SEED_TOURNAMENTS,
  vouchers: SEED_VOUCHERS,
  notifications: SEED_NOTIFICATIONS,
  complaints: SEED_COMPLAINTS,
};

// Listeners registry for reactive real-time updates in Demo Mode
const demoListeners = {};

const notifyListeners = (colName) => {
  if (demoListeners[colName]) {
    db.getAll(colName).then((items) => {
      demoListeners[colName].forEach((cb) => {
        try {
          cb(items);
        } catch (e) {
          console.warn('Listener error:', e);
        }
      });
    });
  }
};

export const db = {
  // Kiểm tra phiên bản dữ liệu mẫu trong Demo Mode
  async checkSeedVersion() {
    if (isVersionChecked) return;
    try {
      const saved = await AsyncStorage.getItem(SEED_VERSION_KEY);
      if (saved !== SEED_VERSION) {
        console.log(`[Demo] SEED_VERSION thay đổi (${saved} -> ${SEED_VERSION}), nạp lại dữ liệu mẫu...`);
        for (const [colName, items] of Object.entries(SEED_MAP)) {
          await AsyncStorage.setItem(`@datsan_${colName}`, JSON.stringify(items));
        }
        await AsyncStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      }
      isVersionChecked = true;
    } catch (e) {
      console.warn('Lỗi kiểm tra SEED_VERSION:', e);
    }
  },

  // Lấy toàn bộ danh sách bản ghi
  async getAll(colName, filterFn = null) {
    if (!isDemoMode && firestore) {
      try {
        const snap = await getDocs(fsCollection(firestore, colName));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return filterFn ? list.filter(filterFn) : list;
      } catch (err) {
        console.warn(`[Firestore] Lỗi getAll ${colName}, fallback về Demo storage:`, err);
      }
    }

    // Demo Mode: tự động đồng bộ version
    await this.checkSeedVersion();

    // Demo Mode: đọc từ AsyncStorage
    try {
      const key = `@datsan_${colName}`;
      const raw = await AsyncStorage.getItem(key);
      let list = [];
      if (raw) {
        list = JSON.parse(raw);
      } else {
        // Nạp seed data lần đầu
        list = SEED_MAP[colName] ? [...SEED_MAP[colName]] : [];
        await AsyncStorage.setItem(key, JSON.stringify(list));
      }
      return filterFn ? list.filter(filterFn) : list;
    } catch (e) {
      console.error(`[Local DB] Lỗi getAll ${colName}:`, e);
      const list = SEED_MAP[colName] ? [...SEED_MAP[colName]] : [];
      return filterFn ? list.filter(filterFn) : list;
    }
  },

  // Lấy chi tiết 1 bản ghi theo ID
  async getById(colName, id) {
    if (!id) return null;
    if (!isDemoMode && firestore) {
      try {
        const snap = await getDoc(doc(firestore, colName, id));
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() };
        }
        return null;
      } catch (err) {
        console.warn(`[Firestore] Lỗi getById ${colName}:`, err);
      }
    }

    const items = await this.getAll(colName);
    return items.find((item) => item.id === id) || null;
  },

  // Thêm mới 1 bản ghi
  async add(colName, item) {
    const newItem = {
      ...item,
      id: item.id || `${colName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: item.createdAt || new Date().toISOString(),
    };

    if (!isDemoMode && firestore) {
      try {
        if (item.id) {
          await setDoc(doc(firestore, colName, item.id), newItem);
        } else {
          const docRef = await addDoc(fsCollection(firestore, colName), newItem);
          newItem.id = docRef.id;
        }
        return newItem;
      } catch (err) {
        console.warn(`[Firestore] Lỗi add ${colName}, lưu local:`, err);
      }
    }

    // Demo Mode
    const items = await this.getAll(colName);
    const updated = [newItem, ...items];
    await AsyncStorage.setItem(`@datsan_${colName}`, JSON.stringify(updated));
    notifyListeners(colName);
    return newItem;
  },

  // Cập nhật bản ghi theo ID
  async update(colName, id, updates) {
    if (!id) return null;

    if (!isDemoMode && firestore) {
      try {
        await updateDoc(doc(firestore, colName, id), updates);
        return { id, ...updates };
      } catch (err) {
        console.warn(`[Firestore] Lỗi update ${colName}:`, err);
      }
    }

    // Demo Mode
    const items = await this.getAll(colName);
    const index = items.findIndex((i) => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(`@datsan_${colName}`, JSON.stringify(items));
      notifyListeners(colName);
      return items[index];
    }
    return null;
  },

  // Xóa bản ghi theo ID
  async remove(colName, id) {
    if (!id) return false;

    if (!isDemoMode && firestore) {
      try {
        await deleteDoc(doc(firestore, colName, id));
        return true;
      } catch (err) {
        console.warn(`[Firestore] Lỗi remove ${colName}:`, err);
      }
    }

    // Demo Mode
    const items = await this.getAll(colName);
    const filtered = items.filter((i) => i.id !== id);
    await AsyncStorage.setItem(`@datsan_${colName}`, JSON.stringify(filtered));
    notifyListeners(colName);
    return true;
  },

  // Lắng nghe thay đổi dữ liệu thời gian thực
  subscribe(colName, callback, filterFn = null) {
    if (!isDemoMode && firestore) {
      try {
        const q = query(fsCollection(firestore, colName));
        const unsub = onSnapshot(q, (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          callback(filterFn ? list.filter(filterFn) : list);
        });
        return unsub;
      } catch (err) {
        console.warn(`[Firestore] Không thể subscribe ${colName}:`, err);
      }
    }

    // Demo Mode Subscription
    if (!demoListeners[colName]) {
      demoListeners[colName] = [];
    }
    const wrappedCb = (items) => {
      callback(filterFn ? items.filter(filterFn) : items);
    };
    demoListeners[colName].push(wrappedCb);

    // Bắn dữ liệu ngay lúc đầu
    this.getAll(colName, filterFn).then(callback);

    // Trả về hàm hủy đăng ký
    return () => {
      if (demoListeners[colName]) {
        demoListeners[colName] = demoListeners[colName].filter((cb) => cb !== wrappedCb);
      }
    };
  },

  // Nạp toàn bộ dữ liệu mẫu lên Firestore (dành cho Admin)
  async seedAllToFirestore() {
    if (isDemoMode || !firestore) {
      // Nếu ở Demo Mode, chỉ cần reset AsyncStorage về seed data ban đầu
      await this.resetToSeedData();
      return { success: true, message: 'Đã nạp lại dữ liệu mẫu Demo mượt mà!' };
    }

    try {
      for (const [colName, items] of Object.entries(SEED_MAP)) {
        for (const item of items) {
          const docId = item.id || `${colName}_${Date.now()}`;
          await setDoc(doc(firestore, colName, docId), item);
        }
      }
      return { success: true, message: 'Đã nạp thành công dữ liệu mẫu lên Firestore!' };
    } catch (err) {
      console.error('Lỗi khi nạp seed data lên Firestore:', err);
      return { success: false, error: err.message };
    }
  },

  // Khôi phục toàn bộ dữ liệu về trạng thái Seed Data ban đầu
  async resetToSeedData() {
    for (const [colName, items] of Object.entries(SEED_MAP)) {
      await AsyncStorage.setItem(`@datsan_${colName}`, JSON.stringify(items));
      notifyListeners(colName);
    }
    await AsyncStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    return true;
  },
};
