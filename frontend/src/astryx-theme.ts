import { defineTheme } from '@astryxdesign/core';
import { color, fontFallbacks, fontPrimary } from './theme';

/**
 * Theme Astryx của MEMS — nguồn sự thật duy nhất cho token giao diện.
 *
 * Vì sao **không** `extends: neutralTheme`:
 * theme neutral của Meta dùng accent gần đen (`#1b1b1b`) nên link, focus ring và
 * mục đang chọn đều thành màu than; radius của nó là 6/10/12 thay vì 4/8/12/28.
 * `defineTheme` không có `extends` sẽ lấy default của core rồi mới áp phần dưới
 * đây — đúng thứ mình cần, và không phải tải thêm package theme.
 *
 * Vì sao phải **pin** token chứ không chỉ khai `color.accent`:
 * `color.accent` đưa seed qua mô hình HCT để tự sinh cả thang màu, và HCT đổi
 * `#0E4A8B` thành `#1D5EAC` (khác brand). `tokens` được ưu tiên sau khi sinh nên
 * ghi đè lại đúng mã brand. `--color-text-accent` / `--color-icon-accent` /
 * `--color-accent-muted` được sinh dưới dạng `var(--color-accent)` nên tự đi theo.
 *
 * Màu khai dạng cặp `[sáng, tối]`: Astryx tự đổi thành `light-dark()` khi dựng
 * theme. Nửa sáng là màu MEMS đã chốt trong `theme.ts`, nửa tối giữ default của
 * Astryx để sau này bật dark mode không phải làm lại. App hiện chỉ render
 * `mode="light"` (xem `main.tsx`).
 */

/** Một cặp màu theo hai chế độ — đọc nhanh hơn khi soát bảng token bên dưới. */
const pair = (light: string, dark: string): [string, string] => [light, dark];

export const astryxThemeName = 'mems';

export const memsTheme = defineTheme({
  name: astryxThemeName,

  // Seed cho các token phái sinh (hover/selected/muted). Token cụ thể bên dưới
  // vẫn thắng, nên đây chỉ là lưới an toàn cho những token mình chưa pin.
  color: { accent: color.brand },

  tokens: {
    // --- Nhấn (brand) -------------------------------------------------------
    // Chốt đúng mã brand; `--color-text-accent` v.v. tự trỏ về đây.
    '--color-accent': color.brand,
    '--color-on-accent': color.onBrand,

    // --- Chữ ----------------------------------------------------------------
    '--color-text-primary': pair(color.text, '#DFE2E5'),
    '--color-text-secondary': pair(color.textSecondary, '#AAAFB5'),
    // Astryx dùng chung token này cho cả placeholder; #98A2B3 là mức nhạt nhất
    // còn đọc được trên nền trắng (≈2.8:1 — placeholder được miễn 1.4.3).
    '--color-text-disabled': pair(color.placeholder, '#6F747C'),

    // --- Nền ----------------------------------------------------------------
    // `body` = canvas trang; `card`/`surface` = bề mặt nội dung trắng.
    '--color-background-body': pair(color.canvas, '#111112'),
    '--color-background-card': pair(color.surface, '#1F1F22'),
    '--color-background-surface': pair(color.surface, '#1F1F22'),
    '--color-background-popover': pair(color.surface, '#28292C'),

    // Icon dùng chung một mực với chữ: nếu để Astryx tự sinh thì icon là `#191B22`
    // còn chữ là `#101828` — lệch nhau vài đơn vị, nhìn kỹ mới thấy nhưng là hai
    // "màu đen" khác nhau trên cùng một dòng.
    '--color-icon-primary': pair(color.text, '#DFE2E5'),
    '--color-icon-secondary': pair(color.textSecondary, '#AAAFB5'),
    '--color-icon-disabled': pair(color.placeholder, '#6F747C'),

    // --- Viền ---------------------------------------------------------------
    // `border` = hairline trang trí (card, divider, bảng) — không dùng cho field.
    '--color-border': pair(color.border, '#F2F4F619'),
    // `border-emphasized` = viền field, đủ 3:1 trên trắng lẫn canvas (WCAG 1.4.11).
    '--color-border-emphasized': pair(color.borderInput, '#494D53'),

    // --- Bề mặt phụ ---------------------------------------------------------
    // Table dùng token này cho nền hàng hover / hàng kẻ sọc, và một số khối phụ
    // (code block, header nhóm) dùng làm nền. `surfaceSunken` là màu đã chốt cho
    // "nền header bảng / hover row" trong `theme.ts`.
    '--color-background-muted': pair(color.surfaceSunken, '#1111127F'),
    // Skeleton và rãnh của progress bar: phải là xám RẤT nhạt, chỉ đủ thấy hình
    // khối. Default của Astryx (`#CCD3DB`) đậm gần bằng viền field nên khung xương
    // đọc như dữ liệu thật đang tải.
    '--color-skeleton': pair('#EAECF0', '#434653'),
    '--color-track': pair('#EAECF0', '#434653'),

    // --- Trạng thái ---------------------------------------------------------
    // Mỗi trạng thái có 3 lớp: màu đặc (icon/viền), màu chữ, và nền nhạt 20%.
    // Chữ trạng thái luôn kèm nhãn bằng lời (BR-08), không dựa riêng vào màu.
    '--color-error': pair(color.error, '#F5394F'),
    '--color-text-error': pair(color.error, '#FFB2B8'),
    '--color-error-muted': pair('#B4231833', '#F5394F3F'),

    '--color-success': pair(color.success, '#0D8626'),
    '--color-text-success': pair(color.success, '#A5F690'),
    '--color-success-muted': pair('#06764733', '#0B991F3F'),

    '--color-warning': pair(color.warning, '#E9AF08'),
    '--color-text-warning': pair(color.warning, '#FBCE03'),
    '--color-warning-muted': pair('#B5470833', '#E2A4003F'),

    // --- Thông tin (info) ---------------------------------------------------
    // MEMS không có "xanh thông tin" riêng — antd cũ đặt `colorInfo = brand`.
    // Giữ đúng tinh thần đó: info là brand, không phải xanh Meta `#0064E0`.
    // `Banner status="info"` lấy nền từ `--color-info-muted` và chữ từ
    // `--color-on-info-muted`, nên phải pin cả hai; chỉ pin `--color-info` thì
    // banner vẫn ra xanh Meta.
    '--color-info': 'var(--color-accent)',
    '--color-info-muted': 'var(--color-accent-muted)',
    '--color-text-info': 'var(--color-accent)',
    '--color-on-info-muted': pair(color.brand, '#AFD7FF'),

    // Banner tô chữ bằng `--color-on-*-muted`, không dùng `--color-text-*`.
    // Để default thì chữ banner lệch màu với chữ trạng thái cùng nghĩa
    // (`#187046` vs `#067647` ở success). Pin cho khớp một mực.
    '--color-on-success-muted': pair(color.success, '#A5F690'),
    '--color-on-warning-muted': pair(color.warning, '#FBCE03'),
    '--color-on-error-muted': pair(color.error, '#FFB2B8'),
  },

  typography: {
    // 14 · 1.2 → 12 / 14 / 17 / 20 / 24 px (display: 29 / 35 / 42).
    // Đây là thang đã chốt: bỏ các mốc lửng 13/15/16, mỗi mốc là một cấp bậc
    // mắt đọc ra được. Line-height do ratio sinh ra rơi đúng lưới 4px.
    scale: { base: 14, ratio: 1.2 },
    body: { family: fontPrimary, fallbacks: fontFallbacks },
    heading: { family: fontPrimary, fallbacks: fontFallbacks, weight: 'semibold' },
  },
});
