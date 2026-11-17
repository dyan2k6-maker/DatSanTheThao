import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '../constants/firebaseConfig';

let app = null;
let firestore = null;
let auth = null;
let isDemoMode = true;

try {
  if (isFirebaseConfigured()) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firestore = getFirestore(app);
    auth = getAuth(app);
    isDemoMode = false;
    console.log('[Firebase] Đã khởi tạo Firebase thành công.');
  } else {
    isDemoMode = true;
    console.log('[Firebase] Đang chạy ở DEMO MODE (Local Storage & Seed Data).');
  }
} catch (error) {
  console.warn('[Firebase] Khởi tạo Firebase thất bại, tự động chuyển về DEMO MODE:', error.message);
  isDemoMode = true;
}

export { app, firestore, auth, isDemoMode };
