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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { db } from '../../services/db';
import { RADIUS, SPACING } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, quickLogin } = useAuth();
  const { colors } = useTheme();

  const [identifier, setIdentifier] = useState('trongnghia@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quản lý BottomSheet chọn chủ sân
  const [ownerSheetVisible, setOwnerSheetVisible] = useState(false);
  const [ownerList, setOwnerList] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  const handleOpenOwnerSheet = async () => {
    setLoadingOwners(true);
    setOwnerSheetVisible(true);
    try {
      const [users, courts] = await Promise.all([
        db.getAll('users'),
        db.getAll('courts'),
      ]);
      const activeOwners = users.filter((u) => u.role === 'owner' && u.status === 'active');
      const enrichedOwners = activeOwners.map((owner) => {
        const ownerCourts = courts.filter((c) => c.ownerId === owner.id);
        const sports = [...new Set(ownerCourts.map((c) => c.sport))];
        return {
          ...owner,
          courtCount: ownerCourts.length,
          sports,
          courts: ownerCourts,
        };
      });
      setOwnerList(enrichedOwners);
    } catch (err) {
      console.warn('Lỗi lấy danh sách chủ sân:', err);
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc Số điện thoại');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await login(identifier, password);
    } catch (err) {
      setErrorMessage(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role, userId = null) => {
    setOwnerSheetVisible(false);
    setLoading(true);
    setErrorMessage('');
    try {
      await quickLogin(role, userId);
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi đăng nhập nhanh');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Gradient */}
        <LinearGradient
          colors={['#07241B', '#0B3D2E', '#166534']}
          style={[styles.hero, { paddingTop: Math.max(insets.top, 24) + 20 }]}
        >
          {/* Pitch line decoration */}
          <View style={styles.pitchCircle} />
          <View style={styles.pitchLine} />

          <View style={styles.logoBadge}>
            <Ionicons name="football" size={36} color="#A3E635" />
          </View>
          <Text style={styles.heroTitle}>DatSanTheThao</Text>
          <Text style={styles.heroSubtitle}>
            Sân cỏ liền tay - Đặt ngay trận bóng!
          </Text>
        </LinearGradient>

        {/* Card Form */}
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Đăng nhập</Text>
          <Text style={[styles.formSub, { color: colors.textSecondary }]}>
            Chào mừng bạn quay trở lại với nền tảng thể thao
          </Text>

          {errorMessage !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Input
            label="Email hoặc Số điện thoại"
            placeholder="vd: trongnghia@gmail.com hoặc 0981112233"
            value={identifier}
            onChangeText={(t) => {
              setIdentifier(t);
              setErrorMessage('');
            }}
            leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Mật khẩu"
            placeholder="Nhập ít nhất 6 ký tự"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrorMessage('');
            }}
            secureTextEntry
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              Quên mật khẩu?
            </Text>
          </TouchableOpacity>

          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            variant="primary"
            size="lg"
            style={styles.loginBtn}
          />

          {/* Demo quick access buttons */}
          <View style={styles.demoSection}>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                ĐĂNG NHẬP NHANH (DEMO)
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                activeOpacity={0.8}
                onPress={() => handleQuickLogin('user')}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: '#16A34A' }]}>
                  <Ionicons name="person" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.quickTitle}>Người dùng</Text>
                <Text style={styles.quickDesc}>Đặt sân & xem giải</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                activeOpacity={0.8}
                onPress={handleOpenOwnerSheet}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: '#D97706' }]}>
                  <Ionicons name="business" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.quickTitle}>Chủ sân</Text>
                <Text style={styles.quickDesc}>Chọn cụm sân</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}
                activeOpacity={0.8}
                onPress={() => handleQuickLogin('admin')}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: '#0284C7' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.quickTitle}>Admin</Text>
                <Text style={styles.quickDesc}>Duyệt & Thống kê</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register switch */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Chưa có tài khoản?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                Đăng ký ngay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* BottomSheet chọn Chủ sân */}
      <BottomSheet
        visible={ownerSheetVisible}
        onClose={() => setOwnerSheetVisible(false)}
        title="Chọn Chủ sân đăng nhập"
      >
        <View style={styles.ownerSheetBody}>
          <Text style={[styles.ownerSheetSubtitle, { color: colors.textSecondary }]}>
            Chọn một trong các Chủ sân đang hoạt động để quản lý cụm sân tương ứng:
          </Text>

          {loadingOwners ? (
            <View style={styles.ownerLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.ownerLoadingText, { color: colors.textSecondary }]}>
                Đang tải danh sách chủ sân...
              </Text>
            </View>
          ) : (
            ownerList.map((owner) => (
              <TouchableOpacity
                key={owner.id}
                style={[
                  styles.ownerCardItem,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleQuickLogin('owner', owner.id)}
              >
                <Image
                  source={{ uri: owner.avatar }}
                  style={styles.ownerAvatar}
                />
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerNameRow}>
                    <Text style={[styles.ownerClusterName, { color: colors.text }]}>
                      {owner.courtClusterName || owner.fullName}
                    </Text>
                    <View style={styles.courtCountBadge}>
                      <Text style={styles.courtCountText}>
                        {owner.courtCount} sân
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ownerPersonName, { color: colors.textSecondary }]}>
                    Chủ sở hữu: {owner.fullName}
                  </Text>
                  <Text style={[styles.ownerCourtsList, { color: colors.primary }]}>
                    {owner.courts?.map((c) => c.name).join(' • ') || 'Chưa có sân'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pitchCircle: {
    position: 'absolute',
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pitchLine: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A3E635',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  formCard: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  formSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: SPACING.lg,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginBtn: {
    marginBottom: SPACING.lg,
  },
  demoSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
  },
  ownerSheetBody: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  ownerSheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  ownerLoadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ownerLoadingText: {
    fontSize: 13,
  },
  ownerCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ownerInfo: {
    flex: 1,
    gap: 3,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerClusterName: {
    fontSize: 15,
    fontWeight: '800',
  },
  courtCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  courtCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  ownerPersonName: {
    fontSize: 12,
  },
  ownerCourtsList: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

