import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { notify } from '../../utils/dialog';
import { RADIUS, SPACING } from '../../constants/theme';

export const ImagePickerGrid = ({
  images = [],
  onChangeImages = () => {},
  coverIndex = 0,
  onChangeCover = () => {},
  maxImages = 6,
  containerStyle,
}) => {
  const { colors } = useTheme();

  const handlePickImage = async () => {
    if (images.length >= maxImages) {
      notify('Giới hạn ảnh', `Bạn chỉ có thể thêm tối đa ${maxImages} hình ảnh cho sân.`);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        notify('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh lên.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const newImages = [...images, result.assets[0].uri];
        onChangeImages(newImages);
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh:', e);
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, idx) => idx !== index);
    onChangeImages(newImages);
    if (coverIndex >= newImages.length) {
      onChangeCover(Math.max(0, newImages.length - 1));
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.text }]}>
          Hình ảnh cụm sân ({images.length}/{maxImages})
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          * Nhấn vào ảnh để chọn làm ảnh bìa
        </Text>
      </View>

      <View style={styles.grid}>
        {images.map((uri, idx) => {
          const isCover = idx === coverIndex;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.imageBox,
                { borderColor: isCover ? '#16A34A' : colors.border },
                isCover && styles.coverImageBox,
              ]}
              activeOpacity={0.8}
              onPress={() => onChangeCover(idx)}
            >
              <Image source={{ uri }} style={styles.thumbImage} />

              {/* Cover badge */}
              {isCover && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Ảnh bìa</Text>
                </View>
              )}

              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveImage(idx)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {images.length < maxImages && (
          <TouchableOpacity
            style={[
              styles.addBox,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
            <Text style={[styles.addText, { color: colors.primary }]}>Thêm ảnh</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageBox: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImageBox: {
    borderWidth: 2.5,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  coverText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  removeBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  addBox: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ImagePickerGrid;
