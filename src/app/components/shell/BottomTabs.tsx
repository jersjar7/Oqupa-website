import { Link, useLocation } from 'react-router-dom'
import type { Capabilities } from './capabilities'
import { getNavGroups } from './navItems'

/**
 * Mobile-only bottom tab bar. Shows the first 5 nav items (flattened across groups).
 * Sidebar takes over at >=768px.
 */
export default function BottomTabs({ caps }: { caps: Capabilities }) {
  const location = useLocation()
  const items = getNavGroups(caps).flatMap((g) => g.items).slice(0, 5)
  const isActive = (to: string) =>
    to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(to)

  return (
    <nav
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-0 inset-x-0 border-t border-border bg-white grid z-40"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((item) => {
        const active = isActive(item.to)
        const Icon = item.icon
        return (
          <Link
            key={item.id}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center py-2 text-[10px] ${
              active ? 'text-secondary font-medium' : 'text-text-secondary'
            }`}
          >
            <Icon className="h-5 w-5 mb-1" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
