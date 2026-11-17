import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { RatingStars } from '../components/ui/RatingStars';
import { db } from '../services/db';
import { RADIUS, SPACING } from '../constants/theme';

const QUICK_TAGS = [
  'Sân đẹp',
  'Chủ sân thân thiện',
  'Giá hợp lý',
  'Đèn chiếu sáng tốt',
  'Vệ sinh sạch sẽ',
  'Chỗ để xe rộng',
  'Mặt cỏ chuẩn',
  'Check-in nhanh',
];

export default function ReviewScreen() {
  const { bookingId, courtId, courtName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Sân đẹp', 'Chủ sân thân thiện']);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert('Giới hạn', 'Bạn chỉ có thể tải lên tối đa 3 ảnh đánh giá');
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setImages([...images, res.assets[0].uri]);
      }
    } catch (e) {}
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Nhận xét', 'Vui lòng viết đôi dòng cảm nhận về chất lượng sân');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Kiểm tra xem booking đã được đánh giá chưa
      const existingReviews = await db.getAll('reviews', (r) => r.bookingId === bookingId);
      if (existingReviews.length > 0) {
        Alert.alert('Đã đánh giá', 'Đơn đặt sân này đã được bạn gửi đánh giá trước đó.');
        setSubmitting(false);
        return;
      }

      // 2. Thêm bản ghi review mới
      await db.add('reviews', {
        courtId,
        bookingId,
        userId: user?.id || 'guest_user',
        userName: user?.fullName || 'Khách thể thao',
        userAvatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        rating,
        comment: comment.trim(),
        tags: selectedTags,
        images,
        createdAt: new Date().toISOString(),
      });

      // 3. Tính toán lại điểm đánh giá trung bình của sân
      const courtReviews = await db.getAll('reviews', (r) => r.courtId === courtId);
      const totalScore = courtReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = courtReviews.length > 0 ? totalScore / courtReviews.length : rating;

      await db.update('courts', courtId, {
        rating: parseFloat(avgRating.toFixed(1)),
        reviewCount: courtReviews.length,
      });

      // Thưởng 50 điểm tích lũy cho người dùng
      if (user?.id) {
        const currentPoints = user.points || 0;
        await db.update('users', user.id, { points: currentPoints + 50 });
      }

      Alert.alert(
        'Cảm ơn bạn! 🎉',
        'Đánh giá của bạn đã được ghi nhận và bạn được tặng +50 điểm tích lũy.',
        [{ text: 'Hoàn tất', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Đánh giá chất lượng sân" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.courtNameHeading, { color: colors.text }]}>{courtName || 'Cụm sân thể thao'}</Text>
        <Text style={[styles.subHint, { color: colors.textSecondary }]}>
          Trải nghiệm của bạn sẽ giúp cộng đồng thể thao chọn được sân ưng ý
        </Text>

        {/* Interactive Star Rating */}
        <View style={[styles.ratingBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.ratingLabel, { color: colors.text }]}>Bạn chấm bao nhiêu sao?</Text>
          <RatingStars
            rating={rating}
            size={36}
            interactive
            onRatingChange={(newVal) => setRating(newVal)}
            style={{ marginVertical: 12 }}
          />
          <Text style={[styles.ratingDescription, { color: colors.primary }]}>
            {rating === 5 && 'Tuyệt vời - Rất hài lòng ⭐⭐⭐⭐⭐'}
            {rating === 4 && 'Rất tốt - Sẽ quay lại ⭐⭐⭐⭐'}
            {rating === 3 && 'Tạm ổn - Cần cải thiện ⭐⭐⭐'}
            {rating === 2 && 'Chưa hài lòng ⭐⭐'}
            {rating === 1 && 'Rất tệ ⭐'}
          </Text>
        </View>

        {/* Quick Tag Chips */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thẻ nhận xét nhanh</Text>
        <View style={styles.tagsGrid}>
          {QUICK_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Detailed Comment Box */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.lg }]}>
          Bình luận chi tiết
        </Text>
        <TextInput
          style={[
            styles.commentInput,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Hãy chia sẻ thêm về mặt cỏ, ánh sáng, thái độ phục vụ của chủ sân..."
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
        />

        {/* Image Upload up to 3 */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.lg }]}>
          Ảnh thực tế tại sân ({images.length}/3)
        </Text>
        <View style={styles.imagesRow}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imagePreviewWrapper}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}

          {images.length < 3 && (
            <TouchableOpacity
              style={[styles.addImageBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={pickImage}
            >
              <Ionicons name="camera-outline" size={26} color={colors.primary} />
              <Text style={[styles.addImageText, { color: colors.textSecondary }]}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <Button
          title="Gửi đánh giá"
          onPress={handleSubmit}
          loading={submitting}
          variant="primary"
          size="lg"
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  courtNameHeading: {
    fontSize: 20,
    fontWeight: '900',
  },
  subHint: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  ratingBox: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  ratingDescription: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentInput: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  imagePreviewWrapper: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 10,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: SPACING.xxl,
  },
});
