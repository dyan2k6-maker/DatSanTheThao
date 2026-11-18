import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AnimatedTabBar } from '../../components/ui/AnimatedTabBar';

export default function AdminTabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {/* 1. Hệ thống (Dashboard) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Hệ thống',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 2. Quản lý Tài chính & Đối soát */}
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Tài chính',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 3. Kiểm duyệt cụm sân */}
      <Tabs.Screen
        name="moderation"
        options={{
          title: 'Kiểm duyệt',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 4. Quản lý Voucher & Khuyến mãi */}
      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Voucher',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'pricetag' : 'pricetag-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 5. Menu Mở rộng (Truy cập nhanh Giải đấu, Người dùng, Đánh giá) */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mở rộng',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
