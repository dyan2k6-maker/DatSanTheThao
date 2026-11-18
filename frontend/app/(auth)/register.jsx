import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Header } from '../../components/ui/Header';
import { RADIUS, SPACING } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();

  const [role, setRole] = useState('user'); // 'user' | 'owner'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fields for Owner
  const [courtClusterName, setCourtClusterName] = useState('');
  const [courtClusterAddress, setCourtClusterAddress] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [idCard, setIdCard] = useState('');
  const [licenseImage, setLicenseImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const pickLicenseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLicenseImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh giấy phép:', e);
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Vui lòng nhập email hợp lệ');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setErrorMessage('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không trùng khớp');
      return;
    }

    if (role === 'owner') {
      if (!courtClusterName.trim()) {
        setErrorMessage('Chủ sân vui lòng nhập tên cụm sân thể thao');
        return;
      }
      if (!courtClusterAddress.trim()) {
        setErrorMessage('Chủ sân vui lòng nhập địa chỉ cụm sân');
        return;
      }
      if (!businessLicense.trim() && !idCard.trim()) {
        setErrorMessage('Chủ sân vui lòng nhập số GPKD hoặc CCCD');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        fullName,
        email,
        phone,
        password,
        role,
        courtClusterName,
        courtClusterAddress,
        businessLicense,
        idCard,
      };

      const res = await register(payload);
      if (res.success) {
        if (role === 'owner') {
          setSuccessInfo({
            title: 'Đăng ký thành công!',
            message:
              'Hồ sơ chủ sân của bạn đã được gửi lên hệ thống và đang ở trạng thái CHỜ DUYỆT. Quản trị viên sẽ xét duyệt trong vòng 24h làm việc.',
          });
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Đăng ký thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  if (successInfo) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCircle, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="time-outline" size={54} color="#15803D" />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>
          {successInfo.title}
        </Text>
        <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
          {successInfo.message}
        </Text>
        <Button
          title="Quay lại Đăng nhập"
          onPress={() => router.replace('/(auth)/login')}
          variant="primary"
          size="lg"
          style={styles.backBtn}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Header title="Đăng ký tài khoản" showBack onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Chọn vai trò của bạn
        </Text>

        {/* Role Selector Cards */}
        <View style={styles.roleGrid}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              {
                backgroundColor: role === 'user' ? colors.primary + '15' : colors.surface,
                borderColor: role === 'user' ? colors.primary : colors.border,
                borderWidth: role === 'user' ? 2 : 1,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setRole('user')}
          >
            <View
              style={[
                styles.roleIconCircle,
                { backgroundColor: role === 'user' ? colors.primary : colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="person"
                size={22}
                color={role === 'user' ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <Text style={[styles.roleName, { color: colors.text }]}>Người chơi thể thao</Text>
            <Text style={[styles.roleSub, { color: colors.textSecondary }]}>
              Tìm sân, đặt lịch nhanh và tham gia giải đấu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              {
                backgroundColor: role === 'owner' ? colors.warning + '15' : colors.surface,
                borderColor: role === 'owner' ? colors.warning : colors.border,
                borderWidth: role === 'owner' ? 2 : 1,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setRole('owner')}
          >
            <View
              style={[
                styles.roleIconCircle,
                { backgroundColor: role === 'owner' ? colors.warning : colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="business"
                size={22}
                color={role === 'owner' ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <Text style={[styles.roleName, { color: colors.text }]}>Chủ cụm sân</Text>
            <Text style={[styles.roleSub, { color: colors.textSecondary }]}>
              Đăng bán sân, quản lý lịch và quét mã QR
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Basic Fields */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardHeading, { color: colors.text }]}>
            Thông tin cá nhân
          </Text>

          <Input
            label="Họ và tên *"
            placeholder="vd: Nguyễn Văn An"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Email *"
            placeholder="vd: an.nguyen@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Số điện thoại *"
            placeholder="vd: 0981234567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Mật khẩu *"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Nhập lại mật khẩu *"
            placeholder="Xác nhận lại mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />}
          />
        </View>

        {/* Owner Specific Fields */}
        {role === 'owner' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <View style={styles.ownerBadgeRow}>
              <Ionicons name="shield-alert-outline" size={20} color={colors.warning} />
              <Text style={[styles.cardHeading, { color: colors.warning, marginLeft: 6 }]}>
                Thông tin doanh nghiệp sân
              </Text>
            </View>
            <Text style={[styles.ownerNotice, { color: colors.textSecondary }]}>
              Lưu ý: Tài khoản chủ sân sau khi đăng ký sẽ ở trạng thái "Chờ duyệt". Quản trị viên sẽ kiểm tra giấy phép kinh doanh để duyệt hiển thị sân.
            </Text>

            <Input
              label="Tên cụm sân thể thao *"
              placeholder="vd: Cụm Sân Thể Thao Sao Vàng"
              value={courtClusterName}
              onChangeText={setCourtClusterName}
              leftIcon={<Ionicons name="trophy-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Địa chỉ cụm sân *"
              placeholder="vd: 123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM"
              value={courtClusterAddress}
              onChangeText={setCourtClusterAddress}
              leftIcon={<Ionicons name="location-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Số Giấy phép kinh doanh / MST"
              placeholder="vd: GPKD-79-2023-XXXX"
              value={businessLicense}
              onChangeText={setBusinessLicense}
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Số CCCD người đại diện *"
              placeholder="vd: 079090XXXXXX"
              value={idCard}
              onChangeText={setIdCard}
              keyboardType="number-pad"
              leftIcon={<Ionicons name="card-outline" size={20} color={colors.textSecondary} />}
            />

            <Text style={[styles.imageUploadLabel, { color: colors.text }]}>
              Ảnh chụp Giấy phép kinh doanh / CCCD
            </Text>
            <TouchableOpacity
              style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
              onPress={pickLicenseImage}
              activeOpacity={0.7}
            >
              {licenseImage ? (
                <Image source={{ uri: licenseImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                  <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                    Bấm để tải ảnh giấy phép lên
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Button
          title={role === 'owner' ? 'Gửi hồ sơ đăng ký Chủ sân' : 'Đăng ký tài khoản'}
          onPress={handleRegister}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.submitBtn}
        />

        <View style={styles.loginSwitchRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Đã có tài khoản?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.loginLink, { color: colors.primary }]}>
              Đăng nhập ngay
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  roleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  roleCard: {
    width: '48.5%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  roleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.lg,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  ownerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerNotice: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  imageUploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 6,
  },
  uploadBox: {
    height: 120,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 12,
    marginTop: 6,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  submitBtn: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  loginSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  backBtn: {
    minWidth: 200,
  },
});
