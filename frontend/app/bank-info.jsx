import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import LogoutButton from '../components/ui/LogoutButton';
import { db } from '../services/db';
import { notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

const POPULAR_BANKS = [
  'Vietcombank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'BIDV',
  'VietinBank',
  'VPBank',
  'TPBank',
];

export default function BankInfoScreen() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { colors, isDark } = useTheme();

  // Form states
  const [bankName, setBankName] = useState(user?.bankInfo?.bankName || 'Vietcombank');
  const [accountNumber, setAccountNumber] = useState(user?.bankInfo?.accountNumber || '0071001234567');
  const [accountName, setAccountName] = useState(user?.bankInfo?.accountName || (user?.fullName?.toUpperCase() || 'NGUYEN VAN MINH'));
  const [branch, setBranch] = useState(user?.bankInfo?.branch || 'Chi nhánh TP. Hồ Chí Minh');
  const [courtClusterName, setCourtClusterName] = useState(user?.courtClusterName || 'Cụm Sân Chảo Lửa');
  const [courtClusterAddress, setCourtClusterAddress] = useState(user?.courtClusterAddress || '30 Phan Thúc Duyện, Phường 4, Tân Bình, TP.HCM');
  const [businessLicense, setBusinessLicense] = useState(user?.businessLicense || 'GPKD-79-2023-00123');

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (!accountNumber.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập số tài khoản ngân hàng');
      return;
    }
    if (!accountName.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập tên chủ tài khoản');
      return;
    }

    setSaving(true);
    try {
      const updatedData = {
        courtClusterName: courtClusterName.trim(),
        courtClusterAddress: courtClusterAddress.trim(),
        businessLicense: businessLicense.trim(),
        bankInfo: {
          bankName,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim().toUpperCase(),
          branch: branch.trim(),
        },
      };

      if (user?.id) {
        await db.update('users', user.id, updatedData);
        // Refresh session
        const fresh = await db.getById('users', user.id);
        if (fresh) {
          await login(fresh);
        }
      }

      setIsEditing(false);
      notify('Thành công', 'Đã lưu thông tin tài khoản và thông tin kinh doanh.');
    } catch (e) {
      notify('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Thông tin doanh nghiệp & Ngân hàng"
        showBack
        onBack={() => safeBack(router, '/(owner)/more')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Thông tin doanh nghiệp & GPKD */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="business" size={20} color="#0284C7" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Hồ sơ cơ sở kinh doanh</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              <Text style={styles.verifiedText}>Đã xác minh</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tên cụm sân thể thao</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={courtClusterName}
                onChangeText={setCourtClusterName}
              />
            ) : (
              <Text style={[styles.valueText, { color: colors.text }]}>{courtClusterName}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Địa chỉ đăng ký hoạt động</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={courtClusterAddress}
                onChangeText={setCourtClusterAddress}
              />
            ) : (
              <Text style={[styles.valueText, { color: colors.text }]}>{courtClusterAddress}</Text>
            )}
          </View>

          <View style={styles.twoCols}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Giấy phép KD / MST</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                  value={businessLicense}
                  onChangeText={setBusinessLicense}
                />
              ) : (
                <Text style={[styles.valueText, { color: colors.primary, fontWeight: '700' }]}>{businessLicense}</Text>
              )}
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>CCCD chủ sân</Text>
              <Text style={[styles.valueText, { color: colors.text }]}>{user?.idCard || '079090012345'}</Text>
            </View>
          </View>

          <View style={styles.twoCols}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Chủ đại diện</Text>
              <Text style={[styles.valueText, { color: colors.text }]}>{user?.fullName || 'Chủ sân'}</Text>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Hotline tiếp nhận</Text>
              <Text style={[styles.valueText, { color: colors.text }]}>{user?.phone || '0912345678'}</Text>
            </View>
          </View>
        </View>

        {/* Card 2: VietQR Digital Card Preview */}
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bankCardPreview, SHADOWS.md]}
        >
          <View style={styles.bankCardHeader}>
            <View style={styles.bankCardChipRow}>
              <View style={styles.simChip} />
              <Ionicons name="wifi" size={18} color="rgba(255, 255, 255, 0.6)" />
            </View>
            <Text style={styles.bankBrandName}>{bankName.toUpperCase()}</Text>
          </View>

          <Text style={styles.bankCardNumber}>
            {accountNumber.replace(/(\d{4})/g, '$1 ').trim()}
          </Text>

          <View style={styles.bankCardFooter}>
            <View>
              <Text style={styles.bankCardHolderLabel}>CHỦ TÀI KHOẢN</Text>
              <Text style={styles.bankCardHolderName}>{accountName.toUpperCase()}</Text>
            </View>
            <View style={styles.vietQrBadge}>
              <Ionicons name="qr-code" size={16} color="#FFFFFF" />
              <Text style={styles.vietQrText}>VietQR</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Card 3: Form Chi tiết tài khoản ngân hàng */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="card" size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Tài khoản ngân hàng nhận tiền</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={[styles.editBtn, { borderColor: colors.border }]}
            >
              <Ionicons name={isEditing ? 'close' : 'create-outline'} size={15} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>{isEditing ? 'Hủy' : 'Chỉnh sửa'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Ngân hàng thụ hưởng</Text>
            {isEditing ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankChipsScroll}>
                {POPULAR_BANKS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.bankChip,
                      {
                        backgroundColor: bankName === b ? colors.primary : colors.surfaceSecondary,
                        borderColor: bankName === b ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setBankName(b)}
                  >
                    <Text style={{ color: bankName === b ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.valueText, { color: colors.text, fontWeight: '700' }]}>{bankName}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Số tài khoản ngân hàng (STK)</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
                placeholder="Nhập số tài khoản"
              />
            ) : (
              <Text style={[styles.valueText, { color: colors.primary, fontSize: 17, fontWeight: '800' }]}>
                {accountNumber}
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tên chủ tài khoản (In hoa không dấu)</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={accountName}
                onChangeText={(t) => setAccountName(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="VD: NGUYEN VAN MINH"
              />
            ) : (
              <Text style={[styles.valueText, { color: colors.text, fontWeight: '700' }]}>{accountName}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Chi nhánh ngân hàng</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={branch}
                onChangeText={setBranch}
                placeholder="VD: Chi nhánh TP. Hồ Chí Minh"
              />
            ) : (
              <Text style={[styles.valueText, { color: colors.text }]}>{branch}</Text>
            )}
          </View>

          {isEditing && (
            <Button
              title="Lưu thông tin tài khoản"
              onPress={handleSave}
              loading={saving}
              variant="primary"
              size="md"
              style={{ marginTop: SPACING.sm }}
            />
          )}
        </View>

        {/* Card 4: Bảo mật & Đăng xuất */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="lock-closed" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Bảo mật tài khoản</Text>
            </View>
          </View>

          <Text style={[styles.securityNotice, { color: colors.textSecondary }]}>
            Thông tin tài khoản ngân hàng dùng để khách hàng chuyển khoản đặt cọc và hệ thống quyết toán doanh thu. Mọi giao dịch được ghi nhận tự động vào mục Báo cáo Doanh thu.
          </Text>

          <View style={{ marginTop: SPACING.md }}>
            <LogoutButton />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: 50,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm + 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  fieldGroup: {
    gap: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  twoCols: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bankChipsScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginRight: 8,
  },
  bankCardPreview: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    height: 190,
    justifyContent: 'space-between',
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankCardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simChip: {
    width: 34,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#D97706',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bankBrandName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bankCardNumber: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bankCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bankCardHolderLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bankCardHolderName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  vietQrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  vietQrText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  securityNotice: {
    fontSize: 12,
    lineHeight: 18,
  },
});
