import { isMockMode } from '@/services/http'

/** Chỉ hiện công cụ đổi vai trò demo khi chạy mock và không bị tắt bằng env. */
export const SHOW_DEMO_TOOLBAR =
  isMockMode && (import.meta.env.VITE_ENABLE_DEMO_TOOLBAR ?? 'true') !== 'false'
