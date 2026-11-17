import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

const DATE_FMT = 'YYYY-MM-DD';
const WEEKDAYS_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const WEEKDAYS_SHORT_MON_FIRST = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_SHORT_SUN_FIRST = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const ACTIVE_STATUSES = ['confirmed', 'checked_in', 'completed'];

const pad2 = (n) => String(n).padStart(2, '0');

/* ============================================================
 * TIỆN ÍCH NGÀY
 * ============================================================ */

// Kiểm tra chuỗi ngày dạng YYYY-MM-DD (loại cả ngày không tồn tại như 2026-02-31)
export const isValidDateInput = (str) => {
  const s = String(str || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = dayjs(s);
  return d.isValid() && d.format(DATE_FMT) === s;
};

// Thuộc khoảng [s, e] (bao gồm cả hai đầu)
const inRange = (t, s, e) => !t.isBefore(s) && !t.isAfter(e);

/* ============================================================
 * LỌC THEO CHỦ SÂN
 * ============================================================ */

export const filterCourtsByOwner = (courts, ownerId) => {
  if (!ownerId || !Array.isArray(courts)) return [];
  return courts.filter((c) => c.ownerId === ownerId);
};

// Nhận thêm danh sách sân để vẫn bắt được đơn cũ chưa có trường ownerId
export const filterBookingsByOwner = (bookings, ownerId, courts = null) => {
  if (!ownerId || !Array.isArray(bookings)) return [];
  const courtIds = new Set(
    Array.isArray(courts) ? courts.filter((c) => c.ownerId === ownerId).map((c) => c.id) : []
  );
  return bookings.filter((b) => b.ownerId === ownerId || courtIds.has(b.courtId));
};

/* ============================================================
 * THANH TOÁN CỦA MỘT ĐƠN
 * ============================================================ */

// Lấy danh sách khoản thu. Đơn cũ chưa có payments[] thì dựng từ trường amountPaid / paymentStatus.
const getPayments = (b) => {
  if (Array.isArray(b.payments) && b.payments.length > 0) return b.payments;

  const stored = Number(b.amountPaid);
  const legacyPaid =
    stored > 0 ? stored : b.paymentStatus === 'paid' ? Number(b.finalAmount ?? b.totalPrice ?? 0) : 0;

  if (legacyPaid > 0) {
    return [
      {
        id: `legacy_${b.id}`,
        type: 'full',
        method: b.paymentMethod === 'cash' ? 'cash' : 'qr',
        amount: legacyPaid,
        at: b.paidAt || b.completedAt || b.createdAt,
        note: 'Dữ liệu cũ',
      },
    ];
  }
  return [];
};

const netOf = (p) => {
  const amt = Number(p.amount || 0);
  return p.type === 'refund' ? -amt : amt;
};

// Mọi phương thức không phải tiền mặt đều tính là chuyển khoản/QR
const methodOf = (p) => (p.method === 'cash' ? 'cash' : 'qr');

const getTotalDue = (b) => {
  const base = Number(b.finalAmount ?? b.totalPrice ?? 0);
  const extra = Array.isArray(b.extraCharges)
    ? b.extraCharges.reduce((s, x) => s + Number(x.amount || 0), 0)
    : 0;
  return base + extra;
};

const getAmountPaid = (b) => getPayments(b).reduce((s, p) => s + netOf(p), 0);

// Tính lại từ payments, không tin trường remaining lưu sẵn
const getRemaining = (b) => Math.max(0, getTotalDue(b) - getAmountPaid(b));

/* ============================================================
 * KHOẢNG NGÀY THEO KỲ (tuần bắt đầu từ Thứ Hai)
 * ============================================================ */

export const getDateRange = (period, offset = 0, customFrom = null, customTo = null) => {
  const now = dayjs();

  if (period === 'today') {
    const target = now.add(offset, 'day');
    return {
      start: target.startOf('day'),
      end: target.endOf('day'),
      label: offset === 0 ? 'Hôm nay' : target.format('DD/MM/YYYY'),
      subLabel: `${WEEKDAYS_FULL[target.day()]}, ${target.format('DD/MM/YYYY')}`,
    };
  }

  if (period === 'week') {
    const target = now.add(offset, 'week');
    const start = target.startOf('isoWeek');
    const end = target.endOf('isoWeek');
    return {
      start,
      end,
      label: offset === 0 ? 'Tuần này' : `Tuần ${start.format('DD/MM')} - ${end.format('DD/MM')}`,
      subLabel: `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`,
    };
  }

  if (period === 'month') {
    const target = now.add(offset, 'month');
    return {
      start: target.startOf('month'),
      end: target.endOf('month'),
      label: offset === 0 ? 'Tháng này' : `Tháng ${target.format('MM/YYYY')}`,
      subLabel: `Tháng ${target.format('MM/YYYY')}`,
    };
  }

  if (period === 'year') {
    const target = now.add(offset, 'year');
    return {
      start: target.startOf('year'),
      end: target.endOf('year'),
      label: offset === 0 ? 'Năm nay' : `Năm ${target.format('YYYY')}`,
      subLabel: `Năm ${target.format('YYYY')}`,
    };
  }

  if (period === 'custom') {
    let from = isValidDateInput(customFrom) ? dayjs(customFrom) : now.subtract(30, 'day');
    let to = isValidDateInput(customTo) ? dayjs(customTo) : now;
    if (to.isBefore(from, 'day')) [from, to] = [to, from];
    const start = from.startOf('day');
    const end = to.endOf('day');
    return {
      start,
      end,
      label: `${start.format('DD/MM/YY')} - ${end.format('DD/MM/YY')}`,
      subLabel: `${start.format('DD/MM/YYYY')} đến ${end.format('DD/MM/YYYY')}`,
    };
  }

  return {
    start: now.startOf('month'),
    end: now.endOf('month'),
    label: 'Tháng này',
    subLabel: now.format('MM/YYYY'),
  };
};

// Kỳ liền trước. Nếu kỳ hiện tại chưa kết thúc thì chỉ lấy phần đã trôi qua của kỳ trước
// (vd: hôm nay là 02/11 -> so với 01–02/10, không so với cả tháng 10).
const getPrevRange = (period, range, now) => {
  const { start, end } = range;
  let prevStart;

  if (period === 'today') prevStart = start.subtract(1, 'day');
  else if (period === 'week') prevStart = start.subtract(1, 'week');
  else if (period === 'month') prevStart = start.subtract(1, 'month');
  else if (period === 'year') prevStart = start.subtract(1, 'year');
  else {
    const span = end.valueOf() - start.valueOf() + 1;
    prevStart = dayjs(start.valueOf() - span);
  }

  const prevFullEnd = start.subtract(1, 'millisecond');
  const elapsed = Math.min(now.valueOf(), end.valueOf()) - start.valueOf();
  const partialEnd = prevStart.add(Math.max(0, elapsed), 'millisecond');
  const prevEnd = partialEnd.isBefore(prevFullEnd) ? partialEnd : prevFullEnd;
  const isPartial = prevEnd.isBefore(prevFullEnd);

  const sameDay = prevStart.isSame(prevEnd, 'day');
  const label = sameDay
    ? prevStart.format('DD/MM')
    : `${prevStart.format('DD/MM')}–${prevEnd.format('DD/MM')}`;

  return { start: prevStart, end: prevEnd, isPartial, label };
};

/* ============================================================
 * NHÓM CỘT BIỂU ĐỒ (mọi khoản thu đều rơi vào 1 cột)
 * ============================================================ */

const buildBuckets = (period, range) => {
  const { start, end } = range;
  const buckets = [];
  let keyOf;

  if (period === 'today') {
    for (let i = 0; i < 12; i++) buckets.push({ key: String(i), label: `${pad2(i * 2)}h` });
    keyOf = (t) => String(Math.floor(t.hour() / 2));
  } else if (period === 'week') {
    WEEKDAYS_SHORT_MON_FIRST.forEach((label, i) => buckets.push({ key: String(i), label }));
    keyOf = (t) => String(t.isoWeekday() - 1);
  } else if (period === 'month') {
    const days = start.daysInMonth();
    for (let d = 1; d <= days; d++) buckets.push({ key: String(d), label: String(d) });
    keyOf = (t) => String(t.date());
  } else if (period === 'year') {
    for (let m = 1; m <= 12; m++) buckets.push({ key: String(m), label: `T${m}` });
    keyOf = (t) => String(t.month() + 1);
  } else {
    const totalDays = end.diff(start, 'day') + 1;
    if (totalDays <= 31) {
      let d = start.startOf('day');
      while (!d.isAfter(end, 'day')) {
        buckets.push({ key: d.format(DATE_FMT), label: d.format('DD/MM') });
        d = d.add(1, 'day');
      }
      keyOf = (t) => t.format(DATE_FMT);
    } else {
      let m = start.startOf('month');
      while (!m.isAfter(end, 'month')) {
        buckets.push({ key: m.format('YYYY-MM'), label: m.format('MM/YY') });
        m = m.add(1, 'month');
      }
      keyOf = (t) => t.format('YYYY-MM');
    }
  }

  return { buckets, keyOf };
};

/* ============================================================
 * TỶ LỆ LẤP ĐẦY (giờ đã đặt / giờ mở cửa, tính đến hôm nay)
 * ============================================================ */

const toHour = (t, fallback) => {
  if (!t) return fallback;
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return fallback;
  return h + (m || 0) / 60;
};

// Số giờ mở cửa mỗi ngày của sân: ưu tiên trường giờ mở/đóng, sau đó suy ra từ bảng giá, cuối cùng mặc định 06–22h
const getOpenHours = (c) => {
  let open = toHour(c.openTime ?? c.openingHours?.open ?? c.openingHours?.from, null);
  let close = toHour(c.closeTime ?? c.openingHours?.close ?? c.openingHours?.to, null);

  if ((open === null || close === null) && Array.isArray(c.priceRules) && c.priceRules.length > 0) {
    const froms = c.priceRules.map((r) => toHour(r.from, null)).filter((v) => v !== null);
    const tos = c.priceRules.map((r) => toHour(r.to, null)).filter((v) => v !== null);
    if (froms.length && tos.length) {
      open = Math.min(...froms);
      close = Math.max(...tos);
    }
  }

  if (open === null || close === null || close <= open) {
    open = 6;
    close = 22;
  }
  return close - open;
};

const getBookingHours = (b) => {
  if (Array.isArray(b.selectedSlots) && b.selectedSlots.length > 0) return b.selectedSlots.length;
  const h = toHour(b.endTime, 0) - toHour(b.startTime, 0);
  return h > 0 ? h : 1;
};

const calcOccupancy = (bookings, courts, startStr, endStr, now) => {
  const todayStr = now.format(DATE_FMT);
  const effectiveEnd = endStr < todayStr ? endStr : todayStr;
  if (effectiveEnd < startStr) return null; // kỳ chưa bắt đầu

  const days = dayjs(effectiveEnd).diff(dayjs(startStr), 'day') + 1;
  const capacity = courts.reduce(
    (sum, c) => sum + days * (c.subCourts?.length || 1) * getOpenHours(c),
    0
  );
  if (capacity <= 0) return null;

  let used = 0;
  for (const b of bookings) {
    if (!ACTIVE_STATUSES.includes(b.status)) continue;
    if (b.date < startStr || b.date > effectiveEnd) continue;
    used += getBookingHours(b);
  }
  return Math.min(100, Math.round((used / capacity) * 100));
};

/* ============================================================
 * KPI TỔNG QUAN CHO DASHBOARD CHỦ SÂN
 * ============================================================ */

export const calcDashboardKPIs = (allBookings, allCourts, ownerId, selectedCourtId = 'all') => {
  const now = dayjs();
  const todayStr = now.format(DATE_FMT);
  const monthStart = now.startOf('month');
  const monthEnd = now.endOf('month');

  const ownerCourts = filterCourtsByOwner(allCourts, ownerId);
  const activeCourts = ownerCourts.filter((c) => c.status === 'approved' && c.isActive !== false);
  const pendingCourts = ownerCourts.filter((c) => c.status === 'pending');

  let ownerBookings = filterBookingsByOwner(allBookings, ownerId, allCourts);
  if (selectedCourtId && selectedCourtId !== 'all') {
    ownerBookings = ownerBookings.filter((b) => b.courtId === selectedCourtId);
  }

  // Thực thu hôm nay & tháng này (từ payments, trừ refund)
  let todayRevenue = 0;
  let monthRevenue = 0;
  for (const b of ownerBookings) {
    for (const p of getPayments(b)) {
      if (!p.at) continue;
      const t = dayjs(p.at);
      if (!t.isValid()) continue;
      const net = netOf(p);
      if (t.format(DATE_FMT) === todayStr) todayRevenue += net;
      if (inRange(t, monthStart, monthEnd)) monthRevenue += net;
    }
  }
  todayRevenue = Math.max(0, todayRevenue);
  monthRevenue = Math.max(0, monthRevenue);

  const pendingBookings = ownerBookings.filter((b) => b.status === 'pending');
  const checkedInBookings = ownerBookings.filter((b) => b.status === 'checked_in');

  const todayBookings = ownerBookings
    .filter((b) => b.date === todayStr && ['confirmed', 'checked_in'].includes(b.status))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Biểu đồ 7 ngày gần nhất
  const recent7DaysChart = [];
  for (let i = 6; i >= 0; i--) {
    const d = now.subtract(i, 'day');
    const dStr = d.format(DATE_FMT);
    let dayAmount = 0;
    for (const b of ownerBookings) {
      for (const p of getPayments(b)) {
        if (!p.at) continue;
        if (dayjs(p.at).format(DATE_FMT) === dStr) dayAmount += netOf(p);
      }
    }
    recent7DaysChart.push({
      date: d.format('DD/MM'),
      dayName: i === 0 ? 'Hôm nay' : WEEKDAYS_SHORT_SUN_FIRST[d.day()],
      amount: Math.max(0, dayAmount),
      rawDate: dStr,
    });
  }

  return {
    todayRevenue,
    monthRevenue,
    pendingCount: pendingBookings.length,
    checkedInCount: checkedInBookings.length,
    activeCourtsCount: activeCourts.length,
    pendingCourtsCount: pendingCourts.length,
    pendingBookings,
    todayBookings,
    recent7DaysChart,
    ownerCourts,
  };
};

/* ============================================================
 * SỐ LIỆU CHI TIẾT CHO TRANG DOANH THU
 *
 * Định nghĩa:
 *  - Thực thu: tổng payments có ngày nhận tiền thuộc kỳ (trừ refund), kể cả tiền cọc cho lịch sắp tới.
 *  - Đơn có thu tiền: số đơn có ít nhất 1 khoản thu trong kỳ.
 *  - Trung bình/đơn: Thực thu / Đơn có thu tiền.
 *  - Dự kiến: phần còn phải thu của đơn confirmed/checked_in có ngày chơi trong kỳ.
 *  - Công nợ: phần còn thiếu của đơn completed có ngày hoàn thành trong kỳ.
 *  - Đơn hoàn thành: đơn completed có ngày hoàn thành (completedAt) trong kỳ.
 * ============================================================ */

export const calcRevenueStats = (
  allBookings,
  allCourts,
  {
    ownerId,
    courtId = 'all', // 'all' hoặc id sân
    method = 'all', // all | cash | qr
    period = 'month',
    offset = 0,
    customFrom = null,
    customTo = null,
  }
) => {
  const now = dayjs();
  const range = getDateRange(period, offset, customFrom, customTo);
  const { start, end } = range;
  const startStr = start.format(DATE_FMT);
  const endStr = end.format(DATE_FMT);

  const ownerCourts = filterCourtsByOwner(allCourts, ownerId);
  const filterByCourt = courtId && courtId !== 'all';
  const scopeCourts = filterByCourt ? ownerCourts.filter((c) => c.id === courtId) : ownerCourts;

  let bookings = filterBookingsByOwner(allBookings, ownerId, allCourts);
  if (filterByCourt) bookings = bookings.filter((b) => b.courtId === courtId);

  const prev = getPrevRange(period, range, now);
  const { buckets, keyOf } = buildBuckets(period, range);
  const chartMap = new Map(buckets.map((b) => [b.key, 0]));

  const transactions = [];
  const paidBookingIds = new Set();
  let realRevenue = 0;
  let cashRevenue = 0;
  let qrRevenue = 0;
  let prevRealRevenue = 0;

  const courtRevenueMap = {};
  scopeCourts.forEach((c) => {
    courtRevenueMap[c.id] = {
      courtId: c.id,
      courtName: c.name,
      sport: c.sport,
      revenue: 0,
      bookingsCount: 0,
    };
  });

  // ---- 1. Quét các khoản thu (payments) ----
  for (const b of bookings) {
    getPayments(b).forEach((p, idx) => {
      if (!p.at) return;
      const t = dayjs(p.at);
      if (!t.isValid()) return;

      const pm = methodOf(p);
      if (method !== 'all' && pm !== method) return; // lọc phương thức cho cả kỳ trước lẫn kỳ này

      const net = netOf(p);

      if (inRange(t, prev.start, prev.end)) prevRealRevenue += net;
      if (!inRange(t, start, end)) return;

      realRevenue += net;
      if (pm === 'cash') cashRevenue += net;
      else qrRevenue += net;
      paidBookingIds.add(b.id);

      transactions.push({
        id: p.id || `${b.id}_${idx}`,
        bookingId: b.id,
        bookingCode: b.code,
        userName: b.userName || 'Khách thể thao',
        courtName: b.courtName,
        subCourt: b.subCourt,
        amount: Number(p.amount || 0),
        type: p.type,
        method: pm,
        at: p.at,
        note: p.note,
      });

      const key = keyOf(t);
      if (chartMap.has(key)) chartMap.set(key, chartMap.get(key) + net);

      if (courtRevenueMap[b.courtId]) courtRevenueMap[b.courtId].revenue += net;
    });
  }

  // ---- 2. Quét các đơn: đếm đơn, dự kiến, công nợ, giờ đắt khách ----
  const hourMap = {};
  let expectedRevenue = 0;
  let debt = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const b of bookings) {
    const playedInRange = b.date >= startStr && b.date <= endStr;

    if (playedInRange && ACTIVE_STATUSES.includes(b.status)) {
      if (courtRevenueMap[b.courtId]) courtRevenueMap[b.courtId].bookingsCount += 1;
      if (b.startTime) {
        const h = `${String(b.startTime).slice(0, 2)}:00`;
        hourMap[h] = (hourMap[h] || 0) + 1;
      }
    }

    if (['confirmed', 'checked_in'].includes(b.status) && playedInRange) {
      expectedRevenue += getRemaining(b);
    } else if (b.status === 'completed') {
      const doneDate = b.completedAt ? dayjs(b.completedAt).format(DATE_FMT) : b.date;
      if (doneDate >= startStr && doneDate <= endStr) {
        completedCount += 1;
        debt += getRemaining(b);
      }
    } else if (['cancelled', 'no_show', 'rejected'].includes(b.status) && playedInRange) {
      cancelledCount += 1;
    }
  }

  realRevenue = Math.max(0, realRevenue);
  prevRealRevenue = Math.max(0, prevRealRevenue);
  cashRevenue = Math.max(0, cashRevenue);
  qrRevenue = Math.max(0, qrRevenue);

  // % so với kỳ trước: null nếu kỳ trước không có dữ liệu (không bịa số)
  const growthPercent =
    prevRealRevenue > 0 ? Math.round(((realRevenue - prevRealRevenue) / prevRealRevenue) * 100) : null;

  const totalMethods = cashRevenue + qrRevenue;
  const cashPercent = totalMethods > 0 ? Math.round((cashRevenue / totalMethods) * 100) : 0;
  const qrPercent = totalMethods > 0 ? 100 - cashPercent : 0;

  const paidOrdersCount = paidBookingIds.size;
  const avgOrderValue = paidOrdersCount > 0 ? Math.round(realRevenue / paidOrdersCount) : null;

  const occupancyRate = calcOccupancy(bookings, scopeCourts, startStr, endStr, now);

  const chartData = buckets.map((b) => ({
    label: b.label,
    value: Math.max(0, chartMap.get(b.key) || 0),
  }));

  const courtBreakdown = Object.values(courtRevenueMap)
    .map((item) => ({
      ...item,
      percent: realRevenue > 0 ? Math.round((item.revenue / realRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topHours = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  transactions.sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    range,
    realRevenue,
    prevRealRevenue,
    growthPercent,
    compareLabel: prev.label,
    comparePartial: prev.isPartial,
    expectedRevenue,
    debt,
    completedCount,
    cancelledCount,
    paidOrdersCount,
    avgOrderValue,
    occupancyRate,
    cashRevenue,
    qrRevenue,
    cashPercent,
    qrPercent,
    chartData,
    courtBreakdown,
    topHours,
    transactions,
    ownerCourts,
  };
};