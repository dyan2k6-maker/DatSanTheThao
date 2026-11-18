import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { confirmAction, notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { db } from '../services/db';
import { formatDateVN, formatVND } from '../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [search, setSearch] = useState('');
  const [roleTab, setRoleTab] = useState('user'); // 'user' | 'owner' | 'admin' | 'locked' | 'all'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modal
  const [selectedUser, setSelectedUser] = useState(null);

  // Create User Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newClusterName, setNewClusterName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [uList, bList, cList] = await Promise.all([
        db.getAll('users'),
        db.getAll('bookings'),
        db.getAll('courts'),
      ]);

      uList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setUsers(uList);
      setBookings(bList);
      setCourts(cList);
    } catch (e) {
      console.warn('Lỗi tải dữ liệu người dùng:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = db.subscribe('users', () => loadData());
    return () => unsub?.();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Thống kê theo từng người dùng
  const userStatsMap = useMemo(() => {
    const stats = {};
    users.forEach((u) => {
      if (u.role === 'owner') {
        const ownerCourts = courts.filter((c) => c.ownerId === u.id);
        const ownerBookings = bookings.filter((b) => b.ownerId === u.id && b.status !== 'cancelled');
        const revenue = ownerBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        stats[u.id] = {
          courtCount: ownerCourts.length,
          subCourtsCount: ownerCourts.reduce((sum, c) => sum + (c.subCourts?.length || 1), 0),
          bookingCount: ownerBookings.length,
          revenue,
        };
      } else {
        const userBookings = bookings.filter((b) => b.userId === u.id && b.status !== 'cancelled');
        const totalSpent = userBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        stats[u.id] = {
          bookingCount: userBookings.length,
          totalSpent,
        };
      }
    });
    return stats;
  }, [users, bookings, courts]);

  // Bộ đếm từng phân loại
  const counts = useMemo(() => {
    return {
      all: users.length,
      user: users.filter((u) => u.role === 'user').length,
      owner: users.filter((u) => u.role === 'owner').length,
      admin: users.filter((u) => u.role === 'admin').length,
      locked: users.filter((u) => u.status === 'locked').length,
    };
  }, [users]);

  // Lọc danh sách
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleTab === 'user' && u.role !== 'user') return false;
      if (roleTab === 'owner' && u.role !== 'owner') return false;
      if (roleTab === 'admin' && u.role !== 'admin') return false;
      if (roleTab === 'locked' && u.status !== 'locked') return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = u.fullName?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchPhone = u.phone?.includes(q);
        const matchCluster = u.courtClusterName?.toLowerCase().includes(q);
        const matchLicense = u.businessLicense?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCluster && !matchLicense) return false;
      }
      return true;
    });
  }, [users, roleTab, search]);

  // Khóa / Mở khóa tài khoản
  const handleToggleLock = (targetUser) => {
    const isLocked = targetUser.status === 'locked';
    confirmAction(
      isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      isLocked
        ? `Mở khóa cho tài khoản "${targetUser.fullName}"? Khách sẽ có thể đăng nhập và đặt sân lại bình thường.`
        : `Bạn có chắc chắn muốn KHÓA tài khoản "${targetUser.fullName}"? Người này sẽ bị chặn đăng nhập ngay lập tức.`,
      isLocked ? 'Mở khóa ngay' : 'Khóa ngay',
      async () => {
        try {
          const nextStatus = isLocked ? 'active' : 'locked';
          await db.update('users', targetUser.id, { status: nextStatus });
          notify('Thành công', `Tài khoản đã chuyển sang trạng thái: ${nextStatus === 'active' ? 'Đang hoạt động' : 'Đã khóa'}`);
          if (selectedUser?.id === targetUser.id) {
            setSelectedUser((prev) => (prev ? { ...prev, status: nextStatus } : null));
          }
          await loadData();
        } catch (e) {
          notify('Lỗi', 'Không thể đổi trạng thái tài khoản');
        }
      },
      !isLocked
    );
  };

  // Đặt lại mật khẩu mặc định (Reset password)
  const handleResetPassword = (targetUser) => {
    confirmAction(
      'Đặt lại mật khẩu',
      `Khôi phục mật khẩu mặc định cho "${targetUser.fullName}" thành: 123456?`,
      'Đặt lại mật khẩu',
      async () => {
        try {
          await db.update('users', targetUser.id, { password: 'password123' });
          notify('Thành công', `Mật khẩu của "${targetUser.fullName}" đã được đặt lại thành: 123456`);
        } catch (e) {
          notify('Lỗi', 'Không thể đặt lại mật khẩu');
        }
      },
      false
    );
  };

  // Đổi phân quyền vai trò (User <-> Owner)
  const handleChangeRole = (targetUser) => {
    const nextRole = targetUser.role === 'owner' ? 'user' : 'owner';
    const nextRoleLabel = nextRole === 'owner' ? 'Chủ sân đối tác' : 'Khách hàng (Người dùng)';

    confirmAction(
      'Chuyển đổi phân quyền',
      `Bạn có muốn đổi vai trò của "${targetUser.fullName}" thành "${nextRoleLabel}"?`,
      'Đồng ý đổi',
      async () => {
        try {
          await db.update('users', targetUser.id, { role: nextRole });
          notify('Thành công', `Đã chuyển tài khoản sang vai trò: ${nextRoleLabel}`);
          if (selectedUser?.id === targetUser.id) {
            setSelectedUser((prev) => (prev ? { ...prev, role: nextRole } : null));
          }
          await loadData();
        } catch (e) {
          notify('Lỗi', 'Không thể đổi phân quyền');
        }
      },
      false
    );
  };

  // Tạo tài khoản mới từ Admin
  const handleCreateUser = async () => {
    if (!newFullName.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập họ và tên');
      return;
    }
    if (!newEmail.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập địa chỉ email');
      return;
    }

    setCreating(true);
    try {
      const newUser = {
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim() || '0981112233',
        role: newRole,
        password: 'password123',
        status: 'active',
        courtClusterName: newRole === 'owner' ? (newClusterName.trim() || `Cụm Sân ${newFullName.trim()}`) : null,
        avatar: newRole === 'owner'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        createdAt: new Date().toISOString(),
      };

      await db.add('users', newUser);
      notify('Tạo thành công 🎉', `Tài khoản mới đã được tạo với mật khẩu mặc định: 123456`);
      setCreateModalVisible(false);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewClusterName('');
      await loadData();
    } catch (e) {
      notify('Lỗi', e.message || 'Không thể tạo tài khoản');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Quản lý Tài khoản & Phân quyền"
        showBack
        onBack={() => safeBack(router, '/(admin)/more')}
        rightAction={
          <TouchableOpacity
            style={[styles.addTopBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addTopBtnText}>+ Thêm</Text>
          </TouchableOpacity>
        }
      />

      {/* TỔNG QUAN SỐ LIỆU */}
      <View style={styles.topStatsRow}>
        <TouchableOpacity
          style={[
            styles.statCard,
            { backgroundColor: colors.surface, borderColor: roleTab === 'user' ? colors.primary : colors.border },
            roleTab === 'user' && { borderWidth: 2 },
            SHADOWS.sm,
          ]}
          onPress={() => setRoleTab('user')}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="person" size={18} color="#0284C7" />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>{counts.user}</Text>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Khách hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statCard,
            { backgroundColor: colors.surface, borderColor: roleTab === 'owner' ? '#D97706' : colors.border },
            roleTab === 'owner' && { borderWidth: 2 },
            SHADOWS.sm,
          ]}
          onPress={() => setRoleTab('owner')}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="business" size={18} color="#D97706" />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>{counts.owner}</Text>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Chủ sân đối tác</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statCard,
            { backgroundColor: colors.surface, borderColor: roleTab === 'admin' ? '#8B5CF6' : colors.border },
            roleTab === 'admin' && { borderWidth: 2 },
            SHADOWS.sm,
          ]}
          onPress={() => setRoleTab('admin')}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#8B5CF6" />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>{counts.admin}</Text>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Quản trị viên</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statCard,
            {
              backgroundColor: colors.surface,
              borderColor: roleTab === 'locked' ? '#EF4444' : counts.locked > 0 ? '#FCA5A5' : colors.border,
            },
            roleTab === 'locked' && { borderWidth: 2 },
            SHADOWS.sm,
          ]}
          onPress={() => setRoleTab('locked')}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="lock-closed" size={18} color="#EF4444" />
          </View>
          <Text style={[styles.statNumber, { color: counts.locked > 0 ? '#EF4444' : colors.text }]}>{counts.locked}</Text>
          <Text style={[styles.statTitle, { color: counts.locked > 0 ? '#EF4444' : colors.textSecondary }]}>Đã khóa</Text>
        </TouchableOpacity>
      </View>

      {/* THANH TÌM KIẾM & TAB PHÂN LOẠI */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm theo tên, email, SĐT, cụm sân, GPKD..."
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

        {/* TABS CHỌN NHANH */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { id: 'user', label: `Khách hàng (${counts.user})`, icon: 'person' },
            { id: 'owner', label: `Chủ sân (${counts.owner})`, icon: 'business' },
            { id: 'admin', label: `Admin (${counts.admin})`, icon: 'shield-checkmark' },
            { id: 'locked', label: `Bị khóa (${counts.locked})`, icon: 'lock-closed' },
            { id: 'all', label: `Tất cả (${counts.all})`, icon: 'apps' },
          ].map((tab) => {
            const isActive = roleTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setRoleTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? '#FFFFFF' : colors.text, fontWeight: isActive ? '800' : '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* DANH SÁCH THẺ TÀI KHOẢN */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải hồ sơ tài khoản...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Không tìm thấy tài khoản"
              description="Hãy thử từ khóa tìm kiếm khác hoặc chuyển sang tab vai trò tương ứng."
            />
          }
          renderItem={({ item }) => {
            const isLocked = item.status === 'locked';
            const isOwner = item.role === 'owner';
            const isAdmin = item.role === 'admin';
            const stats = userStatsMap[item.id] || {};

            return (
              <View
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isLocked ? '#FCA5A5' : colors.border,
                  },
                  isLocked && { opacity: 0.8 },
                  SHADOWS.sm,
                ]}
              >
                {/* HÀNG TRÊN: AVATAR + TÊN + BADGE VAI TRÒ & TRẠNG THÁI */}
                <View style={styles.cardHeaderRow}>
                  <Image
                    source={{
                      uri: item.avatar || (isOwner
                        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
                        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'),
                    }}
                    style={styles.avatar}
                  />

                  <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                        {item.fullName}
                      </Text>
                      {/* Badge Vai Trò */}
                      <Badge
                        label={isAdmin ? 'ADMIN' : isOwner ? 'CHỦ SÂN' : 'KHÁCH HÀNG'}
                        variant={isAdmin ? 'accent' : isOwner ? 'warning' : 'info'}
                        size="sm"
                      />
                    </View>

                    <Text style={[styles.userContact, { color: colors.textSecondary }]} numberOfLines={1}>
                      ✉️ {item.email}
                    </Text>
                    <Text style={[styles.userContact, { color: colors.textSecondary }]} numberOfLines={1}>
                      📞 {item.phone || 'Chưa cập nhật SĐT'}
                    </Text>
                  </View>
                </View>

                {/* THÔNG TIN CHI TIẾT THEO LOẠI TÀI KHOẢN */}
                {isOwner ? (
                  // THẺ CHỦ SÂN: CỤM SÂN, GPKD, SỐ SÂN, DOANH THU
                  <View style={[styles.detailBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <View style={styles.clusterRow}>
                      <Ionicons name="business" size={15} color="#D97706" />
                      <Text style={[styles.clusterTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.courtClusterName || 'Cụm sân chưa đặt tên'}
                      </Text>
                    </View>

                    <View style={styles.ownerMetricsRow}>
                      <Text style={[styles.metricText, { color: colors.primary }]}>
                        🏟 <Text style={{ fontWeight: '800' }}>{stats.courtCount || 0}</Text> sân ({stats.subCourtsCount || 0} sân con)
                      </Text>
                      <Text style={[styles.metricText, { color: '#0284C7' }]}>
                        📋 <Text style={{ fontWeight: '800' }}>{stats.bookingCount || 0}</Text> lượt đặt
                      </Text>
                    </View>

                    {Boolean(item.businessLicense) && (
                      <Text style={[styles.licenseText, { color: colors.textSecondary }]}>
                        GPKD: <Text style={{ fontWeight: '700', color: colors.text }}>{item.businessLicense}</Text>
                      </Text>
                    )}
                  </View>
                ) : (
                  // THẺ KHÁCH HÀNG: SỐ LƯỢT ĐẶT SÂN, TỔNG TIỀN CHI TIÊU
                  <View style={[styles.detailBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <View style={styles.ownerMetricsRow}>
                      <Text style={[styles.metricText, { color: colors.primary }]}>
                        ⚽ <Text style={{ fontWeight: '800' }}>{stats.bookingCount || 0}</Text> lần đặt sân
                      </Text>
                      <Text style={[styles.metricText, { color: '#16A34A' }]}>
                        💰 Tổng chi: <Text style={{ fontWeight: '800' }}>{formatVND(stats.totalSpent || 0)}</Text>
                      </Text>
                    </View>
                    <Text style={[styles.licenseText, { color: colors.textSecondary }]}>
                      Tham gia: {formatDateVN(item.createdAt)}
                    </Text>
                  </View>
                )}

                {/* HÀNG HÀNH ĐỘNG DÀNH CHO ADMIN */}
                <View style={[styles.actionsFooter, { borderTopColor: colors.border }]}>
                  {/* Trạng thái hoạt động */}
                  <View style={styles.statusBadgeWrap}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isLocked ? '#EF4444' : '#16A34A' },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: isLocked ? '#EF4444' : '#16A34A' }]}>
                      {isLocked ? 'Đã bị khóa' : 'Đang hoạt động'}
                    </Text>
                  </View>

                  <View style={styles.actionBtnsGroup}>
                    {/* Nút Xem Chi Tiết */}
                    <TouchableOpacity
                      style={[styles.smallBtn, { borderColor: colors.border }]}
                      onPress={() => setSelectedUser(item)}
                    >
                      <Ionicons name="eye-outline" size={14} color={colors.text} />
                      <Text style={[styles.smallBtnText, { color: colors.text }]}>Chi tiết</Text>
                    </TouchableOpacity>

                    {/* Nút Reset Mật Khẩu */}
                    {!isAdmin && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { borderColor: colors.border }]}
                        onPress={() => handleResetPassword(item)}
                      >
                        <Ionicons name="key-outline" size={14} color="#0284C7" />
                        <Text style={[styles.smallBtnText, { color: '#0284C7' }]}>Reset MK</Text>
                      </TouchableOpacity>
                    )}

                    {/* Nút Khóa / Mở Khóa */}
                    {!isAdmin && (
                      <TouchableOpacity
                        style={[
                          styles.smallBtn,
                          {
                            borderColor: isLocked ? '#86EFAC' : '#FCA5A5',
                            backgroundColor: isLocked ? '#DCFCE7' : '#FEE2E2',
                          },
                        ]}
                        onPress={() => handleToggleLock(item)}
                      >
                        <Ionicons
                          name={isLocked ? 'lock-open-outline' : 'lock-closed-outline'}
                          size={14}
                          color={isLocked ? '#16A34A' : '#EF4444'}
                        />
                        <Text style={[styles.smallBtnText, { color: isLocked ? '#16A34A' : '#EF4444' }]}>
                          {isLocked ? 'Mở khóa' : 'Khóa'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL CHI TIẾT TÀI KHOẢN & ĐỔI PHÂN QUYỀN */}
      {selectedUser && (
        <Modal
          visible={Boolean(selectedUser)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedUser(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Hồ sơ tài khoản chi tiết</Text>
                <TouchableOpacity onPress={() => setSelectedUser(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <View style={styles.modalUserRow}>
                  <Image
                    source={{
                      uri: selectedUser.avatar || (selectedUser.role === 'owner'
                        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
                        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'),
                    }}
                    style={styles.modalAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalUserName, { color: colors.text }]}>{selectedUser.fullName}</Text>
                    <Text style={[styles.modalUserEmail, { color: colors.textSecondary }]}>{selectedUser.email}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <Badge
                        label={selectedUser.role === 'owner' ? 'Chủ sân' : selectedUser.role === 'admin' ? 'Admin' : 'Khách hàng'}
                        variant={selectedUser.role === 'owner' ? 'warning' : selectedUser.role === 'admin' ? 'accent' : 'info'}
                        size="sm"
                      />
                      <Badge
                        label={selectedUser.status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
                        variant={selectedUser.status === 'locked' ? 'danger' : 'success'}
                        size="sm"
                      />
                    </View>
                  </View>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Số điện thoại:</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>{selectedUser.phone || 'Chưa cập nhật'}</Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ngày đăng ký:</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>{formatDateVN(selectedUser.createdAt)}</Text>
                </View>

                {selectedUser.role === 'owner' && (
                  <>
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cụm sân thể thao:</Text>
                      <Text style={[styles.infoVal, { color: colors.primary }]}>{selectedUser.courtClusterName || 'Chưa đặt tên'}</Text>
                    </View>

                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Địa chỉ đăng ký:</Text>
                      <Text style={[styles.infoVal, { color: colors.text }]}>{selectedUser.courtClusterAddress || 'Chưa cung cấp'}</Text>
                    </View>

                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>GPKD / Mã ĐKKD:</Text>
                      <Text style={[styles.infoVal, { color: colors.text }]}>{selectedUser.businessLicense || 'Chưa cung cấp'}</Text>
                    </View>

                    {selectedUser.bankInfo && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tài khoản VietQR:</Text>
                        <Text style={[styles.infoVal, { color: colors.text }]}>
                          {selectedUser.bankInfo.bankName} - {selectedUser.bankInfo.accountNumber} ({selectedUser.bankInfo.accountName})
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* THAO TÁC NÂNG CAO */}
                {selectedUser.role !== 'admin' && (
                  <View style={styles.modalExtraActions}>
                    <TouchableOpacity
                      style={[styles.switchRoleBtn, { borderColor: colors.border }]}
                      onPress={() => handleChangeRole(selectedUser)}
                    >
                      <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                      <Text style={[styles.switchRoleText, { color: colors.primary }]}>
                        Đổi vai trò sang: {selectedUser.role === 'owner' ? 'Khách hàng' : 'Chủ sân đối tác'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.switchRoleBtn, { borderColor: colors.border }]}
                      onPress={() => handleResetPassword(selectedUser)}
                    >
                      <Ionicons name="key" size={16} color="#0284C7" />
                      <Text style={[styles.switchRoleText, { color: '#0284C7' }]}>
                        Đặt lại mật khẩu về mặc định (123456)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              {/* Nút Khóa / Mở khóa ở Modal */}
              {selectedUser.role !== 'admin' && (
                <View style={styles.modalFooterActions}>
                  <Button
                    title={selectedUser.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản này'}
                    variant={selectedUser.status === 'locked' ? 'primary' : 'danger'}
                    size="md"
                    onPress={() => handleToggleLock(selectedUser)}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL TẠO TÀI KHOẢN MỚI */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm tài khoản mới</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Loại tài khoản *</Text>
              <View style={styles.roleSelectRow}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: newRole === 'user' ? colors.primary : colors.surfaceSecondary,
                      borderColor: newRole === 'user' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewRole('user')}
                >
                  <Ionicons name="person" size={16} color={newRole === 'user' ? '#FFFFFF' : colors.text} />
                  <Text style={{ color: newRole === 'user' ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                    Khách hàng
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: newRole === 'owner' ? '#D97706' : colors.surfaceSecondary,
                      borderColor: newRole === 'owner' ? '#D97706' : colors.border,
                    },
                  ]}
                  onPress={() => setNewRole('owner')}
                >
                  <Ionicons name="business" size={16} color={newRole === 'owner' ? '#FFFFFF' : colors.text} />
                  <Text style={{ color: newRole === 'owner' ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                    Chủ sân đối tác
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.formLabel, { color: colors.text }]}>Họ và tên *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="VD: Trần Văn Nam"
                placeholderTextColor={colors.textMuted}
                value={newFullName}
                onChangeText={setNewFullName}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Địa chỉ Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="VD: nam.tran@gmail.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Số điện thoại</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="VD: 0912345678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              {newRole === 'owner' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Tên cụm sân thể thao</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="VD: Cụm Sân Cầu Lông Kỳ Hòa"
                    placeholderTextColor={colors.textMuted}
                    value={newClusterName}
                    onChangeText={setNewClusterName}
                  />
                </>
              )}

              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                * Mật khẩu đăng nhập mặc định của tài khoản sẽ là <Text style={{ fontWeight: '800' }}>123456</Text>. Người dùng có thể đổi sau khi đăng nhập.
              </Text>

              <View style={styles.createModalActions}>
                <Button
                  title="Hủy"
                  variant="ghost"
                  onPress={() => setCreateModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Tạo tài khoản"
                  variant="primary"
                  loading={creating}
                  onPress={handleCreateUser}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
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
  addTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  topStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  statTitle: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  filterBar: {
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
    height: 38,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  accountCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  userContact: {
    fontSize: 12,
    lineHeight: 16,
  },
  detailBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
  },
  clusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  clusterTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  ownerMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  licenseText: {
    fontSize: 11,
    marginTop: 4,
  },
  actionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
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
    fontSize: 17,
    fontWeight: '800',
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalUserEmail: {
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
    fontSize: 12,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  modalExtraActions: {
    marginTop: 12,
    gap: 8,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  switchRoleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooterActions: {
    marginTop: SPACING.md,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  roleSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  input: {
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  noteText: {
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },
  createModalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
