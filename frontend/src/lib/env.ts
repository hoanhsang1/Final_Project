import { isMockMode } from '@/services/http'

/** Chỉ hiện công cụ đổi vai trò demo khi chạy mock ở môi trường phát triển. */
export const SHOW_DEMO_TOOLBAR =
  !import.meta.env.PROD &&
  isMockMode &&
  (import.meta.env.VITE_ENABLE_DEMO_TOOLBAR ?? 'true') !== 'false'
