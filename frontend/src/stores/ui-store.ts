import { create } from 'zustand'

const STORAGE_KEY = 'mems.v2.sidebarCollapsed'

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface UiState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set, get) => ({
  sidebarCollapsed: readInitial(),
  mobileNavOpen: false,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* noop */
    }
    set({ sidebarCollapsed: next })
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}))
