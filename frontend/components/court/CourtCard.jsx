import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../ui/Badge';
import { RatingStars } from '../ui/RatingStars';
import { formatVND } from '../../utils/format';
import { formatDistance } from '../../utils/distance';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';

export const CourtCard = ({
  court,
  distance = null,
  horizontal = false,
  isFavorite = false,
  onToggleFavorite = null,
  style,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const scale = useSharedValue(1);
  const hoverY = useSharedValue(0);

  const handlePress = () => {
    router.push(`/court-detail/${court.id}`);
  };

  const handlePressIn = () => {
    if (!reducedMotion) {
      scale.value = withTiming(0.97, { duration: 90 });
    }
  };

  const handlePressOut = () => {
    if (!reducedMotion) {
      scale.value = withSpring(1.0, { damping: 14, stiffness: 220 });
    }
  };

  const handleMouseEnter = () => {
    if (Platform.OS === 'web' && !reducedMotion) {
      hoverY.value = withTiming(-3, { duration: 140 });
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web' && !reducedMotion) {
      hoverY.value = withTiming(0, { duration: 140 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: hoverY.value }],
  }));

  const lowestPrice = court.priceRules && court.priceRules.length > 0
    ? Math.min(...court.priceRules.map((r) => r.price))
    : 100000;

  const fallbackImage = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800';
  const imageUrl = court.images && court.images.length > 0 ? court.images[0] : fallbackImage;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // @ts-ignore Web hover
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={[
          styles.card,
          horizontal ? styles.cardHorizontal : styles.cardVertical,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          SHADOWS.md,
        ]}
      >
      {/* Image container */}
      <View style={horizontal ? styles.imgWrapperHorizontal : styles.imgWrapperVertical}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Sport badge overlay */}
        <View style={styles.badgeOverlay}>
          <Badge
            label={court.type || 'Sân thể thao'}
            variant="accent"
            size="sm"
          />
        </View>

        {/* Favorite button */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.favBtn}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(court.id);
            }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {court.name}
          </Text>
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-sharp" size={14} color={colors.primary} />
          <Text
            style={[styles.addressText, { color: colors.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {court.address}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <RatingStars
            rating={court.rating || 5.0}
            size={13}
            showValue
            reviewCount={court.reviewCount || 0}
          />
          {distance !== null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                {formatDistance(distance)}
              </Text>
            </View>
          )}
        </View>

        {/* Price footer */}
        <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
              Giá chỉ từ
            </Text>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              {formatVND(lowestPrice)}
              <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/giờ</Text>
            </Text>
          </View>

          <View style={[styles.bookBtn, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.bookBtnText, { color: '#365314' }]}>Đặt ngay</Text>
            <Ionicons name="arrow-forward" size={14} color="#365314" />
          </View>
        </View>
      </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardVertical: {
    marginBottom: SPACING.md,
  },
  cardHorizontal: {
    width: 280,
    marginRight: SPACING.md,
    marginBottom: SPACING.sm,
  },
  imgWrapperVertical: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#CBD5E1',
  },
  imgWrapperHorizontal: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#CBD5E1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minWidth: 0,
  },
  addressText: {
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 3,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  priceLabel: {
    fontSize: 11,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
});
