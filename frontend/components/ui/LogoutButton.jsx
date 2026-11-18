import React from 'react';
import { TouchableOpacity, Text, Alert, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function LogoutButton({ style, compact = false }) {
  const { logout } = useAuth();
  const router = useRouter();

  const doLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handlePress = () => {
    // Alert nhiều nút không hoạt động trên web nên dùng window.confirm
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) doLogout();
      return;
    }
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: doLogout },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.btn, compact && styles.compact, style]}
    >
      <Ionicons name="log-out-outline" size={20} color="#DC2626" />
      {!compact && <Text style={styles.text}>Đăng xuất</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  compact: { paddingVertical: 8, paddingHorizontal: 10 },
  text: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});