// Danh sách các môn thể thao, loại sân, mặt sân và tiện ích

export const SPORTS = [
  { id: 'all', name: 'Tất cả', icon: 'apps-outline', type: 'Ionicons' },
  { id: 'football', name: 'Bóng đá', icon: 'football-outline', type: 'Ionicons' },
  { id: 'badminton', name: 'Cầu lông', icon: 'badminton', type: 'MaterialCommunityIcons' },
  { id: 'tennis', name: 'Tennis', icon: 'tennis', type: 'MaterialCommunityIcons' },
  { id: 'pickleball', name: 'Pickleball', icon: 'table-tennis', type: 'MaterialCommunityIcons' },
  { id: 'basketball', name: 'Bóng rổ', icon: 'basketball-outline', type: 'Ionicons' },
  { id: 'volleyball', name: 'Bóng chuyền', icon: 'volleyball', type: 'MaterialCommunityIcons' },
];

export const COURT_TYPES = {
  football: ['Sân 5 người', 'Sân 7 người', 'Sân 11 người'],
  badminton: ['Sân đơn', 'Sân đôi', 'Sân tiêu chuẩn'],
  tennis: ['Sân đất nện', 'Sân cứng', 'Sân cỏ'],
  pickleball: ['Sân tiêu chuẩn', 'Sân đôi'],
  basketball: ['Sân 3x3', 'Sân 5x5'],
  volleyball: ['Sân trong nhà', 'Sân cát bãi biển'],
};

export const SURFACES = [
  'Cỏ nhân tạo',
  'Cỏ tự nhiên',
  'Sàn gỗ chuyên dụng',
  'Sàn cao su thảm PVC',
  'Sân cứng Acrylic',
  'Đất nện',
];

export const AMENITIES = [
  { id: 'parking', name: 'Bãi giữ xe rộng', icon: 'car-outline' },
  { id: 'canteen', name: 'Căn tin / Nước uống', icon: 'fast-food-outline' },
  { id: 'wifi', name: 'Wifi miễn phí', icon: 'wifi-outline' },
  { id: 'shower', name: 'Phòng thay đồ & tắm nóng lạnh', icon: 'water-outline' },
  { id: 'light', name: 'Dàn đèn LED cao áp chuẩn thi đấu', icon: 'flashlight-outline' },
  { id: 'rent_gear', name: 'Cho thuê giày, bóng & vợt', icon: 'shirt-outline' },
  { id: 'tribune', name: 'Khán đài khán giả', icon: 'people-outline' },
  { id: 'first_aid', name: 'Tủ y tế sơ cứu', icon: 'medkit-outline' },
];

export const BOOKING_STATUSES = {
  pending: { label: 'Chờ duyệt', color: '#F59E0B', bg: '#FEF3C7' },
  confirmed: { label: 'Đã xác nhận', color: '#0284C7', bg: '#E0F2FE' },
  checked_in: { label: 'Đang thi đấu', color: '#16A34A', bg: '#DCFCE7' },
  completed: { label: 'Hoàn thành', color: '#15803D', bg: '#BBF7D0' },
  cancelled: { label: 'Đã hủy', color: '#EF4444', bg: '#FEE2E2' },
  rejected: { label: 'Bị từ chối', color: '#64748B', bg: '#F1F5F9' },
  no_show: { label: 'Khách không đến', color: '#8B5CF6', bg: '#EDE9FE' },
};

