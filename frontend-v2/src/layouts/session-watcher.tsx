import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useSession } from '@/features/auth/hooks'

/**
 * Theo dõi phiên ở cấp ứng dụng:
 *  - refresh token hết hạn → đưa về trang đăng nhập kèm thông báo;
 *  - tài khoản còn mật khẩu tạm → buộc đổi trước khi dùng console.
 */
export function SessionWatcher() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const session = useSession()

  useEffect(() => {
    const handler = () => {
      toast.error('Phiên đăng nhập đã hết hạn', {
        description: 'Vui lòng đăng nhập lại để tiếp tục.',
      })
      navigate('/dang-nhap', { replace: true })
    }
    window.addEventListener('mems:session-expired', handler)
    return () => window.removeEventListener('mems:session-expired', handler)
  }, [navigate])

  useEffect(() => {
    if (!session?.user.mustChangePassword) return
    if (pathname === '/doi-mat-khau' || pathname === '/dang-nhap') return
    toast.info('Bạn cần đổi mật khẩu tạm trước khi tiếp tục.')
    navigate('/doi-mat-khau', { replace: true })
  }, [navigate, pathname, session])

  return null
}
