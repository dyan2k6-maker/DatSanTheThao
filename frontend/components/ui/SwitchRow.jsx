import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../constants/theme';

export const SwitchRow = ({
  label,
  description = '',
  value = false,
  onChange = () => {},
  containerStyle,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }, containerStyle]}>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {Boolean(description) && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={Boolean(value)}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
        thumbColor={value ? '#16A34A' : '#F1F5F9'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  textContainer: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SwitchRow;
