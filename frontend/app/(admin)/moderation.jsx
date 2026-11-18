import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { SPORTS, AMENITIES } from '../../constants/sports';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function AdminModerationScreen() {
  const { colors } = useTheme();

  // 3 Tab kiểm duyệt: 'courts' | 'tournaments' | 'owners'
  const [activeTab, setActiveTab] = useState('courts');
  const [pendingCourts, setPendingCourts] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Court Inspection Modal
  const [inspectCourt, setInspectCourt] = useState(null);

  // Tournament Inspection Modal
  const [inspectTournament, setInspectTournament] = useState(null);

  // Reject Modal state (Dùng chung cho cả Sân và Giải đấu)
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectType, setRejectType] = useState('court'); // 'court' | 'tournament'
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadModerationData = useCallback(async () => {
    try {
      const [allCourts, allUsers, allTournaments] = await Promise.all([
        db.getAll('courts'),
        db.getAll('users'),
        db.getAll('tournaments'),
      ]);

      // Sân chờ duyệt
      const pCourts = allCourts.filter((c) => c.status === 'pending');
      const enrichedCourts = pCourts.map((c) => {
        const owner = allUsers.find((u) => u.id === c.ownerId);
        return {
          ...c,
          ownerInfo: owner || null,
        };
      });
      // Sắp xếp sân mới nhất lên đầu
      enrichedCourts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setPendingCourts(enrichedCourts);

      // Giải đấu hệ thống: ưu tiên pending lên trước
      const enrichedTournaments = allTournaments.map((t) => {
        const owner = allUsers.find((u) => u.id === t.ownerId);
        return {
          ...t,
          ownerInfo: owner || null,
        };
      });
      enrichedTournaments.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      setTournaments(enrichedTournaments);

      // Chủ sân chờ duyệt hồ sơ
      const pOwners = allUsers.filter((u) => u.role === 'owner' && u.status === 'pending');
      setPendingOwners(pOwners);
    } catch (e) {
      console.warn('Lỗi tải danh sách kiểm duyệt:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadModerationData();
  }, [loadModerationData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadModerationData();
  };

  // --- HÀNH ĐỘNG KIỂM DUYỆT SÂN ---
  const handleApproveCourt = (court) => {
    confirmAction(
      'Duyệt sân thể thao',
      `Bạn có chắc chắn muốn duyệt cụm sân "${court.name}"? Sân sẽ ngay lập tức hiển thị công khai cho người dùng đặt.`,
      'Duyệt ngay',
      async () => {
        try {
          await db.update('courts', court.id, {
            status: 'approved',
            isActive: true,
          });

          // Gửi thông báo cho Chủ sân
          if (court.ownerId) {
            await db.add('notifications', {
              userId: court.ownerId,
              title: 'Sân của bạn đã được duyệt! 🎉',
              body: `Chúc mừng! Cụm sân "${court.name}" đã được Ban quản trị phê duyệt. Khách hàng đã có thể tìm thấy và đặt sân ngay bây giờ.`,
              type: 'court_approved',
              read: false,
              createdAt: new Date().toISOString(),
            });
          }

          notify('Thành công', `Đã duyệt sân "${court.name}" thành công!`);
          setInspectCourt(null);
          await loadModerationData();
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể duyệt sân');
        }
      }
    );
  };

  // --- HÀNH ĐỘNG KIỂM DUYỆT GIẢI ĐẤU ---
  const handleApproveTournament = (tour) => {
    confirmAction(
      'Phê duyệt giải đấu',
      `Bạn có chắc chắn muốn phê duyệt giải đấu "${tour.name}"? Giải đấu sẽ được công khai trên toàn hệ thống để các đội bóng đăng ký thi đấu.`,
      'Duyệt công khai',
      async () => {
        try {
          await db.update('tournaments', tour.id, {
            status: 'open',
            approvedAt: new Date().toISOString(),
          });

          // Gửi thông báo cho Chủ sân tổ chức
          if (tour.ownerId) {
            await db.add('notifications', {
              userId: tour.ownerId,
              title: 'Giải đấu đã được phê duyệt! 🏆',
              body: `Giải đấu "${tour.name}" đã được Ban quản trị duyệt và hiển thị công khai trên ứng dụng. Các đội bóng có thể bắt đầu đăng ký!`,
              type: 'tournament_approved',
              read: false,
              createdAt: new Date().toISOString(),
            });
          }

          notify('Thành công', `Đã duyệt giải đấu "${tour.name}" thành công!`);
          setInspectTournament(null);
          await loadModerationData();
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể duyệt giải đấu');
        }
      }
    );
  };

  // Mở modal từ chối (chung cho court hoặc tournament)
  const openRejectModal = (target, type = 'court') => {
    setRejectTarget(target);
    setRejectType(type);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  // Xác nhận từ chối kèm lý do
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      notify('Thiếu lý do', 'Vui lòng nhập lý do từ chối để chủ sân biết và chỉnh sửa lại.');
      return;
    }

    try {
      setSubmitting(true);

      if (rejectType === 'court') {
        await db.update('courts', rejectTarget.id, {
          status: 'rejected',
          rejectReason: rejectReason.trim(),
        });

        if (rejectTarget.ownerId) {
          await db.add('notifications', {
            userId: rejectTarget.ownerId,
            title: 'Sân bị từ chối phê duyệt ❌',
            body: `Cụm sân "${rejectTarget.name}" bị từ chối với lý do: "${rejectReason.trim()}". Bạn có thể vào mục "Sân của tôi" bấm Sửa để gửi lại.`,
            type: 'court_rejected',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        notify('Đã từ chối', `Đã từ chối phê duyệt sân "${rejectTarget.name}".`);
        setInspectCourt(null);
      } else if (rejectType === 'tournament') {
        await db.update('tournaments', rejectTarget.id, {
          status: 'rejected',
          rejectReason: rejectReason.trim(),
        });

        if (rejectTarget.ownerId) {
          await db.add('notifications', {
            userId: rejectTarget.ownerId,
            title: 'Giải đấu bị từ chối duyệt ⚠️',
            body: `Giải đấu "${rejectTarget.name}" bị từ chối duyệt với lý do: "${rejectReason.trim()}".`,
            type: 'tournament_rejected',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        notify('Đã từ chối', `Đã từ chối giải đấu "${rejectTarget.name}".`);
        setInspectTournament(null);
      }

      setRejectModalVisible(false);
      await loadModerationData();
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể thực hiện thao tác');
    } finally {
      setSubmitting(false);
    }
  };

  // --- HÀNH ĐỘNG KIỂM DUYỆT CHỦ SÂN ---
  const handleApproveOwner = (owner) => {
    confirmAction(
      'Duyệt hồ sơ Chủ sân',
      `Phê duyệt tài khoản cho chủ sân "${owner.fullName}"? Họ sẽ có đầy đủ quyền đăng ký cụm sân và quản lý kinh doanh.`,
      'Duyệt hồ sơ',
      async () => {
        try {
          await db.update('users', owner.id, { status: 'active' });
          await db.add('notifications', {
            userId: owner.id,
            title: 'Tài khoản Chủ sân đã được kích hoạt! 🏅',
            body: 'Hồ sơ kinh doanh của bạn đã được kiểm duyệt hợp lệ. Hãy bắt đầu đăng tải cụm sân thể thao đầu tiên.',
            type: 'owner_approved',
            read: false,
            createdAt: new Date().toISOString(),
          });
          notify('Thành công', `Đã duyệt hồ sơ của ${owner.fullName}`);
          await loadModerationData();
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể duyệt chủ sân');
        }
      }
    );
  };

  const pendingTournamentsCount = tournaments.filter((t) => t.status === 'pending').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Trung tâm Kiểm duyệt" showBack={false} />

      {/* Tabs Switcher */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surfaceSecondary }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'courts' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('courts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'courts' ? '#FFFFFF' : colors.textSecondary }]}>
            Sân chờ duyệt ({pendingCourts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'tournaments' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('tournaments')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'tournaments' ? '#FFFFFF' : colors.textSecondary }]}>
            Giải đấu ({pendingTournamentsCount > 0 ? `${pendingTournamentsCount} chờ` : tournaments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'owners' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('owners')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'owners' ? '#FFFFFF' : colors.textSecondary }]}>
            Chủ sân ({pendingOwners.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải dữ liệu kiểm duyệt...</Text>
        </View>
      ) : activeTab === 'courts' ? (
        /* TAB 1: SÂN CHỜ DUYỆT */
        <FlatList
          data={pendingCourts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Không có sân chờ duyệt"
              description="Tất cả các sân thể thao đăng ký mới đều đã được xử lý kiểm định thành công."
            />
          }
          renderItem={({ item }) => {
            const sportObj = SPORTS.find((s) => s.id === item.sport);
            const minPrice = item.priceRules?.length
              ? Math.min(...item.priceRules.map((r) => r.price))
              : 150000;

            return (
              <View
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  SHADOWS.md,
                ]}
              >
                <Image
                  source={{
                    uri: item.images?.[0] || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
                  }}
                  style={styles.cardImage}
                />

                <View style={styles.cardBody}>
                  <View style={styles.badgeRow}>
                    <Badge label={sportObj?.name?.toUpperCase() || item.sport?.toUpperCase()} variant="accent" size="sm" />
                    <Badge label="Chờ duyệt xuất bản" variant="warning" size="sm" />
                  </View>

                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemSub, { color: colors.primary }]}>
                    {item.type || 'Tiêu chuẩn'} • {item.subCourts?.length || 1} sân con • Từ {formatVND(minPrice)}/h
                  </Text>
                  <Text style={[styles.itemAddress, { color: colors.textSecondary }]}>
                    📍 {item.address}
                  </Text>

                  {/* Thông tin hồ sơ pháp lý & chủ sân */}
                  <View style={[styles.ownerMetaBox, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.ownerMetaTitle, { color: colors.textSecondary }]}>Hồ sơ chủ sở hữu:</Text>
                    <Text style={[styles.ownerMetaName, { color: colors.text }]}>
                      {item.ownerInfo?.fullName || item.ownerName || 'Chưa rõ'}
                    </Text>
                    <Text style={[styles.ownerMetaText, { color: colors.textSecondary }]}>
                      SĐT: {item.ownerInfo?.phone || item.phone || '---'} • Email: {item.ownerInfo?.email || '---'}
                    </Text>
                    {Boolean(item.ownerInfo?.businessLicense) && (
                      <Text style={[styles.ownerLicenseText, { color: colors.primary }]}>
                        🏛 GPKD: {item.ownerInfo.businessLicense}
                      </Text>
                    )}
                  </View>

                  {/* Action buttons */}
                  <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.inspectBtn, { borderColor: colors.border }]}
                      onPress={() => setInspectCourt(item)}
                    >
                      <Ionicons name="eye-outline" size={16} color={colors.text} />
                      <Text style={[styles.inspectBtnText, { color: colors.text }]}>Xem hồ sơ chi tiết</Text>
                    </TouchableOpacity>

                    <Button
                      title="Từ chối"
                      onPress={() => openRejectModal(item, 'court')}
                      variant="danger"
                      size="sm"
                      style={{ flex: 1 }}
                    />

                    <Button
                      title="Phê duyệt"
                      onPress={() => handleApproveCourt(item)}
                      variant="primary"
                      size="sm"
                      style={{ flex: 1.4 }}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      ) : activeTab === 'tournaments' ? (
        /* TAB 2: QUẢN LÝ & DUYỆT GIẢI ĐẤU HỆ THỐNG */
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="trophy-outline"
              title="Chưa có giải đấu nào"
              description="Hiện chưa có giải đấu nào được đăng ký trên hệ thống."
            />
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            const isRejected = item.status === 'rejected';
            const isOpen = item.status === 'open';

            return (
              <View
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.surface, borderColor: isPending ? '#FDE68A' : colors.border },
                  SHADOWS.md,
                ]}
              >
                <Image
                  source={{
                    uri: item.cover || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
                  }}
                  style={styles.cardImage}
                />

                <View style={styles.cardBody}>
                  <View style={styles.badgeRow}>
                    <Badge label={item.sport?.toUpperCase()} variant="accent" size="sm" />
                    {isPending ? (
                      <Badge label="Chờ duyệt công khai ⏳" variant="warning" size="sm" />
                    ) : isRejected ? (
                      <Badge label="Bị từ chối ❌" variant="danger" size="sm" />
                    ) : (
                      <Badge label="Đang mở đăng ký 🏆" variant="success" size="sm" />
                    )}
                  </View>

                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  
                  <View style={styles.tourMetaGrid}>
                    <View style={styles.tourMetaItem}>
                      <Text style={[styles.tourMetaLabel, { color: colors.textSecondary }]}>Giải thưởng:</Text>
                      <Text style={[styles.tourMetaVal, { color: '#D97706', fontWeight: '800' }]}>{item.prize}</Text>
                    </View>
                    <View style={styles.tourMetaItem}>
                      <Text style={[styles.tourMetaLabel, { color: colors.textSecondary }]}>Lệ phí:</Text>
                      <Text style={[styles.tourMetaVal, { color: colors.primary }]}>{formatVND(item.fee)}/đội</Text>
                    </View>
                  </View>

                  <View style={styles.tourMetaGrid}>
                    <View style={styles.tourMetaItem}>
                      <Text style={[styles.tourMetaLabel, { color: colors.textSecondary }]}>Quy mô:</Text>
                      <Text style={[styles.tourMetaVal, { color: colors.text }]}>Tối đa {item.maxTeams || 16} đội ({item.teams?.length || 0} đã đk)</Text>
                    </View>
                    <View style={styles.tourMetaItem}>
                      <Text style={[styles.tourMetaLabel, { color: colors.textSecondary }]}>Hạn đăng ký:</Text>
                      <Text style={[styles.tourMetaVal, { color: colors.text }]}>{item.registerTo || '---'}</Text>
                    </View>
                  </View>

                  {/* Chủ sân tổ chức */}
                  <View style={[styles.ownerMetaBox, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.ownerMetaTitle, { color: colors.textSecondary }]}>Đơn vị tổ chức:</Text>
                    <Text style={[styles.ownerMetaName, { color: colors.text }]}>
                      {item.ownerInfo?.fullName || item.ownerName || 'Chủ sân đối tác'}
                    </Text>
                    <Text style={[styles.ownerMetaText, { color: colors.textSecondary }]}>
                      SĐT: {item.ownerInfo?.phone || '---'} • Email: {item.ownerInfo?.email || '---'}
                    </Text>
                  </View>

                  {/* Actions for Tournament */}
                  <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.inspectBtn, { borderColor: colors.border }]}
                      onPress={() => setInspectTournament(item)}
                    >
                      <Ionicons name="document-text-outline" size={16} color={colors.text} />
                      <Text style={[styles.inspectBtnText, { color: colors.text }]}>Xem thể lệ</Text>
                    </TouchableOpacity>

                    {isPending ? (
                      <>
                        <Button
                          title="Từ chối"
                          onPress={() => openRejectModal(item, 'tournament')}
                          variant="danger"
                          size="sm"
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Duyệt công khai"
                          onPress={() => handleApproveTournament(item)}
                          variant="primary"
                          size="sm"
                          style={{ flex: 1.5 }}
                        />
                      </>
                    ) : (
                      <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isOpen ? '#16A34A' : '#64748B' }}>
                          {isOpen ? '✓ Đang hoạt động trên app' : 'Đã kết thúc / Đóng'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* TAB 3: HỒ SƠ CHỦ SÂN */
        <FlatList
          data={pendingOwners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Không có hồ sơ chủ sân chờ duyệt"
              description="Tất cả các chủ sân đăng ký mới đã được kích hoạt tài khoản."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.ownerCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                SHADOWS.md,
              ]}
            >
              <View style={styles.ownerTop}>
                <Image
                  source={{
                    uri: item.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                  }}
                  style={styles.ownerAvatar}
                />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={[styles.ownerName, { color: colors.text }]}>{item.fullName}</Text>
                  <Text style={[styles.ownerContact, { color: colors.textSecondary }]}>
                    SĐT: {item.phone} • {item.email}
                  </Text>
                  <Badge label="Chờ duyệt hồ sơ" variant="warning" size="sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                </View>
              </View>

              <View style={[styles.ownerBusinessBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.bizField, { color: colors.textSecondary }]}>
                  Tên cụm sân dự kiến: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.courtClusterName || 'Chưa cung cấp'}</Text>
                </Text>
                <Text style={[styles.bizField, { color: colors.textSecondary }]}>
                  Địa chỉ kinh doanh: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.courtClusterAddress || 'Chưa cung cấp'}</Text>
                </Text>
                <Text style={[styles.bizField, { color: colors.textSecondary }]}>
                  Số GPKD: <Text style={{ color: colors.primary, fontWeight: '800' }}>{item.businessLicense || 'Chưa nộp GPKD'}</Text>
                </Text>
                <Text style={[styles.bizField, { color: colors.textSecondary }]}>
                  CCCD / CMND: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.idCard || 'Chưa cung cấp'}</Text>
                </Text>
              </View>

              <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                <Button
                  title="Kích hoạt Chủ sân"
                  onPress={() => handleApproveOwner(item)}
                  variant="primary"
                  size="sm"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL 1: XEM CHI TIẾT HỒ SƠ SÂN CHỜ DUYỆT */}
      {inspectCourt && (
        <Modal
          visible={Boolean(inspectCourt)}
          animationType="slide"
          transparent
          onRequestClose={() => setInspectCourt(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalDetailCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  Hồ sơ sân: {inspectCourt.name}
                </Text>
                <TouchableOpacity onPress={() => setInspectCourt(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Image Gallery */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalGallery}>
                  {(inspectCourt.images || [inspectCourt.image]).map((img, idx) => (
                    <Image key={idx} source={{ uri: img }} style={styles.galleryThumb} />
                  ))}
                </ScrollView>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>1. Thông tin vị trí & quy mô</Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>📍 Địa chỉ: {inspectCourt.address}</Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  🏟 Loại sân: {inspectCourt.type || 'Tiêu chuẩn'} | Mặt sân: {inspectCourt.surface || 'Chuyên dụng'}
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  🕒 Giờ mở cửa: {inspectCourt.openTime || '06:00'} - {inspectCourt.closeTime || '23:00'} (Slot {inspectCourt.slotDurationMinutes || 60} phút)
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  Số sân con: {inspectCourt.subCourts?.join(', ') || 'Sân 1'}
                </Text>

                <Text style={[styles.detailSectionTitle, { color: colors.text, marginTop: 14 }]}>2. Bảng giá niêm yết</Text>
                {inspectCourt.priceRules?.map((pr, idx) => (
                  <Text key={idx} style={[styles.detailText, { color: colors.textSecondary }]}>
                    • {pr.from} - {pr.to} ({pr.label}): <Text style={{ color: colors.primary, fontWeight: '800' }}>{formatVND(pr.price)}</Text>/h
                  </Text>
                ))}

                <Text style={[styles.detailSectionTitle, { color: colors.text, marginTop: 14 }]}>3. Tiện ích & Chính sách</Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  Đặt cọc: {inspectCourt.depositPercent || 30}% | Hủy miễn phí trước: {inspectCourt.freeCancellationHours || 4} giờ
                </Text>
                <View style={styles.amenitiesWrap}>
                  {inspectCourt.amenities?.map((amId) => {
                    const amObj = AMENITIES.find((a) => a.id === amId);
                    return (
                      <View key={amId} style={[styles.amenityPill, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.amenityPillText, { color: colors.text }]}>✓ {amObj?.name || amId}</Text>
                      </View>
                    );
                  })}
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text, marginTop: 14 }]}>4. Thông tin Chủ sân & Pháp lý</Text>
                <View style={[styles.ownerLegalBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.detailText, { color: colors.text }]}>Họ tên: {inspectCourt.ownerInfo?.fullName || inspectCourt.ownerName}</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>Điện thoại: {inspectCourt.ownerInfo?.phone || inspectCourt.phone}</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>Số GPKD: <Text style={{ color: colors.primary, fontWeight: '800' }}>{inspectCourt.ownerInfo?.businessLicense || 'Chưa cập nhật'}</Text></Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>CCCD: {inspectCourt.ownerInfo?.idCard || 'Chưa cập nhật'}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <Button
                  title="Từ chối sân"
                  variant="danger"
                  size="md"
                  onPress={() => openRejectModal(inspectCourt, 'court')}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Phê duyệt ngay"
                  variant="primary"
                  size="md"
                  onPress={() => handleApproveCourt(inspectCourt)}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: XEM CHI TIẾT THỂ LỆ GIẢI ĐẤU */}
      {inspectTournament && (
        <Modal
          visible={Boolean(inspectTournament)}
          animationType="slide"
          transparent
          onRequestClose={() => setInspectTournament(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalDetailCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {inspectTournament.name}
                </Text>
                <TouchableOpacity onPress={() => setInspectTournament(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Image source={{ uri: inspectTournament.cover }} style={styles.tourModalCover} />

                <Text style={[styles.detailSectionTitle, { color: colors.text, marginTop: 12 }]}>Thông tin giải thưởng & Lệ phí</Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  🏆 Tổng giá trị giải thưởng: <Text style={{ color: '#D97706', fontWeight: '800' }}>{inspectTournament.prize}</Text>
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  💵 Lệ phí tham dự: <Text style={{ color: colors.primary, fontWeight: '800' }}>{formatVND(inspectTournament.fee)}/đội</Text>
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  👥 Số lượng đội: Tối đa {inspectTournament.maxTeams} đội ({inspectTournament.teams?.length || 0} đội đã ghi danh)
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  📅 Thời gian mở đăng ký: Từ {inspectTournament.registerFrom} đến {inspectTournament.registerTo}
                </Text>

                <Text style={[styles.detailSectionTitle, { color: colors.text, marginTop: 14 }]}>Điều lệ thi đấu</Text>
                <View style={[styles.rulesBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.rulesText, { color: colors.text }]}>{inspectTournament.rules || 'Chưa cung cấp thể lệ chi tiết.'}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text, marginTop: 14 }]}>Đơn vị chủ sân bảo trợ</Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {inspectTournament.ownerInfo?.fullName || inspectTournament.ownerName || 'Chủ sân đối tác'} ({inspectTournament.ownerInfo?.phone || '---'})
                </Text>
              </ScrollView>

              <View style={styles.modalFooterActions}>
                {inspectTournament.status === 'pending' ? (
                  <>
                    <Button
                      title="Từ chối"
                      variant="danger"
                      size="md"
                      onPress={() => openRejectModal(inspectTournament, 'tournament')}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Duyệt công khai"
                      variant="primary"
                      size="md"
                      onPress={() => handleApproveTournament(inspectTournament)}
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

      {/* MODAL 3: NHẬP LÝ DO TỪ CHỐI */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalBoxTitle, { color: colors.text }]}>
              {rejectType === 'court' ? 'Từ chối duyệt sân' : 'Từ chối giải đấu'}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Vui lòng nêu rõ lý do để chủ sân nắm được và cập nhật lại thông tin đúng quy định:
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="VD: Giấy phép kinh doanh mờ, thiếu hình ảnh phòng thay đồ..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Hủy bỏ"
                onPress={() => setRejectModalVisible(false)}
                variant="outline"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title="Xác nhận từ chối"
                onPress={handleConfirmReject}
                variant="danger"
                size="md"
                loading={submitting}
                style={{ flex: 1.2 }}
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
  tabsRow: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabActive: {},
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  itemCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: SPACING.md,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
  },
  itemSub: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemAddress: {
    fontSize: 12,
  },
  ownerMetaBox: {
    marginTop: 6,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  ownerMetaTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ownerMetaName: {
    fontSize: 13,
    fontWeight: '700',
  },
  ownerMetaText: {
    fontSize: 11,
  },
  ownerLicenseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 0.5,
    gap: 8,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tourMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  tourMetaItem: {
    flex: 1,
  },
  tourMetaLabel: {
    fontSize: 11,
  },
  tourMetaVal: {
    fontSize: 12,
  },
  ownerCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  ownerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  ownerContact: {
    fontSize: 12,
    marginTop: 2,
  },
  ownerBusinessBox: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  bizField: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalDetailCard: {
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
  modalGallery: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  galleryThumb: {
    width: 180,
    height: 120,
    borderRadius: RADIUS.md,
    marginRight: 10,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 3,
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  amenityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  amenityPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ownerLegalBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: 6,
    gap: 4,
  },
  tourModalCover: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  rulesBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  rulesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalFooterActions: {
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
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
});
