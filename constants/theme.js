// Bộ thiết kế DatSanTheThao - Tông màu sân thể thao hiện đại, cao cấp
export const COLORS = {
  // Brand colors
  primaryDark: '#0B3D2E',   // Xanh cỏ sân đậm (header, hero, brand text)
  primary: '#16A34A',       // Xanh cỏ tươi (actions, active, success)
  accent: '#84CC16',        // Xanh chanh / lime (highlight, badge, CTA)
  accentLight: '#ECFCCB',   // Xanh chanh nhạt nền
  warning: '#F97316',       // Cam giờ vàng, khuyến mãi, cảnh báo
  warningLight: '#FFEDD5',  // Cam nhạt nền
  danger: '#EF4444',        // Đỏ hủy, xóa, từ chối
  dangerLight: '#FEE2E2',   // Đỏ nhạt nền
  info: '#0284C7',          // Xanh dương thông tin
  infoLight: '#E0F2FE',     // Xanh dương nhạt nền

  // Neutral - Light Mode
  background: '#F4F7F5',    // Nền ứng dụng sáng dịu
  surface: '#FFFFFF',       // Nền card, container
  surfaceSecondary: '#EAEFEA',
  border: '#E2E8F0',        // Đường viền
  borderHighlight: '#CBD5E1',
  text: '#0F172A',          // Chữ chính (Slate đậm)
  textSecondary: '#64748B', // Chữ phụ
  textMuted: '#94A3B8',     // Chữ mờ / placeholder
  textInverse: '#FFFFFF',   // Chữ trên nền tối
  backdrop: 'rgba(15, 23, 42, 0.6)',

  // Sports field specific
  courtLine: 'rgba(255, 255, 255, 0.3)',
  courtTurf: '#15803D',
  gold: '#EAB308',
};

export const DARK_COLORS = {
  primaryDark: '#07241B',
  primary: '#22C55E',
  accent: '#A3E635',
  accentLight: '#1E3A1A',
  warning: '#FB923C',
  warningLight: '#431407',
  danger: '#F87171',
  dangerLight: '#450A0A',
  info: '#38BDF8',
  infoLight: '#082F49',

  background: '#0B1310',
  surface: '#15221C',
  surfaceSecondary: '#1C2E26',
  border: '#233A30',
  borderHighlight: '#335345',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  backdrop: 'rgba(0, 0, 0, 0.75)',

  courtLine: 'rgba(255, 255, 255, 0.2)',
  courtTurf: '#166534',
  gold: '#FACC15',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const FONTS = {
  headingBold: 'BarlowCondensed-Bold',
  headingSemiBold: 'BarlowCondensed-SemiBold',
  regular: 'BeVietnamPro-Regular',
  medium: 'BeVietnamPro-Medium',
  semiBold: 'BeVietnamPro-SemiBold',
  bold: 'BeVietnamPro-Bold',
};
