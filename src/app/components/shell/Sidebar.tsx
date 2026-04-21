import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import logo from '@/assets/images/Oqupa_FullLogo_multicolor.webp'
import type { Capabilities } from './capabilities'
import { getNavGroups } from './navItems'

type Props = {
  caps: Capabilities
  userName: string
  roleLabel: string
  onLogout: () => void
}

/**
 * Persistent left sidebar for the authenticated /app area. Role-aware:
 * dual-role users see grouped sections, single-role users see a flat list.
 * Hidden on mobile (<768px) — BottomTabs takes over there.
 */
export default function Sidebar({ caps, userName, roleLabel, onLogout }: Props) {
  const location = useLocation()
  const groups = getNavGroups(caps)

  // Active-path match: exact for /app, prefix for nested (e.g. /app/listings/123)
  const isActive = (to: string) =>
    to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(to)

  const initials = userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside
      aria-label="Navegación principal"
      className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border bg-white"
    >
      <div className="px-5 py-4 border-b border-border">
        <Link to="/" className="inline-flex items-center">
          <img src={logo} alt="Oqupa" className="h-10" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-text-secondary">
                {g.label}
              </p>
            )}
            <div className="space-y-1">
              {g.items.map((item) => {
                const active = isActive(item.to)
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40',
                      active
                        ? 'bg-background-secondary text-secondary font-medium'
                        : 'text-text-primary hover:bg-background-secondary/60',
                    ].join(' ')}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-secondary' : 'text-text-secondary'}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <ChevronRight className="h-3 w-3 text-secondary" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-secondary text-white grid place-items-center text-xs font-bold uppercase">
            {initials || '·'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[11px] text-text-secondary truncate">{roleLabel}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </aside>
  )
}
