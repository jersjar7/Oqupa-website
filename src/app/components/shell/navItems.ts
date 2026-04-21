/**
 * Nav items shown in the dashboard sidebar, grouped for dual-role users.
 * Routing: `to` is the actual route path.
 *
 * NOTE: "Mis Anuncios" is intentionally omitted for now. The current /app
 * route already IS the listings view (DashboardPage renders the user's
 * listings). When the Dashboard is redesigned into role-aware KPIs (next
 * commit), we'll add a dedicated /app/listings route + re-add the nav item.
 */
import {
  Home, CreditCard, User, Compass, FileBadge, ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import type { Capabilities } from './capabilities'

export type NavItem = {
  id: string
  label: string
  to: string
  icon: LucideIcon
}

export type NavGroup = {
  label?: string  // undefined = no section header (used for single-role flat nav)
  items: NavItem[]
}

const ITEMS = {
  dashboard:          { id: 'dashboard',          label: 'Dashboard',     to: '/app',                          icon: Home } as NavItem,
  pagos:              { id: 'pagos',              label: 'Pagos',         to: '/app/payments',                 icon: CreditCard } as NavItem,
  miPerfil:           { id: 'miPerfil',           label: 'Mi Perfil',     to: '/app/profile',                  icon: User } as NavItem,
  oportunidades:      { id: 'oportunidades',      label: 'Oportunidades', to: '/app/leads',                    icon: Compass } as NavItem,
  miRegistroAgente:   { id: 'miRegistroAgente',   label: 'Mi Registro',   to: '/app/realtor-registration',     icon: FileBadge } as NavItem,
  aplicaciones:       { id: 'aplicaciones',       label: 'Aplicaciones',  to: '/app/admin/applications',       icon: ClipboardList } as NavItem,
}

/**
 * Returns nav groups based on the user's effective capabilities.
 * Single-role users get a flat list (no section headers); dual-role users get grouped.
 */
export function getNavGroups(caps: Capabilities): NavGroup[] {
  const { dashboard, pagos, miPerfil, oportunidades, miRegistroAgente, aplicaciones } = ITEMS

  if (caps.isAdmin && caps.isRealtor) {
    return [
      { label: 'Principal', items: [dashboard, pagos, miPerfil] },
      { label: 'Agente',    items: [oportunidades, miRegistroAgente] },
      { label: 'Admin',     items: [aplicaciones] },
    ]
  }
  if (caps.isRealtor) {
    return [{ items: [dashboard, oportunidades, pagos, miRegistroAgente, miPerfil] }]
  }
  if (caps.isAdmin) {
    return [{ items: [dashboard, aplicaciones, pagos, miPerfil] }]
  }
  return [{ items: [dashboard, pagos, miPerfil] }]
}
