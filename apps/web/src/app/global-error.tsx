'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-[32px] border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-red-200/70">Something broke</p>
            <h1 className="mt-4 text-3xl font-semibold">We hit an unexpected error.</h1>
            <p className="mt-3 text-white/70">
              The issue has been captured for review. You can retry this screen now.
            </p>
            <button
              onClick={() => reset()}
              className="mt-6 rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
