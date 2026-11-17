import { Alert, Platform } from 'react-native';

/**
 * Hiển thị hộp thoại xác nhận tương thích đa nền tảng (cả Native và Web).
 * @param {string} title - Tiêu đề
 * @param {string} message - Nội dung thông báo
 * @param {string} confirmText - Nhãn nút xác nhận (mặc định: 'Đồng ý')
 * @param {Function} onConfirm - Hàm gọi khi người dùng bấm đồng ý
 * @param {boolean} destructive - Đánh dấu hành động nguy hiểm (xóa/hủy)
 */
export const confirmAction = (
  title,
  message,
  confirmText = 'Đồng ý',
  onConfirm = () => {},
  destructive = false
) => {
  if (Platform.OS === 'web') {
    const fullText = title ? `${title}\n\n${message}` : message;
    if (typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(fullText);
      if (ok && typeof onConfirm === 'function') {
        onConfirm();
      }
    } else {
      if (typeof onConfirm === 'function') onConfirm();
    }
  } else {
    Alert.alert(
      title || 'Xác nhận',
      message || '',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  }
};

/**
 * Hiển thị thông báo đơn giản (1 nút Đóng/OK).
 * @param {string} title - Tiêu đề
 * @param {string} message - Nội dung thông báo
 */
export const notify = (title, message) => {
  if (Platform.OS === 'web') {
    const fullText = title ? `${title}\n\n${message}` : message;
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(fullText);
    } else {
      Alert.alert(title || 'Thông báo', message || '');
    }
  } else {
    Alert.alert(title || 'Thông báo', message || '');
  }
};

export default {
  confirmAction,
  notify,
};
