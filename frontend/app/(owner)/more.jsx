import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import LogoutButton from '../../components/ui/LogoutButton';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function OwnerMoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const menuItems = [
    {
      title: 'Quản lý lịch & Khóa giờ',
      desc: 'Khóa khung giờ bảo trì hoặc khách thuê cố định',
      icon: 'calendar-outline',
      color: '#0284C7',
      bg: '#E0F2FE',
      route: '/schedule',
    },
    {
      title: 'Đăng & Quản lý giải đấu',
      desc: 'Tạo giải đấu phong trào, gửi Admin duyệt công khai',
      icon: 'trophy-outline',
      color: '#D97706',
      bg: '#FEF3C7',
      route: '/tournaments-post',
    },
    {
      title: 'Thông tin tài khoản & Doanh nghiệp',
      desc: 'Hồ sơ kinh doanh, giấy phép và tài khoản ngân hàng',
      icon: 'card-outline',
      color: '#8B5CF6',
      bg: '#EDE9FE',
      route: '/bank-info',
      info: user?.bankInfo ? `${user.bankInfo.bankName} • ${user.bankInfo.accountNumber}` : 'Chưa cập nhật',
    },
    {
      title: 'Đăng ký thêm sân mới',
      desc: 'Tạo cụm sân mới và gửi hồ sơ sang Ban Quản Trị phê duyệt',
      icon: 'add-circle-outline',
      color: '#16A34A',
      bg: '#DCFCE7',
      route: '/court-create',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Tiện ích & Khác" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Image
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.clusterName, { color: colors.text }]}>
              {user?.courtClusterName || 'Cụm sân thể thao'}
            </Text>
            <Text style={[styles.ownerName, { color: colors.textSecondary }]}>
              {user?.fullName} ({user?.phone || 'Chưa có SĐT'})
            </Text>
            {Boolean(user?.businessLicense) && (
              <View style={styles.licenseBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                <Text style={styles.licenseText}>{user.businessLicense}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu list */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                SHADOWS.sm,
              ]}
              activeOpacity={0.7}
              onPress={() => item.route && router.push(item.route)}
              disabled={!item.route}
            >
              <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                {item.info && (
                  <Text style={[styles.menuInfo, { color: colors.primary }]}>{item.info}</Text>
                )}
              </View>
              {item.route && (
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Nút đăng xuất chung LogoutButton */}
        <View style={styles.logoutWrapper}>
          <LogoutButton />
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
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  clusterName: {
    fontSize: 16,
    fontWeight: '800',
  },
  ownerName: {
    fontSize: 13,
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  licenseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  menuContainer: {
    gap: SPACING.sm,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuInfo: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  logoutWrapper: {
    marginTop: SPACING.sm,
  },
});
