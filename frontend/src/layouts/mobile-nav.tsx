import * as DialogPrimitive from '@radix-ui/react-dialog'

import { SidebarContent } from '@/layouts/sidebar'
import { useUiStore } from '@/stores/ui-store'

/** Điều hướng mobile: ngăn kéo trái, đóng khi chọn mục. */
export function MobileNav() {
  const open = useUiStore((state) => state.mobileNavOpen)
  const setOpen = useUiStore((state) => state.setMobileNavOpen)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-fade-in lg:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 w-[19rem] max-w-[85vw] border-r border-sidebar-line shadow-lg data-[state=open]:animate-[drawer-in-left_240ms_var(--ease-entrance)] lg:hidden"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Điều hướng</DialogPrimitive.Title>
          <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} mobile />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
