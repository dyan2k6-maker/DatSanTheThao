// Tiện ích mã hóa và giải mã dữ liệu mã QR Check-in

export const generateBookingQrPayload = (booking) => {
  const payload = {
    bookingId: booking.id,
    code: booking.code,
    courtId: booking.courtId,
    courtName: booking.courtName || '',
    subCourt: booking.subCourt || '',
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    userId: booking.userId,
    userName: booking.userName || '',
    createdAt: booking.createdAt,
    app: 'DatSanTheThao',
  };
  return JSON.stringify(payload);
};

export const parseBookingQrPayload = (qrString) => {
  try {
    const data = JSON.parse(qrString);
    if (data.app === 'DatSanTheThao' || data.bookingId || data.code) {
      return { success: true, data };
    }
    // Nếu chỉ quét được mã chuỗi booking code
    return { success: true, data: { code: qrString } };
  } catch (e) {
    return { success: false, error: 'Mã QR không đúng định dạng của DatSanTheThao' };
  }
};

// Tạo dữ liệu thanh toán VietQR mô phỏng
export const generatePaymentQrData = (bookingCode, amount) => {
  return `2|99|0987654321|NGUYEN VAN CHU SAN|datsanthethao@bank|0|0|${amount}|DATSAN-${bookingCode}|transfer_myqr`;
};
