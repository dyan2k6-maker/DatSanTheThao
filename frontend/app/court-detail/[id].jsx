import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import { db } from '../../services/db';
import { SPORT_FORMS } from '../../constants/sports';
import { safeBack } from '../../utils/navigation';
import { Badge } from '../../components/ui/Badge';
import { RatingStars } from '../../components/ui/RatingStars';
import { Button } from '../../components/ui/Button';
import { HScroll } from '../../components/ui/HScroll';
import { AMENITIES } from '../../constants/sports';
import { calculateDistance, formatDistance } from '../../utils/distance';
import { formatVND, formatDateVN } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CourtDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { location } = useLocation();

  const [court, setCourt] = useState(null);
  const [owner, setOwner] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourtData();
    checkFavorite();
  }, [id]);

  const loadCourtData = async () => {
    setLoading(true);
    try {
      const data = await db.getById('courts', id);
      if (data) {
        setCourt(data);
        if (data.ownerId) {
          const ownerData = await db.getById('users', data.ownerId);
          setOwner(ownerData);
        }
      }
      const allReviews = await db.getAll('reviews', (r) => r.courtId === id);
      setReviews(allReviews);
    } catch (e) {
      console.warn('Lỗi tải chi tiết sân:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const raw = await AsyncStorage.getItem('@datsan_favorites');
      if (raw) {
        const list = JSON.parse(raw);
        setIsFavorite(list.includes(id));
      }
    } catch (e) {}
  };

  const toggleFavorite = async () => {
    try {
      const raw = await AsyncStorage.getItem('@datsan_favorites');
      let list = raw ? JSON.parse(raw) : [];
      if (list.includes(id)) {
        list = list.filter((item) => item !== id);
        setIsFavorite(false);
      } else {
        list.push(id);
        setIsFavorite(true);
      }
      await AsyncStorage.setItem('@datsan_favorites', JSON.stringify(list));
    } catch (e) {}
  };

  const openDirections = () => {
    if (!court) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${court.lat},${court.lng}`,
      android: `geo:0,0?q=${court.lat},${court.lng}(${encodeURIComponent(court.name)})`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${court.lat},${court.lng}`);
    });
  };

  const handleCall = () => {
    const phone = owner?.phone || '0912345678';
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Đang tải thông tin sân...</Text>
      </View>
    );
  }

  if (!court) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 12 }}>Không tìm thấy sân</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          Sân này không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống.
        </Text>
        <Button title="Quay lại" onPress={() => safeBack(router, '/(tabs)')} variant="primary" />
      </View>
    );
  }

  // Chặn truy cập nếu sân chưa được duyệt (trừ khi là Admin hoặc chính Chủ sân này)
  const isOwnerOrAdmin = user?.role === 'admin' || (user?.id && user?.id === court.ownerId);
  if (court.status && court.status !== 'approved' && !isOwnerOrAdmin) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="shield-outline" size={56} color="#F59E0B" />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 12 }}>Sân chưa được duyệt</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          {court.status === 'pending'
            ? 'Sân này đang trong quá trình xét duyệt của Ban quản trị và chưa sẵn sàng nhận đặt chỗ.'
            : 'Sân này hiện đang tạm ngừng hoạt động hoặc đã bị từ chối xét duyệt.'}
        </Text>
        <Button title="Quay lại" onPress={() => safeBack(router, '/(tabs)')} variant="primary" />
      </View>
    );
  }

  const distance = calculateDistance(location.latitude, location.longitude, court.lat, court.lng);
  const images = court.images && court.images.length > 0 ? court.images : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800'];
  const lowestPrice = court.priceRules && court.priceRules.length > 0 ? Math.min(...court.priceRules.map((r) => r.price)) : 150000;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <HScroll
            pagingEnabled
            showArrows
            pageSize={SCREEN_WIDTH}
            snapToInterval={SCREEN_WIDTH}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(idx);
            }}
          >
            {images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.galleryImage} resizeMode="cover" />
            ))}
          </HScroll>

          {/* Top Bar Floating Buttons */}
          <View style={[styles.topFloatingBar, { top: Math.max(insets.top, 12) }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => safeBack(router, '/(tabs)')}>
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.topRightBtns}>
              <TouchableOpacity style={styles.circleBtn} onPress={toggleFavorite}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? '#EF4444' : '#0F172A'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dots Indicator */}
          <View style={styles.paginationDots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === activeImageIndex ? colors.accent : 'rgba(255,255,255,0.6)' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Header Info */}
          <View style={styles.headerBlock}>
            <View style={styles.tagsRow}>
              <Badge label={court.type || 'Sân thể thao'} variant="accent" />
              <View style={{ width: 8 }} />
              <Badge label={court.surface || 'Mặt cỏ nhân tạo'} variant="neutral" />
            </View>

            <Text style={[styles.courtName, { color: colors.text }]}>{court.name}</Text>

            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={16} color={colors.primary} />
              <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                {court.address}
              </Text>
            </View>

            <View style={styles.ratingDistanceRow}>
              <RatingStars
                rating={court.rating || 5.0}
                size={16}
                showValue
                reviewCount={court.reviewCount || reviews.length}
              />
              {distance !== null && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                  <Text style={[styles.distanceText, { color: colors.primary }]}>
                    Cách bạn {formatDistance(distance)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Contact Bar: Call & Chat */}
          <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ownerInfo}>
              <Image
                source={{
                  uri: owner?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                }}
                style={styles.ownerAvatar}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.ownerName, { color: colors.text }]}>
                  {owner?.fullName || 'Chủ cụm sân'}
                </Text>
                <Text style={[styles.ownerPhone, { color: colors.textSecondary }]}>
                  Phản hồi nhanh trong 5 phút
                </Text>
              </View>
            </View>

            <View style={styles.contactActionButtons}>
              <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary + '15', flex: 1 }]} onPress={handleCall}>
                <Ionicons name="call" size={18} color={colors.primary} />
                <Text style={[styles.contactBtnText, { color: colors.primary }]}>Gọi điện hotline</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Mô tả cụm sân</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>
              {court.description || 'Cụm sân thể thao tiêu chuẩn, trang bị đầy đủ cơ sở vật chất đáp ứng nhu cầu tập luyện và thi đấu giao lưu.'}
            </Text>
          </View>

          {/* Technical Specs / Sport Attrs */}
          {court.attrs && Object.keys(court.attrs).length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Thông số kỹ thuật & Tiêu chuẩn</Text>
              <View style={[styles.specCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(() => {
                  // PHÒNG HỘ AN TOÀN: Đảm bảo SPORT_FORMS luôn là object hợp lệ, chuẩn hóa sport key về chữ thường
                  const safeForms = SPORT_FORMS || {};
                  const sportKey = court?.sport ? String(court.sport).toLowerCase().trim() : 'football';
                  const sportConfig = safeForms[sportKey] || safeForms['football'] || { fields: [] };
                  const fields = sportConfig.fields || [];

                  return Object.entries(court.attrs).map(([key, val], idx, arr) => {
                    const fieldDef = fields.find((f) => f.key === key);
                    const label = fieldDef?.label || key;
                    let displayVal = '';
                    if (typeof val === 'boolean') {
                      displayVal = val ? 'Có' : 'Không';
                    } else if (Array.isArray(val)) {
                      displayVal = val.join(', ');
                    } else if (fieldDef?.options) {
                      const opt = fieldDef.options.find((o) => o.value === val);
                      displayVal = opt?.label || val;
                    } else {
                      displayVal = String(val);
                    }
                    const isLast = idx === arr.length - 1;
                    return (
                      <View
                        key={key}
                        style={[
                          styles.specRow,
                          { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
                        ]}
                      >
                        <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{label}</Text>
                        <View style={styles.specValWrap}>
                          {typeof val === 'boolean' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons
                                name={val ? 'checkmark-circle' : 'close-circle'}
                                size={16}
                                color={val ? '#10B981' : colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.specVal,
                                  { color: val ? '#10B981' : colors.textSecondary, fontWeight: '700' },
                                ]}
                              >
                                {displayVal}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.specVal, { color: colors.text, fontWeight: '700' }]}>
                              {displayVal}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>
          )}

          {/* Sub courts */}
          {court.subCourts && court.subCourts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Danh sách sân con ({court.subCourts.length} sân)
              </Text>
              <View style={styles.subCourtsRow}>
                {court.subCourts.map((sc, i) => (
                  <View
                    key={i}
                    style={[styles.subCourtBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Ionicons name="football-outline" size={14} color={colors.primary} />
                    <Text style={[styles.subCourtText, { color: colors.text }]}>{sc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Price Rules Table */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Bảng giá theo khung giờ</Text>
            <View style={[styles.priceTable, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {court.priceRules?.map((rule, idx) => {
                const isPeak = rule.from >= '16:00' && rule.to <= '21:00';
                return (
                  <View
                    key={idx}
                    style={[
                      styles.priceTableRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isPeak ? colors.warningLight + '40' : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.priceRowLeft}>
                      <Text style={[styles.priceHours, { color: colors.text }]}>
                        {rule.from} - {rule.to}
                      </Text>
                      <Text style={[styles.priceLabelTag, { color: isPeak ? colors.warning : colors.textSecondary }]}>
                        {rule.label || (isPeak ? 'Giờ vàng' : 'Giờ thường')}
                      </Text>
                    </View>
                    <Text style={[styles.priceValueText, { color: isPeak ? colors.warning : colors.primary }]}>
                      {formatVND(rule.price)}/h
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Tiện ích sân bãi</Text>
            <View style={styles.amenitiesGrid}>
              {court.amenities?.map((amenityId) => {
                const item = AMENITIES.find((a) => a.id === amenityId);
                if (!item) return null;
                return (
                  <View
                    key={amenityId}
                    style={[styles.amenityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Ionicons name={item.icon} size={20} color={colors.primary} />
                    <Text style={[styles.amenityName, { color: colors.text }]}>{item.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Directions / Map Location Button */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Vị trí & Chỉ đường</Text>
            <View style={[styles.mapShortcutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapAddressTitle, { color: colors.text }]}>{court.address}</Text>
                <Text style={[styles.mapCoords, { color: colors.textSecondary }]}>
                  Tọa độ: {court.lat.toFixed(4)}, {court.lng.toFixed(4)}
                </Text>
              </View>
              <Button
                title="Chỉ đường"
                onPress={openDirections}
                variant="accent"
                size="sm"
                icon={<Ionicons name="navigate" size={16} color="#0F172A" />}
              />
            </View>
          </View>

          {/* Reviews list */}
          <View style={styles.section}>
            <View style={styles.reviewHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Đánh giá từ khách hàng ({reviews.length})
              </Text>
            </View>

            {reviews.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                Chưa có đánh giá nào cho sân này. Hãy là người đầu tiên trải nghiệm!
              </Text>
            ) : (
              reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.reviewUserRow}>
                    <Image
                      source={{ uri: rev.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }}
                      style={styles.reviewAvatar}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.reviewAuthor, { color: colors.text }]}>{rev.userName}</Text>
                      <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                        {formatDateVN(rev.createdAt)}
                      </Text>
                    </View>
                    <RatingStars rating={rev.rating} size={14} />
                  </View>

                  <Text style={[styles.reviewComment, { color: colors.text }]}>{rev.comment}</Text>

                  {/* Review Tags */}
                  {rev.tags && rev.tags.length > 0 && (
                    <View style={styles.reviewTagsRow}>
                      {rev.tags.map((t, ti) => (
                        <View key={ti} style={[styles.reviewTag, { backgroundColor: colors.surfaceSecondary }]}>
                          <Text style={[styles.reviewTagText, { color: colors.textSecondary }]}>#{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar */}
      <View
        style={[
          styles.bottomBookingBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
          SHADOWS.lg,
        ]}
      >
        <View>
          <Text style={[styles.bottomPriceLabel, { color: colors.textSecondary }]}>Giá chỉ từ</Text>
          <Text style={[styles.bottomPriceValue, { color: colors.primary }]}>
            {formatVND(lowestPrice)}
            <Text style={[styles.bottomPriceUnit, { color: colors.textSecondary }]}>/giờ</Text>
          </Text>
        </View>

        <Button
          title="Đặt sân ngay"
          onPress={() => router.push(`/checkout?courtId=${court.id}`)}
          variant="primary"
          size="lg"
          icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
          style={styles.bookNowBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContainer: {
    height: 280,
    position: 'relative',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  topFloatingBar: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  topRightBtns: {
    flexDirection: 'row',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  body: {
    padding: SPACING.lg,
  },
  headerBlock: {
    marginBottom: SPACING.lg,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  courtName: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  ratingDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  contactCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '800',
  },
  ownerPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  contactActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginHorizontal: 4,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
  },
  subCourtsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subCourtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  subCourtText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  priceTable: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  priceTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  priceRowLeft: {
    flex: 1,
  },
  priceHours: {
    fontSize: 14,
    fontWeight: '700',
  },
  priceLabelTag: {
    fontSize: 11,
    marginTop: 2,
  },
  priceValueText: {
    fontSize: 15,
    fontWeight: '800',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amenityCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  amenityName: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  mapShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  mapAddressTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  mapCoords: {
    fontSize: 11,
    marginTop: 2,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewDate: {
    fontSize: 11,
    marginTop: 1,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginRight: 6,
    marginBottom: 4,
  },
  reviewTagText: {
    fontSize: 11,
  },
  bottomBookingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomPriceLabel: {
    fontSize: 11,
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  bottomPriceUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookNowBtn: {
    minWidth: 160,
  },
  specCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: SPACING.md,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  specValWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specVal: {
    fontSize: 13,
  },
});
