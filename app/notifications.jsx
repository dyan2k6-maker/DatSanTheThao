import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/ui/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../services/db';
import { formatDateVN } from '../utils/format';
import { RADIUS, SPACING } from '../constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifs();
  }, []);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const list = await db.getAll('notifications', (n) => !n.userId || n.userId === user?.id);
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setNotifications(list);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.read) {
        await db.update('notifications', n.id, { read: true });
      }
    }
    await loadNotifs();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'booking_new':
        return { name: 'calendar', color: '#0284C7' };
      case 'booking_confirmed':
        return { name: 'checkmark-circle', color: '#16A34A' };
      case 'booking_rejected':
        return { name: 'close-circle', color: '#EF4444' };
      case 'booking_checked_in':
        return { name: 'log-in-outline', color: '#8B5CF6' };
      case 'booking_completed':
        return { name: 'flag-outline', color: '#10B981' };
      case 'court_approved':
        return { name: 'shield-checkmark-outline', color: '#16A34A' };
      case 'court_rejected':
        return { name: 'alert-circle-outline', color: '#EF4444' };
      case 'tournament':
        return { name: 'trophy', color: '#F59E0B' };
      case 'reminder':
        return { name: 'alarm', color: '#0284C7' };
      default:
        return { name: 'notifications', color: colors.primary };
    }
  };

  const handlePressItem = async (item) => {
    if (!item.read) {
      await db.update('notifications', item.id, { read: true });
      loadNotifs();
    }
    if (item.bookingId) {
      router.push(`/booking-detail/${item.bookingId}`);
    } else if (item.courtId) {
      router.push(`/court-detail/${item.courtId}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Thông báo"
        showBack
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadNotifs(); setRefreshing(false); }} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Không có thông báo mới"
            description="Bạn đã cập nhật tất cả thông tin đặt sân và giải đấu."
          />
        }
        renderItem={({ item }) => {
          const icon = getIcon(item.type);
          return (
            <TouchableOpacity
              style={[
                styles.itemCard,
                {
                  backgroundColor: item.read ? colors.surface : colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => handlePressItem(item)}
            >
              <View style={[styles.iconBox, { backgroundColor: icon.color + '20' }]}>
                <Ionicons name={icon.name} size={22} color={icon.color} />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.topRow}>
                  <Text style={[styles.title, { color: colors.text, fontWeight: item.read ? '600' : '800' }]}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>

                <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>
                  {formatDateVN(item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.lg,
  },
  itemCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
  },
});
