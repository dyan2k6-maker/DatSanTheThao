import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { ChipGroup } from '../components/ui/ChipGroup';
import { SPORTS, AMENITIES } from '../constants/sports';
import { db } from '../services/db';
import { notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

const PROVINCES = [
  {
    label: 'TP. Hồ Chí Minh',
    value: 'TP. Hồ Chí Minh',
    districts: ['Quận 1', 'Quận 3', 'Quận 7', 'Quận 10', 'Tân Bình', 'Bình Thạnh', 'TP. Thủ Đức', 'Gò Vấp'],
  },
  {
    label: 'Hà Nội',
    value: 'Hà Nội',
    districts: ['Ba Đình', 'Hoàn Kiếm', 'Cầu Giấy', 'Tây Hồ', 'Đống Đa', 'Thanh Xuân', 'Nam Từ Liêm'],
  },
  {
    label: 'Đà Nẵng',
    value: 'Đà Nẵng',
    districts: ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Cẩm Lệ'],
  },
];

const DEFAULT_IMAGES_BY_SPORT = {
  football: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
  badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
  pickleball: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
  tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
  basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
  volleyball: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
};

export default function CourtCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  // Form State
  const [name, setName] = useState('');
  const [sport, setSport] = useState('football');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState('TP. Hồ Chí Minh');
  const [district, setDistrict] = useState('Tân Bình');
  const [streetAddress, setStreetAddress] = useState('');

  // Sân con
  const [subCourtNames, setSubCourtNames] = useState(['Sân 1', 'Sân 2', 'Sân 3']);
  const [newSubCourtName, setNewSubCourtName] = useState('');

  // Giờ & Giá
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [priceNormal, setPriceNormal] = useState('200000');
  const [pricePeak, setPricePeak] = useState('350000');
  const [priceNight, setPriceNight] = useState('250000');

  // Chính sách & Tiện ích
  const [depositPercent, setDepositPercent] = useState('30');
  const [freeCancellationHours, setFreeCancellationHours] = useState('4');
  const [amenities, setAmenities] = useState(['parking', 'wifi', 'shower', 'light']);

  // Hình ảnh
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGES_BY_SPORT.football);
  const [submitting, setSubmitting] = useState(false);

  // Thêm sân con
  const handleAddSubCourt = () => {
    if (!newSubCourtName.trim()) return;
    setSubCourtNames((prev) => [...prev, newSubCourtName.trim()]);
    setNewSubCourtName('');
  };

  const handleRemoveSubCourt = (index) => {
    if (subCourtNames.length <= 1) {
      notify('Lưu ý', 'Cụm sân phải có ít nhất 1 sân thi đấu con.');
      return;
    }
    setSubCourtNames((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Đổi môn thể thao -> đổi luôn ảnh mẫu tương ứng
  const handleSelectSport = (sportId) => {
    setSport(sportId);
    setImageUrl(DEFAULT_IMAGES_BY_SPORT[sportId] || DEFAULT_IMAGES_BY_SPORT.football);
  };

  // Submit gửi yêu cầu kiểm duyệt sân
  const handleSubmit = async () => {
    if (!name.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập tên cụm sân thể thao');
      return;
    }
    if (!streetAddress.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập số nhà, tên đường chi tiết');
      return;
    }
    if (!phone.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ đặt sân');
      return;
    }

    try {
      setSubmitting(true);
      const fullAddress = `${streetAddress.trim()}, ${district}, ${province}`;

      const priceRules = [
        { from: '06:00', to: '16:00', price: Number(priceNormal) || 200000, label: 'Giờ thường' },
        { from: '16:00', to: '21:00', price: Number(pricePeak) || 350000, label: 'Giờ vàng' },
        { from: '21:00', to: '23:00', price: Number(priceNight) || 250000, label: 'Giờ đêm' },
      ];

      const newCourt = {
        ownerId: user?.id,
        ownerName: user?.courtClusterName || user?.fullName || 'Chủ sân đối tác',
        name: name.trim(),
        sport,
        description: description.trim() || `Cụm sân ${name.trim()} tiêu chuẩn chất lượng cao, đầy đủ tiện ích và ánh sáng.`,
        phone: phone.trim(),
        address: fullAddress,
        type: 'Sân tiêu chuẩn thi đấu',
        surface: sport === 'football' ? 'Cỏ nhân tạo 5cm' : sport === 'badminton' ? 'Thảm PVC chuyên dụng' : 'Acrylic 5 lớp',
        subCourts: subCourtNames,
        openTime,
        closeTime,
        slotDurationMinutes: 60,
        priceRules,
        depositPercent: Number(depositPercent) || 30,
        freeCancellationHours: Number(freeCancellationHours) || 4,
        amenities,
        images: [imageUrl],
        rating: 5.0,
        reviewCount: 0,
        status: 'pending', // Chờ Ban Quản Trị Admin phê duyệt
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await db.add('courts', newCourt);

      // Gửi thông báo tới Ban Quản Trị Admin
      const admins = await db.getAll('users', (u) => u.role === 'admin');
      for (const adm of admins) {
        await db.add('notifications', {
          userId: adm.id,
          title: 'Sân mới cần kiểm duyệt 🏛️',
          body: `Chủ sân ${user?.fullName} vừa đăng ký cụm sân "${newCourt.name}" (${newCourt.address}). Vui lòng vào kiểm duyệt.`,
          type: 'court_pending',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      notify(
        'Gửi yêu cầu thành công 🎉',
        'Sân của bạn đang ở trạng thái "Chờ Admin duyệt". Sau khi Ban quản trị kiểm duyệt hồ sơ, sân sẽ chính thức xuất hiện trên ứng dụng!'
      );

      safeBack(router, '/(owner)/courts');
    } catch (err) {
      notify('Lỗi lưu sân', err.message || 'Không thể gửi yêu cầu tạo sân');
    } finally {
      setSubmitting(false);
    }
  };

  const currentProvinceObj = PROVINCES.find((p) => p.value === province) || PROVINCES[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Đăng ký thêm sân mới"
        showBack
        onBack={() => safeBack(router, '/(owner)/courts')}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER THÔNG BÁO QUY TRÌNH DUYỆT */}
        <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          <Ionicons name="information-circle" size={24} color="#D97706" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.alertTitle}>Quy trình kiểm duyệt sân mới</Text>
            <Text style={styles.alertDesc}>
              Sau khi bạn nhấn "Gửi yêu cầu", sân sẽ ở trạng thái <Text style={{ fontWeight: '800' }}>"Chờ duyệt"</Text> và được chuyển trực tiếp tới Admin để kiểm định hồ sơ, giấy phép trước khi xuất bản công khai.
            </Text>
          </View>
        </View>

        {/* 1. MÔN THỂ THAO */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Môn thể thao</Text>
          <View style={styles.sportsGrid}>
            {SPORTS.map((s) => {
              const isSelected = sport === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.sportCard,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => handleSelectSport(s.id)}
                >
                  <Ionicons
                    name={s.icon || 'football'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sportText,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. THÔNG TIN CỤM SÂN */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Thông tin cụm sân</Text>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Tên cụm sân thể thao *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            placeholder="VD: Cụm Sân Bóng Đá Chảo Lửa Tân Bình"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Số điện thoại liên hệ đặt sân *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            placeholder="Số điện thoại của bạn"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Mô tả cụm sân</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            placeholder="Mô tả cơ sở vật chất, hệ thống chiếu sáng, không gian nghỉ ngơi..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* 3. ĐỊA CHỈ & VỊ TRÍ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Địa chỉ cụm sân</Text>

          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tỉnh / Thành phố *</Text>
              <Select
                options={PROVINCES.map((p) => ({ label: p.label, value: p.value }))}
                value={province}
                onChange={(val) => {
                  setProvince(val);
                  const pObj = PROVINCES.find((p) => p.value === val);
                  if (pObj && pObj.districts.length > 0) {
                    setDistrict(pObj.districts[0]);
                  }
                }}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Quận / Huyện *</Text>
              <Select
                options={currentProvinceObj.districts.map((d) => ({ label: d, value: d }))}
                value={district}
                onChange={setDistrict}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 10 }]}>Số nhà, tên đường chi tiết *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            placeholder="VD: 30 Phan Thúc Duyện, Phường 4"
            placeholderTextColor={colors.textMuted}
            value={streetAddress}
            onChangeText={setStreetAddress}
          />
        </View>

        {/* 4. SÂN CON THI ĐẤU */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Danh sách các sân con ({subCourtNames.length} sân)</Text>

          <View style={styles.subCourtsList}>
            {subCourtNames.map((item, idx) => (
              <View key={idx} style={[styles.subCourtPill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="football-outline" size={14} color={colors.primary} />
                <Text style={[styles.subCourtText, { color: colors.text }]}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemoveSubCourt(idx)}>
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.addSubCourtRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Nhập tên sân con mới (VD: Sân 4)"
              placeholderTextColor={colors.textMuted}
              value={newSubCourtName}
              onChangeText={setNewSubCourtName}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddSubCourt}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. KHUNG GIỜ & BẢNG GIÁ NIÊM YẾT */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Giờ hoạt động & Bảng giá theo giờ</Text>

          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Giờ mở cửa</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={openTime}
                onChangeText={setOpenTime}
                placeholder="06:00"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Giờ đóng cửa</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={closeTime}
                onChangeText={setCloseTime}
                placeholder="23:00"
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 10 }]}>Giá giờ thường (06:00 - 16:00) (đ/h) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            keyboardType="numeric"
            value={priceNormal}
            onChangeText={setPriceNormal}
            placeholder="200000"
          />

          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Giá giờ vàng (16:00 - 21:00) (đ/h) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            keyboardType="numeric"
            value={pricePeak}
            onChangeText={setPricePeak}
            placeholder="350000"
          />

          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Giá giờ đêm (21:00 - 23:00) (đ/h) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            keyboardType="numeric"
            value={priceNight}
            onChangeText={setPriceNight}
            placeholder="250000"
          />
        </View>

        {/* 6. TIỆN ÍCH & CHÍNH SÁCH */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Tiện ích & Chính sách đặt sân</Text>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Tiện ích có sẵn tại sân:</Text>
          <ChipGroup
            items={AMENITIES}
            selectedValues={amenities}
            onToggle={(id) => {
              setAmenities((prev) =>
                prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
              );
            }}
          />

          <View style={[styles.twoCols, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tỷ lệ đặt cọc (%)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={depositPercent}
                onChangeText={setDepositPercent}
                placeholder="30"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Hủy miễn phí trước (giờ)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={freeCancellationHours}
                onChangeText={setFreeCancellationHours}
                placeholder="4"
              />
            </View>
          </View>
        </View>

        {/* 7. HÌNH ẢNH SÂN THỰC TẾ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Hình ảnh sân thể thao</Text>
          <Image source={{ uri: imageUrl }} style={styles.previewImage} />
          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Đường dẫn ảnh đại diện sân:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
          />
        </View>
      </ScrollView>

      {/* FOOTER SUBMIT BUTTON */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }, SHADOWS.lg]}>
        <Button
          title="Gửi yêu cầu kiểm duyệt sân"
          variant="primary"
          size="lg"
          icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
          loading={submitting}
          onPress={handleSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  alertDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#B45309',
    marginTop: 2,
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportCard: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sportText: {
    fontSize: 11,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  subCourtsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  subCourtPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  subCourtText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addSubCourtRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    marginBottom: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    borderTopWidth: 1,
  },
});
