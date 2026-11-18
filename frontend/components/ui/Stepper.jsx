import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../constants/theme';

export const Stepper = ({
  label,
  value = 1,
  min = 1,
  max = 99,
  step = 1,
  unit = '',
  onChange = () => {},
  containerStyle,
}) => {
  const { colors } = useTheme();

  const handleDecrease = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {Boolean(label) && (
        <View style={styles.labelCol}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </View>
      )}

      <View style={[styles.stepperBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.stepBtn, value <= min && styles.btnDisabled]}
          onPress={handleDecrease}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Ionicons
            name="remove"
            size={18}
            color={value <= min ? colors.textMuted : colors.text}
          />
        </TouchableOpacity>

        <View style={styles.valueContainer}>
          <Text style={[styles.valueText, { color: colors.text }]}>
            {value} {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.stepBtn, value >= max && styles.btnDisabled]}
          onPress={handleIncrease}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={18}
            color={value >= max ? colors.textMuted : colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  labelCol: {
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default Stepper;
