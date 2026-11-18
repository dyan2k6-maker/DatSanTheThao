// Tiện ích tính toán mô hình thanh toán và phát sinh cho đơn đặt sân

/**
 * Tính toán tóm tắt thanh toán từ booking
 * @param {Object} booking 
 * @returns {{ totalDue: number, amountPaid: number, remaining: number, paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded' }}
 */
export const calcPaymentSummary = (booking) => {
  if (!booking) {
    return {
      totalDue: 0,
      amountPaid: 0,
      remaining: 0,
      paymentStatus: 'unpaid',
      extraTotal: 0,
    };
  }

  const finalAmount = Number(booking.finalAmount || booking.totalPrice || 0);

  // Tính tổng phát sinh
  const extraCharges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
  const extraTotal = extraCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Tổng số tiền phải trả
  const totalDue = Math.max(0, finalAmount + extraTotal);

  // Tính tổng số tiền đã thanh toán (loại 'refund' thì trừ ra)
  const payments = Array.isArray(booking.payments) ? booking.payments : [];
  let amountPaid = 0;
  for (const p of payments) {
    const amt = Number(p.amount || 0);
    if (p.type === 'refund') {
      amountPaid -= amt;
    } else {
      amountPaid += amt;
    }
  }
  amountPaid = Math.max(0, amountPaid);

  // Số tiền còn nợ / thiếu
  const remaining = Math.max(0, totalDue - amountPaid);

  // Xác định trạng thái thanh toán
  let paymentStatus = 'unpaid';
  if (payments.some((p) => p.type === 'refund') && amountPaid === 0) {
    paymentStatus = 'refunded';
  } else if (remaining === 0 && totalDue > 0) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0 && remaining > 0) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  return {
    totalDue,
    amountPaid,
    remaining,
    paymentStatus,
    extraTotal,
  };
};

export const PAYMENT_STATUS_MAP = {
  unpaid: { label: 'Chưa thanh toán', color: '#EF4444', bg: '#FEE2E2' },
  partial: { label: 'Đã cọc một phần', color: '#F59E0B', bg: '#FEF3C7' },
  paid: { label: 'Đã thanh toán đủ', color: '#16A34A', bg: '#DCFCE7' },
  refunded: { label: 'Đã hoàn tiền', color: '#64748B', bg: '#F1F5F9' },
};
