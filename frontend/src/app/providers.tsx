import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'

import { ErrorBoundary } from '@/app/error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 404/403 và các 4xx khác là lỗi cố định: thử lại chỉ nhân đôi request.
        retry: (failureCount, error) => {
          if (isAxiosError(error)) {
            const status = error.response?.status
            if (status && status >= 400 && status < 500) return false
          }
          return failureCount < 1
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        gcTime: 5 * 60_000,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200} skipDelayDuration={400}>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
