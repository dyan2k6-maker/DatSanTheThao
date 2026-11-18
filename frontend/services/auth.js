import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, isDemoMode } from './firebase';
import { db } from './db';

const AUTH_USER_KEY = '@datsan_current_user';
const AUTH_TOKEN_KEY = 'datsan_auth_token';

// Quản lý lưu trữ an toàn token (fallback sang AsyncStorage trên Web nếu cần)
const saveToken = async (token) => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch (e) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

const getToken = async () => {
  try {
    if (Platform.OS !== 'web') {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) return token;
    }
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }
};

const removeToken = async () => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
  } catch (e) { }
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
};

export const authService = {
  // Lấy tài khoản đang đăng nhập hiện tại
  async getCurrentUser() {
    try {
      const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        const cachedUser = JSON.parse(raw);
        if (cachedUser && cachedUser.id) {
          // Nạp lại user mới nhất từ db theo id và gộp vào
          const freshUser = await db.getById('users', cachedUser.id);
          if (freshUser) {
            const merged = { ...cachedUser, ...freshUser };
            await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(merged));
            return merged;
          } else {
            // Không còn tồn tại trong db thì xóa phiên và về đăng nhập
            await this.logout();
            return null;
          }
        }
        return cachedUser;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  // Đăng nhập bằng Email/SĐT + Mật khẩu
  async login(identifier, password) {
    const cleanId = identifier.trim().toLowerCase();

    // 1. Nếu có Firebase Auth thật
    if (!isDemoMode && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanId, password);
        const userDoc = await db.getById('users', cred.user.uid);
        if (userDoc) {
          if (userDoc.status === 'locked') {
            throw new Error('Tài khoản của bạn đã bị khóa bởi Quản trị viên.');
          }
          if (userDoc.status === 'pending' && userDoc.role === 'owner') {
            throw new Error('Tài khoản Chủ sân đang chờ Ban quản trị duyệt.');
          }
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userDoc));
          await saveToken(await cred.user.getIdToken());
          return { success: true, user: userDoc };
        }
      } catch (err) {
        console.warn('Firebase login failed, trying local DB:', err.message);
      }
    }

    // 2. Demo Mode hoặc Local Fallback
    const users = await db.getAll('users');
    const matchedUser = users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.phone && u.phone === cleanId)
    );

    if (!matchedUser) {
      throw new Error('Email hoặc số điện thoại không tồn tại trong hệ thống.');
    }

    // Ở Demo Mode, cho phép mật khẩu bất kỳ từ 6 ký tự hoặc đúng mật khẩu demo
    if (password.length < 6) {
      throw new Error('Mật khẩu phải từ 6 ký tự trở lên.');
    }

    if (matchedUser.status === 'locked') {
      throw new Error('Tài khoản của bạn đã bị khóa bởi Quản trị viên.');
    }

    if (matchedUser.status === 'pending' && matchedUser.role === 'owner') {
      throw new Error('Tài khoản Chủ sân đang chờ Ban quản trị duyệt.');
    }

    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(matchedUser));
    await saveToken(`demo_token_${matchedUser.id}_${Date.now()}`);
    return { success: true, user: matchedUser };
  },

  // Đăng ký tài khoản mới (User hoặc Chủ sân)
  async register(data) {
    const { fullName, email, phone, password, role, courtClusterName, courtClusterAddress, businessLicense, idCard } = data;

    // Kiểm tra trùng lặp email hoặc SĐT
    const users = await db.getAll('users');
    const existing = users.find(
      (u) =>
        (email && u.email && u.email.toLowerCase() === email.trim().toLowerCase()) ||
        (phone && u.phone && u.phone === phone.trim())
    );

    if (existing) {
      throw new Error('Email hoặc số điện thoại đã được đăng ký.');
    }

    let firebaseUid = null;
    if (!isDemoMode && auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        firebaseUid = cred.user.uid;
      } catch (err) {
        console.warn('Firebase register error:', err.message);
      }
    }

    const newUser = {
      id: firebaseUid || `user_${Date.now()}`,
      role: role || 'user',
      fullName,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
      status: role === 'owner' ? 'pending' : 'active', // Chủ sân mặc định chờ duyệt
      points: 100, // Điểm thưởng khi tạo tài khoản
      businessLicense: businessLicense || null,
      idCard: idCard || null,
      courtClusterName: courtClusterName || null,
      courtClusterAddress: courtClusterAddress || null,
      createdAt: new Date().toISOString(),
    };

    await db.add('users', newUser);

    // Nếu là user bình thường thì tự động đăng nhập, nếu là chủ sân thì yêu cầu chờ duyệt
    if (newUser.status === 'active') {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      await saveToken(`token_${newUser.id}`);
    }

    return { success: true, user: newUser };
  },

  // Đăng nhập nhanh cho Demo (User / Chủ sân / Admin)
  async quickLoginDemo(role, userId = null) {
    const users = await db.getAll('users');
    let target = null;

    if (userId) {
      target = users.find((u) => u.id === userId);
    } else if (role === 'admin') {
      target = users.find((u) => u.role === 'admin') || users[0];
    } else if (role === 'owner') {
      // Chọn chủ sân đã active
      target = users.find((u) => u.role === 'owner' && u.status === 'active') || users[1];
    } else {
      // User thường
      target = users.find((u) => u.role === 'user' && u.status === 'active') || users[5];
    }

    if (target) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(target));
      await saveToken(`demo_token_${target.id}`);
      return target;
    }
    throw new Error('Không tìm thấy tài khoản demo phù hợp.');
  },

  // Đăng xuất
  async logout() {
    if (!isDemoMode && auth) {
      try {
        await signOut(auth);
      } catch (e) { }
    }
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    await removeToken();
    return true;
  },

  // Cập nhật thông tin tài khoản hiện tại
  async updateCurrentUser(updates) {
    const current = await this.getCurrentUser();
    if (!current) return null;

    const updated = await db.update('users', current.id, updates);
    const merged = { ...current, ...updated };
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(merged));
    return merged;
  },
};
