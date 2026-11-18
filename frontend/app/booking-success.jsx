import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { formatVND, formatDateVN } from '../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';

export default function BookingSuccessScreen() {
  const { bookingJson } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  let booking = null;
  try {
    booking = bookingJson ? JSON.parse(bookingJson) : null;
  } catch (e) {}

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Không tìm thấy thông tin đơn đặt sân.</Text>
        <Button title="Về trang chủ" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const qrValue = booking.qrPayload || JSON.stringify({
    bookingId: booking.id,
    code: booking.code,
    courtId: booking.courtId,
    date: booking.date,
    startTime: booking.startTime,
  });

  const isConfirmed = booking.status === 'confirmed';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Icon */}
        <View style={[styles.iconCircle, { backgroundColor: isConfirmed ? '#16A34A' : '#F59E0B' }]}>
          <Ionicons
            name={isConfirmed ? 'checkmark-sharp' : 'time-outline'}
            size={48}
            color="#FFFFFF"
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {isConfirmed ? 'Đặt sân thành công!' : 'Đã gửi yêu cầu đặt sân!'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isConfirmed
            ? 'Lịch đặt của bạn đã được xác nhận vào hệ thống'
            : 'Đơn đang ở trạng thái Chờ chủ sân duyệt. Bạn sẽ nhận được thông báo ngay khi chủ sân duyệt.'}
        </Text>

        {/* QR Code Container or Pending Notice */}
        {isConfirmed ? (
          <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.border }, SHADOWS.lg]}>
            <Text style={styles.qrHeader}>MÃ CHECK-IN TẠI SÂN</Text>
            <View style={styles.qrBox}>
              <QRCode value={qrValue} size={180} color="#0B3D2E" backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.codeText}>{booking.code}</Text>
            <Text style={styles.qrNote}>
              Xuất trình mã QR này cho Chủ sân để quét check-in khi bạn đến sân
            </Text>
          </View>
        ) : (
          <View style={[styles.pendingNoticeCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <View style={styles.pendingHeaderRow}>
              <Ionicons name="hourglass-outline" size={24} color="#D97706" />
              <Text style={styles.pendingNoticeTitle}>Đang chờ duyệt đơn</Text>
            </View>
            <Text style={styles.pendingNoticeDesc}>
              Mã QR check-in sẽ được cấp ngay sau khi Chủ sân xác nhận đơn đặt. Bạn có thể theo dõi tiến độ trong mục "Lịch đặt của tôi".
            </Text>
            <View style={styles.pendingCodeBadge}>
              <Text style={styles.pendingCodeLabel}>Mã đơn: </Text>
              <Text style={styles.pendingCodeVal}>{booking.code}</Text>
            </View>
          </View>
        )}

        {/* Booking Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.detailsTitle, { color: colors.text }]}>Thông tin chi tiết</Text>

          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary }}>Cụm sân:</Text>
            <Text style={[styles.detailBold, { color: colors.text }]}>{booking.courtName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary }}>Vị trí sân:</Text>
            <Text style={[styles.detailBold, { color: colors.primary }]}>{booking.subCourt || 'Sân tiêu chuẩn'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary }}>Ngày thi đấu:</Text>
            <Text style={[styles.detailBold, { color: colors.text }]}>{formatDateVN(booking.date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary }}>Khung giờ:</Text>
            <Text style={[styles.detailBold, { color: colors.warning }]}>
              {booking.startTime} - {booking.endTime}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary }}>Tổng thanh toán:</Text>
            <Text style={[styles.detailBold, { color: colors.primary, fontSize: 16 }]}>
              {formatVND(booking.finalAmount || booking.totalPrice)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <Button
          title="Xem danh sách lịch đặt"
          onPress={() => router.replace('/(tabs)/bookings')}
          variant="primary"
          size="lg"
          style={styles.actionBtn}
        />

        <Button
          title="Về trang chủ"
          onPress={() => router.replace('/(tabs)')}
          variant="outline"
          size="md"
          style={{ marginTop: 10, marginBottom: 30 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  qrContainer: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0B3D2E',
    letterSpacing: 1,
    marginBottom: 16,
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 14,
    letterSpacing: 0.5,
  },
  qrNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  detailsCard: {
    width: '100%',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailBold: {
    fontWeight: '700',
  },
  actionBtn: {
    width: '100%',
  },
  pendingNoticeCard: {
    width: '100%',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    marginBottom: SPACING.lg,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pendingNoticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
  },
  pendingNoticeDesc: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 12,
  },
  pendingCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  pendingCodeLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  pendingCodeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
