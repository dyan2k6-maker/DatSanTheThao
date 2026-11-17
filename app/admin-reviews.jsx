import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../services/db';
import { formatDateVN } from '../utils/format';
import { confirmAction, notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [reviews, setReviews] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState('all'); // 'all' | '5' | '4' | 'attention' (1-3) | 'hidden'

  // Modal inspection
  const [selectedReview, setSelectedReview] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [revList, courtList] = await Promise.all([
        db.getAll('reviews'),
        db.getAll('courts'),
      ]);

      // Enrich reviews with court name if missing
      const courtMap = {};
      courtList.forEach((c) => {
        courtMap[c.id] = c.name;
      });

      const enriched = revList.map((r) => ({
        ...r,
        courtName: r.courtName || courtMap[r.courtId] || 'Cụm sân thể thao',
      }));

      // Sort newest first
      enriched.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setReviews(enriched);
      setCourts(courtList);
    } catch (e) {
      console.warn('Lỗi tải đánh giá:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = db.subscribe('reviews', () => loadData());
    return () => unsub?.();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Toggle Hide / Show Review
  const handleToggleHideReview = (review) => {
    const isHidden = review.status === 'hidden';
    confirmAction(
      isHidden ? 'Hiển thị lại đánh giá' : 'Tạm ẩn đánh giá vi phạm',
      isHidden
        ? 'Bạn có muốn bỏ ẩn đánh giá này và cho phép hiển thị lại công khai trên trang chi tiết sân?'
        : 'Bạn có chắc chắn muốn TẠM ẨN đánh giá này? Đánh giá này sẽ không còn hiển thị công khai với người dùng.',
      isHidden ? 'Cho phép hiện' : 'Tạm ẩn ngay',
      async () => {
        try {
          const nextStatus = isHidden ? 'published' : 'hidden';
          await db.update('reviews', review.id, { status: nextStatus });
          notify('Thành công', isHidden ? 'Đã hiển thị lại đánh giá.' : 'Đã tạm ẩn đánh giá vi phạm.');
          if (selectedReview?.id === review.id) {
            setSelectedReview((prev) => (prev ? { ...prev, status: nextStatus } : null));
          }
          await loadData();
        } catch (e) {
          notify('Lỗi', e.message || 'Không thể thao tác');
        }
      },
      !isHidden
    );
  };

  // Delete Review
  const handleDeleteReview = (review) => {
    confirmAction(
      'Xóa vĩnh viễn đánh giá',
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN đánh giá của "${review.userName}"? Hành động này không thể hoàn tác.`,
      'Xóa vĩnh viễn',
      async () => {
        try {
          await db.remove('reviews', review.id);
          notify('Đã xóa', 'Đã xóa vĩnh viễn đánh giá khỏi hệ thống.');
          setSelectedReview(null);
          await loadData();
        } catch (e) {
          notify('Lỗi', e.message || 'Không thể xóa đánh giá');
        }
      },
      true
    );
  };

  // Metrics
  const totalReviews = reviews.length;
  const avgRating = useMemo(() => {
    if (totalReviews === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / totalReviews).toFixed(1);
  }, [reviews, totalReviews]);

  const count5Star = useMemo(() => reviews.filter((r) => r.rating === 5).length, [reviews]);
  const countAttention = useMemo(() => reviews.filter((r) => r.rating <= 3).length, [reviews]);
  const countHidden = useMemo(() => reviews.filter((r) => r.status === 'hidden').length, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Star filter
      if (starFilter === '5' && r.rating !== 5) return false;
      if (starFilter === '4' && r.rating !== 4) return false;
      if (starFilter === 'attention' && r.rating > 3) return false;
      if (starFilter === 'hidden' && r.status !== 'hidden') return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchUser = r.userName?.toLowerCase().includes(q);
        const matchCourt = r.courtName?.toLowerCase().includes(q);
        const matchComment = r.comment?.toLowerCase().includes(q);
        if (!matchUser && !matchCourt && !matchComment) return false;
      }

      return true;
    });
  }, [reviews, starFilter, search]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={15}
          color={i <= rating ? '#EAB308' : '#CBD5E1'}
          style={{ marginRight: 1 }}
        />
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Kiểm duyệt & Quản lý Đánh giá"
        showBack
        onBack={() => safeBack(router, '/(admin)/more')}
      />

      {/* Overview Statistics Cards */}
      <View style={styles.statsBanner}>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{avgRating} ★</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Điểm TB</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{totalReviews}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tổng đánh giá</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.statNum, { color: '#EAB308' }]}>{count5Star}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>5 Sao Tuyệt vời</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: countAttention > 0 ? '#FCA5A5' : colors.border }, SHADOWS.sm]}>
          <Text style={[styles.statNum, { color: countAttention > 0 ? '#EF4444' : colors.textSecondary }]}>
            {countAttention}
          </Text>
          <Text style={[styles.statLabel, { color: countAttention > 0 ? '#EF4444' : colors.textSecondary }]}>
            1-3★ Cần lưu ý
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm theo khách hàng, sân, nội dung bình luận..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {Boolean(search) && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'all', label: `Tất cả (${totalReviews})` },
            { id: '5', label: `5 Sao (${count5Star})` },
            { id: '4', label: `4 Sao (${reviews.filter((r) => r.rating === 4).length})` },
            { id: 'attention', label: `1-3 Sao (${countAttention})` },
            { id: 'hidden', label: `Đã ẩn (${countHidden})` },
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item }) => {
            const isActive = starFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStarFilter(item.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? '#FFFFFF' : colors.text, fontWeight: isActive ? '800' : '600' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Review List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải đánh giá...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title="Không có đánh giá phù hợp"
              description="Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc số sao khác."
            />
          }
          renderItem={({ item }) => {
            const isHidden = item.status === 'hidden';

            return (
              <View
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isHidden ? '#FCA5A5' : colors.border,
                    opacity: isHidden ? 0.75 : 1,
                  },
                  SHADOWS.sm,
                ]}
              >
                {/* Header row: User + Date */}
                <View style={styles.cardHeader}>
                  <View style={styles.userRow}>
                    <Image
                      source={{
                        uri:
                          item.userAvatar ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
                      }}
                      style={styles.avatar}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameAndBadge}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.userName || 'Khách hàng'}</Text>
                        {isHidden && (
                          <View style={styles.hiddenTag}>
                            <Ionicons name="eye-off" size={11} color="#EF4444" />
                            <Text style={styles.hiddenTagText}>Đang ẩn</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        {formatDateVN(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Rating Stars & Score */}
                  <View style={styles.ratingBadge}>
                    {renderStars(item.rating || 5)}
                    <Text style={[styles.scoreText, { color: colors.text }]}>{item.rating}.0</Text>
                  </View>
                </View>

                {/* Court Tag */}
                <View style={[styles.courtTagBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="business" size={13} color={colors.primary} />
                  <Text style={[styles.courtTagText, { color: colors.text }]} numberOfLines={1}>
                    {item.courtName}
                  </Text>
                </View>

                {/* Comment Body */}
                <Text style={[styles.commentText, { color: colors.text }]}>{item.comment}</Text>

                {/* Actions Row */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.footerBtn, { borderColor: colors.border }]}
                    onPress={() => setSelectedReview(item)}
                  >
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.footerBtnText, { color: colors.text }]}>Chi tiết</Text>
                  </TouchableOpacity>

                  <View style={styles.rightActions}>
                    {/* Nút Ẩn / Hiện */}
                    <TouchableOpacity
                      style={[
                        styles.toggleHideBtn,
                        {
                          backgroundColor: isHidden ? '#DCFCE7' : '#FEF3C7',
                          borderColor: isHidden ? '#86EFAC' : '#FDE68A',
                        },
                      ]}
                      onPress={() => handleToggleHideReview(item)}
                    >
                      <Ionicons
                        name={isHidden ? 'eye-outline' : 'eye-off-outline'}
                        size={15}
                        color={isHidden ? '#15803D' : '#D97706'}
                      />
                      <Text
                        style={[
                          styles.toggleHideText,
                          { color: isHidden ? '#15803D' : '#D97706' },
                        ]}
                      >
                        {isHidden ? 'Cho phép hiện' : 'Tạm ẩn vi phạm'}
                      </Text>
                    </TouchableOpacity>

                    {/* Nút Xóa */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteReview(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <Modal
          visible={Boolean(selectedReview)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedReview(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Chi tiết Đánh giá</Text>
                <TouchableOpacity onPress={() => setSelectedReview(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalUserRow}>
                <Image
                  source={{
                    uri:
                      selectedReview.userAvatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
                  }}
                  style={styles.modalAvatar}
                />
                <View>
                  <Text style={[styles.modalUserName, { color: colors.text }]}>{selectedReview.userName}</Text>
                  <Text style={[styles.modalDate, { color: colors.textSecondary }]}>
                    Ngày gửi: {formatDateVN(selectedReview.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cụm sân:</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{selectedReview.courtName}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mức chấm điểm:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {renderStars(selectedReview.rating || 5)}
                  <Text style={{ fontWeight: '800', color: colors.text }}>{selectedReview.rating}/5 sao</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Trạng thái:</Text>
                <Badge
                  label={selectedReview.status === 'hidden' ? 'Đã bị ẩn' : 'Đang công khai'}
                  variant={selectedReview.status === 'hidden' ? 'danger' : 'success'}
                  size="sm"
                />
              </View>

              <Text style={[styles.commentTitle, { color: colors.text }]}>Nội dung phản hồi:</Text>
              <View style={[styles.commentBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.modalCommentText, { color: colors.text }]}>{selectedReview.comment}</Text>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <Button
                  title={selectedReview.status === 'hidden' ? 'Bỏ ẩn đánh giá' : 'Tạm ẩn đánh giá'}
                  variant="outline"
                  size="md"
                  onPress={() => handleToggleHideReview(selectedReview)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Xóa đánh giá"
                  variant="danger"
                  size="md"
                  onPress={() => handleDeleteReview(selectedReview)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  statsBanner: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBarWrapper: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    height: 40,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  reviewCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  nameAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  hiddenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  hiddenTagText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  ratingBadge: {
    alignItems: 'flex-end',
  },
  starsRow: {
    flexDirection: 'row',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  courtTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 5,
    marginBottom: 8,
    maxWidth: '100%',
  },
  courtTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleHideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 5,
  },
  toggleHideText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: RADIUS.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalDate: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  commentBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  modalCommentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
