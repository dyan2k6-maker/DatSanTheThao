import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { confirmAction, notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { db } from '../services/db';
import { formatVND, formatDateVN } from '../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

export default function TournamentsPostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [tournaments, setTournaments] = useState([]);
  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTour, setEditingTour] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [sport, setSport] = useState('football');
  const [prize, setPrize] = useState('');
  const [fee, setFee] = useState('500000');
  const [maxTeams, setMaxTeams] = useState('16');
  const [registerTo, setRegisterTo] = useState('2026-12-01');
  const [rules, setRules] = useState('');
  const [cover, setCover] = useState('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    if (user?.id) {
      const unsub = db.subscribe('tournaments', () => loadData());
      return () => unsub?.();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      if (!user?.id) return;
      const [tList, cList] = await Promise.all([
        db.getAll('tournaments', (t) => t.ownerId === user.id),
        db.getAll('courts', (c) => c.ownerId === user.id),
      ]);
      setTournaments(tList);
      setCourts(cList);
      if (cList.length > 0 && !selectedCourtId) {
        setSelectedCourtId(cList[0].id);
      }
    } catch (e) {}
  };

  const openCreateModal = () => {
    setEditingTour(null);
    setName('');
    setSport('football');
    setSelectedCourtId(courts[0]?.id || '');
    setPrize('10.000.000đ + Cúp');
    setFee('500000');
    setMaxTeams('16');
    setRegisterTo('2026-12-01');
    setRules('Thi đấu theo luật chuẩn phong trào. Loại trực tiếp.');
    setCover('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800');
    setModalVisible(true);
  };

  const openEditModal = (tour) => {
    setEditingTour(tour);
    setName(tour.name || '');
    setSport(tour.sport || 'football');
    setSelectedCourtId(tour.courtId || (courts[0]?.id || ''));
    setPrize(tour.prize || '');
    setFee(String(tour.fee || '0'));
    setMaxTeams(String(tour.maxTeams || '16'));
    setRegisterTo(tour.registerTo || '2026-12-01');
    setRules(tour.rules || '');
    setCover(tour.cover || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800');
    setModalVisible(true);
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'open' ? 'ongoing' : item.status === 'ongoing' ? 'completed' : 'open';
    const label = nextStatus === 'open' ? 'Mở đăng ký' : nextStatus === 'ongoing' ? 'Đang diễn ra' : 'Đã kết thúc';
    await db.update('tournaments', item.id, { status: nextStatus });
    notify('Thành công', `Giải đấu chuyển sang trạng thái "${label}"`);
    await loadData();
  };

  const pickCoverImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setCover(res.assets[0].uri);
      }
    } catch (e) {}
  };

  const handleSaveTournament = async () => {
    if (!name.trim()) {
      notify('Lỗi', 'Vui lòng nhập tên giải đấu');
      return;
    }
    setSaving(true);
    try {
      const selectedCourt = courts.find((c) => c.id === selectedCourtId);
      const payload = {
        ownerId: user?.id,
        courtId: selectedCourtId || null,
        courtName: selectedCourt?.name || '',
        name: name.trim(),
        sport,
        prize: prize.trim() || 'Cúp vô địch',
        fee: parseInt(fee, 10) || 0,
        maxTeams: parseInt(maxTeams, 10) || 16,
        registerFrom: new Date().toISOString().split('T')[0],
        registerTo,
        rules: rules.trim(),
        cover,
        status: editingTour?.status || 'pending',
        teams: editingTour?.teams || [],
        matches: editingTour?.matches || [],
        standings: editingTour?.standings || [],
        createdAt: editingTour?.createdAt || new Date().toISOString(),
      };

      if (editingTour) {
        await db.update('tournaments', editingTour.id, payload);
        notify('Thành công', 'Đã cập nhật thông tin giải đấu');
      } else {
        await db.add('tournaments', payload);

        // Gửi thông báo tới Admin kiểm duyệt
        const admins = await db.getAll('users', (u) => u.role === 'admin');
        for (const adm of admins) {
          await db.add('notifications', {
            userId: adm.id,
            title: 'Giải đấu mới cần kiểm duyệt 🏆',
            body: `Chủ sân ${user?.fullName} vừa đăng ký giải đấu "${payload.name}". Vui lòng vào kiểm duyệt.`,
            type: 'tournament_pending',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }

        notify(
          'Đã gửi yêu cầu tạo giải 🎉',
          'Giải đấu đang ở trạng thái "Chờ Admin duyệt". Sau khi được phê duyệt, giải sẽ chính thức hiển thị công khai!'
        );
      }

      setModalVisible(false);
      await loadData();
    } catch (e) {
      notify('Lỗi', 'Không thể lưu giải đấu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    confirmAction(
      'Xóa giải đấu',
      'Bạn có chắc chắn muốn xóa giải đấu này?',
      'Xóa',
      async () => {
        await db.remove('tournaments', id);
        await loadData();
      },
      true
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Quản lý giải đấu"
        showBack
        onBack={() => safeBack(router, '/(owner)/more')}
        rightAction={
          <TouchableOpacity onPress={openCreateModal}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={tournaments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="Chưa có giải đấu"
            description="Bấm vào nút + góc trên bên phải để tạo giải đấu phong trào cho cụm sân của bạn."
            actionTitle="Tạo giải đấu ngay"
            onAction={openCreateModal}
          />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.tourCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              SHADOWS.md,
            ]}
          >
            <Image source={{ uri: item.cover }} style={styles.tourCover} />
            <View style={styles.tourBody}>
              <View style={styles.tourTopRow}>
                <Badge label={item.sport?.toUpperCase()} variant="accent" size="sm" />
                <Badge
                  label={item.status === 'open' ? 'Mở đăng ký' : item.status === 'ongoing' ? 'Đang đấu' : item.status === 'pending' ? 'Chờ duyệt' : 'Đã xong'}
                  variant={item.status === 'open' ? 'success' : item.status === 'pending' ? 'warning' : 'neutral'}
                  size="sm"
                />
              </View>

              <Text style={[styles.tourName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.prizeText, { color: colors.primary }]}>Giải thưởng: {item.prize}</Text>
              <Text style={[styles.teamsCount, { color: colors.textSecondary }]}>
                Đã đăng ký: {item.teams?.length || 0}/{item.maxTeams} đội • Lệ phí: {formatVND(item.fee)}
              </Text>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.deadlineText, { color: colors.warning }]}>
                  Hạn chót: {formatDateVN(item.registerTo)}
                </Text>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => handleToggleStatus(item)}
                  >
                    <Ionicons name="swap-horizontal" size={15} color={colors.primary} />
                    <Text style={[styles.actionBtnLabel, { color: colors.primary }]}>Đổi trạng thái</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={15} color={colors.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo giải đấu mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tên giải đấu *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="vd: Cúp Bóng Đá Mini Mùa Hè 2026"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Tổng giá trị giải thưởng</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="vd: 15.000.000đ + Cúp Vàng"
                placeholderTextColor={colors.textMuted}
                value={prize}
                onChangeText={setPrize}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Lệ phí tham gia (VNĐ)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="500000"
                keyboardType="number-pad"
                value={fee}
                onChangeText={setFee}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Số đội tối đa</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="16"
                keyboardType="number-pad"
                value={maxTeams}
                onChangeText={setMaxTeams}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Hạn chót đăng ký (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="2026-12-01"
                value={registerTo}
                onChangeText={setRegisterTo}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Thể lệ thi đấu</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text, minHeight: 70 }]}
                placeholder="Quy định số lượng cầu thủ, thời gian hiệp đấu, luật bốc thăm..."
                value={rules}
                onChangeText={setRules}
                multiline
              />

              <Button
                title="Tải ảnh bìa giải đấu"
                onPress={pickCoverImage}
                variant="outline"
                size="sm"
                icon={<Ionicons name="camera-outline" size={16} color={colors.primary} />}
                style={{ marginVertical: 10 }}
              />

              <Button
                title="Đăng giải đấu"
                onPress={handleSaveTournament}
                loading={saving}
                variant="primary"
                size="lg"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  tourCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  tourCover: {
    width: '100%',
    height: 140,
  },
  tourBody: {
    padding: SPACING.md,
  },
  tourTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tourName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  prizeText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamsCount: {
    fontSize: 12,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
});
