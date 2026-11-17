import dayjs from 'dayjs';

export const SEED_VERSION = '2.4.0';

export const SEED_USERS = [
  // Quản trị viên
  {
    id: 'admin_1',
    role: 'admin',
    fullName: 'Trần Quản Trị (Admin)',
    email: 'admin@datsan.vn',
    phone: '0901234567',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    status: 'active',
    points: 9999,
    createdAt: '2025-01-01T00:00:00Z',
  },
  // Chủ sân 1 - Cụm Sân Chảo Lửa (TP.HCM, active)
  {
    id: 'owner_1',
    role: 'owner',
    fullName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    email: 'chusan.minh@datsan.vn',
    phone: '0912345678',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    status: 'active',
    points: 1500,
    businessLicense: 'GPKD-79-2023-00123',
    idCard: '079090012345',
    courtClusterName: 'Cụm Sân Chảo Lửa',
    courtClusterAddress: '30 Phan Thúc Duyện, Phường 4, Tân Bình, TP.HCM',
    bankInfo: {
      bankName: 'Vietcombank',
      accountNumber: '0071001234567',
      accountName: 'NGUYEN VAN MINH',
    },
    createdAt: '2025-01-10T08:00:00Z',
  },
  // Chủ sân 2 - Sao Vàng Sport (TP.HCM, active)
  {
    id: 'owner_2',
    role: 'owner',
    fullName: 'Lê Hoàng Phong (Sao Vàng Sport)',
    email: 'chusan.phong@datsan.vn',
    phone: '0933456789',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    status: 'active',
    points: 2200,
    businessLicense: 'GPKD-79-2022-00891',
    idCard: '079088009876',
    courtClusterName: 'Sao Vàng Sport',
    courtClusterAddress: '238 Đường 3/2, Phường 12, Quận 10, TP.HCM',
    bankInfo: {
      bankName: 'Techcombank',
      accountNumber: '19034567891011',
      accountName: 'LE HOANG PHONG',
    },
    createdAt: '2025-01-12T09:00:00Z',
  },
  // Chủ sân 3 - Arena Hà Nội (Hà Nội, active)
  {
    id: 'owner_3',
    role: 'owner',
    fullName: 'Phạm Thanh Tùng (Arena Hà Nội)',
    email: 'chusan.tung@datsan.vn',
    phone: '0988776655',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    status: 'active',
    points: 1800,
    businessLicense: 'GPKD-01-2024-55443',
    idCard: '001090012345',
    courtClusterName: 'Arena Hà Nội',
    courtClusterAddress: '15 Lê Văn Lương, Trung Hòa, Cầu Giấy, Hà Nội',
    bankInfo: {
      bankName: 'MB Bank',
      accountNumber: '0888123456789',
      accountName: 'PHAM THANH TUNG',
    },
    createdAt: '2025-02-01T10:00:00Z',
  },
  // Chủ sân 4 - Chờ duyệt tài khoản (status: pending)
  {
    id: 'owner_4',
    role: 'owner',
    fullName: 'Đặng Quốc Bảo (Diamond Club)',
    email: 'chusan.bao@datsan.vn',
    phone: '0977889900',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    status: 'pending', // Chờ duyệt
    points: 0,
    businessLicense: 'GPKD-01-2025-99881',
    idCard: '001099001122',
    courtClusterName: 'Diamond Sport Club',
    courtClusterAddress: '88 Hoàng Hoa Thám, Tây Hồ, Hà Nội',
    bankInfo: {
      bankName: 'VPBank',
      accountNumber: '998877665544',
      accountName: 'DANG QUOC BAO',
    },
    createdAt: '2025-03-01T10:30:00Z',
  },
  // Người dùng thường
  {
    id: 'user_1',
    role: 'user',
    fullName: 'Hoàng Trọng Nghĩa',
    email: 'trongnghia@gmail.com',
    phone: '0981112233',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    status: 'active',
    points: 850,
    createdAt: '2025-02-01T10:00:00Z',
  },
  {
    id: 'user_2',
    role: 'user',
    fullName: 'Võ Thị Thanh Thảo',
    email: 'thanhthao@gmail.com',
    phone: '0982223344',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    status: 'active',
    points: 420,
    createdAt: '2025-02-05T14:20:00Z',
  },
  {
    id: 'user_3',
    role: 'user',
    fullName: 'Hoàng Minh Tuấn',
    email: 'minhtuan@gmail.com',
    phone: '0983334455',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400',
    status: 'active',
    points: 1200,
    createdAt: '2025-02-10T16:00:00Z',
  },
  {
    id: 'user_4',
    role: 'user',
    fullName: 'Lê Văn Nam',
    email: 'vannam@gmail.com',
    phone: '0984445566',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    status: 'active',
    points: 310,
    createdAt: '2025-02-15T11:00:00Z',
  },
  {
    id: 'user_5',
    role: 'user',
    fullName: 'Ngô Thanh Hải',
    email: 'thanhhai@gmail.com',
    phone: '0985556677',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    status: 'active',
    points: 650,
    createdAt: '2025-02-18T09:30:00Z',
  },
  {
    id: 'user_6',
    role: 'user',
    fullName: 'Đoàn Nhật Nam',
    email: 'nhatnam@gmail.com',
    phone: '0986667788',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    status: 'active',
    points: 980,
    createdAt: '2025-02-20T13:10:00Z',
  },
  {
    id: 'user_7',
    role: 'user',
    fullName: 'Ngô Khánh Huyền',
    email: 'khanhhuyen@gmail.com',
    phone: '0987778899',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    status: 'active',
    points: 560,
    createdAt: '2025-02-22T08:30:00Z',
  },
];

// Danh sách sân thể thao
export const SEED_COURTS = [
  // --- CHỦ SÂN A (owner_1): Cụm Sân Chảo Lửa ---
  // Sân 1: Bóng đá mini 7 người (4 sân con)
  {
    id: 'court_1',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    name: 'Sân Bóng Đá Mini Chảo Lửa 7 Người',
    sport: 'football',
    type: 'Sân 7 người',
    surface: 'Cỏ nhân tạo',
    description: 'Cụm 4 sân bóng đá mini 7 người chuẩn FIFA, cỏ sợi gân êm ái, thoát nước nhanh, dàn đèn LED cao áp chống chói, bãi xe ô tô rộng rãi.',
    address: '30 Phan Thúc Duyện, Phường 4, Tân Bình, TP.HCM',
    lat: 10.8038,
    lng: 106.6612,
    images: [
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear', 'tribune', 'first_aid'],
    subCourts: ['Sân 7A1', 'Sân 7A2', 'Sân 7B1', 'Sân 7B2'],
    priceRules: [
      { from: '06:00', to: '16:00', price: 300000, label: 'Giờ thường ban ngày' },
      { from: '16:00', to: '21:00', price: 480000, label: 'Giờ vàng buổi tối' },
      { from: '21:00', to: '23:00', price: 350000, label: 'Giờ đêm' },
    ],
    attrs: {
      courtType: 'Sân 7 người',
      surface: 'Cỏ nhân tạo',
      dimension: '50x30m (Sân 7 chuẩn)',
      environment: 'Ngoài trời',
      lighting: true,
      rentGear: true,
      hasTribune: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.8,
    reviewCount: 156,
    status: 'approved',
    isActive: true,
  },
  // Sân 2: Cầu lông (6 sân con)
  {
    id: 'court_2',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    name: 'Sân Cầu Lông Chảo Lửa Center',
    sport: 'badminton',
    type: 'Sân tiêu chuẩn',
    surface: 'Sàn cao su thảm PVC',
    description: 'Nhà thi đấu cầu lông 6 thảm PVC chuyên dụng 5 lớp, trần cao 11m thoáng gió, đèn LED chống chói 500 Lux, có phòng thay đồ máy lạnh.',
    address: '30 Phan Thúc Duyện, Phường 4, Tân Bình, TP.HCM',
    lat: 10.8035,
    lng: 106.6615,
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear'],
    subCourts: ['Sân CL 01', 'Sân CL 02', 'Sân CL 03', 'Sân CL 04', 'Sân CL 05', 'Sân CL 06'],
    priceRules: [
      { from: '06:00', to: '17:00', price: 120000, label: 'Giờ thường' },
      { from: '17:00', to: '22:00', price: 170000, label: 'Giờ cao điểm' },
      { from: '22:00', to: '23:00', price: 130000, label: 'Giờ muộn' },
    ],
    attrs: {
      surface: 'Sàn cao su thảm PVC',
      courtType: 'Sân đơn & đôi tiêu chuẩn BWF',
      ceilingHeight: '10m - 12m (Chuẩn giải đấu BWF)',
      antiGlareLighting: true,
      isIndoor: true,
      racketRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 2,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.9,
    reviewCount: 98,
    status: 'approved',
    isActive: true,
  },
  // Sân 3: Pickleball (3 sân con)
  {
    id: 'court_3',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    name: 'Sân Pickleball Chảo Lửa Pro',
    sport: 'pickleball',
    type: 'Sân tiêu chuẩn',
    surface: 'Sân cứng Acrylic',
    description: 'Cụm 3 sân Pickleball mới khánh thành với mặt sân Acrylic 5 lớp chuẩn USAPA, mái che cao thoáng, cho thuê vợt Carbon cao cấp.',
    address: '30 Phan Thúc Duyện, Phường 4, Tân Bình, TP.HCM',
    lat: 10.8041,
    lng: 106.6609,
    images: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear', 'first_aid'],
    subCourts: ['Sân PB 01', 'Sân PB 02', 'Sân PB 03'],
    priceRules: [
      { from: '06:00', to: '16:00', price: 160000, label: 'Ban ngày' },
      { from: '16:00', to: '22:00', price: 240000, label: 'Giờ vàng tối' },
      { from: '22:00', to: '23:00', price: 180000, label: 'Giờ đêm' },
    ],
    attrs: {
      surface: 'Sân cứng Acrylic 5 lớp',
      environment: 'Có mái che thoáng khí',
      courtCountStandard: 3,
      portableNet: true,
      paddleRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.7,
    reviewCount: 64,
    status: 'approved',
    isActive: true,
  },

  // --- CHỦ SÂN B (owner_2): Sao Vàng Sport ---
  // Sân 4: Bóng đá mini 5 người (3 sân con)
  {
    id: 'court_4',
    ownerId: 'owner_2',
    ownerName: 'Lê Hoàng Phong (Sao Vàng Sport)',
    name: 'Sân Bóng Đá Mini 5 Người Sao Vàng',
    sport: 'football',
    type: 'Sân 5 người',
    surface: 'Cỏ nhân tạo',
    description: 'Sân bóng mini 5 người trung tâm Quận 10, cỏ nhân tạo đạt chuẩn châu Âu, có mái lưới chắn bóng an toàn, căn tin phục vụ giải khát.',
    address: '238 Đường 3/2, Phường 12, Quận 10, TP.HCM',
    lat: 10.7712,
    lng: 106.6738,
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear'],
    subCourts: ['Sân 5A', 'Sân 5B', 'Sân 5C'],
    priceRules: [
      { from: '06:00', to: '16:00', price: 200000, label: 'Giờ thường' },
      { from: '16:00', to: '21:00', price: 340000, label: 'Giờ vàng' },
      { from: '21:00', to: '23:00', price: 240000, label: 'Giờ khuya' },
    ],
    attrs: {
      courtType: 'Sân 5 người',
      surface: 'Cỏ nhân tạo',
      dimension: '40x20m (Tiêu chuẩn 5)',
      environment: 'Ngoài trời',
      lighting: true,
      rentGear: true,
      hasTribune: false,
    },
    depositPercent: 20,
    freeCancellationHours: 2,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.6,
    reviewCount: 112,
    status: 'approved',
    isActive: true,
  },
  // Sân 5: Bóng rổ (2 sân con)
  {
    id: 'court_5',
    ownerId: 'owner_2',
    ownerName: 'Lê Hoàng Phong (Sao Vàng Sport)',
    name: 'Sân Bóng Rổ Sao Vàng Arena',
    sport: 'basketball',
    type: 'Sân 5x5',
    surface: 'Sàn gỗ chuyên dụng',
    description: 'Sân bóng rổ trong nhà sàn gỗ Maple tiêu chuẩn NBA, bảng rổ kính cường lực có đệm chống va đập, bảng điểm điện tử hiện đại.',
    address: '238 Đường 3/2, Phường 12, Quận 10, TP.HCM',
    lat: 10.7715,
    lng: 106.6741,
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
      'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear', 'tribune'],
    subCourts: ['Sân Rổ Full 01', 'Sân Rổ 3x3 VIP'],
    priceRules: [
      { from: '06:00', to: '17:00', price: 250000, label: 'Giờ thường' },
      { from: '17:00', to: '22:00', price: 380000, label: 'Giờ cao điểm' },
      { from: '22:00', to: '23:00', price: 280000, label: 'Giờ muộn' },
    ],
    attrs: {
      courtType: 'Sân Full Court 5x5 chuẩn FIBA',
      surface: 'Sàn gỗ Maple chuyên dụng',
      environment: 'Trong nhà',
      hoopCount: 2,
      digitalScoreboard: true,
      ballRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.9,
    reviewCount: 88,
    status: 'approved',
    isActive: true,
  },
  // Sân 6: Tennis (2 sân con)
  {
    id: 'court_6',
    ownerId: 'owner_2',
    ownerName: 'Lê Hoàng Phong (Sao Vàng Sport)',
    name: 'Sân Tennis Sao Vàng Club',
    sport: 'tennis',
    type: 'Sân cứng',
    surface: 'Sân cứng Acrylic',
    description: 'Sân tennis cứng Acrylic tiêu chuẩn ITF, có máy bắn bóng tự động, huấn luyện viên chuyên nghiệp hỗ trợ tập luyện.',
    address: '238 Đường 3/2, Phường 12, Quận 10, TP.HCM',
    lat: 10.7718,
    lng: 106.6735,
    images: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
      'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear'],
    subCourts: ['Sân Tennis T1', 'Sân Tennis T2'],
    priceRules: [
      { from: '06:00', to: '16:00', price: 220000, label: 'Giờ sáng - trưa' },
      { from: '16:00', to: '22:00', price: 350000, label: 'Giờ bật đèn' },
      { from: '22:00', to: '23:00', price: 250000, label: 'Giờ đêm' },
    ],
    attrs: {
      surface: 'Sân cứng Acrylic',
      courtType: 'Sân đôi tiêu chuẩn',
      environment: 'Ngoài trời',
      nightLights: true,
      ballMachine: true,
      hasCoach: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.8,
    reviewCount: 74,
    status: 'approved',
    isActive: true,
  },

  // --- CHỦ SÂN C (owner_3): Arena Hà Nội ---
  // Sân 7: Cầu lông
  {
    id: 'court_7',
    ownerId: 'owner_3',
    ownerName: 'Phạm Thanh Tùng (Arena Hà Nội)',
    name: 'CLB Cầu Lông Arena Cầu Giấy',
    sport: 'badminton',
    type: 'Sân tiêu chuẩn',
    surface: 'Sàn cao su thảm PVC',
    description: 'Sân cầu lông cao cấp khu Cầu Giấy, 5 thảm PVC mới 100%, ánh sáng chuẩn thi đấu, chỗ để xe thoải mái.',
    address: '15 Lê Văn Lương, Trung Hòa, Cầu Giấy, Hà Nội',
    lat: 21.0045,
    lng: 105.8034,
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear'],
    subCourts: ['Sân CG 1', 'Sân CG 2', 'Sân CG 3', 'Sân CG 4', 'Sân CG 5'],
    priceRules: [
      { from: '06:00', to: '17:00', price: 130000, label: 'Giờ thường' },
      { from: '17:00', to: '22:00', price: 180000, label: 'Giờ cao điểm' },
      { from: '22:00', to: '23:00', price: 140000, label: 'Giờ muộn' },
    ],
    attrs: {
      surface: 'Sàn cao su thảm PVC',
      courtType: 'Sân đơn & đôi tiêu chuẩn BWF',
      ceilingHeight: '10m - 12m (Chuẩn giải đấu BWF)',
      antiGlareLighting: true,
      isIndoor: true,
      racketRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 2,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.8,
    reviewCount: 92,
    status: 'approved',
    isActive: true,
  },
  // Sân 8: Bóng chuyền
  {
    id: 'court_8',
    ownerId: 'owner_3',
    ownerName: 'Phạm Thanh Tùng (Arena Hà Nội)',
    name: 'Sân Bóng Chuyền Arena Tây Hồ',
    sport: 'volleyball',
    type: 'Sân trong nhà',
    surface: 'Sàn cao su thảm PVC',
    description: 'Sân bóng chuyền tiêu chuẩn thi đấu quốc gia, sàn cao su đệm đàn hồi giảm chấn thương, chiều cao lưới nam nữ tùy chỉnh.',
    address: '88 Võ Chí Công, Xuân La, Tây Hồ, Hà Nội',
    lat: 21.0562,
    lng: 105.8012,
    images: [
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
      'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear', 'tribune'],
    subCourts: ['Sân BC 01', 'Sân BC 02', 'Sân BC 03'],
    priceRules: [
      { from: '06:00', to: '17:00', price: 200000, label: 'Giờ thường' },
      { from: '17:00', to: '22:00', price: 320000, label: 'Giờ tối' },
      { from: '22:00', to: '23:00', price: 220000, label: 'Giờ đêm' },
    ],
    attrs: {
      courtType: 'Sân trong nhà tiêu chuẩn',
      surface: 'Sàn cao su thảm PVC',
      netHeight: 'Tùy chỉnh linh hoạt',
      ballRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.7,
    reviewCount: 45,
    status: 'approved',
    isActive: true,
  },
  // Sân 9: Pickleball
  {
    id: 'court_9',
    ownerId: 'owner_3',
    ownerName: 'Phạm Thanh Tùng (Arena Hà Nội)',
    name: 'Pickleball Arena Center Hà Nội',
    sport: 'pickleball',
    type: 'Sân tiêu chuẩn',
    surface: 'Sân cứng Acrylic',
    description: 'Cụm 4 sân Pickleball hiện đại bậc nhất Hà Nội, trang bị mái che khí động học, gió mát tự nhiên, khu vực lounge nghỉ ngơi thư giãn.',
    address: '15 Lê Văn Lương, Trung Hòa, Cầu Giấy, Hà Nội',
    lat: 21.0048,
    lng: 105.8038,
    images: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light', 'rent_gear', 'first_aid'],
    subCourts: ['Sân PAC 1', 'Sân PAC 2', 'Sân PAC 3', 'Sân PAC 4'],
    priceRules: [
      { from: '06:00', to: '16:00', price: 150000, label: 'Giờ sáng - chiều' },
      { from: '16:00', to: '22:00', price: 230000, label: 'Giờ vàng' },
      { from: '22:00', to: '23:00', price: 170000, label: 'Giờ đêm' },
    ],
    attrs: {
      surface: 'Sân cứng Acrylic 5 lớp',
      environment: 'Có mái che thoáng khí',
      courtCountStandard: 4,
      portableNet: true,
      paddleRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    rating: 4.9,
    reviewCount: 82,
    status: 'approved',
    isActive: true,
  },

  // --- SÂN CỦA CHỦ SÂN D (owner_4, status pending) ---
  {
    id: 'court_10',
    ownerId: 'owner_4',
    ownerName: 'Đặng Quốc Bảo (Diamond Club)',
    name: 'Sân Diamond Pickleball Tây Hồ',
    sport: 'pickleball',
    type: 'Sân tiêu chuẩn',
    surface: 'Sân cứng Acrylic',
    description: 'Sân mới hoàn thiện tại quận Tây Hồ, đang chờ kiểm định nghiệm thu hệ thống thoát nước và chiếu sáng.',
    address: '88 Hoàng Hoa Thám, Tây Hồ, Hà Nội',
    lat: 21.0412,
    lng: 105.8198,
    images: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
    ],
    amenities: ['parking', 'wifi', 'light', 'shower'],
    subCourts: ['Sân Diamond 1', 'Sân Diamond 2'],
    priceRules: [
      { from: '06:00', to: '22:00', price: 160000, label: 'Đồng giá khai trương' },
    ],
    attrs: {
      surface: 'Sân cứng Acrylic 5 lớp',
      environment: 'Ngoài trời',
      courtCountStandard: 2,
      portableNet: true,
      paddleRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '22:00',
    slotDurationMinutes: 60,
    rating: 5.0,
    reviewCount: 0,
    status: 'pending', // Chờ Admin duyệt
    isActive: true,
  },

  // --- SÂN CHỜ DUYỆT CỦA OWNER 1 ĐỂ DEMO MODERATION ---
  {
    id: 'court_11',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    name: 'Cụm Sân Pickleball Chảo Lửa Mở Rộng',
    sport: 'pickleball',
    type: 'Sân tiêu chuẩn',
    surface: 'Sân cứng Acrylic',
    description: 'Giai đoạn 2 của tổ hợp Chảo Lửa, bổ sung 4 sân Pickleball cao cấp chuẩn giải đấu quốc tế.',
    address: '30 Phan Thúc Duyện, Phường 4, Tân Bình, TP.HCM',
    lat: 10.8045,
    lng: 106.6620,
    images: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
    ],
    amenities: ['parking', 'canteen', 'wifi', 'shower', 'light'],
    subCourts: ['Sân PB Khí Cầu 1', 'Sân PB Khí Cầu 2'],
    priceRules: [
      { from: '06:00', to: '22:00', price: 200000, label: 'Giá tiêu chuẩn' },
    ],
    attrs: {
      surface: 'Sân cứng Acrylic 5 lớp',
      environment: 'Có mái che thoáng khí',
      courtCountStandard: 2,
      portableNet: true,
      paddleRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 4,
    openTime: '06:00',
    closeTime: '22:00',
    slotDurationMinutes: 60,
    rating: 5.0,
    reviewCount: 0,
    status: 'pending', // Chờ duyệt
    isActive: true,
  },

  // --- SÂN BỊ TỪ CHỐI (REJECTED) CÓ LÝ DO ĐỂ DEMO ---
  {
    id: 'court_12',
    ownerId: 'owner_2',
    ownerName: 'Lê Hoàng Phong (Sao Vàng Sport)',
    name: 'Sân Cầu Lông Sao Vàng Quận 7',
    sport: 'badminton',
    type: 'Sân tiêu chuẩn',
    surface: 'Sàn cao su thảm PVC',
    description: 'Chi nhánh cầu lông mới tại Quận 7, đang hoàn thiện thêm giấy phép an toàn PCCC.',
    address: '102 Nguyễn Thị Thập, Tân Phú, Quận 7, TP.HCM',
    lat: 10.7412,
    lng: 106.7188,
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
    ],
    amenities: ['parking', 'light'],
    subCourts: ['Sân Q7-1', 'Sân Q7-2'],
    priceRules: [
      { from: '06:00', to: '22:00', price: 140000, label: 'Giá thử nghiệm' },
    ],
    attrs: {
      surface: 'Sàn cao su thảm PVC',
      courtType: 'Sân đôi phong trào',
      ceilingHeight: '8m - 9m (Tiêu chuẩn CLB)',
      antiGlareLighting: false,
      isIndoor: true,
      racketRental: true,
    },
    depositPercent: 30,
    freeCancellationHours: 2,
    openTime: '06:00',
    closeTime: '22:00',
    slotDurationMinutes: 60,
    rating: 0,
    reviewCount: 0,
    status: 'rejected',
    rejectReason: 'Ảnh chụp mặt sân không rõ ràng và thông tin biên bản an toàn PCCC cơ sở chưa hoàn thiện. Vui lòng cập nhật lại giấy tờ.',
    isActive: false,
  },
];

// Hàm sinh 70+ Bookings phân bổ 90 ngày tương đối với ngày hiện tại
const generateSeedBookings = () => {
  const bookings = [];
  const now = dayjs();
  const users = SEED_USERS.filter((u) => u.role === 'user');
  
  // Chỉ lấy các sân approved để tạo lịch đặt
  const activeCourts = SEED_COURTS.filter((c) => c.status === 'approved');

  let idCounter = 1;

  // 1. Một số đơn ĐẶC BIỆT cho ngày HÔM NAY (pending, confirmed, checked_in) để trải nghiệm liền tay
  const todayStr = now.format('YYYY-MM-DD');
  
  // Đơn 1: Hôm nay, Chảo Lửa, pending, tiền mặt (để chủ sân A thấy ngay nút Duyệt)
  bookings.push({
    id: `b_${String(idCounter++).padStart(3, '0')}`,
    code: `DS-${now.format('YYMMDD')}-1001`,
    userId: 'user_1',
    userName: 'Hoàng Trọng Nghĩa',
    userPhone: '0981112233',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    courtId: 'court_1',
    courtName: 'Sân Bóng Đá Mini Chảo Lửa 7 Người',
    subCourt: 'Sân 7A1',
    date: todayStr,
    startTime: '18:00',
    endTime: '19:00',
    totalPrice: 480000,
    deposit: 150000,
    voucherCode: null,
    discountAmount: 0,
    finalAmount: 480000,
    paymentMethod: 'cash',
    status: 'pending', // Chờ duyệt
    extraCharges: [],
    payments: [],
    amountPaid: 0,
    remaining: 480000,
    paymentStatus: 'unpaid',
    qrPayload: JSON.stringify({ code: `DS-${now.format('YYMMDD')}-1001`, courtId: 'court_1' }),
    createdAt: now.subtract(2, 'hour').toISOString(),
  });

  // Đơn 2: Hôm nay, Chảo Lửa, confirmed, đã trả QR đủ (sẵn sàng check-in)
  bookings.push({
    id: `b_${String(idCounter++).padStart(3, '0')}`,
    code: `DS-${now.format('YYMMDD')}-1002`,
    userId: 'user_2',
    userName: 'Võ Thị Thanh Thảo',
    userPhone: '0982223344',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    courtId: 'court_2',
    courtName: 'Sân Cầu Lông Chảo Lửa Center',
    subCourt: 'Sân CL 01',
    date: todayStr,
    startTime: '19:00',
    endTime: '20:00',
    totalPrice: 170000,
    deposit: 50000,
    voucherCode: 'GIAMGIA10',
    discountAmount: 17000,
    finalAmount: 153000,
    paymentMethod: 'qr',
    status: 'confirmed', // Đã duyệt, có thể check-in
    approvedAt: now.subtract(4, 'hour').toISOString(),
    extraCharges: [],
    payments: [
      {
        id: `pay_${Date.now()}_1`,
        type: 'full',
        method: 'qr',
        amount: 153000,
        at: now.subtract(5, 'hour').toISOString(),
        note: 'Thanh toán trực tuyến mã QR',
      },
    ],
    amountPaid: 153000,
    remaining: 0,
    paymentStatus: 'paid',
    qrPayload: JSON.stringify({ code: `DS-${now.format('YYMMDD')}-1002`, courtId: 'court_2' }),
    createdAt: now.subtract(5, 'hour').toISOString(),
  });

  // Đơn 3: Hôm nay, Chảo Lửa, checked_in, đang thi đấu, có phát sinh nước uống
  bookings.push({
    id: `b_${String(idCounter++).padStart(3, '0')}`,
    code: `DS-${now.format('YYMMDD')}-1003`,
    userId: 'user_3',
    userName: 'Hoàng Minh Tuấn',
    userPhone: '0983334455',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    courtId: 'court_3',
    courtName: 'Sân Pickleball Chảo Lửa Pro',
    subCourt: 'Sân PB 01',
    date: todayStr,
    startTime: '17:00',
    endTime: '18:00',
    totalPrice: 240000,
    deposit: 80000,
    voucherCode: null,
    discountAmount: 0,
    finalAmount: 240000,
    paymentMethod: 'cash',
    status: 'checked_in', // Đang thi đấu
    approvedAt: now.subtract(3, 'hour').toISOString(),
    checkedInAt: now.subtract(30, 'minute').toISOString(),
    extraCharges: [
      { id: 'ec_1', name: '4 chai Pocari Sweat', amount: 60000, at: now.subtract(15, 'minute').toISOString() },
      { id: 'ec_2', name: 'Thuê 2 vợt Carbon', amount: 40000, at: now.subtract(25, 'minute').toISOString() },
    ],
    payments: [
      {
        id: `pay_${Date.now()}_2`,
        type: 'deposit',
        method: 'cash',
        amount: 80000,
        at: now.subtract(3, 'hour').toISOString(),
        note: 'Tiền cọc giữ sân',
        recordedBy: 'Chủ sân',
      },
    ],
    amountPaid: 80000,
    remaining: 260000, // 240k + 100k - 80k
    paymentStatus: 'partial',
    qrPayload: JSON.stringify({ code: `DS-${now.format('YYMMDD')}-1003`, courtId: 'court_3' }),
    createdAt: now.subtract(6, 'hour').toISOString(),
  });

  // Đơn 4: Hôm nay, Sao Vàng Sport, pending
  bookings.push({
    id: `b_${String(idCounter++).padStart(3, '0')}`,
    code: `DS-${now.format('YYMMDD')}-1004`,
    userId: 'user_4',
    userName: 'Lê Văn Nam',
    userPhone: '0984445566',
    ownerId: 'owner_2',
    ownerName: 'Lê Hoàng Phong (Sao Vàng Sport)',
    courtId: 'court_4',
    courtName: 'Sân Bóng Đá Mini 5 Người Sao Vàng',
    subCourt: 'Sân 5A',
    date: todayStr,
    startTime: '20:00',
    endTime: '21:00',
    totalPrice: 340000,
    deposit: 100000,
    voucherCode: null,
    discountAmount: 0,
    finalAmount: 340000,
    paymentMethod: 'cash',
    status: 'pending',
    extraCharges: [],
    payments: [],
    amountPaid: 0,
    remaining: 340000,
    paymentStatus: 'unpaid',
    qrPayload: JSON.stringify({ code: `DS-${now.format('YYMMDD')}-1004`, courtId: 'court_4' }),
    createdAt: now.subtract(1, 'hour').toISOString(),
  });

  // 2. Tạo 65+ đơn rải trong 90 ngày qua (dựa trên dayjs().subtract(X, 'day'))
  const hours = ['07:00', '08:00', '09:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  
  for (let i = 1; i <= 68; i++) {
    // Phân bổ ngày: 70% rơi vào 30 ngày gần nhất, 30% trong khoảng 31-90 ngày trước
    const daysAgo = i <= 48 ? Math.floor(Math.random() * 28) + 1 : Math.floor(Math.random() * 60) + 30;
    const targetDate = now.subtract(daysAgo, 'day');
    const isWeekend = targetDate.day() === 0 || targetDate.day() === 6;

    const court = activeCourts[i % activeCourts.length];
    const user = users[i % users.length];
    const subCourt = court.subCourts[(i * 3) % court.subCourts.length];

    // Khung giờ: cuối tuần hoặc giờ vàng xác suất cao hơn
    const startHour = isWeekend ? hours[i % hours.length] : hours[(i % 4) + 5]; // 17h, 18h, 19h, 20h
    const startH = parseInt(startHour.split(':')[0], 10);
    const endHour = `${String(startH + 1).padStart(2, '0')}:00`;

    // Tính giá theo priceRules
    let pricePerHour = 200000;
    for (const rule of court.priceRules) {
      if (startHour >= rule.from && startHour < rule.to) {
        pricePerHour = rule.price;
        break;
      }
    }

    const hasVoucher = i % 4 === 0;
    const discountAmount = hasVoucher ? 30000 : 0;
    const finalAmount = Math.max(100000, pricePerHour - discountAmount);

    // Trạng thái theo thời gian:
    // Quá khứ (> 2 ngày trước): chủ yếu completed, một số ít cancelled, rejected, no_show
    let status = 'completed';
    const rand = Math.random();
    if (daysAgo > 3) {
      if (rand < 0.8) status = 'completed';
      else if (rand < 0.88) status = 'cancelled';
      else if (rand < 0.94) status = 'rejected';
      else status = 'no_show';
    } else {
      if (rand < 0.6) status = 'completed';
      else if (rand < 0.8) status = 'confirmed';
      else status = 'pending';
    }

    // Thanh toán
    const isQR = i % 3 !== 0;
    const payments = [];
    const extraCharges = [];

    if (status === 'completed') {
      // Có thể có phát sinh nước uống
      if (i % 3 === 0) {
        extraCharges.push({
          id: `ec_${i}_1`,
          name: 'Nước suối Aquafina (3 chai)',
          amount: 30000,
          at: targetDate.set('hour', startH).toISOString(),
        });
      }

      const totalDue = finalAmount + (extraCharges[0]?.amount || 0);

      if (isQR) {
        // Trả trước qua QR
        payments.push({
          id: `pay_${i}_1`,
          type: 'full',
          method: 'qr',
          amount: finalAmount,
          at: targetDate.subtract(1, 'day').toISOString(),
          note: 'Thanh toán trực tuyến quét QR',
        });
        if (extraCharges.length > 0) {
          payments.push({
            id: `pay_${i}_2`,
            type: 'extra',
            method: 'cash',
            amount: extraCharges[0].amount,
            at: targetDate.set('hour', startH + 1).toISOString(),
            note: 'Thanh toán phát sinh tiền mặt',
            recordedBy: court.ownerName,
          });
        }
      } else {
        // Trả tiền mặt tại quầy khi xong
        payments.push({
          id: `pay_${i}_cash`,
          type: 'full',
          method: 'cash',
          amount: totalDue,
          at: targetDate.set('hour', startH + 1).toISOString(),
          note: 'Thu tiền mặt tại sân lúc check-out',
          recordedBy: court.ownerName,
        });
      }
    } else if (status === 'confirmed') {
      if (isQR) {
        payments.push({
          id: `pay_${i}_qr`,
          type: 'full',
          method: 'qr',
          amount: finalAmount,
          at: targetDate.subtract(2, 'hour').toISOString(),
          note: 'Thanh toán QR',
        });
      } else {
        payments.push({
          id: `pay_${i}_dep`,
          type: 'deposit',
          method: 'cash',
          amount: Math.round(finalAmount * 0.3),
          at: targetDate.subtract(4, 'hour').toISOString(),
          note: 'Đặt cọc tiền mặt',
          recordedBy: court.ownerName,
        });
      }
    } else if (status === 'cancelled') {
      if (isQR) {
        payments.push({
          id: `pay_${i}_refund`,
          type: 'refund',
          method: 'qr',
          amount: finalAmount,
          at: targetDate.toISOString(),
          note: 'Hoàn tiền do khách hủy đúng hạn',
        });
      }
    }

    const totalExtra = extraCharges.reduce((s, c) => s + c.amount, 0);
    const totalDue = finalAmount + totalExtra;
    let amountPaid = 0;
    for (const p of payments) {
      if (p.type === 'refund') amountPaid -= p.amount;
      else amountPaid += p.amount;
    }
    amountPaid = Math.max(0, amountPaid);
    const remaining = Math.max(0, totalDue - amountPaid);

    let paymentStatus = 'unpaid';
    if (status === 'cancelled' && payments.some((p) => p.type === 'refund')) paymentStatus = 'refunded';
    else if (remaining === 0 && totalDue > 0) paymentStatus = 'paid';
    else if (amountPaid > 0) paymentStatus = 'partial';

    const createdAt = targetDate.subtract(Math.floor(Math.random() * 24) + 2, 'hour').toISOString();

    bookings.push({
      id: `b_${String(idCounter++).padStart(3, '0')}`,
      code: `DS-${targetDate.format('YYMMDD')}-${1000 + i}`,
      userId: user.id,
      userName: user.fullName,
      userPhone: user.phone,
      ownerId: court.ownerId,
      ownerName: court.ownerName,
      courtId: court.id,
      courtName: court.name,
      subCourt: subCourt,
      date: targetDate.format('YYYY-MM-DD'),
      startTime: startHour,
      endTime: endHour,
      totalPrice: pricePerHour,
      deposit: Math.round(pricePerHour * 0.3),
      voucherCode: hasVoucher ? 'GIAMGIA10' : null,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      paymentMethod: isQR ? 'qr' : 'cash',
      status: status,
      rejectReason: status === 'rejected' ? 'Sân bận bảo trì định kỳ' : null,
      approvedAt: ['confirmed', 'checked_in', 'completed'].includes(status) ? targetDate.subtract(3, 'hour').toISOString() : null,
      checkedInAt: ['checked_in', 'completed'].includes(status) ? targetDate.set('hour', startH).toISOString() : null,
      checkedOutAt: status === 'completed' ? targetDate.set('hour', startH + 1).toISOString() : null,
      completedAt: status === 'completed' ? targetDate.set('hour', startH + 1).toISOString() : null,
      cancelledAt: status === 'cancelled' ? targetDate.toISOString() : null,
      rejectedAt: status === 'rejected' ? targetDate.toISOString() : null,
      extraCharges,
      payments,
      amountPaid,
      remaining,
      paymentStatus,
      qrPayload: JSON.stringify({ code: `DS-${targetDate.format('YYMMDD')}-${1000 + i}`, courtId: court.id }),
      createdAt,
    });
  }

  // 3. Vài đơn cho ngày mai & ngày mốt (tương lai)
  for (let f = 1; f <= 5; f++) {
    const futureDate = now.add(f <= 2 ? 1 : 2, 'day');
    const court = activeCourts[f % activeCourts.length];
    const user = users[f % users.length];
    const subCourt = court.subCourts[0];
    const startHour = '19:00';
    const endHour = '20:00';
    const price = court.priceRules[1]?.price || 300000;

    bookings.push({
      id: `b_${String(idCounter++).padStart(3, '0')}`,
      code: `DS-${futureDate.format('YYMMDD')}-${2000 + f}`,
      userId: user.id,
      userName: user.fullName,
      userPhone: user.phone,
      ownerId: court.ownerId,
      ownerName: court.ownerName,
      courtId: court.id,
      courtName: court.name,
      subCourt: subCourt,
      date: futureDate.format('YYYY-MM-DD'),
      startTime: startHour,
      endTime: endHour,
      totalPrice: price,
      deposit: Math.round(price * 0.3),
      voucherCode: null,
      discountAmount: 0,
      finalAmount: price,
      paymentMethod: f % 2 === 0 ? 'qr' : 'cash',
      status: f % 2 === 0 ? 'confirmed' : 'pending',
      approvedAt: f % 2 === 0 ? now.toISOString() : null,
      extraCharges: [],
      payments: f % 2 === 0 ? [{ id: `pay_fut_${f}`, type: 'full', method: 'qr', amount: price, at: now.toISOString(), note: 'Đã thanh toán trước' }] : [],
      amountPaid: f % 2 === 0 ? price : 0,
      remaining: f % 2 === 0 ? 0 : price,
      paymentStatus: f % 2 === 0 ? 'paid' : 'unpaid',
      qrPayload: JSON.stringify({ code: `DS-${futureDate.format('YYMMDD')}-${2000 + f}`, courtId: court.id }),
      createdAt: now.toISOString(),
    });
  }

  return bookings;
};

export const SEED_BOOKINGS = generateSeedBookings();

// Khung giờ bị khóa bởi chủ sân
export const SEED_BLOCKED_SLOTS = [
  {
    id: 'bs_1',
    courtId: 'court_1',
    ownerId: 'owner_1',
    subCourt: 'Sân 7A1',
    date: dayjs().format('YYYY-MM-DD'),
    from: '14:00',
    to: '16:00',
    reason: 'Bảo trì dàn đèn cao áp',
    type: 'maintenance',
  },
  {
    id: 'bs_2',
    courtId: 'court_1',
    ownerId: 'owner_1',
    subCourt: 'Sân 7A2',
    date: dayjs().format('YYYY-MM-DD'),
    from: '17:00',
    to: '19:00',
    reason: 'Đội bóng FC Bách Khoa thuê cố định tháng',
    type: 'fixed',
  },
  {
    id: 'bs_3',
    courtId: 'court_4',
    ownerId: 'owner_2',
    subCourt: 'Sân 5B',
    date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    from: '18:00',
    to: '20:00',
    reason: 'Lớp năng khiếu bóng đá thiếu nhi',
    type: 'fixed',
  },
];

// Đánh giá thực tế của khách hàng trên toàn hệ thống
export const SEED_REVIEWS = [
  {
    id: 'rev_1',
    courtId: 'court_1',
    courtName: 'Cụm Sân Bóng Đá Chảo Lửa Tân Bình',
    userId: 'user_1',
    userName: 'Hoàng Trọng Nghĩa',
    userAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    rating: 5,
    comment: 'Mặt cỏ sân 7 rất êm chân, dàn đèn cực sáng không bị chói. Có chỗ đậu xe ô tô rất tiện lợi và an ninh!',
    status: 'approved',
    createdAt: dayjs().subtract(2, 'day').toISOString(),
  },
  {
    id: 'rev_2',
    courtId: 'court_2',
    courtName: 'Sân Cầu Lông Lan Anh Club',
    userId: 'user_2',
    userName: 'Võ Thị Thanh Thảo',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    rating: 5,
    comment: 'Thảm PVC mới tinh bám chân tốt, trần cao không bị bí gió, chủ sân hỗ trợ nhiệt tình.',
    status: 'approved',
    createdAt: dayjs().subtract(4, 'day').toISOString(),
  },
  {
    id: 'rev_3',
    courtId: 'court_3',
    courtName: 'Sân Pickleball Saigon South',
    userId: 'user_3',
    userName: 'Hoàng Minh Tuấn',
    userAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400',
    rating: 5,
    comment: 'Sân Pickleball đẹp nhất khu vực, bóng nảy chuẩn, có sẵn vợt xịn cho thuê trải nghiệm.',
    status: 'approved',
    createdAt: dayjs().subtract(5, 'day').toISOString(),
  },
  {
    id: 'rev_4',
    courtId: 'court_1',
    courtName: 'Cụm Sân Bóng Đá Chảo Lửa Tân Bình',
    userId: 'user_4',
    userName: 'Lê Văn Nam',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    rating: 4,
    comment: 'Sân đá rất thích, nhưng phòng thay đồ cuối tuần hơi đông. Nên bổ sung thêm móc treo quần áo.',
    status: 'approved',
    createdAt: dayjs().subtract(6, 'day').toISOString(),
  },
  {
    id: 'rev_5',
    courtId: 'court_4',
    courtName: 'Sân Bóng Đá Mini 5 Người Sao Vàng',
    userId: 'user_2',
    userName: 'Võ Thị Thanh Thảo',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    rating: 3,
    comment: 'Lưới khung thành bị rách một đoạn góc trên, đá bóng hay bị văng ra sau sân, đề nghị chủ sân vá lại sớm.',
    status: 'approved',
    createdAt: dayjs().subtract(8, 'day').toISOString(),
  },
  {
    id: 'rev_6',
    courtId: 'court_5',
    courtName: 'CLB Cầu Lông Sao Vàng Quận 10',
    userId: 'user_1',
    userName: 'Hoàng Trọng Nghĩa',
    userAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    rating: 2,
    comment: 'Hôm qua đèn ở sân số 2 bị chớp liên tục gây lóa mắt khi đập cầu. Quản lý cần kiểm tra đường điện.',
    status: 'approved',
    createdAt: dayjs().subtract(10, 'day').toISOString(),
  },
  {
    id: 'rev_7',
    courtId: 'court_2',
    courtName: 'Sân Cầu Lông Lan Anh Club',
    userId: 'user_3',
    userName: 'Hoàng Minh Tuấn',
    userAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400',
    rating: 1,
    comment: 'Quảng cáo link cá độ bóng đá lừa đảo liên hệ 0999xxx để nhận thưởng...',
    status: 'hidden', // Đã bị Admin ẩn do vi phạm tiêu chuẩn cộng đồng
    createdAt: dayjs().subtract(12, 'day').toISOString(),
  },
];

// Giải đấu
export const SEED_TOURNAMENTS = [
  {
    id: 'tour_1',
    ownerId: 'owner_1',
    name: 'Giải Bóng Đá 7 Người Chảo Lửa Cup 2026',
    sport: 'football',
    cover: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
    prize: '15.000.000đ + Cúp Vô Địch',
    fee: 500000,
    maxTeams: 16,
    registerFrom: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
    registerTo: dayjs().add(10, 'day').format('YYYY-MM-DD'),
    rules: 'Thi đấu luật bóng đá 7 người. Mỗi đội tối đa 14 cầu thủ.',
    status: 'open',
    teams: [
      { id: 'tm_1', name: 'FC Bách Khoa', captain: 'Hoàng Trọng Nghĩa', phone: '0981112233', status: 'approved' },
      { id: 'tm_2', name: 'FC IT Devs', captain: 'Hoàng Minh Tuấn', phone: '0983334455', status: 'pending' },
    ],
    matches: [],
    standings: [],
    createdAt: dayjs().subtract(12, 'day').toISOString(),
  },
  {
    id: 'tour_2',
    ownerId: 'owner_2',
    name: 'Giải Tennis Sao Vàng Open Mở Rộng',
    sport: 'tennis',
    cover: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    prize: '10.000.000đ',
    fee: 400000,
    maxTeams: 16,
    registerFrom: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    registerTo: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    rules: 'Nội dung đôi nam phong trào.',
    status: 'open',
    teams: [],
    matches: [],
    standings: [],
    createdAt: dayjs().subtract(7, 'day').toISOString(),
  },
  {
    id: 'tour_3',
    ownerId: 'owner_1',
    ownerName: 'Nguyễn Văn Minh (Chảo Lửa Sport)',
    name: 'Giải Pickleball Đôi Nam Nữ Tranh Cúp Tân Bình 2026',
    sport: 'pickleball',
    cover: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
    prize: '8.000.000đ + Huy Chương Vàng',
    fee: 300000,
    maxTeams: 16,
    registerFrom: dayjs().format('YYYY-MM-DD'),
    registerTo: dayjs().add(18, 'day').format('YYYY-MM-DD'),
    rules: 'Thi đấu theo luật Pickleball quốc tế USAPA. Vòng bảng 1 set 11 điểm chạm 11 cách biệt 2. Bán kết và Chung kết 3 set 11 điểm.',
    status: 'pending', // Chờ Admin kiểm duyệt
    teams: [],
    matches: [],
    standings: [],
    createdAt: dayjs().subtract(1, 'day').toISOString(),
  },
];

// Vouchers
export const SEED_VOUCHERS = [
  {
    id: 'v_1',
    code: 'GIAMGIA10',
    discountPercent: 10,
    discountAmount: null,
    maxDiscount: 50000,
    minOrder: 150000,
    expiresAt: '2026-12-31',
    title: 'Giảm 10% đơn đặt sân',
    description: 'Áp dụng cho mọi môn thể thao từ 150k (tối đa 50k)',
  },
  {
    id: 'v_2',
    code: 'SINHVIEN15',
    discountPercent: 15,
    discountAmount: null,
    maxDiscount: 70000,
    minOrder: 100000,
    expiresAt: '2026-12-31',
    title: 'Ưu đãi sinh viên 15%',
    description: 'Dành riêng cho sinh viên thể thao năng động',
  },
  {
    id: 'v_3',
    code: 'DATSAN50K',
    discountPercent: null,
    discountAmount: 50000,
    maxDiscount: 50000,
    minOrder: 300000,
    expiresAt: '2026-11-30',
    title: 'Giảm ngay 50.000đ',
    description: 'Áp dụng cho đơn đặt sân trên 300.000đ',
  },
];

// Thông báo hệ thống
export const SEED_NOTIFICATIONS = [
  {
    id: 'notif_1',
    userId: 'user_1',
    title: 'Đặt sân thành công 🎉',
    body: 'Lịch đặt Sân Cầu Lông Chảo Lửa Center lúc 19:00 đã được duyệt. Mở mã QR khi tới sân nhé!',
    type: 'booking_confirmed',
    read: false,
    createdAt: dayjs().subtract(3, 'hour').toISOString(),
  },
  {
    id: 'notif_2',
    userId: 'owner_1',
    title: 'Có lịch đặt sân mới 📋',
    body: 'Khách hàng Hoàng Trọng Nghĩa vừa đặt Sân 7A1 lúc 18:00 hôm nay. Vui lòng kiểm tra và duyệt.',
    type: 'booking_new',
    read: false,
    createdAt: dayjs().subtract(2, 'hour').toISOString(),
  },
  {
    id: 'notif_3',
    userId: 'owner_2',
    title: 'Có lịch đặt sân mới 📋',
    body: 'Khách hàng Lê Văn Nam vừa đặt Sân 5A lúc 20:00 hôm nay.',
    type: 'booking_new',
    read: false,
    createdAt: dayjs().subtract(1, 'hour').toISOString(),
  },
];

// Khiếu nại
export const SEED_COMPLAINTS = [
  {
    id: 'comp_1',
    bookingId: 'b_003',
    userId: 'user_6',
    userName: 'Đoàn Nhật Nam',
    ownerId: 'owner_1',
    courtName: 'Sân Bóng Đá Mini Chảo Lửa 7 Người',
    content: 'Chủ sân từ chối lịch đặt sát giờ nhưng tiền cọc chưa thấy hoàn trả.',
    status: 'new',
    adminNote: 'Đang liên hệ chủ sân để giải quyết hoàn tiền cọc.',
    createdAt: dayjs().subtract(2, 'day').toISOString(),
  },
];
