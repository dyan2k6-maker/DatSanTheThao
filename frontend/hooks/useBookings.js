import { useState, useEffect } from 'react';
import { db } from '../services/db';

export const useBookings = (userId = null, ownerId = null) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = db.subscribe('bookings', async (list) => {
      let filtered = list;

      if (userId) {
        filtered = filtered.filter((b) => b.userId === userId);
      } else if (ownerId) {
        // Lấy danh sách courtId của owner này
        const courts = await db.getAll('courts');
        const ownerCourtIds = courts.filter((c) => c.ownerId === ownerId).map((c) => c.id);
        filtered = filtered.filter((b) => ownerCourtIds.includes(b.courtId));
      }

      // Sắp xếp ngày mới nhất lên đầu
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setBookings(filtered);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [userId, ownerId]);

  return { bookings, loading, refetch: () => db.getAll('bookings') };
};
