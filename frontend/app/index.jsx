import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function IndexScreen() {
  const { user, role, isLoading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else {
        if (role === 'owner') {
          router.replace('/(owner)/dashboard');
        } else if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, role, isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryDark }]}>
      <View style={styles.logoCircle}>
        <Ionicons name="football" size={54} color="#A3E635" />
      </View>
      <Text style={styles.brandTitle}>DatSanTheThao</Text>
      <Text style={styles.brandSubtitle}>Nền tảng đặt sân thể thao thông minh</Text>
      <ActivityIndicator size="small" color="#A3E635" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A3E635',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 6,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 12,
  },
});
