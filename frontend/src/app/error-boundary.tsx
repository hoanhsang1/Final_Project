import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/states'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

/** Chặn lỗi render để không trắng trang; luôn có lối thoát cho người dùng. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Không gửi dữ liệu nhạy cảm lên dịch vụ ngoài; chỉ ghi console khi dev.
    if (import.meta.env.DEV) {
      console.error('[MEMS] Unhandled render error', error, info.componentStack)
    }
  }

  private reset = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
          <ErrorState
            title="Giao diện gặp sự cố"
            description="Một thành phần đã dừng hoạt động ngoài dự kiến. Dữ liệu trên máy chủ không bị ảnh hưởng."
            details={this.state.error.message}
            onRetry={this.reset}
            action={
              <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                Quay lại
              </Button>
            }
          />
        </div>
      )
    }
    return this.props.children
  }
}
