import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// Cấu hình điểm mốc khởi đầu mặc định cho Expo Router trên Web và Deep Linking
// Giúp tránh lỗi "Linking did not produce an initial navigation state"
export const unstable_settings = {
  initialRouteName: 'index',
};

// Ẩn cảnh báo vô hại của react-native-svg khi chạy trên web
LogBox.ignoreLogs(['Unknown event handler property', 'The action \'GO_BACK\' was not handled by any navigator']);

function RootNavigationLayout() {
  const { user, role, isLoading } = useAuth();
  const { isDark, colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Route Guard theo trạng thái đăng nhập và vai trò (role)
  useEffect(() => {
    if (isLoading) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === '(auth)';
    const inOwnerGroup = currentSegment === '(owner)';
    const inAdminGroup = currentSegment === '(admin)';
    const isRootGateway = !currentSegment || currentSegment === 'index';

    if (!user) {
      // Chưa đăng nhập -> chỉ cho phép ở trong (auth)
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Đã đăng nhập
      if (inAuthGroup || isRootGateway) {
        // Đang ở màn auth hoặc trang splash gateway -> điều hướng vào trang chính theo role
        if (role === 'owner') {
          router.replace('/(owner)/dashboard');
        } else if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // Kiểm tra phân quyền truy cập chéo giữa các role
        if (role === 'user' && (inOwnerGroup || inAdminGroup)) {
          router.replace('/(tabs)');
        } else if (role === 'owner' && (inAdminGroup || currentSegment === '(tabs)')) {
          router.replace('/(owner)/dashboard');
        } else if (role === 'admin' && (inOwnerGroup || currentSegment === '(tabs)')) {
          router.replace('/(admin)/dashboard');
        }
      }
    }
  }, [user, role, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.primaryDark}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="court-detail/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="checkout" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="booking-success" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="booking-detail/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="court-form" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="court-create" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="schedule" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tournaments-post" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bank-info" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="review" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="tournament-detail/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin-tournaments" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin-users" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin-reviews" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="favorites" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-Medium': BeVietnamPro_500Medium,
    'BeVietnamPro-SemiBold': BeVietnamPro_600SemiBold,
    'BeVietnamPro-Bold': BeVietnamPro_700Bold,
    'BarlowCondensed-SemiBold': BarlowCondensed_600SemiBold,
    'BarlowCondensed-Bold': BarlowCondensed_700Bold,
  });

  // Nếu font chưa tải xong, vẫn cho chạy với hệ thống fallback để không bị màn hình trắng
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigationLayout />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});