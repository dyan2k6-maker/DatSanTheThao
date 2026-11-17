import React, { forwardRef, useImperativeHandle } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDragScroll } from '../../hooks/useDragScroll';

/**
 * HScroll
 * Horizontal ScrollView with mouse drag & momentum support for Web,
 * floating navigation arrows, and native touch support for mobile.
 */
export const HScroll = forwardRef(function HScroll(
  {
    children,
    showArrows = false,
    arrowSize = 34,
    snapToInterval = 0,
    pagingEnabled = false,
    pageSize = 0,
    style,
    contentContainerStyle,
    nestedScrollEnabled = true,
    showsHorizontalScrollIndicator = false,
    ...restProps
  },
  ref
) {
  const isWeb = Platform.OS === 'web';

  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scrollLeftAction,
    scrollRightAction,
  } = useDragScroll({
    enabled: isWeb,
    snapToInterval,
    pagingEnabled,
    pageSize,
  });

  useImperativeHandle(ref, () => scrollRef.current, [scrollRef]);

  // Native mobile rendering: simple ScrollView
  if (!isWeb) {
    return (
      <ScrollView
        ref={ref}
        horizontal
        nestedScrollEnabled={nestedScrollEnabled}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        snapToInterval={snapToInterval || undefined}
        pagingEnabled={pagingEnabled}
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...restProps}
      >
        {children}
      </ScrollView>
    );
  }

  // Web rendering: wrapped in relative container with drag scroll and optional arrows
  return (
    <View style={[styles.webWrapper, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled={nestedScrollEnabled}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        snapToInterval={snapToInterval || undefined}
        pagingEnabled={pagingEnabled}
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        {...restProps}
      >
        {children}
      </ScrollView>

      {/* Floating navigation arrows for Web */}
      {showArrows && canScrollLeft && (
        <TouchableOpacity
          style={[
            styles.arrowBtn,
            styles.arrowLeft,
            { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2 },
          ]}
          activeOpacity={0.85}
          onPress={() => scrollLeftAction()}
        >
          <Ionicons name="chevron-back" size={20} color="#1E293B" />
        </TouchableOpacity>
      )}

      {showArrows && canScrollRight && (
        <TouchableOpacity
          style={[
            styles.arrowBtn,
            styles.arrowRight,
            { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2 },
          ]}
          activeOpacity={0.85}
          onPress={() => scrollRightAction()}
        >
          <Ionicons name="chevron-forward" size={20} color="#1E293B" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  webWrapper: {
    position: 'relative',
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -17 }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
});
