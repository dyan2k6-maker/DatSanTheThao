export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "datsanthethao-demo.firebaseapp.com",
  projectId: "datsanthethao-demo",
  storageBucket: "datsanthethao-demo.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Kiểm tra xem cấu hình có hợp lệ và đã được cấu hình thật chưa
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "datsanthethao-demo"
  );
};
