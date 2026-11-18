import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import LogoutButton from '../../components/ui/LogoutButton';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function AdminMoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const menuSections = [
    {
      title: 'QUẢN LÝ DỊCH VỤ & NGƯỜI DÙNG',
      items: [
        {
          id: 'tournaments',
          title: 'Quản lý Giải đấu Hệ thống',
          sub: 'Duyệt, giám sát hoặc hủy các giải đấu trên toàn sàn',
          icon: 'trophy',
          iconColor: '#D97706',
          iconBg: '#FEF3C7',
          route: '/admin-tournaments',
        },
        {
          id: 'users',
          title: 'Quản lý Người dùng, Khách hàng & Chủ sân',
          sub: 'Phân loại khách hàng, chủ sân, phân quyền & khóa tài khoản',
          icon: 'people',
          iconColor: '#0284C7',
          iconBg: '#E0F2FE',
          route: '/admin-users',
        },
        {
          id: 'reviews',
          title: 'Kiểm duyệt Đánh giá Khách hàng',
          sub: 'Xem điểm sao, bình luận sân & ẩn nội dung vi phạm',
          icon: 'star',
          iconColor: '#EAB308',
          iconBg: '#FEF9C3',
          route: '/admin-reviews',
        },
      ],
    },
    {
      title: 'TÀI CHÍNH & VẬN HÀNH',
      items: [
        {
          id: 'finance',
          title: 'Tài chính & Đối soát Dòng tiền',
          sub: 'Doanh thu đặt sân, hoa hồng sàn 10% & chuyển trả chủ sân',
          icon: 'cash',
          iconColor: '#16A34A',
          iconBg: '#DCFCE7',
          route: '/(admin)/finance',
        },
        {
          id: 'vouchers',
          title: 'Mã Giảm giá & Khuyến mãi',
          sub: 'Phát hành, kích hoạt & cấu hình voucher ưu đãi toàn hệ thống',
          icon: 'pricetag',
          iconColor: '#8B5CF6',
          iconBg: '#EDE9FE',
          route: '/(admin)/vouchers',
        },
        {
          id: 'moderation',
          title: 'Trung tâm Kiểm duyệt Sân',
          sub: 'Phê duyệt cụm sân mới, kiểm tra giấy phép kinh doanh',
          icon: 'shield-checkmark',
          iconColor: '#EA580C',
          iconBg: '#FFEDD5',
          route: '/(admin)/moderation',
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Menu Quản trị Hệ thống" showBack={false} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Profile Box */}
        <View style={[styles.adminProfileCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Image
            source={{
              uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
            }}
            style={styles.adminAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminName, { color: colors.text }]}>{user?.fullName || 'Ban Quản Trị'}</Text>
            <Text style={[styles.adminEmail, { color: colors.textSecondary }]}>{user?.email || 'admin@datsan.vn'}</Text>
            <View style={styles.roleTag}>
              <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
              <Text style={styles.roleTagText}>Quản trị viên Cấp cao</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((sec, idx) => (
          <View key={idx} style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{sec.title}</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
              {sec.items.map((item, itemIdx) => {
                const isLast = itemIdx === sec.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => router.push(item.route)}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon} size={20} color={item.iconColor} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.sub}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout Section */}
        <View style={styles.logoutSection}>
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
  },
  adminProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: 12,
  },
  adminAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  adminName: {
    fontSize: 16,
    fontWeight: '800',
  },
  adminEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  sectionWrap: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  menuCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutSection: {
    marginTop: SPACING.sm,
  },
});
