'use client'

import { ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  FileText,
  KeyRound,
  LayoutDashboard,
  Link2,
  LogOut,
  Settings,
  Users
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth-store'
import { WorkspaceSwitcher } from '@/app/dashboard/workspace-switcher'
import { MobileDashboardNav } from '@/components/dashboard/mobile-dashboard-nav'

type Props = {
  children: ReactNode
}

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Overview'
  if (pathname === '/dashboard/links') return 'Links'
  if (pathname.startsWith('/dashboard/links/') && pathname.endsWith('/edit')) return 'Edit Link'
  if (pathname.startsWith('/dashboard/links/')) return 'Link Details'
  if (pathname === '/dashboard/analytics') return 'Analytics'
  if (pathname === '/dashboard/api-keys') return 'API Keys'
  if (pathname === '/dashboard/audit-logs') return 'Audit Logs'
  if (pathname === '/dashboard/members') return 'Members'
  if (pathname === '/dashboard/exports') return 'Exports'
  if (pathname === '/dashboard/settings') return 'Settings'
  if (pathname === '/dashboard/change-password') return 'Change Password'
  return 'Dashboard'
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/links', label: 'Links', icon: Link2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/dashboard/exports', label: 'Exports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings }
]

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { accessToken, hydrated, hydrate, logout } = useAuthStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login')
    }
  }, [hydrated, accessToken, router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/10 bg-slate-950/90 lg:block">
          <div className="sticky top-0 flex h-full flex-col p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                <Link2 size={20} />
              </div>
              <div>
                <p className="text-sm text-white/45">Business shortener</p>
                <h1 className="text-lg font-semibold">UrlShortener</h1>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <WorkspaceSwitcher />
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href ||
                  (item.href === '/dashboard/links' && pathname.startsWith('/dashboard/links/'))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                      active
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/5"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="min-w-0 pb-20 lg:pb-0">
          <header className="border-b border-white/10 bg-slate-950/70 px-6 py-5 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white/45">Dashboard</p>
                <h2 className="truncate text-2xl font-semibold">{getPageTitle(pathname)}</h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="block lg:hidden">
                  <WorkspaceSwitcher />
                </div>

                <Link
                  href="/"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/5"
                >
                  View site
                </Link>
              </div>
            </div>
          </header>

          <div className="px-6 py-8 lg:px-8">{children}</div>
        </main>
      </div>

      <MobileDashboardNav />
    </div>
  )
}
