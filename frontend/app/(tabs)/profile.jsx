import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { confirmAction, notify } from '../../utils/dialog';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
  const [points, setPoints] = useState(user?.points || 850);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Vouchers Modal
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
      setPoints(user.points || 850);
    }
    loadVouchers();
  }, [user]);

  const loadVouchers = async () => {
    try {
      const vList = await db.getAll('vouchers');
      setVouchers(vList);
    } catch (e) { }
  };

  const getTier = (pts) => {
    if (pts >= 1000) return { name: 'Hạng Vàng', color: '#EAB308', icon: 'medal' };
    if (pts >= 500) return { name: 'Hạng Bạc', color: '#94A3B8', icon: 'ribbon' };
    return { name: 'Hạng Đồng', color: '#B45309', icon: 'shield' };
  };

  const tier = getTier(points);

  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const newUri = res.assets[0].uri;
        setAvatar(newUri);
        await updateProfile({ avatar: newUri });
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh avatar:', e);
    }
  };

  const saveProfile = async () => {
    if (!fullName.trim()) {
      notify('Lỗi', 'Họ tên không được để trống');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setEditModalVisible(false);
      notify('Thành công', 'Đã cập nhật thông tin cá nhân');
    } catch (e) {
      notify('Lỗi', 'Không thể cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    confirmAction(
      'Khôi phục dữ liệu mẫu',
      'Thao tác này sẽ đặt lại toàn bộ danh sách sân, lịch đặt và giải đấu về trạng thái Seed Data ban đầu.',
      'Khôi phục ngay',
      async () => {
        await db.resetToSeedData();
        notify('Thành công', 'Dữ liệu Demo đã được khôi phục thành công!');
      },
      false
    );
  };

  const handleLogout = async () => {
    console.log('logout pressed');
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 14) + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.md]}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
            <TouchableOpacity style={styles.cameraBtn} onPress={pickAvatar}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.fullName || 'Người dùng'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.email}
          </Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.phone || 'Chưa cập nhật SĐT'}
          </Text>

          {/* Membership Tier Box */}
          <View style={[styles.tierBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name={tier.icon} size={20} color={tier.color} />
            <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
            <Text style={[styles.tierPoints, { color: colors.text }]}>• {points} Điểm tích lũy</Text>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setEditModalVisible(true)}>
            <View style={[styles.menuIconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Chỉnh sửa thông tin cá nhân</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setVoucherModalVisible(true)}>
            <View style={[styles.menuIconCircle, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="ticket-outline" size={20} color={colors.warning} />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Ví mã giảm giá & Voucher</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/favorites')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="heart-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Sân thể thao yêu thích</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
            <View style={[styles.menuIconCircle, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.info} />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Thông báo hệ thống</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings & System */}
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconCircle, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Giao diện Tối (Dark Mode)</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={handleResetData}>
            <View style={[styles.menuIconCircle, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="reload-outline" size={20} color="#15803D" />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Nạp lại dữ liệu mẫu (Demo)</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <Button
          title="Đăng xuất"
          onPress={handleLogout}
          variant="outline"
          size="lg"
          icon={<Ionicons name="log-out-outline" size={20} color={colors.danger} />}
          style={[styles.logoutBtn, { borderColor: colors.danger }]}
          textStyle={{ color: colors.danger }}
        />

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          DatSanTheThao v1.0.0 • Đồ án sinh viên
        </Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Cập nhật thông tin cá nhân</Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Họ và tên</Text>
            <TextInput
              style={[
                styles.inputField,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Số điện thoại</Text>
            <TextInput
              style={[
                styles.inputField,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Hủy"
                onPress={() => setEditModalVisible(false)}
                variant="ghost"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Lưu thay đổi"
                onPress={saveProfile}
                loading={saving}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Vouchers Modal */}
      <Modal visible={voucherModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ví Voucher & Mã giảm giá</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {vouchers.map((v) => (
                <View
                  key={v.id}
                  style={[styles.voucherCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                >
                  <View style={styles.voucherLeft}>
                    <Ionicons name="ticket" size={28} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.vCode, { color: colors.primary }]}>{v.code}</Text>
                    <Text style={[styles.vTitle, { color: colors.text }]}>{v.title}</Text>
                    <Text style={[styles.vDesc, { color: colors.textSecondary }]}>{v.description}</Text>
                    <Text style={[styles.vExpiry, { color: colors.textMuted }]}>Hạn dùng: {v.expiresAt}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Button
              title="Đóng"
              onPress={() => setVoucherModalVisible(false)}
              variant="primary"
              style={{ width: '100%', marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#16A34A',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  tierBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    marginTop: 12,
  },
  tierName: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  tierPoints: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    marginBottom: SPACING.md,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalBox: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputField: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  voucherCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
  },
  voucherLeft: {
    width: 44,
    alignItems: 'center',
  },
  vCode: {
    fontSize: 14,
    fontWeight: '900',
  },
  vTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  vDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  vExpiry: {
    fontSize: 10,
    marginTop: 4,
  },
});
