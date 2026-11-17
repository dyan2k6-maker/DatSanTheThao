import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';

import { useAuth } from '../../context/AuthContext';
import { safeBack, getHomeRouteByRole } from '../../utils/navigation';

export const Header = ({
  title,
  subtitle = null,
  showBack = true,
  onBack = null,
  fallbackRoute = null,
  rightAction = null,
  variant = 'default', // default | primaryDark
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { role } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const defaultRoute = fallbackRoute || getHomeRouteByRole(role);
      safeBack(router, defaultRoute);
    }
  };

  const isDarkBg = variant === 'primaryDark';
  const textColor = isDarkBg ? '#FFFFFF' : colors.text;
  const iconColor = isDarkBg ? '#FFFFFF' : colors.text;
  const bgColor = isDarkBg ? colors.primaryDark : colors.surface;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: bgColor,
          borderBottomColor: isDarkBg ? 'transparent' : colors.border,
          borderBottomWidth: isDarkBg ? 0 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={[
                styles.iconBtn,
                isDarkBg && { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.center}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: isDarkBg ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.right}>{rightAction}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    minHeight: 44,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
});
