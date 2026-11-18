import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Stepper } from '../components/ui/Stepper';
import { ChipGroup } from '../components/ui/ChipGroup';
import { SwitchRow } from '../components/ui/SwitchRow';
import { ImagePickerGrid } from '../components/ui/ImagePickerGrid';
import { SPORT_CONFIGS } from '../constants/sportForms';
import { SPORTS, AMENITIES } from '../constants/sports';
import { db } from '../services/db';
import { formatVND } from '../utils/format';
import { confirmAction, notify } from '../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

let MapView, Marker;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch (e) {
    console.warn('Không load được react-native-maps:', e);
  }
}

// Danh sách Tỉnh/Thành & Quận/Huyện cố định
const PROVINCES = [
  {
    label: 'TP. Hồ Chí Minh',
    value: 'TP. Hồ Chí Minh',
    districts: ['Quận 1', 'Quận 3', 'Quận 7', 'Quận 10', 'Tân Bình', 'Bình Thạnh', 'TP. Thủ Đức'],
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

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00'
];

const EXTENDED_AMENITIES = [
  ...AMENITIES,
  { id: 'aircon', name: 'Máy lạnh', icon: 'snow-outline' },
  { id: 'camera', name: 'Camera an ninh', icon: 'videocam-outline' },
  { id: 'wc', name: 'Nhà vệ sinh sạch', icon: 'man-outline' },
];

export default function CourtFormScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const scrollRef = useRef(null);

  const isEdit = Boolean(id);
  const [initialCourt, setInitialCourt] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form State
  const [sport, setSport] = useState('football');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState('TP. Hồ Chí Minh');
  const [district, setDistrict] = useState('Tân Bình');
  const [streetAddress, setStreetAddress] = useState('');
  const [coords, setCoords] = useState({ lat: 10.8038, lng: 106.6612 });

  // Thông số riêng theo môn
  const [attrs, setAttrs] = useState({});

  // Sân con
  const [subCourtsCount, setSubCourtsCount] = useState(3);
  const [subCourtNames, setSubCourtNames] = useState(['Sân 1', 'Sân 2', 'Sân 3']);

  // Giờ & Giá
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [slotDuration, setSlotDuration] = useState(60);
  const [priceRules, setPriceRules] = useState([
    { from: '06:00', to: '16:00', price: 200000, label: 'Giờ thường' },
    { from: '16:00', to: '21:00', price: 350000, label: 'Giờ vàng' },
    { from: '21:00', to: '23:00', price: 250000, label: 'Giờ đêm' },
  ]);

  // Chính sách & Tiện ích
  const [depositPercent, setDepositPercent] = useState(30);
  const [freeCancellationHours, setFreeCancellationHours] = useState(4);
  const [amenities, setAmenities] = useState(['parking', 'wifi', 'shower', 'light']);

  // Hình ảnh
  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);

  // Errors map
  const [errors, setErrors] = useState({});

  // Tải thông tin sân nếu đang sửa
  useEffect(() => {
    if (isEdit) {
      loadCourtForEdit();
    } else {
      // Khởi tạo attrs mặc định theo môn
      initAttrsForSport('football');
    }
  }, [id]);

  const loadCourtForEdit = async () => {
    try {
      setLoading(true);
      const courtData = await db.getById('courts', id);
      if (courtData) {
        setInitialCourt(courtData);
        setSport(courtData.sport || 'football');
        setName(courtData.name || '');
        setDescription(courtData.description || '');
        setPhone(courtData.phone || user?.phone || '');
        setStreetAddress(courtData.address || '');
        if (courtData.lat && courtData.lng) {
          setCoords({ lat: courtData.lat, lng: courtData.lng });
        }
        setAttrs(courtData.attrs || {});
        setSubCourtsCount(courtData.subCourts?.length || 3);
        setSubCourtNames(courtData.subCourts || ['Sân 1', 'Sân 2', 'Sân 3']);
        setOpenTime(courtData.openTime || '06:00');
        setCloseTime(courtData.closeTime || '23:00');
        setSlotDuration(courtData.slotDurationMinutes || 60);
        setPriceRules(courtData.priceRules || [
          { from: '06:00', to: '22:00', price: 200000, label: 'Tiêu chuẩn' },
        ]);
        setDepositPercent(courtData.depositPercent ?? 30);
        setFreeCancellationHours(courtData.freeCancellationHours ?? 4);
        setAmenities(courtData.amenities || []);
        setImages(courtData.images || []);
      }
    } catch (e) {
      console.warn('Lỗi tải sân để sửa:', e);
    } finally {
      setLoading(false);
    }
  };

  const initAttrsForSport = (sportKey) => {
    const config = SPORT_CONFIGS[sportKey];
    if (!config) return;
    const defaultAttrs = {};
    config.fields.forEach((f) => {
      defaultAttrs[f.key] = f.default;
    });
    setAttrs(defaultAttrs);
  };

  // Đổi môn thể thao
  const handleSelectSport = (newSport) => {
    if (newSport === sport) return;

    if (Object.keys(attrs).length > 0) {
      confirmAction(
        'Đổi môn thể thao',
        'Các thông số riêng của môn cũ sẽ được thay đổi theo môn mới. Bạn có đồng ý đổi môn không?',
        'Đồng ý đổi',
        () => {
          setSport(newSport);
          initAttrsForSport(newSport);
          setHasUnsavedChanges(true);
        }
      );
    } else {
      setSport(newSport);
      initAttrsForSport(newSport);
      setHasUnsavedChanges(true);
    }
  };

  // Cập nhật số lượng sân con
  const handleSubCourtCountChange = (newCount) => {
    setSubCourtsCount(newCount);
    const newNames = [];
    for (let i = 1; i <= newCount; i++) {
      newNames.push(subCourtNames[i - 1] || `Sân ${i}`);
    }
    setSubCourtNames(newNames);
    setHasUnsavedChanges(true);
  };

  // Lấy vị trí GPS hiện tại
  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notify('Quyền vị trí', 'Vui lòng cấp quyền truy cập vị trí để lấy tọa độ tự động.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setHasUnsavedChanges(true);
      notify('Đã lấy vị trí', `Tọa độ: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
    } catch (e) {
      notify('Lỗi lấy vị trí', e.message || 'Không thể lấy vị trí hiện tại');
    }
  };

  // Thêm/Xóa dòng giá
  const handleAddPriceRule = () => {
    setPriceRules([
      ...priceRules,
      { from: '17:00', to: '21:00', price: 300000, label: 'Giờ vàng tối' },
    ]);
    setHasUnsavedChanges(true);
  };

  const handleRemovePriceRule = (index) => {
    if (priceRules.length <= 1) {
      notify('Bảng giá', 'Bảng giá phải có ít nhất 1 khung giờ.');
      return;
    }
    setPriceRules(priceRules.filter((_, idx) => idx !== index));
    setHasUnsavedChanges(true);
  };

  // Quay lại có kiểm tra unsaved changes
  const handleBack = () => {
    if (hasUnsavedChanges) {
      confirmAction(
        'Thoát không lưu?',
        'Bạn có thay đổi chưa được lưu. Rời khỏi đây sẽ làm mất các thông tin vừa nhập.',
        'Rời khỏi',
        () => router.back(),
        true
      );
    } else {
      router.back();
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên cụm sân';
    if (!phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại liên hệ';
    if (!streetAddress.trim()) newErrors.streetAddress = 'Vui lòng nhập số nhà, tên đường';
    if (priceRules.some((r) => !r.price || r.price <= 0)) {
      newErrors.priceRules = 'Vui lòng nhập giá hợp lệ cho tất cả khung giờ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Lưu sân (Thêm mới hoặc Cập nhật)
  const handleSubmit = async () => {
    if (!validate()) {
      notify('Chưa đủ thông tin', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    // Kiểm tra sửa sân đã duyệt: có đổi các trường quan trọng không?
    let needReApproval = false;
    if (isEdit && initialCourt?.status === 'approved') {
      const isImportantChanged =
        initialCourt.name !== name ||
        initialCourt.sport !== sport ||
        initialCourt.address !== `${streetAddress}, ${district}, ${province}` ||
        initialCourt.subCourts?.length !== subCourtNames.length ||
        initialCourt.lat !== coords.lat ||
        initialCourt.lng !== coords.lng;

      if (isImportantChanged) {
        needReApproval = true;
      }
    }

    const saveAction = async () => {
      try {
        setSubmitting(true);
        const fullAddress = `${streetAddress.trim()}, ${district}, ${province}`;
        const config = SPORT_CONFIGS[sport] || {};

        // Ảnh mặc định theo môn nếu chưa chọn
        const finalImages =
          images.length > 0
            ? images
            : [
                sport === 'football'
                  ? 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'
                  : sport === 'badminton'
                  ? 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'
                  : sport === 'pickleball'
                  ? 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800'
                  : sport === 'tennis'
                  ? 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800'
                  : sport === 'basketball'
                  ? 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800'
                  : 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
              ];

        // Map ngược về court.type và court.surface để bộ lọc tìm kiếm cũ hoạt động trơn tru
        const mappedType = attrs.courtType || config.defaultType || 'Sân tiêu chuẩn';
        const mappedSurface = attrs.surface || config.defaultSurface || 'Mặt sân chuyên dụng';

        if (isEdit) {
          const updates = {
            name: name.trim(),
            sport,
            description: description.trim(),
            phone: phone.trim(),
            address: fullAddress,
            lat: coords.lat,
            lng: coords.lng,
            type: mappedType,
            surface: mappedSurface,
            attrs,
            subCourts: subCourtNames,
            openTime,
            closeTime,
            slotDurationMinutes: slotDuration,
            priceRules,
            depositPercent,
            freeCancellationHours,
            amenities,
            images: finalImages,
          };

          if (needReApproval) {
            updates.status = 'pending';
          }

          await db.update('courts', id, updates);
          notify(
            'Thành công',
            needReApproval
              ? 'Sân đã được gửi lại cho Admin duyệt do bạn vừa sửa thông tin cốt lõi.'
              : 'Đã cập nhật thông tin sân thành công!'
          );
        } else {
          // SÂN MỚI LUÔN CÓ STATUS = PENDING
          const newCourt = {
            ownerId: user?.id,
            ownerName: user?.courtClusterName || user?.fullName || 'Chủ sân',
            name: name.trim(),
            sport,
            description: description.trim(),
            phone: phone.trim(),
            address: fullAddress,
            lat: coords.lat,
            lng: coords.lng,
            type: mappedType,
            surface: mappedSurface,
            attrs,
            subCourts: subCourtNames,
            openTime,
            closeTime,
            slotDurationMinutes: slotDuration,
            priceRules,
            depositPercent,
            freeCancellationHours,
            amenities,
            images: finalImages,
            rating: 5.0,
            reviewCount: 0,
            status: 'pending', // Chờ Admin duyệt
            isActive: true,
            createdAt: new Date().toISOString(),
          };

          await db.add('courts', newCourt);

          // Gửi thông báo cho Admin có sân mới chờ duyệt
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
            'Tạo sân thành công 🎉',
            'Sân của bạn đang ở trạng thái "Chờ Admin duyệt". Sau khi được phê duyệt, sân sẽ chính thức xuất hiện trên ứng dụng!'
          );
        }

        router.back();
      } catch (err) {
        notify('Lỗi lưu sân', err.message || 'Không thể lưu thông tin sân');
      } finally {
        setSubmitting(false);
      }
    };

    if (needReApproval) {
      confirmAction(
        'Cảnh báo kiểm duyệt lại',
        'Bạn đã thay đổi các thông tin cốt lõi (tên, địa chỉ, vị trí hoặc quy mô sân). Sân sẽ quay về trạng thái "Chờ Admin duyệt". Bạn có chắc chắn muốn lưu?',
        'Đồng ý gửi duyệt',
        saveAction
      );
    } else {
      saveAction();
    }
  };

  const currentSportConfig = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải thông tin sân...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={isEdit ? 'Sửa thông tin sân' : 'Thêm sân thể thao mới'}
        showBack
        onBack={handleBack}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* SECTION 1: CHỌN MÔN THỂ THAO */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Môn thể thao</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Chọn môn thể thao để hệ thống cấu hình thông số kỹ thuật tiêu chuẩn tương ứng
          </Text>

          <View style={styles.sportsGrid}>
            {SPORTS.filter((s) => s.id !== 'all').map((item) => {
              const active = sport === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sportCard,
                    {
                      backgroundColor: active ? '#DCFCE7' : colors.surfaceSecondary,
                      borderColor: active ? '#16A34A' : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSport(item.id)}
                >
                  <View style={[styles.sportIconCircle, active && { backgroundColor: '#16A34A' }]}>
                    {item.type === 'Ionicons' ? (
                      <Ionicons name={item.icon} size={22} color={active ? '#FFFFFF' : colors.text} />
                    ) : (
                      <MaterialCommunityIcons name={item.icon} size={22} color={active ? '#FFFFFF' : colors.text} />
                    )}
                  </View>
                  <Text style={[styles.sportCardText, active && { color: '#16A34A', fontWeight: '800' }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: THÔNG TIN CHUNG & ĐỊA CHỈ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Thông tin chung & Vị trí</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tên cụm sân *</Text>
            <TextInput
              style={[styles.input, { borderColor: errors.name ? '#EF4444' : colors.border, color: colors.text }]}
              placeholder="vd: Cụm Sân Pickleball & Cầu Lông Chảo Lửa"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setHasUnsavedChanges(true);
              }}
            />
            {Boolean(errors.name) && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Số điện thoại liên hệ *</Text>
            <TextInput
              style={[styles.input, { borderColor: errors.phone ? '#EF4444' : colors.border, color: colors.text }]}
              placeholder="0912 345 678"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setHasUnsavedChanges(true);
              }}
            />
            {Boolean(errors.phone) && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Mô tả cụm sân</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text }]}
              placeholder="Giới thiệu về chất lượng ánh sáng, phòng tắm, dịch vụ..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                setHasUnsavedChanges(true);
              }}
            />
          </View>

          {/* Địa chỉ phân cấp */}
          <Select
            label="Tỉnh / Thành phố *"
            value={province}
            options={PROVINCES.map((p) => p.label)}
            onSelect={(val) => {
              setProvince(val);
              const provObj = PROVINCES.find((p) => p.label === val);
              if (provObj && provObj.districts.length > 0) {
                setDistrict(provObj.districts[0]);
              }
              setHasUnsavedChanges(true);
            }}
          />

          <Select
            label="Quận / Huyện *"
            value={district}
            options={PROVINCES.find((p) => p.label === province)?.districts || []}
            onSelect={(val) => {
              setDistrict(val);
              setHasUnsavedChanges(true);
            }}
          />

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Số nhà & Tên đường *</Text>
            <TextInput
              style={[styles.input, { borderColor: errors.streetAddress ? '#EF4444' : colors.border, color: colors.text }]}
              placeholder="vd: 30 Phan Thúc Duyện, Phường 4"
              placeholderTextColor={colors.textSecondary}
              value={streetAddress}
              onChangeText={(t) => {
                setStreetAddress(t);
                setHasUnsavedChanges(true);
              }}
            />
            {Boolean(errors.streetAddress) && <Text style={styles.errorText}>{errors.streetAddress}</Text>}
          </View>

          {/* Vị trí bản đồ & GPS */}
          <View style={styles.mapSection}>
            <View style={styles.mapHeaderRow}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tọa độ ghim trên bản đồ</Text>
              <TouchableOpacity style={styles.gpsBtn} onPress={handleGetCurrentLocation}>
                <Ionicons name="locate" size={16} color={colors.primary} />
                <Text style={[styles.gpsBtnText, { color: colors.primary }]}>Dùng vị trí hiện tại</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS !== 'web' && MapView ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  region={{
                    latitude: coords.lat,
                    longitude: coords.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(e) => {
                    const c = e.nativeEvent.coordinate;
                    setCoords({ lat: c.latitude, lng: c.longitude });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <Marker
                    coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                    draggable
                    onDragEnd={(e) => {
                      const c = e.nativeEvent.coordinate;
                      setCoords({ lat: c.latitude, lng: c.longitude });
                      setHasUnsavedChanges(true);
                    }}
                  />
                </MapView>
              </View>
            ) : (
              <View style={[styles.webCoordsBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>Vĩ độ (Lat):</Text>
                  <TextInput
                    style={[styles.coordInput, { color: colors.text }]}
                    value={String(coords.lat)}
                    onChangeText={(t) => setCoords({ ...coords, lat: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>Kinh độ (Lng):</Text>
                  <TextInput
                    style={[styles.coordInput, { color: colors.text }]}
                    value={String(coords.lng)}
                    onChangeText={(t) => setCoords({ ...coords, lng: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* SECTION 3: THÔNG SỐ RIÊNG THEO MÔN */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Thông số kỹ thuật môn {currentSportConfig.name}
          </Text>

          {currentSportConfig.fields?.map((f) => {
            if (f.type === 'select') {
              return (
                <Select
                  key={f.key}
                  label={f.label}
                  value={attrs[f.key] ?? f.default}
                  options={f.options}
                  onSelect={(val) => {
                    setAttrs({ ...attrs, [f.key]: val });
                    setHasUnsavedChanges(true);
                  }}
                />
              );
            }
            if (f.type === 'stepper') {
              return (
                <Stepper
                  key={f.key}
                  label={f.label}
                  value={attrs[f.key] ?? f.default}
                  min={f.min}
                  max={f.max}
                  onChange={(val) => {
                    setAttrs({ ...attrs, [f.key]: val });
                    setHasUnsavedChanges(true);
                  }}
                />
              );
            }
            if (f.type === 'switch') {
              return (
                <SwitchRow
                  key={f.key}
                  label={f.label}
                  value={attrs[f.key] ?? f.default}
                  onChange={(val) => {
                    setAttrs({ ...attrs, [f.key]: val });
                    setHasUnsavedChanges(true);
                  }}
                />
              );
            }
            return null;
          })}
        </View>

        {/* SECTION 4: SỐ LƯỢNG SÂN CON */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Số sân con trong cụm</Text>

          <Stepper
            label="Số lượng sân con hoạt động"
            value={subCourtsCount}
            min={1}
            max={20}
            unit="sân"
            onChange={handleSubCourtCountChange}
          />

          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 4, marginBottom: 8 }]}>
            Tùy chỉnh tên từng sân con:
          </Text>
          <View style={styles.subCourtsList}>
            {subCourtNames.map((name, idx) => (
              <View key={idx} style={styles.subCourtRow}>
                <View style={styles.subCourtIndexCircle}>
                  <Text style={styles.subCourtIndexText}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]}
                  value={name}
                  onChangeText={(text) => {
                    const updated = [...subCourtNames];
                    updated[idx] = text;
                    setSubCourtNames(updated);
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* SECTION 5: GIỜ MỞ CỬA & BẢNG GIÁ NHIỀU DÒNG */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Giờ hoạt động & Bảng giá</Text>

          <View style={styles.timeSelectRow}>
            <View style={{ flex: 1 }}>
              <Select
                label="Giờ mở cửa"
                value={openTime}
                options={TIME_OPTIONS}
                onSelect={(val) => {
                  setOpenTime(val);
                  setHasUnsavedChanges(true);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Select
                label="Giờ đóng cửa"
                value={closeTime}
                options={TIME_OPTIONS}
                onSelect={(val) => {
                  setCloseTime(val);
                  setHasUnsavedChanges(true);
                }}
              />
            </View>
          </View>

          <Select
            label="Độ dài mỗi lượt thi đấu"
            value={`${slotDuration} phút`}
            options={['60 phút', '90 phút', '120 phút']}
            onSelect={(val) => {
              setSlotDuration(parseInt(val, 10));
              setHasUnsavedChanges(true);
            }}
          />

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Bảng giá theo khung giờ</Text>
            <TouchableOpacity style={styles.addPriceBtn} onPress={handleAddPriceRule}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addPriceText, { color: colors.primary }]}>Thêm khung giờ</Text>
            </TouchableOpacity>
          </View>

          {priceRules.map((rule, idx) => (
            <View key={idx} style={[styles.priceRuleBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.priceRuleHeader}>
                <Text style={[styles.priceRuleIndex, { color: colors.text }]}>Khung giờ {idx + 1}</Text>
                {priceRules.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemovePriceRule(idx)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.priceRowInputs}>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Từ giờ"
                    value={rule.from}
                    options={TIME_OPTIONS}
                    onSelect={(val) => {
                      const updated = [...priceRules];
                      updated[idx].from = val;
                      setPriceRules(updated);
                      setHasUnsavedChanges(true);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Đến giờ"
                    value={rule.to}
                    options={TIME_OPTIONS}
                    onSelect={(val) => {
                      const updated = [...priceRules];
                      updated[idx].to = val;
                      setPriceRules(updated);
                      setHasUnsavedChanges(true);
                    }}
                  />
                </View>
              </View>

              <View style={styles.priceRowInputs}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Nhãn khung giờ</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    value={rule.label}
                    onChangeText={(t) => {
                      const updated = [...priceRules];
                      updated[idx].label = t;
                      setPriceRules(updated);
                      setHasUnsavedChanges(true);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Giá / giờ (VNĐ)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    value={String(rule.price)}
                    keyboardType="numeric"
                    onChangeText={(t) => {
                      const updated = [...priceRules];
                      updated[idx].price = parseInt(t.replace(/\D/g, ''), 10) || 0;
                      setPriceRules(updated);
                      setHasUnsavedChanges(true);
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
          {Boolean(errors.priceRules) && <Text style={styles.errorText}>{errors.priceRules}</Text>}
        </View>

        {/* SECTION 6: CHÍNH SÁCH ĐẶT SÂN */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Chính sách đặt & hủy sân</Text>

          <Select
            label="Mức tiền đặt cọc giữ sân"
            value={`${depositPercent}%`}
            options={['0%', '20%', '30%', '50%', '100%']}
            onSelect={(val) => {
              setDepositPercent(parseInt(val, 10));
              setHasUnsavedChanges(true);
            }}
          />

          <Select
            label="Thời hạn hủy miễn phí trước giờ thi đấu"
            value={`${freeCancellationHours} giờ`}
            options={['1 giờ', '2 giờ', '4 giờ', '12 giờ', '24 giờ']}
            onSelect={(val) => {
              setFreeCancellationHours(parseInt(val, 10));
              setHasUnsavedChanges(true);
            }}
          />
        </View>

        {/* SECTION 7: TIỆN ÍCH */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Tiện ích cụm sân</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Chọn tất cả tiện ích mà sân của bạn cung cấp cho người chơi
          </Text>

          <ChipGroup
            items={EXTENDED_AMENITIES}
            selectedValues={amenities}
            onToggle={(id) => {
              const updated = amenities.includes(id)
                ? amenities.filter((a) => a !== id)
                : [...amenities, id];
              setAmenities(updated);
              setHasUnsavedChanges(true);
            }}
          />
        </View>

        {/* SECTION 8: HÌNH ẢNH */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Hình ảnh thực tế</Text>

          <ImagePickerGrid
            images={images}
            onChangeImages={(imgs) => {
              setImages(imgs);
              setHasUnsavedChanges(true);
            }}
            coverIndex={coverIndex}
            onChangeCover={setCoverIndex}
            maxImages={6}
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* NÚT LƯU CỐ ĐỊNH Ở ĐÁY */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }, SHADOWS.lg]}>
        <Button
          title={isEdit ? 'Lưu thay đổi' : 'Gửi yêu cầu kiểm duyệt'}
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 6,
  },
  sportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportCardText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  mapSection: {
    marginTop: SPACING.xs,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    height: 180,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  webCoordsBox: {
    flexDirection: 'row',
    gap: 12,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  subCourtsList: {
    gap: 8,
  },
  subCourtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subCourtIndexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCourtIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  timeSelectRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  addPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPriceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceRuleBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  priceRuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRuleIndex: {
    fontSize: 12,
    fontWeight: '800',
  },
  priceRowInputs: {
    flexDirection: 'row',
    gap: 10,
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
