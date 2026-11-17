import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

const DEFAULT_LOCATION = {
  latitude: 10.7769,
  longitude: 106.7009,
  city: 'TP. Hồ Chí Minh',
  address: 'Quận 1, TP. Hồ Chí Minh',
};

export const useLocation = () => {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            city: 'TP. Hồ Chí Minh',
            address: 'Vị trí hiện tại của bạn',
          });
        } else {
          setHasPermission(false);
          setLocation(DEFAULT_LOCATION);
        }
      } catch (e) {
        console.warn('Lỗi lấy vị trí GPS, dùng vị trí mặc định TP.HCM:', e.message);
        setLocation(DEFAULT_LOCATION);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, hasPermission, loading };
};
