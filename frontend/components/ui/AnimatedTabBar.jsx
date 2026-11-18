import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,         
  Platform,
  useWindowDimensions,                     
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (e) {
    Haptics = null;
  }
}

function TabItem({
  route,
  descriptor,
  isFocused,
  pressColor,
  onPress,
  onLongPress,
  onMeasure,
  colors,
  reducedMotion,
}) {
  const options = descriptor?.options || {};
  const label =
    options.title !== undefined
      ? options.title
      : options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : route.name;

  const badge = options.tabBarBadge;

  // Press & bounce scale animation
  const scale = useSharedValue(1);
  const iconBounce = useSharedValue(1);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isFocused && !reducedMotion) {
      iconBounce.value = withSpring(1.15, { damping: 10, stiffness: 200 }, () => {
        iconBounce.value = withSpring(1.0, { damping: 12, stiffness: 180 });
      });
    }
  }, [isFocused, reducedMotion, iconBounce]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * iconBounce.value }],
  }));

  const handlePressIn = () => {
    if (!reducedMotion) {
      scale.value = withTiming(0.92, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (!reducedMotion) {
      scale.value = withSpring(1.0, { damping: 14, stiffness: 220 });
    }
  };

  const color = isFocused ? colors.primary : colors.textSecondary;
  const size = 22;

  const iconElement = typeof options.tabBarIcon === 'function'
    ? options.tabBarIcon({ color, size, focused: isFocused })
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={(e) => onMeasure(e.nativeEvent.layout)}
      // @ts-ignore Web hover
      onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
      onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
      style={[
        styles.tabItem,
        isHovered && Platform.OS === 'web' && { backgroundColor: 'rgba(0,0,0,0.03)' },
      ]}
    >
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        {iconElement}
        {badge !== undefined && badge !== null && (
          <View style={styles.badgeWrapper}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        )}
      </Animated.View>

      <Text
        style={[
          styles.label,
          {
            color: isFocused ? colors.primary : colors.textSecondary,
            fontWeight: isFocused ? '800' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation: navProp,
  navigateToTab,
  emitter,
}) {
  const router = useRouter();

  if (!state?.routes) return null;

  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Filter out screens with href: null
  const visibleRoutes =
    state?.routes?.filter((route) => {
      const options = descriptors?.[route.key]?.options || {};
      return options.href !== null;
    }) || [];

  const activeRouteKey = state?.routes?.[state?.index]?.key;
  const activeVisibleIndex = visibleRoutes.findIndex((r) => r.key === activeRouteKey);

  // Tab measurements for sliding pill
  const layoutsRef = useRef({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const updateIndicator = (index) => {
    const layout = layoutsRef.current[index];
    if (layout) {
      if (reducedMotion) {
        indicatorX.value = layout.x;
        indicatorWidth.value = layout.width;
        indicatorOpacity.value = 1;
      } else {
        indicatorX.value = withSpring(layout.x, { damping: 20, stiffness: 220, mass: 0.7 });
        indicatorWidth.value = withSpring(layout.width, { damping: 20, stiffness: 220, mass: 0.7 });
        indicatorOpacity.value = withTiming(1, { duration: 150 });
      }
    }
  };

  const handleMeasure = (index, layout) => {
    layoutsRef.current[index] = layout;
    if (index === activeVisibleIndex) {
      updateIndicator(index);
    }
  };

  useEffect(() => {
    if (activeVisibleIndex >= 0) {
      updateIndicator(activeVisibleIndex);
    }
  }, [activeVisibleIndex, reducedMotion, windowWidth]); // Thêm windowWidth để cập nhật lại khi đổi kích thước màn hình

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  // Trigger light haptic on native mobile
  const triggerHaptic = () => {
    if (Platform.OS !== 'web' && Haptics) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
  };

  // Limit bar width on large tablets / web
  const maxBarWidth = Math.min(windowWidth - SPACING.md * 2, 540);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerContainer,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View
        style={[
          styles.barContainer,
          {
            width: maxBarWidth,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.96)',
            borderColor: colors.border,
          },
        ]}
      >
        {/* Sliding Pill Indicator */}
        <Animated.View
          style={[
            styles.indicatorPill,
            {
              backgroundColor: isDark ? colors.primary + '28' : colors.primary + '18',
            },
            animatedIndicatorStyle,
          ]}
        />

        {visibleRoutes.map((route, index) => {
          const isFocused = state?.routes?.[state?.index]?.key === route.key;

          const onPress = () => {
            const descriptorNav = descriptors?.[route.key]?.navigation;

            // Emit tabPress event
            let event = { defaultPrevented: false };
            if (emitter?.emit) {
              event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
            } else if (descriptorNav?.emit) {
              event = descriptorNav.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
            } else if (navProp?.emit) {
              event = navProp.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
            }

            if (!isFocused && !event?.defaultPrevented) {
              triggerHaptic();

              // 1. Expo Router standard tab switcher in SDK 58
              if (typeof navigateToTab === 'function') {
                navigateToTab(route.key);
              }
              // 2. Tab descriptor navigation
              else if (descriptorNav && typeof descriptorNav.navigate === 'function') {
                descriptorNav.navigate(route.name, route.params);
              }
              // 3. Tab bar props navigation
              else if (navProp && typeof navProp.navigate === 'function') {
                navProp.navigate(route.name, route.params);
              }
              // 4. Expo Router path-based fallback
              else if (typeof router?.navigate === 'function') {
                const group = state.routes.some((r) => r.name === 'bookings-request')
                  ? '(owner)'
                  : state.routes.some((r) => r.name === 'moderation')
                  ? '(admin)'
                  : '(tabs)';
                router.navigate(`/${group}/${route.name}`);
              }
            }
          };

          const onLongPress = () => {
            const descriptorNav = descriptors?.[route.key]?.navigation;
            if (emitter?.emit) {
              emitter.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            } else if (descriptorNav?.emit) {
              descriptorNav.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            } else if (navProp?.emit) {
              navProp.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            }
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              descriptor={descriptors[route.key]}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              onMeasure={(layout) => handleMeasure(index, layout)}
              colors={colors}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
    borderRadius: 26,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  indicatorPill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderRadius: 20,
    paddingVertical: 4,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  badgeWrapper: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});