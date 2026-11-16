import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

const numberFormatter = new Intl.NumberFormat('vi-VN')

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isValid(value) ? value : null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

/** 1.234.567 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return numberFormatter.format(value)
}

/** 1.234.567 ₫ */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${numberFormatter.format(value)} ₫`
}

/** 12/03/2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'dd/MM/yyyy') : '—'
}

/** 14:05 · 12/03/2026 */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'HH:mm · dd/MM/yyyy') : '—'
}

/** Thứ Ba, 12/03/2026 */
export function formatLongDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, "EEEE, dd/MM/yyyy", { locale: vi }) : '—'
}

/** 12/03 — dùng cho trục thời gian */
export function formatDayMonth(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'dd/MM') : '—'
}

/** 3 giờ trước */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: vi })
}

/** Chữ cái đầu của họ tên: "Nguyễn Văn An" → "NA" */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function truncate(value: string, max = 48): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

/** Ẩn bớt số điện thoại: 0901 234 567 → 0901 *** 567 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\s/g, '')
  if (digits.length < 7) return phone
  return `${digits.slice(0, 4)} *** ${digits.slice(-3)}`
}

/** Chuẩn hoá chuỗi tiếng Việt để tìm kiếm không dấu. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}
