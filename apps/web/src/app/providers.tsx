'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { ToastProvider } from '@/components/ui/toast-provider'

type Props = {
  children: ReactNode
}

export function Providers({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000
          }
        }
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastProvider />
    </QueryClientProvider>
  )
}