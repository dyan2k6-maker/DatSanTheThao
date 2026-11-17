import { useState, useEffect } from 'react';
import { db } from '../services/db';

export const useCourts = (sportFilter = 'all', searchQuery = '') => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = db.subscribe('courts', (list) => {
      // Chỉ hiển thị sân đã được duyệt và đang hoạt động cho người dùng
      let filtered = list.filter((c) => c.status === 'approved' && c.isActive !== false);

      // Lọc theo môn thể thao
      if (sportFilter && sportFilter !== 'all') {
        filtered = filtered.filter((c) => c.sport === sportFilter);
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.address && c.address.toLowerCase().includes(query)) ||
            (c.type && c.type.toLowerCase().includes(query))
        );
      }

      setCourts(filtered);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [sportFilter, searchQuery]);

  return { courts, loading, refetch: () => db.getAll('courts') };
};
