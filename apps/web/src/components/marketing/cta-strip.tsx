'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'

export function CtaStrip() {
  const { accessToken, hydrated, hydrate } = useAuthStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  return (
    <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">Ready to launch</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Build cleaner links and track every click.
          </h3>
          <p className="mt-2 max-w-2xl text-white/65">
            Start with a workspace, create your first branded short URL, and manage everything from one dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {accessToken ? (
            <Link
              href="/dashboard"
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950"
              >
                Start free
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center text-white/85"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}