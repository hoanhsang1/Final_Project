import { Toaster as SonnerToaster } from 'sonner'

/** Cấu hình toast dùng chung; gọi qua `toast` của sonner. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      duration={4500}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !border !border-line !bg-surface !text-ink-800 !shadow-lg !font-sans !text-sm',
          title: '!font-semibold !text-ink-900',
          description: '!text-ink-500 !text-xs',
          actionButton: '!bg-jade-700 !text-white !font-medium',
          cancelButton: '!bg-ink-100 !text-ink-700',
          success: '[&_[data-icon]]:!text-success-500',
          error: '[&_[data-icon]]:!text-danger-500',
        },
      }}
    />
  )
}
