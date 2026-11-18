import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export const RatingStars = ({
  rating = 0,
  maxRating = 5,
  size = 16,
  interactive = false,
  onRatingChange = null,
  showValue = false,
  reviewCount = null,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {Array.from({ length: maxRating }).map((_, index) => {
          const starNumber = index + 1;
          const isFilled = rating >= starNumber;
          const isHalf = rating >= starNumber - 0.5 && rating < starNumber;

          const StarIcon = (
            <Ionicons
              name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
              size={size}
              color="#F59E0B"
              style={{ marginRight: interactive ? 6 : 2 }}
            />
          );

          if (interactive) {
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => onRatingChange && onRatingChange(starNumber)}
              >
                {StarIcon}
              </TouchableOpacity>
            );
          }

          return <View key={index}>{StarIcon}</View>;
        })}
      </View>

      {showValue && (
        <Text style={[styles.ratingValue, { color: colors.text, fontSize: size - 1 }]}>
          {rating.toFixed(1)}
        </Text>
      )}

      {reviewCount !== null && (
        <Text style={[styles.reviewCount, { color: colors.textSecondary, fontSize: size - 3 }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewCount: {
    marginLeft: 3,
  },
});
