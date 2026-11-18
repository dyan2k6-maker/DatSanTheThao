import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { TimeSlotPicker } from '../components/court/TimeSlotPicker';
import { HScroll } from '../components/ui/HScroll';
import { db } from '../services/db';
import { getNext14Days } from '../utils/date';
import { formatVND, generateBookingCode } from '../utils/format';
import { generateBookingQrPayload } from '../utils/qr';
import { notify } from '../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';


// Đổi "HH:mm" -> số phút để so sánh khoảng giờ
const toMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};
const isOverlap = (aFrom, aTo, bFrom, bTo) =>
  toMinutes(aFrom) < toMinutes(bTo) && toMinutes(aTo) > toMinutes(bFrom);

export default function CheckoutScreen() {
  const { courtId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [court, setCourt] = useState(null);
  const [days] = useState(getNext14Days());
  const [selectedDate, setSelectedDate] = useState(days[0].dateString);
  const [selectedSubCourt, setSelectedSubCourt] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]); // array of { from, to, price }

  const [bookedSlots, setBookedSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');

  // Payment & Note
  const [paymentMethod, setPaymentMethod] = useState('qr'); // 'qr' | 'cash'
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCourtAndSchedule();
    const unsub1 = db.subscribe('bookings', () => loadCourtAndSchedule());
    const unsub2 = db.subscribe('blockedSlots', () => loadCourtAndSchedule());
    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [courtId, selectedDate]);

  const loadCourtAndSchedule = async () => {
    try {
      const courtData = await db.getById('courts', courtId);
      if (courtData) {
        setCourt(courtData);
        if (!selectedSubCourt && courtData.subCourts && courtData.subCourts.length > 0) {
          setSelectedSubCourt(courtData.subCourts[0]);
        }
      }

      // Lấy danh sách booking của ngày đã chọn để chống trùng
      const allBookings = await db.getAll('bookings', (b) => {
        return (
          b.courtId === courtId &&
          b.date === selectedDate &&
          b.status !== 'cancelled' &&
          b.status !== 'rejected'
        );
      });
      setBookedSlots(allBookings);

      // Lấy danh sách khung giờ bị khóa
      const allBlocked = await db.getAll('blockedSlots', (bs) => {
        return bs.courtId === courtId && bs.date === selectedDate;
      });
      setBlockedSlots(allBlocked);
    } catch (e) {
      console.warn('Lỗi tải lịch đặt:', e);
    }
  };

  const handleToggleSlot = (slot) => {
    const exists = selectedSlots.some((s) => s.from === slot.from);
    if (exists) {
      setSelectedSlots(selectedSlots.filter((s) => s.from !== slot.from));
    } else {
      // Sắp xếp khung giờ theo thứ tự
      const updated = [...selectedSlots, slot].sort((a, b) => a.from.localeCompare(b.from));
      setSelectedSlots(updated);
    }
  };

  const handleApplyVoucher = async () => {
    setVoucherError('');
    if (!voucherCode.trim()) {
      setVoucherError('Vui lòng nhập mã giảm giá');
      return;
    }
    const cleanCode = voucherCode.trim().toUpperCase();
    const vouchers = await db.getAll('vouchers');
    const found = vouchers.find((v) => v.code === cleanCode);

    if (!found) {
      setVoucherError('Mã giảm giá không tồn tại');
      return;
    }

    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      setVoucherError('Mã giảm giá đã hết hạn');
      return;
    }

    if (subtotal < (found.minOrder || 0)) {
      setVoucherError(`Đơn hàng tối thiểu ${formatVND(found.minOrder)} để áp dụng mã này`);
      return;
    }

    setAppliedVoucher(found);
    notify('Thành công', `Đã áp dụng mã ${found.code}: ${found.title}`);
  };

  // Tính toán hóa đơn
  const subtotal = selectedSlots.reduce((sum, s) => sum + s.price, 0);

  // Voucher chỉ có hiệu lực khi đơn còn đạt mức tối thiểu (đổi giờ có thể làm tụt xuống)
  const voucherValid = !!appliedVoucher && subtotal >= (appliedVoucher.minOrder || 0);

  let discount = 0;
  if (voucherValid) {
    if (appliedVoucher.discountPercent) {
      const calc = (subtotal * appliedVoucher.discountPercent) / 100;
      discount = appliedVoucher.maxDiscount ? Math.min(calc, appliedVoucher.maxDiscount) : calc;
    } else if (appliedVoucher.discountAmount) {
      discount = appliedVoucher.discountAmount;
    }
  }

  const finalTotal = Math.max(0, subtotal - discount);
  const deposit = subtotal > 0 ? (paymentMethod === 'qr' ? finalTotal : Math.round(finalTotal * 0.3)) : 0;

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0) {
      notify('Chưa chọn giờ', 'Vui lòng chọn ít nhất 1 khung giờ thi đấu');
      return;
    }

    // Các khung giờ phải liên tiếp nhau (vd 18:00-19:00 rồi 19:00-20:00)
    for (let i = 0; i < selectedSlots.length - 1; i++) {
      if (selectedSlots[i].to !== selectedSlots[i + 1].from) {
        notify('Khung giờ không liên tiếp', 'Vui lòng chọn các khung giờ liền kề nhau, hoặc đặt riêng từng lượt.');
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Kiểm tra lại chống trùng giờ theo KHOẢNG giờ (Anti-conflict check)
      const currentBookings = await db.getAll('bookings', (b) => {
        return (
          b.courtId === courtId &&
          b.date === selectedDate &&
          b.subCourt === selectedSubCourt &&
          b.status !== 'cancelled' &&
          b.status !== 'rejected'
        );
      });

      for (const slot of selectedSlots) {
        const isConflict = currentBookings.some((cb) => {
          const ranges =
            cb.selectedSlots && cb.selectedSlots.length > 0
              ? cb.selectedSlots
              : [{ from: cb.startTime, to: cb.endTime }];
          return ranges.some((r) => isOverlap(slot.from, slot.to, r.from, r.to));
        });
        if (isConflict) {
          notify('Rất tiếc', `Khung giờ ${slot.from} - ${slot.to} vừa có khách khác đặt. Vui lòng chọn khung giờ khác!`);
          await loadCourtAndSchedule();
          setSelectedSlots([]);
          setLoading(false);
          return;
        }
      }

      // 1b. Kiểm tra giờ bị chủ sân khóa (bảo trì, khách thuê cố định...)
      const freshBlocked = await db.getAll('blockedSlots', (bs) => {
        return (
          bs.courtId === courtId &&
          bs.date === selectedDate &&
          (!bs.subCourt || bs.subCourt === 'all' || bs.subCourt === selectedSubCourt)
        );
      });

      for (const slot of selectedSlots) {
        const isBlocked = freshBlocked.some((bs) => isOverlap(slot.from, slot.to, bs.from, bs.to));
        if (isBlocked) {
          notify('Khung giờ đã bị khóa', `Khung giờ ${slot.from} - ${slot.to} hiện không nhận đặt (chủ sân đã khóa).`);
          await loadCourtAndSchedule();
          setSelectedSlots([]);
          setLoading(false);
          return;
        }
      }

      // 2. Tạo mã đặt sân chuẩn DS-YYMMDD-XXXX
      const bookingCode = generateBookingCode();
      const startTime = selectedSlots[0].from;
      const endTime = selectedSlots[selectedSlots.length - 1].to;

      // Chuyển khoản QR: coi như đã thanh toán -> xác nhận luôn.
      // Tiền mặt: chờ chủ sân duyệt.
      // Chuyển khoản QR: coi như đã thanh toán -> xác nhận luôn (confirmed).
      // Tiền mặt: chờ chủ sân duyệt (pending).
      const isQr = paymentMethod === 'qr';
      const bookingStatus = isQr ? 'confirmed' : 'pending';

      const payments = isQr
        ? [
            {
              id: `pay_${Date.now()}_qr`,
              type: 'full',
              method: 'qr',
              amount: finalTotal,
              at: new Date().toISOString(),
              note: 'Thanh toán trực tuyến mã QR',
            },
          ]
        : [];

      const amountPaid = isQr ? finalTotal : 0;
      const remaining = Math.max(0, finalTotal - amountPaid);
      const paymentStatus = isQr ? 'paid' : 'unpaid';

      const newBooking = {
        code: bookingCode,
        userId: user?.id || 'guest_user',
        userName: user?.fullName || 'Khách thể thao',
        userPhone: user?.phone || '0981112233',
        ownerId: court.ownerId,
        ownerName: court.ownerName || 'Chủ sân',
        courtId: court.id,
        courtName: court.name,
        courtAddress: court.address,
        subCourt: selectedSubCourt,
        date: selectedDate,
        startTime,
        endTime,
        selectedSlots,
        totalPrice: subtotal,
        discountAmount: discount,
        voucherCode: voucherValid ? appliedVoucher.code : null,
        finalAmount: finalTotal,
        deposit,
        extraCharges: [],
        payments,
        amountPaid,
        remaining,
        paymentMethod,
        paymentStatus,
        note: note.trim(),
        status: bookingStatus,
        approvedAt: isQr ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };

      // Tạo chuỗi mã QR Check-in
      newBooking.qrPayload = generateBookingQrPayload(newBooking);

      const saved = await db.add('bookings', newBooking);

      // Thông báo hệ thống cho User
      await db.add('notifications', {
        userId: user?.id || 'guest_user',
        title: isQr ? 'Đặt sân thành công 🎉' : 'Đã gửi yêu cầu đặt sân ⏳',
        body: isQr
          ? `Lịch đặt ${court.name} (${selectedSubCourt}) ngày ${selectedDate} lúc ${startTime} đã xác nhận!`
          : `Lịch đặt ${court.name} (${selectedSubCourt}) ngày ${selectedDate} lúc ${startTime} đang chờ chủ sân duyệt.`,
        type: isQr ? 'booking_confirmed' : 'booking_pending',
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Thông báo cho Chủ sân: Có lịch đặt mới
      if (court.ownerId) {
        await db.add('notifications', {
          userId: court.ownerId,
          title: 'Có lịch đặt mới 📋',
          body: `Mã đơn ${bookingCode}: Khách ${user?.fullName || 'Khách'} đặt ${court.name} (${selectedSubCourt}) lúc ${startTime} - ${endTime} ngày ${selectedDate}.`,
          type: 'booking_new',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Điều hướng sang màn hình thành công
      router.replace({
        pathname: '/booking-success',
        params: { bookingJson: JSON.stringify(saved) },
      });
    } catch (err) {
      notify('Lỗi đặt sân', err.message || 'Không thể ghi nhận đặt sân');
    } finally {
      setLoading(false);
    }
  };

  if (!court) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Đặt sân" showBack onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.textSecondary }}>Đang tải dữ liệu...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Xác nhận đặt sân" showBack onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Court Info summary */}
        <View style={[styles.courtHeaderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image source={{ uri: court.images?.[0] }} style={styles.courtThumb} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.courtName, { color: colors.text }]}>{court.name}</Text>
            <Text style={[styles.courtAddress, { color: colors.textSecondary }]} numberOfLines={1}>
              {court.address}
            </Text>
            <Text style={[styles.courtSportTag, { color: colors.primary }]}>
              {court.type} • {court.surface}
            </Text>
          </View>
        </View>

        {/* 1. Chọn ngày (14 ngày tới) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Chọn ngày thi đấu</Text>
        <HScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {days.map((d) => {
            const isSelected = selectedDate === d.dateString;
            return (
              <TouchableOpacity
                key={d.dateString}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedDate(d.dateString);
                  setSelectedSlots([]); // Đổi ngày thì reset slot đang chọn
                }}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayOfWeekText,
                    { color: isSelected ? '#FFFFFF' : d.isWeekend ? colors.warning : colors.textSecondary },
                  ]}
                >
                  {d.dayOfWeek}
                </Text>
                <Text style={[styles.dayNumberText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {d.dayNumber}
                </Text>
                <Text style={[styles.dayMonthText, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                  Th{d.monthNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </HScroll>

        {/* 2. Chọn sân con */}
        {court.subCourts && court.subCourts.length > 0 && (
          <View style={{ marginTop: SPACING.md }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Chọn vị trí sân con</Text>
            <View style={styles.subCourtsGrid}>
              {court.subCourts.map((sc) => {
                const isSelected = selectedSubCourt === sc;
                return (
                  <TouchableOpacity
                    key={sc}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedSubCourt(sc);
                      setSelectedSlots([]);
                    }}
                    style={[
                      styles.subCourtBtn,
                      {
                        backgroundColor: isSelected ? colors.primaryDark : colors.surface,
                        borderColor: isSelected ? colors.primaryDark : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="football"
                      size={14}
                      color={isSelected ? '#A3E635' : colors.textSecondary}
                    />
                    <Text style={[styles.subCourtBtnText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {sc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 3. Lưới chọn khung giờ */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.lg }]}>
          3. Chọn khung giờ (Cho phép chọn nhiều giờ liền kề)
        </Text>
        <TimeSlotPicker
          court={court}
          selectedSlots={selectedSlots}
          onToggleSlot={handleToggleSlot}
          bookedSlots={bookedSlots}
          blockedSlots={blockedSlots}
          selectedSubCourt={selectedSubCourt}
        />

        {/* 4. Voucher giảm giá */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.md }]}>
          4. Mã giảm giá (Voucher)
        </Text>
        <View style={styles.voucherRow}>
          <TextInput
            style={[
              styles.voucherInput,
              {
                backgroundColor: colors.surface,
                borderColor: voucherError ? colors.danger : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="vd: GIAMGIA10, SINHVIEN15"
            placeholderTextColor={colors.textMuted}
            value={voucherCode}
            onChangeText={(t) => {
              setVoucherCode(t);
              setVoucherError('');
            }}
            autoCapitalize="characters"
          />
          <Button
            title="Áp dụng"
            onPress={handleApplyVoucher}
            variant="accent"
            size="md"
            style={{ marginLeft: 8 }}
          />
        </View>
        {voucherError !== '' && <Text style={styles.voucherErrorText}>{voucherError}</Text>}
        {voucherValid && (
          <View style={[styles.voucherSuccessBox, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.voucherSuccessText}>
              Đã giảm {formatVND(discount)} ({appliedVoucher.code})
            </Text>
          </View>
        )}
        {appliedVoucher && !voucherValid && (
          <Text style={styles.voucherErrorText}>
            Đơn chưa đạt mức tối thiểu {formatVND(appliedVoucher.minOrder)} nên mã {appliedVoucher.code} chưa được áp dụng.
          </Text>
        )}

        {/* 5. Ghi chú */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.md }]}>
          5. Ghi chú cho chủ sân
        </Text>
        <TextInput
          style={[
            styles.noteInput,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="vd: Chuẩn bị thêm 2 áo bib thi đấu, mượn còi..."
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
        />

        {/* 6. Phương thức thanh toán */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.md }]}>
          6. Phương thức thanh toán
        </Text>
        <View style={styles.paymentMethodsRow}>
          <TouchableOpacity
            style={[
              styles.paymentCard,
              {
                backgroundColor: paymentMethod === 'qr' ? colors.primary + '15' : colors.surface,
                borderColor: paymentMethod === 'qr' ? colors.primary : colors.border,
                borderWidth: paymentMethod === 'qr' ? 2 : 1,
              },
            ]}
            onPress={() => setPaymentMethod('qr')}
          >
            <Ionicons name="qr-code" size={24} color={paymentMethod === 'qr' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.paymentTitle, { color: colors.text }]}>Chuyển khoản QR</Text>
            <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>Xác nhận ngay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentCard,
              {
                backgroundColor: paymentMethod === 'cash' ? colors.primary + '15' : colors.surface,
                borderColor: paymentMethod === 'cash' ? colors.primary : colors.border,
                borderWidth: paymentMethod === 'cash' ? 2 : 1,
              },
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cash' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.paymentTitle, { color: colors.text }]}>Tiền mặt tại sân</Text>
            <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>Chờ chủ sân duyệt</Text>
          </TouchableOpacity>
        </View>

        {/* 7. Tóm tắt hóa đơn */}
        <View style={[styles.invoiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.invoiceTitle, { color: colors.text }]}>Chi tiết thanh toán</Text>

          <View style={styles.invoiceRow}>
            <Text style={{ color: colors.textSecondary }}>Tổng tiền sân ({selectedSlots.length} giờ):</Text>
            <Text style={[styles.invoiceBold, { color: colors.text }]}>{formatVND(subtotal)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.invoiceRow}>
              <Text style={{ color: '#16A34A' }}>Giảm giá khuyến mãi:</Text>
              <Text style={[styles.invoiceBold, { color: '#16A34A' }]}>-{formatVND(discount)}</Text>
            </View>
          )}

          <View style={styles.invoiceRow}>
            <Text style={{ color: colors.textSecondary }}>Tiền cọc tối thiểu:</Text>
            <Text style={[styles.invoiceBold, { color: colors.warning }]}>{formatVND(deposit)}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceTotalLabel, { color: colors.text }]}>Tổng thanh toán:</Text>
            <Text style={[styles.invoiceTotalValue, { color: colors.primary }]}>{formatVND(finalTotal)}</Text>
          </View>
        </View>

        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          {paymentMethod === 'qr'
            ? 'Thanh toán QR: lịch đặt được xác nhận ngay.'
            : 'Tiền mặt: lịch đặt sẽ chờ chủ sân duyệt trước khi xác nhận.'}
        </Text>

        {/* Nút Đặt sân */}
        <Button
          title={selectedSlots.length > 0 ? `Xác nhận đặt (${formatVND(finalTotal)})` : 'Vui lòng chọn khung giờ'}
          onPress={handleConfirmBooking}
          disabled={selectedSlots.length === 0}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.confirmBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  courtHeaderCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  courtThumb: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.md,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '800',
  },
  courtAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  courtSportTag: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  daysScroll: {
    paddingVertical: 4,
  },
  dayCard: {
    width: 60,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  dayOfWeekText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayNumberText: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 2,
  },
  dayMonthText: {
    fontSize: 10,
  },
  subCourtsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subCourtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  subCourtBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voucherInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  voucherErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  voucherSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  voucherSuccessText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  paymentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  invoiceCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceBold: {
    fontWeight: '700',
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  confirmBtn: {
    marginBottom: 20,
  },
});
