import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AnimatedTabBar } from '../../components/ui/AnimatedTabBar';
import { db } from '../../services/db';

export default function OwnerTabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = db.subscribe('bookings', (allBookings) => {
      const pending = allBookings.filter(
        (b) => b.ownerId === user.id && b.status === 'pending'
      );
      setPendingCount(pending.length);
    });
    return unsub;
  }, [user?.id]);

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {/* 1. Tổng quan */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 2. Lịch đặt (có badge đơn chờ duyệt) */}
      <Tabs.Screen
        name="bookings-request"
        options={{
          title: 'Lịch đặt',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 3. Doanh thu */}
      <Tabs.Screen
        name="revenue"
        options={{
          title: 'Doanh thu',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 4. Sân */}
      <Tabs.Screen
        name="courts"
        options={{
          title: 'Sân',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'football' : 'football-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 5. Khác */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'Khác',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
