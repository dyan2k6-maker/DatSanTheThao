import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Reanimated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';

export const Skeleton = ({
  width = '100%',
  height = 20,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCrossFade = ({ loading, skeleton, children, style }) => {
  const reducedMotion = useReducedMotion();

  return (
    <View style={style}>
      {loading ? (
        <Reanimated.View key="skeleton" exiting={reducedMotion ? undefined : FadeOut.duration(200)}>
          {skeleton}
        </Reanimated.View>
      ) : (
        <Reanimated.View key="content" entering={reducedMotion ? undefined : FadeIn.duration(250)}>
          {children}
        </Reanimated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
