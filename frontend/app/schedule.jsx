import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { HScroll } from '../components/ui/HScroll';
import { confirmAction, notify } from '../utils/dialog';
import { safeBack } from '../utils/navigation';
import { db } from '../services/db';
import { TIME_SLOTS, getNext14Days } from '../utils/date';
import { formatDateVN } from '../utils/format';
import { RADIUS, SPACING } from '../constants/theme';

export const SLOT_TYPES = [
  { id: 'maintenance', label: 'Bảo trì sân / đèn', color: '#EF4444' },
  { id: 'fixed', label: 'Khách thuê cố định tháng', color: '#8B5CF6' },
  { id: 'offline', label: 'Khách đặt ngoài app', color: '#D97706' },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [days] = useState(getNext14Days());
  const [selectedDate, setSelectedDate] = useState(days[0].dateString);
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedSubCourt, setSelectedSubCourt] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);

  // Lock/Unlock Modal
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);
  const [lockType, setLockType] = useState('maintenance');
  const [lockReason, setLockReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourts();
  }, []);

  useEffect(() => {
    if (selectedCourt) {
      loadSlots();
      const unsub1 = db.subscribe('bookings', () => loadSlots());
      const unsub2 = db.subscribe('blockedSlots', () => loadSlots());
      return () => {
        unsub1?.();
        unsub2?.();
      };
    }
  }, [selectedCourt?.id, selectedSubCourt, selectedDate]);

  const loadCourts = async () => {
    try {
      if (!user?.id) return;
      const list = await db.getAll('courts', (c) => c.ownerId === user.id);
      setCourts(list);
      if (list.length > 0) {
        setSelectedCourt(list[0]);
        if (list[0].subCourts?.length > 0) {
          setSelectedSubCourt(list[0].subCourts[0]);
        }
      }
    } catch (e) {}
  };

  const loadSlots = async () => {
    if (!selectedCourt) return;
    try {
      const bList = await db.getAll('bookings', (b) => {
        return (
          b.courtId === selectedCourt.id &&
          b.date === selectedDate &&
          (!selectedSubCourt || b.subCourt === selectedSubCourt) &&
          b.status !== 'cancelled' &&
          b.status !== 'rejected'
        );
      });
      setBookings(bList);

      const bsList = await db.getAll('blockedSlots', (bs) => {
        return (
          bs.courtId === selectedCourt.id &&
          bs.date === selectedDate &&
          (!selectedSubCourt || bs.subCourt === selectedSubCourt)
        );
      });
      setBlockedSlots(bsList);
    } catch (e) {}
  };

  const handleSlotPress = (slot) => {
    const isBooked = bookings.some((b) => b.startTime === slot.from);
    if (isBooked) {
      const b = bookings.find((item) => item.startTime === slot.from);
      notify(
        'Khách đã đặt trên App',
        `Khách hàng: ${b.userName}\nSĐT: ${b.userPhone || '0981112233'}\nTrạng thái: ${b.status}`
      );
      return;
    }

    const matchedBlocked = blockedSlots.find((bs) => bs.from <= slot.from && bs.to > slot.from);
    if (matchedBlocked) {
      // Mở hộp thoại mở khóa
      confirmAction(
        'Khung giờ đang bị khóa',
        `Lý do: ${matchedBlocked.reason} (${matchedBlocked.type})\nBạn có muốn mở khóa khung giờ này để khách đặt qua app không?`,
        'Mở khóa ngay',
        async () => {
          await db.remove('blockedSlots', matchedBlocked.id);
          await loadSlots();
        },
        false
      );
      return;
    }

    // Khung giờ trống -> mở modal khóa
    setTargetSlot(slot);
    setLockReason('');
    setLockType('maintenance');
    setLockModalVisible(true);
  };

  const handleSaveLock = async () => {
    if (!targetSlot || !selectedCourt) return;
    setSaving(true);
    try {
      await db.add('blockedSlots', {
        courtId: selectedCourt.id,
        courtName: selectedCourt.name,
        subCourt: selectedSubCourt,
        date: selectedDate,
        from: targetSlot.from,
        to: targetSlot.to,
        reason: lockReason.trim() || 'Chủ sân khóa khung giờ này',
        type: lockType,
        createdAt: new Date().toISOString(),
      });

      setLockModalVisible(false);
      await loadSlots();
      notify('Thành công', `Đã khóa khung giờ ${targetSlot.from} - ${targetSlot.to}`);
    } catch (e) {
      notify('Lỗi', 'Không thể khóa khung giờ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Lịch & Khóa giờ sân"
        showBack
        onBack={() => safeBack(router, '/(owner)/more')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Court selector */}
        {courts.length > 1 && (
          <HScroll showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {courts.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.courtSelectChip,
                  {
                    backgroundColor: selectedCourt?.id === c.id ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedCourt(c);
                  if (c.subCourts?.length > 0) setSelectedSubCourt(c.subCourts[0]);
                }}
              >
                <Text style={{ color: selectedCourt?.id === c.id ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </HScroll>
        )}

        {/* Date Selector */}
        <HScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {days.map((d) => {
            const isSelected = selectedDate === d.dateString;
            return (
              <TouchableOpacity
                key={d.dateString}
                activeOpacity={0.8}
                onPress={() => setSelectedDate(d.dateString)}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.dayOfWeek, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                  {d.dayOfWeek}
                </Text>
                <Text style={[styles.dayNumber, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {d.dayNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </HScroll>

        {/* Sub Court Selector */}
        {selectedCourt?.subCourts && selectedCourt.subCourts.length > 0 && (
          <View style={styles.subCourtsRow}>
            {selectedCourt.subCourts.map((sc) => (
              <TouchableOpacity
                key={sc}
                style={[
                  styles.subCourtChip,
                  {
                    backgroundColor: selectedSubCourt === sc ? colors.primaryDark : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedSubCourt(sc)}
              >
                <Text style={{ color: selectedSubCourt === sc ? '#FFFFFF' : colors.text, fontSize: 13, fontWeight: '700' }}>
                  {sc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Legend */}
        <View style={[styles.legendBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Trống (Mở)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: '#0284C7' }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Khách App</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Đã Khóa</Text>
          </View>
        </View>

        {/* Slots Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Khung giờ ({selectedSubCourt} - {formatDateVN(selectedDate)})
        </Text>
        <Text style={[styles.subHint, { color: colors.textSecondary }]}>
          Bấm vào khung giờ để Khóa giờ bảo trì hoặc Mở khóa lại
        </Text>

        <View style={styles.slotsGrid}>
          {TIME_SLOTS.map((slot) => {
            const isBooked = bookings.some((b) => b.startTime === slot.from);
            const blocked = blockedSlots.find((bs) => bs.from <= slot.from && bs.to > slot.from);

            let bg = colors.surface;
            let border = colors.border;
            let textCol = colors.text;
            let statusText = 'Mở';

            if (isBooked) {
              bg = '#E0F2FE';
              border = '#0284C7';
              textCol = '#0369A1';
              statusText = 'Khách đặt';
            } else if (blocked) {
              bg = '#FEE2E2';
              border = colors.danger;
              textCol = colors.danger;
              statusText = blocked.type === 'maintenance' ? 'Bảo trì' : 'Khóa';
            }

            return (
              <TouchableOpacity
                key={slot.from}
                activeOpacity={0.7}
                onPress={() => handleSlotPress(slot)}
                style={[styles.slotItem, { backgroundColor: bg, borderColor: border }]}
              >
                <Text style={[styles.slotTime, { color: textCol }]}>{slot.from} - {slot.to}</Text>
                <Text style={[styles.slotStatus, { color: textCol }]}>{statusText}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Lock Slot Modal */}
      <Modal visible={lockModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Khóa khung giờ {targetSlot?.from} - {targetSlot?.to}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Khung giờ này sẽ bị làm mờ và khách không thể đặt trên app.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Lý do khóa</Text>
            {SLOT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: lockType === t.id ? t.color + '20' : colors.surfaceSecondary,
                    borderColor: lockType === t.id ? t.color : colors.border,
                  },
                ]}
                onPress={() => setLockType(t.id)}
              >
                <Ionicons
                  name={lockType === t.id ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={lockType === t.id ? t.color : colors.textSecondary}
                />
                <Text style={[styles.typeText, { color: lockType === t.id ? t.color : colors.text }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 10 }]}>
              Ghi chú (Tên khách / Chi tiết bảo trì)
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="vd: Anh Tuấn thuê cố định tối thứ 2, SĐT 0912..."
              placeholderTextColor={colors.textMuted}
              value={lockReason}
              onChangeText={setLockReason}
            />

            <View style={styles.modalActions}>
              <Button
                title="Hủy"
                onPress={() => setLockModalVisible(false)}
                variant="ghost"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Khóa ngay"
                onPress={handleSaveLock}
                loading={saving}
                variant="danger"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  courtSelectChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: 8,
  },
  daysScroll: {
    paddingVertical: 6,
  },
  dayCard: {
    width: 60,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  dayOfWeek: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  subCourtsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  subCourtChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  legendBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginVertical: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  subHint: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotItem: {
    width: '48.5%',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: 10,
    alignItems: 'center',
  },
  slotTime: {
    fontSize: 13,
    fontWeight: '800',
  },
  slotStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalCard: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  noteInput: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
  },
});
