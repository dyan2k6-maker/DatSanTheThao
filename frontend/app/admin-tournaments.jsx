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
  ScrollView,
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
import { formatVND, formatDateVN } from '../utils/format';
import { confirmAction, notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

export default function AdminTournamentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'open' | 'ongoing' | 'completed' | 'rejected'

  // Modal Details
  const [inspectTournament, setInspectTournament] = useState(null);

  // Modal Reject / Cancel
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTargetTour, setRejectTargetTour] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tList, uList] = await Promise.all([
        db.getAll('tournaments'),
        db.getAll('users'),
      ]);

      const ownerMap = {};
      uList.forEach((u) => {
        ownerMap[u.id] = u;
      });

      const enriched = tList.map((t) => ({
        ...t,
        ownerInfo: ownerMap[t.ownerId] || null,
      }));

      // Sort pending first, then by newest
      enriched.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      setTournaments(enriched);
      setUsers(uList);
    } catch (e) {
      console.warn('Lỗi tải danh sách giải đấu:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = db.subscribe('tournaments', () => loadData());
    return () => unsub?.();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Approve Tournament
  const handleApprove = (tour) => {
    confirmAction(
      'Phê duyệt giải đấu',
      `Phê duyệt giải đấu "${tour.name}"? Giải sẽ hiển thị công khai trên ứng dụng để người dùng đăng ký tham gia.`,
      'Duyệt công khai',
      async () => {
        try {
          await db.update('tournaments', tour.id, {
            status: 'open',
            approvedAt: new Date().toISOString(),
          });

          if (tour.ownerId) {
            await db.add('notifications', {
              userId: tour.ownerId,
              title: 'Giải đấu đã được phê duyệt! 🏆',
              body: `Giải đấu "${tour.name}" của bạn đã được Ban quản trị duyệt công khai. Các đội bóng có thể bắt đầu đăng ký!`,
              type: 'tournament_approved',
              read: false,
              createdAt: new Date().toISOString(),
            });
          }

          notify('Thành công', `Đã duyệt giải đấu "${tour.name}"!`);
          setInspectTournament(null);
          await loadData();
        } catch (e) {
          notify('Lỗi', e.message || 'Không thể duyệt giải đấu');
        }
      }
    );
  };

  // Open Reject / Cancel Modal
  const openRejectModal = (tour) => {
    setRejectTargetTour(tour);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  // Confirm Reject / Cancel
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      notify('Thiếu lý do', 'Vui lòng nhập lý do từ chối/hủy giải đấu.');
      return;
    }

    try {
      setSubmitting(true);
      await db.update('tournaments', rejectTargetTour.id, {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
        rejectedAt: new Date().toISOString(),
      });

      if (rejectTargetTour.ownerId) {
        await db.add('notifications', {
          userId: rejectTargetTour.ownerId,
          title: 'Giải đấu bị từ chối / hủy bỏ ⚠️',
          body: `Giải đấu "${rejectTargetTour.name}" bị từ chối với lý do: "${rejectReason.trim()}".`,
          type: 'tournament_rejected',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      setRejectModalVisible(false);
      setInspectTournament(null);
      notify('Đã xử lý', `Đã từ chối/hủy giải đấu "${rejectTargetTour.name}".`);
      await loadData();
    } catch (e) {
      notify('Lỗi', e.message || 'Không thể thao tác');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchSport = t.sport?.toLowerCase().includes(q);
        const matchOwner = t.ownerInfo?.fullName?.toLowerCase().includes(q) || t.ownerName?.toLowerCase().includes(q);
        if (!matchName && !matchSport && !matchOwner) return false;
      }

      return true;
    });
  }, [tournaments, statusFilter, search]);

  // Metrics
  const totalTournaments = tournaments.length;
  const pendingCount = useMemo(() => tournaments.filter((t) => t.status === 'pending').length, [tournaments]);
  const openCount = useMemo(() => tournaments.filter((t) => t.status === 'open').length, [tournaments]);
  const ongoingCount = useMemo(() => tournaments.filter((t) => t.status === 'ongoing').length, [tournaments]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Quản lý Giải đấu Toàn hệ thống"
        showBack
        onBack={() => safeBack(router, '/(admin)/more')}
      />

      {/* Top Metrics Row */}
      <View style={styles.topBannerRow}>
        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: colors.text }]}>{totalTournaments}</Text>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>Tổng số giải</Text>
        </View>

        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: pendingCount > 0 ? '#FDE68A' : colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: pendingCount > 0 ? '#D97706' : colors.textSecondary }]}>
            {pendingCount}
          </Text>
          <Text style={[styles.bannerLabel, { color: pendingCount > 0 ? '#D97706' : colors.textSecondary }]}>
            Chờ kiểm duyệt
          </Text>
        </View>

        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: '#16A34A' }]}>{openCount}</Text>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>Đang mở đăng ký</Text>
        </View>

        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: '#0284C7' }]}>{ongoingCount}</Text>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>Đang tranh tài</Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm theo tên giải đấu, môn thể thao, chủ sân..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {Boolean(search) && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {[
            { id: 'all', label: `Tất cả (${totalTournaments})` },
            { id: 'pending', label: `Chờ duyệt (${pendingCount})` },
            { id: 'open', label: `Đang mở (${openCount})` },
            { id: 'ongoing', label: `Đang diễn ra (${ongoingCount})` },
            { id: 'completed', label: 'Đã bế mạc' },
            { id: 'rejected', label: 'Bị từ chối' },
          ].map((item) => {
            const active = statusFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.pillBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(item.id)}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : colors.text,
                    fontSize: 12,
                    fontWeight: active ? '800' : '600',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tournaments List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải danh sách giải đấu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="trophy-outline"
              title="Không tìm thấy giải đấu phù hợp"
              description="Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
            />
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            const isRejected = item.status === 'rejected';

            return (
              <View
                style={[
                  styles.tourCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isPending ? '#FDE68A' : isRejected ? '#FCA5A5' : colors.border,
                  },
                  SHADOWS.sm,
                ]}
              >
                {/* Cover Image & Sport Badge */}
                <View style={styles.coverWrapper}>
                  <Image
                    source={{
                      uri: item.cover || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
                    }}
                    style={styles.coverImage}
                  />

                  <View style={styles.badgeOverImage}>
                    <Badge label={item.sport?.toUpperCase()} variant="accent" size="sm" />
                    {isPending ? (
                      <Badge label="Chờ duyệt công khai ⏳" variant="warning" size="sm" />
                    ) : isRejected ? (
                      <Badge label="Bị từ chối ❌" variant="danger" size="sm" />
                    ) : (
                      <Badge label="Đang công khai 🏆" variant="success" size="sm" />
                    )}
                  </View>
                </View>

                {/* Content */}
                <View style={styles.cardBody}>
                  <Text style={[styles.tourName, { color: colors.text }]}>{item.name}</Text>

                  {/* Grid details */}
                  <View style={[styles.detailBox, { backgroundColor: colors.surfaceSecondary }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Giải thưởng:</Text>
                      <Text style={[styles.detailVal, { color: '#D97706', fontWeight: '800' }]}>{item.prize}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lệ phí tham gia:</Text>
                      <Text style={[styles.detailVal, { color: colors.primary, fontWeight: '800' }]}>
                        {formatVND(item.fee)}/đội
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quy mô:</Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        Tối đa {item.maxTeams || 16} đội ({item.teams?.length || 0} đội ghi danh)
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Hạn đăng ký:</Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>{item.registerTo || '---'}</Text>
                    </View>
                  </View>

                  {/* Organizer info */}
                  <View style={styles.organizerRow}>
                    <Ionicons name="business" size={14} color={colors.primary} />
                    <Text style={[styles.organizerText, { color: colors.textSecondary }]}>
                      Tổ chức: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.ownerInfo?.fullName || item.ownerName || 'Chủ sân đối tác'}</Text> ({item.ownerInfo?.phone || '---'})
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.inspectBtn, { borderColor: colors.border }]}
                      onPress={() => setInspectTournament(item)}
                    >
                      <Ionicons name="document-text-outline" size={15} color={colors.text} />
                      <Text style={[styles.inspectBtnText, { color: colors.text }]}>Xem thể lệ & Đội</Text>
                    </TouchableOpacity>

                    {isPending ? (
                      <View style={styles.rightButtons}>
                        <Button
                          title="Từ chối"
                          variant="danger"
                          size="sm"
                          onPress={() => openRejectModal(item)}
                        />
                        <Button
                          title="Phê duyệt công khai"
                          variant="primary"
                          size="sm"
                          icon={<Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />}
                          onPress={() => handleApprove(item)}
                        />
                      </View>
                    ) : isRejected ? (
                      <Text style={[styles.rejectedNotice, { color: '#EF4444' }]}>
                        Đã từ chối: {item.rejectReason || 'Không hợp lệ'}
                      </Text>
                    ) : (
                      <Button
                        title="Hủy giải đấu"
                        variant="danger"
                        size="sm"
                        onPress={() => openRejectModal(item)}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL: XEM CHI TIẾT THỂ LỆ & DANH SÁCH ĐỘI */}
      {inspectTournament && (
        <Modal
          visible={Boolean(inspectTournament)}
          transparent
          animationType="slide"
          onRequestClose={() => setInspectTournament(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {inspectTournament.name}
                </Text>
                <TouchableOpacity onPress={() => setInspectTournament(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Image source={{ uri: inspectTournament.cover }} style={styles.modalCover} />

                <Text style={[styles.secTitle, { color: colors.text }]}>1. Giải thưởng & Lệ phí</Text>
                <Text style={[styles.modalLine, { color: colors.textSecondary }]}>
                  🏆 Giải thưởng: <Text style={{ color: '#D97706', fontWeight: '800' }}>{inspectTournament.prize}</Text>
                </Text>
                <Text style={[styles.modalLine, { color: colors.textSecondary }]}>
                  💵 Lệ phí: <Text style={{ color: colors.primary, fontWeight: '800' }}>{formatVND(inspectTournament.fee)}/đội</Text>
                </Text>
                <Text style={[styles.modalLine, { color: colors.textSecondary }]}>
                  📅 Hạn đăng ký: Từ {inspectTournament.registerFrom} đến {inspectTournament.registerTo}
                </Text>

                <Text style={[styles.secTitle, { color: colors.text, marginTop: 12 }]}>2. Điều lệ thi đấu</Text>
                <View style={[styles.rulesBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.rulesText, { color: colors.text }]}>
                    {inspectTournament.rules || 'Chưa cung cấp thể lệ chi tiết.'}
                  </Text>
                </View>

                <Text style={[styles.secTitle, { color: colors.text, marginTop: 12 }]}>
                  3. Danh sách đội bóng đã đăng ký ({inspectTournament.teams?.length || 0}/{inspectTournament.maxTeams || 16})
                </Text>
                {inspectTournament.teams && inspectTournament.teams.length > 0 ? (
                  inspectTournament.teams.map((tm, i) => (
                    <View key={tm.id || i} style={[styles.teamRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.teamIndex, { color: colors.primary }]}>{i + 1}.</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.teamName, { color: colors.text }]}>{tm.name}</Text>
                        <Text style={[styles.teamCaptain, { color: colors.textSecondary }]}>
                          Đội trưởng: {tm.captain} • {tm.phone}
                        </Text>
                      </View>
                      <Badge
                        label={tm.status === 'approved' ? 'Đã duyệt' : 'Chờ xác nhận'}
                        variant={tm.status === 'approved' ? 'success' : 'warning'}
                        size="sm"
                      />
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyTeamsText, { color: colors.textSecondary }]}>
                    Chưa có đội bóng nào ghi danh vào giải đấu này.
                  </Text>
                )}
              </ScrollView>

              <View style={styles.modalBtnRow}>
                {inspectTournament.status === 'pending' ? (
                  <>
                    <Button
                      title="Từ chối"
                      variant="danger"
                      size="md"
                      onPress={() => openRejectModal(inspectTournament)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Phê duyệt công khai"
                      variant="primary"
                      size="md"
                      onPress={() => handleApprove(inspectTournament)}
                      style={{ flex: 1.5 }}
                    />
                  </>
                ) : (
                  <Button
                    title="Đóng"
                    variant="outline"
                    size="md"
                    onPress={() => setInspectTournament(null)}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL: NHẬP LÝ DO TỪ CHỐI / HỦY */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalBoxTitle, { color: colors.text }]}>Từ chối / Hủy giải đấu</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Vui lòng nêu rõ lý do để thông báo chính thức tới đơn vị chủ sân:
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="VD: Không đảm bảo điều lệ an toàn, thời gian trùng lịch bảo trì..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Hủy bỏ"
                variant="outline"
                size="md"
                onPress={() => setRejectModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Xác nhận hủy giải"
                variant="danger"
                size="md"
                loading={submitting}
                onPress={handleConfirmReject}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  topBannerRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    gap: 8,
  },
  bannerCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  bannerNum: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  pillsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  tourCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverWrapper: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgeOverImage: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardBody: {
    padding: SPACING.md,
  },
  tourName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailBox: {
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 4,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailVal: {
    fontSize: 12,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  organizerText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectedNotice: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  modalCover: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  secTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalLine: {
    fontSize: 13,
    marginBottom: 4,
  },
  rulesBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: 6,
  },
  rulesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  teamIndex: {
    fontSize: 13,
    fontWeight: '800',
    width: 24,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
  },
  teamCaptain: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyTeamsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  modalBoxTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    textAlignVertical: 'top',
    height: 80,
  },
});
