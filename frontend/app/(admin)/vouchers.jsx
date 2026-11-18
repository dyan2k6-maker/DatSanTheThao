import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import dayjs from 'dayjs';

export default function AdminVouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal Create/Edit Voucher
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDiscountType, setFormDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [formPercent, setFormPercent] = useState('10');
  const [formFixedAmount, setFormFixedAmount] = useState('30000');
  const [formMaxDiscount, setFormMaxDiscount] = useState('50000');
  const [formMinOrder, setFormMinOrder] = useState('150000');
  const [formExpiresAt, setFormExpiresAt] = useState('2026-12-31');
  const [formIsActive, setFormIsActive] = useState(true);

  const loadVouchers = useCallback(async () => {
    try {
      const list = await db.getAll('vouchers');
      // Normalize isActive field if missing
      const normalized = list.map((v) => ({
        ...v,
        isActive: v.isActive !== false,
      }));
      setVouchers(normalized);
    } catch (e) {
      console.warn('Lỗi tải danh sách voucher:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVouchers();
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingVoucher(null);
    setFormCode('');
    setFormTitle('');
    setFormDesc('');
    setFormDiscountType('percent');
    setFormPercent('10');
    setFormFixedAmount('30000');
    setFormMaxDiscount('50000');
    setFormMinOrder('150000');
    setFormExpiresAt(dayjs().add(60, 'day').format('YYYY-MM-DD'));
    setFormIsActive(true);
    setModalVisible(true);
  };

  // Open Edit Modal
  const openEditModal = (v) => {
    setEditingVoucher(v);
    setFormCode(v.code || '');
    setFormTitle(v.title || '');
    setFormDesc(v.description || '');
    if (v.discountPercent) {
      setFormDiscountType('percent');
      setFormPercent(String(v.discountPercent));
    } else {
      setFormDiscountType('fixed');
      setFormFixedAmount(String(v.discountAmount || 0));
    }
    setFormMaxDiscount(String(v.maxDiscount || ''));
    setFormMinOrder(String(v.minOrder || '0'));
    setFormExpiresAt(v.expiresAt || dayjs().format('YYYY-MM-DD'));
    setFormIsActive(v.isActive !== false);
    setModalVisible(true);
  };

  // Toggle active status
  const handleToggleActive = async (v) => {
    const nextVal = !v.isActive;
    try {
      await db.update('vouchers', v.id, { isActive: nextVal });
      setVouchers((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, isActive: nextVal } : item))
      );
      notify(
        nextVal ? 'Đã kích hoạt mã' : 'Đã tạm dừng mã',
        `Mã "${v.code}" ${nextVal ? 'đã có hiệu lực áp dụng' : 'đã tạm ẩn khỏi hệ thống'}.`
      );
    } catch (e) {
      notify('Lỗi', 'Không thể đổi trạng thái voucher');
    }
  };

  // Delete voucher
  const handleDeleteVoucher = (v) => {
    confirmAction(
      'Xóa mã ưu đãi',
      `Bạn có chắc chắn muốn xóa vĩnh viễn voucher "${v.code}"? Thao tác này không thể hoàn tác.`,
      'Xóa vĩnh viễn',
      async () => {
        try {
          await db.remove('vouchers', v.id);
          notify('Đã xóa', `Đã xóa mã "${v.code}" thành công.`);
          await loadVouchers();
        } catch (e) {
          notify('Lỗi', 'Không thể xóa voucher');
        }
      },
      true
    );
  };

  // Save / Submit voucher form
  const handleSaveVoucher = async () => {
    if (!formCode.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập mã ưu đãi (VD: SPORT10)');
      return;
    }
    if (!formTitle.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập tên chương trình khuyến mãi');
      return;
    }

    try {
      setSubmitting(true);
      const isPercent = formDiscountType === 'percent';

      const payload = {
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim(),
        description: formDesc.trim() || `Giảm ${isPercent ? `${formPercent}%` : formatVND(Number(formFixedAmount))}`,
        discountPercent: isPercent ? Number(formPercent) || 10 : null,
        discountAmount: isPercent ? null : Number(formFixedAmount) || 0,
        maxDiscount: Number(formMaxDiscount) || 50000,
        minOrder: Number(formMinOrder) || 0,
        expiresAt: formExpiresAt || '2026-12-31',
        isActive: formIsActive,
      };

      if (editingVoucher) {
        await db.update('vouchers', editingVoucher.id, payload);
        notify('Cập nhật thành công 🎉', `Đã lưu thông tin mã "${payload.code}".`);
      } else {
        await db.add('vouchers', payload);
        notify('Tạo mới thành công 🎉', `Đã tạo mã ưu đãi "${payload.code}" trên toàn hệ thống.`);
      }

      setModalVisible(false);
      await loadVouchers();
    } catch (e) {
      notify('Lỗi lưu voucher', e.message || 'Không thể lưu mã ưu đãi');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (filterStatus === 'active' && !v.isActive) return false;
      if (filterStatus === 'inactive' && v.isActive) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchCode = v.code?.toLowerCase().includes(q);
        const matchTitle = v.title?.toLowerCase().includes(q);
        const matchDesc = v.description?.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [vouchers, filterStatus, search]);

  const activeCount = useMemo(() => vouchers.filter((v) => v.isActive).length, [vouchers]);
  const inactiveCount = useMemo(() => vouchers.filter((v) => !v.isActive).length, [vouchers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Quản lý Voucher & Khuyến mãi" showBack={false} />

      {/* Top Banner & Stats */}
      <View style={styles.topBannerRow}>
        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: colors.primary }]}>{vouchers.length}</Text>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>Tổng mã ưu đãi</Text>
        </View>

        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: '#16A34A' }]}>{activeCount}</Text>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>Đang phát hành</Text>
        </View>

        <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.bannerNum, { color: '#94A3B8' }]}>{inactiveCount}</Text>
          <Text style={[styles.bannerLabel, { color: colors.textSecondary }]}>Đã tạm ngưng</Text>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={openCreateModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Tạo mã</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm theo mã code, tên chương trình..."
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
        <View style={styles.pillsRow}>
          {[
            { id: 'all', label: `Tất cả (${vouchers.length})` },
            { id: 'active', label: `Đang hoạt động (${activeCount})` },
            { id: 'inactive', label: `Đã tắt (${inactiveCount})` },
          ].map((item) => {
            const active = filterStatus === item.id;
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
                onPress={() => setFilterStatus(item.id)}
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
        </View>
      </View>

      {/* Voucher List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải voucher...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVouchers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="ticket-outline"
              title="Chưa có mã ưu đãi phù hợp"
              description="Bấm nút '+ Tạo mã' bên trên để tạo chương trình khuyến mãi đầu tiên."
            />
          }
          renderItem={({ item }) => {
            const isPercent = Boolean(item.discountPercent);

            return (
              <View
                style={[
                  styles.voucherCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: item.isActive ? colors.border : '#E2E8F0',
                    opacity: item.isActive ? 1 : 0.7,
                  },
                  SHADOWS.sm,
                ]}
              >
                {/* Left Ticket Cutout Decor */}
                <View style={[styles.ticketBadgeWrap, { backgroundColor: item.isActive ? colors.primaryLight : '#F1F5F9' }]}>
                  <Ionicons
                    name={isPercent ? 'pricetag' : 'gift'}
                    size={24}
                    color={item.isActive ? colors.primary : '#64748B'}
                  />
                  <Text style={[styles.discountValueText, { color: item.isActive ? colors.primary : '#64748B' }]}>
                    {isPercent ? `${item.discountPercent}%` : formatVND(item.discountAmount)}
                  </Text>
                </View>

                {/* Main Content */}
                <View style={styles.voucherBody}>
                  <View style={styles.topCodeRow}>
                    <View style={styles.codePill}>
                      <Text style={styles.codeText}>{item.code}</Text>
                    </View>

                    {/* Switch On/Off */}
                    <Switch
                      value={item.isActive}
                      onValueChange={() => handleToggleActive(item)}
                      trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                      thumbColor={item.isActive ? '#16A34A' : '#F1F5F9'}
                    />
                  </View>

                  <Text style={[styles.voucherTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.voucherDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      Đơn tối thiểu: <Text style={{ fontWeight: '700', color: colors.text }}>{formatVND(item.minOrder || 0)}</Text>
                    </Text>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      Tối đa: <Text style={{ fontWeight: '700', color: colors.text }}>{formatVND(item.maxDiscount || 0)}</Text>
                    </Text>
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={[styles.expiresText, { color: '#D97706' }]}>
                      ⏳ HSD: {item.expiresAt || 'Không giới hạn'}
                    </Text>

                    <View style={styles.actionBtns}>
                      <TouchableOpacity
                        style={[styles.smallBtn, { borderColor: colors.border }]}
                        onPress={() => openEditModal(item)}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.text} />
                        <Text style={[styles.smallBtnText, { color: colors.text }]}>Sửa</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallBtn, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleDeleteVoucher(item)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={[styles.smallBtnText, { color: '#EF4444' }]}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL: TẠO / SỬA VOUCHER */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingVoucher ? 'Chỉnh sửa Voucher' : 'Tạo Voucher Khuyến mãi mới'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Mã code */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Mã ưu đãi (Code) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="VD: DATSAN2026, TET15..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={formCode}
                onChangeText={setFormCode}
              />

              {/* Tên chương trình */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tên chương trình ưu đãi *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="VD: Giảm 15% chào hè sôi động"
                placeholderTextColor={colors.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Loại giảm giá */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Loại hình ưu đãi</Text>
              <View style={[styles.typeSelectRow, { backgroundColor: colors.surfaceSecondary }]}>
                <TouchableOpacity
                  style={[styles.typeBtn, formDiscountType === 'percent' && { backgroundColor: colors.primary }]}
                  onPress={() => setFormDiscountType('percent')}
                >
                  <Text style={[styles.typeBtnText, { color: formDiscountType === 'percent' ? '#FFFFFF' : colors.text }]}>
                    Giảm theo %
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, formDiscountType === 'fixed' && { backgroundColor: colors.primary }]}
                  onPress={() => setFormDiscountType('fixed')}
                >
                  <Text style={[styles.typeBtnText, { color: formDiscountType === 'fixed' ? '#FFFFFF' : colors.text }]}>
                    Giảm số tiền cố định (đ)
                  </Text>
                </TouchableOpacity>
              </View>

              {formDiscountType === 'percent' ? (
                <View style={styles.twoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Mức giảm (%) *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                      value={formPercent}
                      onChangeText={setFormPercent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Giảm tối đa (đ)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      placeholder="50000"
                      placeholderTextColor={colors.textMuted}
                      value={formMaxDiscount}
                      onChangeText={setFormMaxDiscount}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Số tiền giảm trực tiếp (đ) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="30000"
                    placeholderTextColor={colors.textMuted}
                    value={formFixedAmount}
                    onChangeText={setFormFixedAmount}
                  />
                </View>
              )}

              {/* Đơn tối thiểu & Ngày hết hạn */}
              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Đơn tối thiểu (đ)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="150000"
                    placeholderTextColor={colors.textMuted}
                    value={formMinOrder}
                    onChangeText={setFormMinOrder}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Hạn sử dụng</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                    placeholder="2026-12-31"
                    placeholderTextColor={colors.textMuted}
                    value={formExpiresAt}
                    onChangeText={setFormExpiresAt}
                  />
                </View>
              </View>

              {/* Mô tả chi tiết */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Mô tả áp dụng</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Áp dụng cho mọi môn thể thao..."
                placeholderTextColor={colors.textMuted}
                value={formDesc}
                onChangeText={setFormDesc}
              />

              {/* Kích hoạt ngay */}
              <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Kích hoạt voucher ngay</Text>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Khách hàng có thể nhập mã này khi thanh toán</Text>
                </View>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                  thumbColor={formIsActive ? '#16A34A' : '#F1F5F9'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Hủy"
                variant="outline"
                size="md"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={editingVoucher ? 'Lưu thay đổi' : 'Tạo voucher'}
                variant="primary"
                size="md"
                loading={submitting}
                onPress={handleSaveVoucher}
                style={{ flex: 1.5 }}
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
    paddingHorizontal: 8,
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 4,
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  pillsRow: {
    flexDirection: 'row',
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
  voucherCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketBadgeWrap: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  discountValueText: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  voucherBody: {
    flex: 1,
    padding: 12,
  },
  topCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  voucherDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  expiresText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
  },
  typeSelectRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: RADIUS.md,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
});
