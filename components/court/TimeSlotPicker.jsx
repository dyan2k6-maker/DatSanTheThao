import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TIME_SLOTS, isPeakHour } from '../../utils/date';
import { formatVND } from '../../utils/format';
import { RADIUS, SPACING } from '../../constants/theme';

export const TimeSlotPicker = ({
  selectedSlots = [], // array of { from, to, price }
  onToggleSlot,
  court,
  bookedSlots = [],   // array of { startTime, endTime, subCourt }
  blockedSlots = [],  // array of { from, to, subCourt }
  selectedSubCourt = null,
  style,
}) => {
  const { colors } = useTheme();

  // Tính giá cho từng khung giờ theo priceRules của sân
  const getSlotPrice = (fromTime) => {
    if (!court || !court.priceRules || court.priceRules.length === 0) {
      return 150000;
    }
    const matched = court.priceRules.find((rule) => {
      return fromTime >= rule.from && fromTime < rule.to;
    });
    return matched ? matched.price : court.priceRules[0].price;
  };

  // Kiểm tra khung giờ có bị chiếm hoặc bảo trì không
  const isSlotDisabled = (slot) => {
    // 1. Kiểm tra trong danh sách đã đặt
    const isBooked = bookedSlots.some((b) => {
      const matchCourt = !selectedSubCourt || b.subCourt === selectedSubCourt;
      return matchCourt && b.startTime === slot.from;
    });
    if (isBooked) return { disabled: true, reason: 'Đã đặt' };

    // 2. Kiểm tra trong danh sách chủ sân khóa
    const isBlocked = blockedSlots.some((bs) => {
      const matchCourt =
        !bs.subCourt || bs.subCourt === 'all' || !selectedSubCourt || bs.subCourt === selectedSubCourt;
      return matchCourt && slot.from >= bs.from && slot.from < bs.to;
    });
    if (isBlocked) return { disabled: true, reason: 'Khóa / Bảo trì' };

    return { disabled: false };
  };

  return (
    <View style={[styles.container, style]}>
      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.surface, borderColor: colors.border }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Trống</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.warningLight, borderColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Giờ vàng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.primary, borderColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Đang chọn</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Đã khóa</Text>
        </View>
      </View>

      {/* Grid of Slots */}
      <View style={styles.grid}>
        {TIME_SLOTS.map((slot) => {
          const { disabled, reason } = isSlotDisabled(slot);
          const isSelected = selectedSlots.some((s) => s.from === slot.from);
          const isPeak = isPeakHour(slot.from);
          const price = getSlotPrice(slot.from);

          let backgroundColor = colors.surface;
          let borderColor = colors.border;
          let textColor = colors.text;

          if (disabled) {
            backgroundColor = colors.surfaceSecondary;
            borderColor = colors.border;
            textColor = colors.textMuted;
          } else if (isSelected) {
            backgroundColor = colors.primary;
            borderColor = colors.primary;
            textColor = '#FFFFFF';
          } else if (isPeak) {
            backgroundColor = colors.warningLight;
            borderColor = colors.warning;
            textColor = '#9A3412';
          }

          return (
            <TouchableOpacity
              key={slot.from}
              disabled={disabled}
              activeOpacity={0.7}
              onPress={() => onToggleSlot({ from: slot.from, to: slot.to, price })}
              style={[
                styles.slotButton,
                {
                  backgroundColor,
                  borderColor,
                },
              ]}
            >
              <View style={styles.slotHeader}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: textColor,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {slot.from} - {slot.to}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                )}
              </View>

              <Text
                style={[
                  styles.priceText,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : disabled
                      ? colors.textMuted
                      : isPeak
                      ? colors.warning
                      : colors.primary,
                  },
                ]}
              >
                {disabled ? reason : formatVND(price)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotButton: {
    width: '48.5%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
    justifyContent: 'center',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
