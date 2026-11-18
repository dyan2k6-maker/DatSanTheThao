import dayjs from 'dayjs';

// Danh sách các khung giờ tiêu chuẩn (1 tiếng mỗi khung giờ)
export const TIME_SLOTS = [
  { from: '06:00', to: '07:00', label: '06:00 - 07:00' },
  { from: '07:00', to: '08:00', label: '07:00 - 08:00' },
  { from: '08:00', to: '09:00', label: '08:00 - 09:00' },
  { from: '09:00', to: '10:00', label: '09:00 - 10:00' },
  { from: '10:00', to: '11:00', label: '10:00 - 11:00' },
  { from: '11:00', to: '12:00', label: '11:00 - 12:00' },
  { from: '14:00', to: '15:00', label: '14:00 - 15:00' },
  { from: '15:00', to: '16:00', label: '15:00 - 16:00' },
  { from: '16:00', to: '17:00', label: '16:00 - 17:00' },
  { from: '17:00', to: '18:00', label: '17:00 - 18:00', isPeak: true },
  { from: '18:00', to: '19:00', label: '18:00 - 19:00', isPeak: true },
  { from: '19:00', to: '20:00', label: '19:00 - 20:00', isPeak: true },
  { from: '20:00', to: '21:00', label: '20:00 - 21:00', isPeak: true },
  { from: '21:00', to: '22:00', label: '21:00 - 22:00' },
  { from: '22:00', to: '23:00', label: '22:00 - 23:00' },
];

const WEEKDAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Sinh danh sách 14 ngày tới để chọn lịch
export const getNext14Days = () => {
  const days = [];
  const today = dayjs();

  for (let i = 0; i < 14; i++) {
    const d = today.add(i, 'day');
    const dayOfWeek = WEEKDAYS_VN[d.day()];
    days.push({
      dateString: d.format('YYYY-MM-DD'),
      displayDate: d.format('DD/MM'),
      dayOfWeek: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayOfWeek,
      dayNumber: d.format('DD'),
      monthNumber: d.format('MM'),
      isWeekend: d.day() === 0 || d.day() === 6,
      isToday: i === 0,
    });
  }

  return days;
};

// Kiểm tra giờ vàng
export const isPeakHour = (startTime) => {
  if (!startTime) return false;
  const hour = parseInt(startTime.split(':')[0], 10);
  return hour >= 17 && hour <= 20;
};

// Kiểm tra xem khung giờ có bị trùng không
export const checkTimeOverlap = (slot1, slot2) => {
  // slot format: { startTime: '17:00', endTime: '18:00' }
  return slot1.startTime < slot2.endTime && slot1.endTime > slot2.startTime;
};
