import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useCourts } from '../../hooks/useCourts';
import { useLocation } from '../../hooks/useLocation';
import { CourtCard } from '../../components/court/CourtCard';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { SPORTS, SURFACES } from '../../constants/sports';
import { calculateDistance } from '../../utils/distance';
import { formatVND } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

// Import react-native-maps safely with fallback for web
let MapView = null;
let Marker = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (e) {
  console.warn('react-native-maps không khả dụng trên nền tảng này:', e);
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { location } = useLocation();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedMapCourt, setSelectedMapCourt] = useState(null);

  // Filters state
  const [selectedSport, setSelectedSport] = useState('all');
  const [maxDistance, setMaxDistance] = useState(null); // null, 2, 5, 10, 20 (km)
  const [priceRange, setPriceRange] = useState('all');  // 'all', 'under200', '200to400', 'above400'
  const [selectedSurface, setSelectedSurface] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all'); // 'all', '5', '7', '11'
  const [minRating, setMinRating] = useState(null);      // null, 4.0, 4.5, 4.8
  const [sortBy, setSortBy] = useState('distance');      // 'distance', 'price_asc', 'rating_desc'

  const { courts, loading } = useCourts(selectedSport);

  // Tính số lượng bộ lọc đang được kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSport !== 'all') count++;
    if (maxDistance !== null) count++;
    if (priceRange !== 'all') count++;
    if (selectedSurface !== 'all') count++;
    if (selectedSize !== 'all') count++;
    if (minRating !== null) count++;
    return count;
  }, [selectedSport, maxDistance, priceRange, selectedSurface, selectedSize, minRating]);

  const resetFilters = () => {
    setSelectedSport('all');
    setMaxDistance(null);
    setPriceRange('all');
    setSelectedSurface('all');
    setSelectedSize('all');
    setMinRating(null);
    setSortBy('distance');
  };

  // Lọc và sắp xếp danh sách sân
  const filteredCourts = useMemo(() => {
    return courts
      .map((c) => {
        const dist = calculateDistance(location.latitude, location.longitude, c.lat, c.lng);
        const lowestPrice = c.priceRules && c.priceRules.length > 0
          ? Math.min(...c.priceRules.map((r) => r.price))
          : 150000;
        return { ...c, calculatedDistance: dist, lowestPrice };
      })
      .filter((c) => {
        // 1. Text Search
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchName = c.name?.toLowerCase().includes(q);
          const matchAddress = c.address?.toLowerCase().includes(q);
          const matchType = c.type?.toLowerCase().includes(q);
          if (!matchName && !matchAddress && !matchType) return false;
        }

        // 2. Max distance
        if (maxDistance !== null && c.calculatedDistance !== null) {
          if (c.calculatedDistance > maxDistance) return false;
        }

        // 3. Price range
        if (priceRange === 'under200' && c.lowestPrice >= 200000) return false;
        if (priceRange === '200to400' && (c.lowestPrice < 200000 || c.lowestPrice > 400000)) return false;
        if (priceRange === 'above400' && c.lowestPrice <= 400000) return false;

        // 4. Surface
        if (selectedSurface !== 'all' && c.surface !== selectedSurface) return false;

        // 5. Size (sân 5, 7, 11)
        if (selectedSize !== 'all' && !c.type?.includes(selectedSize)) return false;

        // 6. Rating
        if (minRating !== null && (c.rating || 0) < minRating) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.lowestPrice - b.lowestPrice;
        if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
        // Mặc định: khoảng cách gần nhất
        const da = a.calculatedDistance ?? 9999;
        const db = b.calculatedDistance ?? 9999;
        return da - db;
      });
  }, [courts, searchQuery, maxDistance, priceRange, selectedSurface, selectedSize, minRating, sortBy, location]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Search Bar & View Mode Toggle */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 14) + 6,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.searchRow}>
          <View style={[styles.searchInputBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Nhập tên sân, địa chỉ, quận huyện..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button */}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFiltersCount > 0 ? colors.primary : colors.surfaceSecondary,
              },
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFiltersCount > 0 ? '#FFFFFF' : colors.text}
            />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* View Switcher: List vs Map */}
        <View style={styles.switchRow}>
          <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <TouchableOpacity
              style={[
                styles.segmentItem,
                viewMode === 'list' && [styles.segmentActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={16}
                color={viewMode === 'list' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: viewMode === 'list' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Danh sách ({filteredCourts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentItem,
                viewMode === 'map' && [styles.segmentActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map"
                size={16}
                color={viewMode === 'map' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: viewMode === 'map' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Bản đồ
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Clear filter button if any */}
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={resetFilters} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: colors.danger }]}>
                Xóa lọc ({activeFiltersCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content: List Mode or Map Mode */}
      {viewMode === 'list' ? (
        <FlatList
          data={filteredCourts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Không tìm thấy sân phù hợp"
              description="Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc."
              actionTitle="Đặt lại bộ lọc"
              onAction={resetFilters}
            />
          }
          renderItem={({ item }) => (
            <CourtCard
              court={item}
              distance={item.calculatedDistance}
            />
          )}
        />
      ) : (
        <View style={styles.mapContainer}>
          {MapView ? (
            <MapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {filteredCourts.map((court) => (
                <Marker
                  key={court.id}
                  coordinate={{ latitude: court.lat, longitude: court.lng }}
                  onPress={() => setSelectedMapCourt(court)}
                >
                  <View
                    style={[
                      styles.mapPricePin,
                      {
                        backgroundColor:
                          selectedMapCourt?.id === court.id
                            ? colors.accent
                            : colors.primaryDark,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mapPriceText,
                        {
                          color:
                            selectedMapCourt?.id === court.id
                              ? '#07241B'
                              : '#FFFFFF',
                        },
                      ]}
                    >
                      {formatVND(court.lowestPrice)}
                    </Text>
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : (
            <EmptyState
              icon="map-outline"
              title="Chế độ bản đồ"
              description="Bản đồ hiển thị vị trí các sân trên thiết bị di động Expo Go."
            />
          )}

          {/* Bottom Card Preview on Map */}
          {selectedMapCourt && (
            <View style={styles.mapCardPreview}>
              <CourtCard
                court={selectedMapCourt}
                distance={selectedMapCourt.calculatedDistance}
              />
              <TouchableOpacity
                style={styles.closePreviewBtn}
                onPress={() => setSelectedMapCourt(null)}
              >
                <Ionicons name="close-circle" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Advanced Filter BottomSheet */}
      <BottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title="Bộ lọc tìm kiếm nâng cao"
        maxHeight="85%"
      >
        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Sắp xếp theo
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Gần nhất"
            selected={sortBy === 'distance'}
            onPress={() => setSortBy('distance')}
          />
          <Chip
            label="Giá thấp → cao"
            selected={sortBy === 'price_asc'}
            onPress={() => setSortBy('price_asc')}
          />
          <Chip
            label="Đánh giá cao ⭐"
            selected={sortBy === 'rating_desc'}
            onPress={() => setSortBy('rating_desc')}
          />
        </View>

        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Môn thể thao
        </Text>
        <View style={styles.chipRow}>
          {SPORTS.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={selectedSport === s.id}
              onPress={() => setSelectedSport(s.id)}
            />
          ))}
        </View>

        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Khoảng cách tối đa
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Tất cả"
            selected={maxDistance === null}
            onPress={() => setMaxDistance(null)}
          />
          <Chip
            label="Dưới 2 km"
            selected={maxDistance === 2}
            onPress={() => setMaxDistance(2)}
          />
          <Chip
            label="Dưới 5 km"
            selected={maxDistance === 5}
            onPress={() => setMaxDistance(5)}
          />
          <Chip
            label="Dưới 10 km"
            selected={maxDistance === 10}
            onPress={() => setMaxDistance(10)}
          />
        </View>

        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Khoảng giá / giờ
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Mọi mức giá"
            selected={priceRange === 'all'}
            onPress={() => setPriceRange('all')}
          />
          <Chip
            label="Dưới 200k"
            selected={priceRange === 'under200'}
            onPress={() => setPriceRange('under200')}
          />
          <Chip
            label="200k - 400k"
            selected={priceRange === '200to400'}
            onPress={() => setPriceRange('200to400')}
          />
          <Chip
            label="Trên 400k"
            selected={priceRange === 'above400'}
            onPress={() => setPriceRange('above400')}
          />
        </View>

        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Loại sân (Số người)
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Tất cả"
            selected={selectedSize === 'all'}
            onPress={() => setSelectedSize('all')}
          />
          <Chip
            label="Sân 5 người"
            selected={selectedSize === '5'}
            onPress={() => setSelectedSize('5')}
          />
          <Chip
            label="Sân 7 người"
            selected={selectedSize === '7'}
            onPress={() => setSelectedSize('7')}
          />
          <Chip
            label="Sân 11 người"
            selected={selectedSize === '11'}
            onPress={() => setSelectedSize('11')}
          />
        </View>

        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Mặt sân thi đấu
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Tất cả"
            selected={selectedSurface === 'all'}
            onPress={() => setSelectedSurface('all')}
          />
          {SURFACES.map((surf) => (
            <Chip
              key={surf}
              label={surf}
              selected={selectedSurface === surf}
              onPress={() => setSelectedSurface(surf)}
            />
          ))}
        </View>

        <Text style={[styles.filterGroupTitle, { color: colors.text }]}>
          Đánh giá tối thiểu
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Mọi đánh giá"
            selected={minRating === null}
            onPress={() => setMinRating(null)}
          />
          <Chip
            label="4.0+ ⭐"
            selected={minRating === 4.0}
            onPress={() => setMinRating(4.0)}
          />
          <Chip
            label="4.5+ ⭐"
            selected={minRating === 4.5}
            onPress={() => setMinRating(4.5)}
          />
          <Chip
            label="4.8+ ⭐"
            selected={minRating === 4.8}
            onPress={() => setMinRating(4.8)}
          />
        </View>

        <View style={styles.modalActionButtons}>
          <Button
            title="Đặt lại"
            onPress={resetFilters}
            variant="ghost"
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title={`Áp dụng (${filteredCourts.length} sân)`}
            onPress={() => setFilterModalVisible(false)}
            variant="primary"
            style={{ flex: 2 }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    padding: 3,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.xs,
  },
  segmentActive: {},
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.lg,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPricePin: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapPriceText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mapCardPreview: {
    position: 'absolute',
    bottom: 20,
    left: SPACING.lg,
    right: SPACING.lg,
    position: 'relative',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: 20,
  },
});
