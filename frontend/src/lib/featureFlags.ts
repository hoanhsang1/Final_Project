/**
 * Cờ tính năng phía FE, đọc một lần lúc build (`VITE_*`).
 *
 * `VITE_ENABLE_DELEGATION_UI=true` mới bật màn "Quyền được ủy quyền" và nút
 * tương ứng ở trang xem thử vai trò. Mặc định TẮT để app không gọi
 * `GET /api/delegations/me` trên môi trường chưa deploy route ủy quyền
 * (PHẦN 6) — tránh 404 trong Network tab.
 */
export const DELEGATION_UI_ENABLED = import.meta.env.VITE_ENABLE_DELEGATION_UI === 'true';
