/**
 * Chuyển ngày (`YYYY-MM-DD` từ `DateInput`) sang ISO instant cho query params.
 * Dùng giờ địa phương của trình duyệt; KHÔNG đọc `app.timezone` (chỉ có trên
 * nhánh room-type, chờ chốt S7) và không ép UTC thủ công.
 */

function toLocalDate(date: string, endOfDay: boolean): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export const dayStartIso = (date: string): string | undefined => toLocalDate(date, false);
export const dayEndIso = (date: string): string | undefined => toLocalDate(date, true);

/** Chỉ bật room picker khi người dùng nhập đúng dạng `ISO instant` đơn giản. */
export function isIsoLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.test(
    value.trim(),
  );
}
