/**
 * Helper điều hướng an toàn cho Expo Router
 * Giải quyết triệt để lỗi:
 * "The action 'GO_BACK' was not handled by any navigator. Is there any screen to go back to?"
 */

/**
 * Quay lại màn hình trước nếu có lịch sử (canGoBack = true).
 * Nếu không có lịch sử (ví dụ mở link trực tiếp trên web hoặc deep link),
 * an toàn chuyển hướng về fallbackRoute tương ứng với vai trò của người dùng.
 *
 * @param {object} router - useRouter() từ 'expo-router'
 * @param {string} [fallbackRoute='/'] - Đường dẫn dự phòng mặc định nếu không quay lại được
 */
export const safeBack = (router, fallbackRoute = '/') => {
  if (!router) return;

  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
  } catch (e) {
    // Trường hợp router chưa gắn kết navigator
  }

  // Nếu không thể quay lại an toàn, dùng replace về fallbackRoute
  if (fallbackRoute) {
    router.replace(fallbackRoute);
  }
};

/**
 * Trả về trang chủ mặc định tùy theo role
 * @param {string} role - 'user' | 'owner' | 'admin'
 * @returns {string} Route trang chủ
 */
export const getHomeRouteByRole = (role) => {
  if (role === 'owner') return '/(owner)/dashboard';
  if (role === 'admin') return '/(admin)/dashboard';
  return '/(tabs)';
};
