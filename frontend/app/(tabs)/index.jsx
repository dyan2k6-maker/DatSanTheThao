import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCourts } from '../../hooks/useCourts';
import { useLocation } from '../../hooks/useLocation';
import { CourtCard } from '../../components/court/CourtCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Chip } from '../../components/ui/Chip';
import { HScroll } from '../../components/ui/HScroll';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SPORTS } from '../../constants/sports';
import { calculateDistance } from '../../utils/distance';
import { db } from '../../services/db';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANNERS = [
  {
    id: 'b1',
    title: 'GIẢM ĐẾN 20% GIỜ VÀNG',
    subtitle: 'Áp dụng cho mọi cụm sân đặt trước 17h hôm nay',
    image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
    tag: 'SIÊU DEAL',
  },
  {
    id: 'b2',
    title: 'GIẢI BÓNG ĐÁ MÙA XUÂN',
    subtitle: 'Tổng giải thưởng 15 triệu VNĐ - Đăng ký ngay!',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
    tag: 'GIẢI ĐẤU',
  },
  {
    id: 'b3',
    title: 'PICKLEBALL XU HƯỚNG MỚI',
    subtitle: 'Trải nghiệm sân chuẩn thi đấu miễn phí mượn banh',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
    tag: 'HOT SPORT',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const greetingFontSize = windowWidth < 360 ? 17 : windowWidth < 420 ? 18 : 20;
  const { location } = useLocation();

  const [selectedSport, setSelectedSport] = useState('all');
  const { courts, loading, refetch } = useCourts(selectedSport);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(2);
  const [favorites, setFavorites] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);

  const bannerScrollRef = useRef(null);

  // Auto carousel effect
  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (activeBanner + 1) % BANNERS.length;
      setActiveBanner(nextIndex);
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * (SCREEN_WIDTH - SPACING.lg * 2),
        animated: true,
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [activeBanner]);

  useEffect(() => {
    loadExtras();
    const unsub = db.subscribe('tournaments', (tours) => {
      setTournaments(tours);
    });
    return () => unsub?.();
  }, []);

  const loadExtras = async () => {
    try {
      const notifs = await db.getAll('notifications');
      const unread = notifs.filter((n) => !n.read && n.userId === user?.id).length;
      setUnreadNotifs(unread > 0 ? unread : 1);

      const favsRaw = await AsyncStorage.getItem('@datsan_favorites');
      if (favsRaw) setFavorites(JSON.parse(favsRaw));

      const tours = await db.getAll('tournaments');
      setTournaments(tours);
    } catch (e) {}
  };

  const handleToggleFavorite = async (courtId) => {
    let next;
    if (favorites.includes(courtId)) {
      next = favorites.filter((id) => id !== courtId);
    } else {
      next = [...favorites, courtId];
    }
    setFavorites(next);
    await AsyncStorage.setItem('@datsan_favorites', JSON.stringify(next));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await loadExtras();
    setRefreshing(false);
  };

  // Tính khoảng cách cho từng sân
  const courtsWithDistance = courts.map((c) => {
    const dist = calculateDistance(
      location.latitude,
      location.longitude,
      c.lat,
      c.lng
    );
    return { ...c, calculatedDistance: dist };
  });

  // Sân nổi bật (rating cao nhất)
  const featuredCourts = [...courtsWithDistance].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);

  // Sân gần bạn (khoảng cách ngắn nhất)
  const nearbyCourts = [...courtsWithDistance].sort((a, b) => {
    const da = a.calculatedDistance ?? 9999;
    const db = b.calculatedDistance ?? 9999;
    return da - db;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenTransition>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
        {/* Top Header & Greeting Bar */}
        <LinearGradient
          colors={['#07241B', '#0B3D2E']}
          style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 16) + 10 }]}
        >
          {/* Subtle field line decor */}
          <View style={styles.fieldCircleDecor} />

          <View style={styles.topRow}>
            <View style={styles.userInfo}>
              <Text
                style={[
                  styles.greetingText,
                  { fontSize: greetingFontSize },
                  Platform.OS === 'web' && { whiteSpace: 'nowrap' },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                <Text style={styles.greetingPrefix}>Xin chào, </Text>
                <Text style={styles.greetingName}>{user?.fullName || 'Bạn'}</Text>
                <Text> 👋</Text>
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color="#A3E635" />
                <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                  {location.city || 'TP. Hồ Chí Minh'}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/favorites')}
              >
                <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
                {favorites.length > 0 && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeDotText}>{favorites.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                {unreadNotifs > 0 && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeDotText}>{unreadNotifs}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Search Input */}
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
              Tìm sân bóng đá, cầu lông, tennis, pickleball...
            </Text>
            <View style={styles.filterQuickIcon}>
              <Ionicons name="options-outline" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* Promo Carousel Banner */}
        <View style={styles.bannerContainer}>
          <HScroll
            ref={bannerScrollRef}
            pagingEnabled
            snapToInterval={SCREEN_WIDTH - SPACING.lg * 2}
            pageSize={SCREEN_WIDTH - SPACING.lg * 2}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - SPACING.lg * 2));
              setActiveBanner(index);
            }}
          >
            {BANNERS.map((banner) => (
              <View
                key={banner.id}
                style={[
                  styles.bannerCard,
                  { width: SCREEN_WIDTH - SPACING.lg * 2 },
                ]}
              >
                <Image source={{ uri: banner.image }} style={styles.bannerImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(7, 36, 27, 0.95)']}
                  style={styles.bannerOverlay}
                >
                  <View style={styles.bannerTag}>
                    <Text style={styles.bannerTagText}>{banner.tag}</Text>
                  </View>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                </LinearGradient>
              </View>
            ))}
          </HScroll>

          {/* Carousel Dots */}
          <View style={styles.dotsRow}>
            {BANNERS.map((_, i) => (
              <Animated.View
                key={i}
                layout={LinearTransition.springify().damping(16).stiffness(180)}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === activeBanner ? colors.primary : colors.border,
                    width: i === activeBanner ? 20 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Sports Category Filter Chips */}
        <View style={styles.categorySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Chọn môn thể thao
          </Text>
          <HScroll
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id;
              return (
                <Chip
                  key={sport.id}
                  label={sport.name}
                  selected={isSelected}
                  onPress={() => setSelectedSport(sport.id)}
                  icon={
                    sport.type === 'Ionicons' ? (
                      <Ionicons
                        name={sport.icon}
                        size={16}
                        color={isSelected ? '#FFFFFF' : colors.primary}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={sport.icon}
                        size={16}
                        color={isSelected ? '#FFFFFF' : colors.primary}
                      />
                    )
                  }
                />
              );
            })}
          </HScroll>
        </View>

        {/* Featured Courts Horizontal Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Sân nổi bật đánh giá cao ⭐"
            subtitle="Được cộng đồng thể thao yêu thích nhất"
            actionText="Xem tất cả"
            onActionPress={() => router.push('/(tabs)/search')}
          />

          <HScroll
            showArrows
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {featuredCourts.map((item) => (
              <CourtCard
                key={item.id}
                court={item}
                distance={item.calculatedDistance}
                horizontal
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </HScroll>
        </View>

        {/* Tournament Highlights Card */}
        {tournaments.length > 0 && (
          <View style={styles.tournamentBannerBox}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(`/tournament-detail/${tournaments[0].id}`)}
              style={styles.tourCard}
            >
              <Image source={{ uri: tournaments[0].cover }} style={styles.tourImage} />
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(11, 61, 46, 0.95)']}
                style={styles.tourOverlay}
              >
                <View style={styles.tourBadge}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={styles.tourBadgeText}>GIẢI ĐẤU NỔI BẬT</Text>
                </View>
                <Text style={styles.tourName} numberOfLines={2}>
                  {tournaments[0].name}
                </Text>
                <Text style={styles.tourPrize}>
                  Giải thưởng: {tournaments[0].prize}
                </Text>
                <View style={styles.tourActionBtn}>
                  <Text style={styles.tourActionText}>Xem & Đăng ký đội</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0F172A" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Nearby Courts Vertical Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Sân gần bạn nhất 📍"
            subtitle="Sắp xếp theo khoảng cách GPS thực tế"
            actionText="Bản đồ"
            onActionPress={() => router.push('/(tabs)/search')}
          />

          {nearbyCourts.map((court, index) => (
            <Animated.View
              key={court.id}
              entering={index < 8 ? FadeInDown.delay(index * 45).duration(260) : undefined}
            >
              <CourtCard
                court={court}
                distance={court.calculatedDistance}
                isFavorite={favorites.includes(court.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 90 }} />
        </ScrollView>
      </ScreenTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 22,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  fieldCircleDecor: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  greetingText: {
    color: '#FFFFFF',
  },
  greetingPrefix: {
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  greetingName: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginTop: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  filterQuickIcon: {
    backgroundColor: '#16A34A',
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  bannerCard: {
    height: 155,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  bannerTag: {
    backgroundColor: '#A3E635',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bannerTagText: {
    color: '#07241B',
    fontSize: 10,
    fontWeight: '900',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    height: 5,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  categorySection: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  chipsScroll: {
    paddingHorizontal: SPACING.lg,
  },
  sectionContainer: {
    paddingHorizontal: SPACING.lg,
  },
  horizontalList: {
    paddingBottom: 4,
  },
  tournamentBannerBox: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  tourCard: {
    height: 160,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  tourImage: {
    width: '100%',
    height: '100%',
  },
  tourOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  tourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tourBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  tourName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  tourPrize: {
    color: '#A3E635',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },
  tourActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A3E635',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  tourActionText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },
});
