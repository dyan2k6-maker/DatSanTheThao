// Công thức Haversine tính khoảng cách địa lý giữa 2 tọa độ (km)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return null;
  }

  const R = 6371; // Bán kính trái đất tính bằng km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Khoảng cách theo km
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Định dạng khoảng cách hiển thị (vd: 1.2 km hoặc 850 m)
export const formatDistance = (distInKm) => {
  if (distInKm === null || distInKm === undefined || isNaN(distInKm)) {
    return 'Gần bạn';
  }
  if (distInKm < 1) {
    return `${Math.round(distInKm * 1000)} m`;
  }
  return `${distInKm.toFixed(1)} km`;
};
