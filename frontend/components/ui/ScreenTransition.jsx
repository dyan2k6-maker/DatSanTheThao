import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

/**
 * ScreenTransition
 * Wraps screen content to provide smooth fade-in and subtle slide-up
 * when the screen is focused, providing consistent 60fps transitions
 * across Native and Web.
 */
export function ScreenTransition({ children, style, delay = 0 }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      if (reducedMotion) {
        opacity.value = 1;
        translateY.value = 0;
        return;
      }

      opacity.value = 0.4;
      translateY.value = 4;

      const runTransition = () => {
        opacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        translateY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      };

      let timeout;
      if (delay > 0) {
        timeout = setTimeout(runTransition, delay);
      } else {
        runTransition();
      }

      return () => {
        if (timeout) clearTimeout(timeout);
        opacity.value = 1;
        translateY.value = 0;
      };
    }, [reducedMotion, delay, opacity, translateY])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
