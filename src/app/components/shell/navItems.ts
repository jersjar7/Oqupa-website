/**
 * Nav items shown in the dashboard sidebar, grouped for dual-role users.
 * Routing: `to` is the actual route path.
 */
import {
  Home, Briefcase, CreditCard, User, Compass, FileBadge, ClipboardList, BarChart3,
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
  pagos:              { id: 'pagos',              label: 'Pagos',         to: '/app/payments',                 icon: CreditCard } as NavItem,
  miPerfil:           { id: 'miPerfil',           label: 'Mi Perfil',     to: '/app/profile',                  icon: User } as NavItem,
  oportunidades:      { id: 'oportunidades',      label: 'Oportunidades', to: '/app/leads',                    icon: Compass } as NavItem,
  miRegistroAgente:   { id: 'miRegistroAgente',   label: 'Mi Registro',   to: '/app/realtor-registration',     icon: FileBadge } as NavItem,
  aplicaciones:       { id: 'aplicaciones',       label: 'Aplicaciones',  to: '/app/admin/applications',       icon: ClipboardList } as NavItem,
  numeros:            { id: 'numeros',            label: 'Números',       to: '/app/numbers',                  icon: BarChart3 } as NavItem,
}

/**
 * Returns nav groups based on the user's effective capabilities.
 * Single-role users get a flat list (no section headers); dual-role users get grouped.
 */
export function getNavGroups(caps: Capabilities): NavGroup[] {
  const { dashboard, misAnuncios, pagos, miPerfil, oportunidades, miRegistroAgente, aplicaciones, numeros } = ITEMS

  // The "Números" tab is the team-internal metrics dashboard. Show it in its
  // own "Equipo" section for dual-role admins (mirrors how Admin chrome is
  // grouped) and append it as a final entry for everyone else who's allowed.
  const metricsItem = caps.isMetricsViewer ? numeros : null

  if (caps.isAdmin && caps.isRealtor) {
    return [
      { label: 'Principal', items: [dashboard, misAnuncios, pagos, miPerfil] },
      { label: 'Agente',    items: [oportunidades, miRegistroAgente] },
      { label: 'Admin',     items: metricsItem ? [aplicaciones, metricsItem] : [aplicaciones] },
    ]
  }
  if (caps.isRealtor) {
    const items = [dashboard, oportunidades, misAnuncios, pagos, miRegistroAgente, miPerfil]
    if (metricsItem) items.push(metricsItem)
    return [{ items }]
  }
  if (caps.isAdmin) {
    const items = [dashboard, aplicaciones, misAnuncios, pagos, miPerfil]
    if (metricsItem) items.push(metricsItem)
    return [{ items }]
  }
  const items = [dashboard, misAnuncios, pagos, miPerfil]
  if (metricsItem) items.push(metricsItem)
  return [{ items }]
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
  const { dashboard, misAnuncios, pagos, miPerfil, oportunidades, miRegistroAgente, aplicaciones, numeros } = ITEMS

  // Bottom-tab bar caps at 5 items. For metrics viewers we drop the lowest-
  // priority tab in each role's slate to make room for "Números"; the missing
  // tab is still reachable from the desktop sidebar / hamburger fallback.
  if (caps.isAdmin && caps.isRealtor) {
    return caps.isMetricsViewer
      ? [dashboard, oportunidades, aplicaciones, numeros, miPerfil]
      : [dashboard, oportunidades, aplicaciones, misAnuncios, miPerfil]
  }
  if (caps.isRealtor) {
    return caps.isMetricsViewer
      ? [dashboard, oportunidades, misAnuncios, numeros, miPerfil]
      : [dashboard, oportunidades, misAnuncios, miRegistroAgente, miPerfil]
  }
  if (caps.isAdmin) {
    return caps.isMetricsViewer
      ? [dashboard, aplicaciones, misAnuncios, numeros, miPerfil]
      : [dashboard, aplicaciones, misAnuncios, pagos, miPerfil]
  }
  return caps.isMetricsViewer
    ? [dashboard, misAnuncios, numeros, pagos, miPerfil]
    : [dashboard, misAnuncios, pagos, miPerfil]
}
