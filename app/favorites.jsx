import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { CourtCard } from '../components/court/CourtCard';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../services/db';
import { SPACING } from '../constants/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [favoriteCourts, setFavoriteCourts] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem('@datsan_favorites');
      const ids = raw ? JSON.parse(raw) : [];
      setFavoriteIds(ids);

      const allCourts = await db.getAll('courts');
      const matched = allCourts.filter((c) => ids.includes(c.id));
      setFavoriteCourts(matched);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (courtId) => {
    const updatedIds = favoriteIds.filter((id) => id !== courtId);
    setFavoriteIds(updatedIds);
    setFavoriteCourts(favoriteCourts.filter((c) => c.id !== courtId));
    await AsyncStorage.setItem('@datsan_favorites', JSON.stringify(updatedIds));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Sân yêu thích" showBack onBack={() => router.back()} />

      <FlatList
        data={favoriteCourts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Chưa có sân yêu thích"
            description="Hãy bấm vào biểu tượng trái tim ở các sân thể thao bạn yêu thích để lưu lại đây nhé!"
            actionTitle="Khám phá sân"
            onAction={() => router.push('/(tabs)/search')}
          />
        }
        renderItem={({ item }) => (
          <CourtCard
            court={item}
            isFavorite={true}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.lg,
  },
});
