import dayjs from 'dayjs';

// Định dạng tiền tệ VNĐ (vd: 250.000đ)
export const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// Định dạng ngày theo chuẩn Việt Nam: dd/MM/yyyy
export const formatDateVN = (date) => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

// Định dạng giờ: 24h (HH:mm)
export const formatTimeVN = (date) => {
  if (!date) return '';
  return dayjs(date).format('HH:mm');
};

// Định dạng ngày giờ đầy đủ
export const formatDateTimeVN = (date) => {
  if (!date) return '';
  return dayjs(date).format('HH:mm - DD/MM/YYYY');
};

// Định dạng số điện thoại đẹp
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{4})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

// Tạo mã booking ngẫu nhiên theo chuẩn: DS-YYMMDD-XXXX
export const generateBookingCode = () => {
  const dateStr = dayjs().format('YYMMDD');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `DS-${dateStr}-${randomNum}`;
};
