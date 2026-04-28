'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  FileText,
  House,
  KeyRound,
  Link2,
  Settings,
  Users
} from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/dashboard/links', label: 'Links', icon: Link2 },
  { href: '/dashboard/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/api-keys', label: 'Keys', icon: KeyRound },
  { href: '/dashboard/exports', label: 'Exports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings }
]

export function MobileDashboardNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-7">
        {items.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href === '/dashboard/links' && pathname.startsWith('/dashboard/links/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-3 text-[11px] ${
                active ? 'text-cyan-300' : 'text-white/55'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}