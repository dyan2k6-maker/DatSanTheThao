import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../constants/theme';

export const Badge = ({
  label,
  variant = 'neutral', // success | warning | danger | info | neutral | accent
  size = 'md',          // sm | md
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.primary + '20', text: colors.primary };
      case 'warning':
        return { bg: colors.warning + '20', text: colors.warning };
      case 'danger':
        return { bg: colors.danger + '20', text: colors.danger };
      case 'info':
        return { bg: colors.info + '20', text: colors.info };
      case 'accent':
        return { bg: colors.accent + '35', text: '#365314' };
      default:
        return { bg: colors.surfaceSecondary, text: colors.textSecondary };
    }
  };

  const c = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 6 : 10,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: c.text,
            fontSize: size === 'sm' ? 11 : 12,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
