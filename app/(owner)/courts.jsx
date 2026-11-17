import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { EmptyState } from '../../components/ui/EmptyState';
import { db } from '../../services/db';
import { SPORTS } from '../../constants/sports';
import { formatVND } from '../../utils/format';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function OwnerCourtsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourts = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Lọc nghiêm ngặt sân của chính chủ sân
      const list = await db.getAll('courts', (c) => c.ownerId === user.id);
      setCourts(list);
    } catch (e) {
      console.warn('Lỗi tải danh sách sân của chủ sân:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCourts();
    }, [loadCourts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCourts();
  };

  // Bật/Tắt hoạt động (Tạm ẩn) - chỉ cho phép khi sân đã approved
  const handleToggleActive = async (court) => {
    if (court.status !== 'approved') {
      notify('Không thể thao tác', 'Chỉ có thể bật/tắt hoạt động cho các sân đã được Ban quản trị phê duyệt.');
      return;
    }

    const nextActive = court.isActive === false ? true : false;
    try {
      await db.update('courts', court.id, { isActive: nextActive });
      setCourts((prev) =>
        prev.map((c) => (c.id === court.id ? { ...c, isActive: nextActive } : c))
      );
      notify(
        nextActive ? 'Đã kích hoạt' : 'Đã tạm ẩn',
        nextActive
          ? `Sân "${court.name}" đã được bật hiển thị cho khách đặt.`
          : `Sân "${court.name}" đã tạm ẩn khỏi trang chủ và tìm kiếm.`
      );
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể đổi trạng thái');
    }
  };

  // Xóa sân - Chặn xóa nếu còn đơn confirmed/checked_in sắp tới
  const handleDeleteCourt = async (court) => {
    try {
      const activeBookings = await db.getAll('bookings', (b) => {
        return (
          b.courtId === court.id &&
          (b.status === 'confirmed' || b.status === 'checked_in')
        );
      });

      if (activeBookings.length > 0) {
        notify(
          'Không thể xóa sân ⚠️',
          `Sân "${court.name}" hiện còn ${activeBookings.length} đơn đặt đã xác nhận hoặc đang thi đấu. Bạn cần hoàn thành hoặc giải quyết các đơn này trước khi xóa.`
        );
        return;
      }

      confirmAction(
        'Xác nhận xóa sân',
        `Bạn có chắc chắn muốn xóa vĩnh viễn cụm sân "${court.name}"? Dữ liệu lịch sử sẽ không thể phục hồi.`,
        'Xóa vĩnh viễn',
        async () => {
          await db.remove('courts', court.id);
          notify('Đã xóa', `Đã xóa sân "${court.name}" thành công.`);
          await loadCourts();
        },
        true
      );
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể xóa sân');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Sân của tôi" />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải danh sách sân...</Text>
        </View>
      ) : (
        <FlatList
          data={courts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={[styles.createBannerBox, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.createBannerTitle, { color: colors.text }]}>Đăng ký sân mới</Text>
                <Text style={[styles.createBannerSub, { color: colors.textSecondary }]}>
                  Gửi thông tin cụm sân thể thao tới Ban Quản Trị để kiểm định & xuất bản.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.createBannerBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/court-create')}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.createBannerBtnText}>Thêm sân</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="football-outline"
              title="Chưa có sân thể thao nào"
              description="Bấm nút '+ Thêm sân mới' bên dưới để bắt đầu đăng ký cụm sân đầu tiên của bạn."
            />
          }
          renderItem={({ item }) => {
            const sportObj = SPORTS.find((s) => s.id === item.sport);
            const minPrice = item.priceRules?.length
              ? Math.min(...item.priceRules.map((r) => r.price))
              : 150000;

            // Xác định trạng thái duyệt & hiển thị
            let statusBadge = { label: 'Đã duyệt', bg: '#DCFCE7', text: '#16A34A' };
            if (item.status === 'pending') {
              statusBadge = { label: 'Chờ Admin duyệt', bg: '#FEF3C7', text: '#D97706' };
            } else if (item.status === 'rejected') {
              statusBadge = { label: 'Bị từ chối', bg: '#FEE2E2', text: '#EF4444' };
            } else if (item.isActive === false) {
              statusBadge = { label: 'Tạm ẩn', bg: '#F1F5F9', text: '#64748B' };
            }

            return (
              <View
                style={[
                  styles.courtCard,
                  { backgroundColor: colors.surface, borderColor: item.status === 'pending' ? '#FDE68A' : colors.border },
                  SHADOWS.sm,
                ]}
              >
                {/* Ảnh sân & Badges */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri: item.images?.[0] || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
                    }}
                    style={styles.courtImage}
                  />

                  {/* Sport Badge */}
                  <View style={styles.sportBadge}>
                    <Text style={styles.sportBadgeText}>{sportObj?.name || item.sport}</Text>
                  </View>

                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Nội dung chi tiết */}
                <View style={styles.courtInfo}>
                  <Text style={[styles.courtName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.courtAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    📍 {item.address}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: colors.primary }]}>
                      🏟 {item.subCourts?.length || 1} sân con ({item.type || 'Tiêu chuẩn'})
                    </Text>
                    <Text style={[styles.priceFrom, { color: colors.text }]}>
                      Từ <Text style={{ fontWeight: '800', color: colors.primary }}>{formatVND(minPrice)}</Text>/h
                    </Text>
                  </View>

                  {/* Rating */}
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#EAB308" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {item.rating || 5.0} ({item.reviewCount || 0} đánh giá)
                    </Text>
                  </View>

                  {/* Thông báo nếu sân đang chờ duyệt */}
                  {item.status === 'pending' && (
                    <View style={styles.pendingNoticeBox}>
                      <Ionicons name="time-outline" size={16} color="#D97706" />
                      <Text style={styles.pendingNoticeText}>
                        Đang chờ Admin kiểm duyệt hồ sơ & cơ sở vật chất. Sân sẽ tự động công khai sau khi được duyệt.
                      </Text>
                    </View>
                  )}

                  {/* Lý do từ chối nếu có */}
                  {item.status === 'rejected' && Boolean(item.rejectReason) && (
                    <View style={styles.rejectReasonBox}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={styles.rejectReasonText}>
                        Lý do từ chối: {item.rejectReason} (Bạn có thể bấm "Sửa" để gửi duyệt lại)
                      </Text>
                    </View>
                  )}

                  {/* Footer actions */}
                  <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                    {/* Bật / Tắt hoạt động */}
                    <View style={styles.activeToggleRow}>
                      <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                        {item.isActive !== false ? 'Đang mở' : 'Tạm ẩn'}
                      </Text>
                      <Switch
                        value={item.isActive !== false}
                        onValueChange={() => handleToggleActive(item)}
                        disabled={item.status !== 'approved'}
                        trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                        thumbColor={item.isActive !== false ? '#16A34A' : '#F1F5F9'}
                      />
                    </View>

                    <View style={styles.btnGroup}>
                      {/* Nút Sửa */}
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={() => router.push(`/court-form?id=${item.id}`)}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.text} />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Sửa</Text>
                      </TouchableOpacity>

                      {/* Nút Xóa */}
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleDeleteCourt(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Nút nổi "+ Thêm sân mới" */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        activeOpacity={0.85}
        onPress={() => router.push('/court-create')}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabBtnText}>+ Thêm sân mới</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  courtCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  courtImage: {
    width: '100%',
    height: '100%',
  },
  sportBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(11, 61, 46, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A3E635',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  courtInfo: {
    padding: SPACING.md,
    gap: 4,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '800',
  },
  courtAddress: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceFrom: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rejectReasonBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  rejectReasonText: {
    fontSize: 11,
    color: '#B91C1C',
    flex: 1,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 0.5,
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fabBtn: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: 12,
  },
  createBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  createBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  createBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  createBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  pendingNoticeText: {
    fontSize: 11,
    color: '#B45309',
    flex: 1,
    lineHeight: 15,
  },
});
