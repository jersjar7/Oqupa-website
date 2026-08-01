/**
 * Nav items shown in the dashboard sidebar, grouped for dual-role users.
 * Routing: `to` is the actual route path.
 */
import {
  Home, Briefcase, CreditCard, User, Compass, FileBadge, ClipboardList, BarChart3, Heart,
  KanbanSquare,
  CalendarDays,
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
  dashboard:          { id: 'dashboard',          label: 'Mi Panel',      to: '/app',                          icon: Home } as NavItem,
  misAnuncios:        { id: 'misAnuncios',        label: 'Mis Propiedades', to: '/app/listings',               icon: Briefcase } as NavItem,
  misListas:          { id: 'misListas',          label: 'Mis Listas',    to: '/app/lists',                    icon: Heart } as NavItem,
  pagos:              { id: 'pagos',              label: 'Pagos',         to: '/app/payments',                 icon: CreditCard } as NavItem,
  miPerfil:           { id: 'miPerfil',           label: 'Mi Perfil',     to: '/app/profile',                  icon: User } as NavItem,
  oportunidades:      { id: 'oportunidades',      label: 'Oportunidades', to: '/app/leads',                    icon: Compass } as NavItem,
  miRegistroAgente:   { id: 'miRegistroAgente',   label: 'Mi Registro',   to: '/app/realtor-registration',     icon: FileBadge } as NavItem,
  aplicaciones:       { id: 'aplicaciones',       label: 'Aplicaciones',  to: '/app/admin/applications',       icon: ClipboardList } as NavItem,
  numeros:            { id: 'numeros',            label: 'Números',       to: '/app/numbers',                  icon: BarChart3 } as NavItem,
  equipo:             { id: 'equipo',             label: 'Ing. de Software', to: '/app/equipo',                icon: KanbanSquare } as NavItem,
  contenido:          { id: 'contenido',          label: 'Contenido',     to: '/app/contenido',                icon: CalendarDays } as NavItem,
}

/**
 * Team-internal tabs (board + metrics) the user is allowed to see, in the order
 * they should appear. Both are allowlist-gated, so most users get an empty list.
 */
function internalItems(caps: Capabilities): NavItem[] {
  const items: NavItem[] = []
  if (caps.isTeamMember) items.push(ITEMS.equipo)
  if (caps.isMarketingMember) items.push(ITEMS.contenido)
  if (caps.isMetricsViewer) items.push(ITEMS.numeros)
  return items
}

/**
 * Returns nav groups based on the user's effective capabilities.
 * Single-role users get a flat list (no section headers); dual-role users get grouped.
 */
export function getNavGroups(caps: Capabilities): NavGroup[] {
  const { dashboard, misAnuncios, misListas, pagos, miPerfil, oportunidades, miRegistroAgente, aplicaciones } = ITEMS

  // "Ing. de Software" (the internal dev board) and "Números" (internal metrics) are
  // both allowlist-gated staff tools and are placed identically: inside the
  // Admin section for dual-role admins, appended as final entries for everyone
  // else who's allowed. Most users get neither.
  const internal = internalItems(caps)

  if (caps.isAdmin && caps.isRealtor) {
    return [
      { label: 'Principal', items: [dashboard, misAnuncios, misListas, pagos, miPerfil] },
      { label: 'Agente',    items: [oportunidades, miRegistroAgente] },
      { label: 'Admin',     items: [aplicaciones, ...internal] },
    ]
  }
  if (caps.isRealtor) {
    return [{ items: [dashboard, oportunidades, misAnuncios, misListas, pagos, miRegistroAgente, miPerfil, ...internal] }]
  }
  if (caps.isAdmin) {
    return [{ items: [dashboard, aplicaciones, misAnuncios, misListas, pagos, miPerfil, ...internal] }]
  }
  return [{ items: [dashboard, misAnuncios, misListas, pagos, miPerfil, ...internal] }]
}

/**
 * Mobile bottom tab bar has space for ~5 items only. Returns the top-5
 * most important items by role, using a different priority order than the
 * sidebar to ensure every role's primary action fits within the limit.
 *
 * For admin+realtor (dual role) the sidebar's flattened order would push
 * Aplicaciones to position 7 (beyond the tab limit). Here we promote it.
 */
export function getMobileNavItems(caps: Capabilities): NavItem[] {
  const { dashboard, misAnuncios, misListas, pagos, miPerfil, oportunidades, aplicaciones } = ITEMS

  // Each role's tabs in priority order, "Mi perfil" always last.
  const base =
    caps.isAdmin && caps.isRealtor ? [dashboard, oportunidades, aplicaciones, misAnuncios, miPerfil] :
    caps.isRealtor                 ? [dashboard, oportunidades, misAnuncios, misListas, miPerfil] :
    caps.isAdmin                   ? [dashboard, aplicaciones, misAnuncios, pagos, miPerfil] :
                                     [dashboard, misAnuncios, misListas, pagos, miPerfil]

  return withInternalTabs(base, internalItems(caps))
}

/**
 * The bottom-tab bar only fits 5 items. Internal staff tabs slot in right after
 * the role's two headline tabs and the slate is trimmed back to 5, keeping
 * "Mi perfil" pinned to the end. Whatever gets squeezed out is still reachable
 * from the desktop sidebar.
 */
function withInternalTabs(base: NavItem[], internal: NavItem[]): NavItem[] {
  if (internal.length === 0) return base
  const profile = base.slice(-1)
  const rest = base.slice(0, -1)
  const merged = [...rest.slice(0, 2), ...internal, ...rest.slice(2)]
  return [...merged.slice(0, 4), ...profile]
}
