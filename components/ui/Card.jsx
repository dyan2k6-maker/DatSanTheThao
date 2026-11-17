import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';

export const Card = ({
  children,
  onPress,
  style,
  shadow = 'md', // sm | md | lg | none
  padding = 'md', // none | sm | md | lg
}) => {
  const { colors } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return SPACING.sm;
      case 'lg':
        return SPACING.lg;
      default:
        return SPACING.md;
    }
  };

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: getPadding(),
        },
        shadow !== 'none' && SHADOWS[shadow],
        style,
      ]}
    >
      {children}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
});
