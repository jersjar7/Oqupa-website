/**
 * Pure helpers used by DashboardPage. Extracted for unit tests and to keep
 * the page component focused on composition. All time-sensitive functions
 * accept an injectable `now` so tests stay deterministic.
 */

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

/** Month name (es-PE, lowercase) that claim counters reset into. */
export function nextClaimResetText(now: Date = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `Reinicia el 1 de ${MONTHS_ES[next.getMonth()]}`
}

/** Count listings whose `expiresAt` is within the next 7 days (active only). */
export function countExpiringSoon(
  items: { listing: { expiresAt?: Date; status: string } }[],
  now: Date = new Date(),
): number {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const nowMs = now.getTime()
  return items.filter(({ listing }) => {
    if (listing.status !== 'active') return false
    if (!listing.expiresAt) return false
    const ms = listing.expiresAt.getTime() - nowMs
    return ms > 0 && ms <= sevenDaysMs
  }).length
}

/** Count items published within the last `hours` window. */
export function countPublishedSince(
  items: { listing: { publishedAt?: Date } }[],
  hours: number,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - hours * 60 * 60 * 1000
  return items.filter(
    ({ listing }) => listing.publishedAt && listing.publishedAt.getTime() >= cutoff,
  ).length
}

/** Sum completed payments' `amount` for the current calendar month. */
export function spendThisMonthSoles(
  payments: { amount: number; status: string; completedAt?: Date }[] | undefined,
  now: Date = new Date(),
): number {
  if (!payments) return 0
  const m = now.getMonth()
  const y = now.getFullYear()
  return payments
    .filter((p) => p.status === 'completed' && p.completedAt
      && p.completedAt.getMonth() === m
      && p.completedAt.getFullYear() === y)
    .reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Compose the dashboard subtitle based on effective role + pending work.
 * Static ~20 lines of copy — extracted so tests can pin the exact strings.
 */
export function buildSubtitle(args: {
  isAdmin: boolean
  isRealtor: boolean
  pendingApps: number | undefined
  pendingAppsLoading: boolean
  availableLeads: number | undefined
  leadsLoading: boolean
}): string {
  const { isAdmin, isRealtor, pendingApps, pendingAppsLoading, availableLeads, leadsLoading } = args

  if (isAdmin && isRealtor) {
    if (pendingAppsLoading || leadsLoading) return 'Cargando resumen del día.'
    const apps = pendingApps ?? 0
    const leads = availableLeads ?? 0
    if (apps === 0 && leads === 0) return 'Todo al día. No hay acciones pendientes.'
    const parts: string[] = []
    if (apps > 0) parts.push(`${apps} ${apps === 1 ? 'aplicación pendiente' : 'aplicaciones pendientes'}`)
    if (leads > 0) parts.push(`${leads} ${leads === 1 ? 'oportunidad disponible' : 'oportunidades disponibles'}`)
    return `${parts.join(' · ')}.`
  }

  if (isAdmin) {
    if (pendingAppsLoading) return 'Cargando aplicaciones pendientes.'
    const apps = pendingApps ?? 0
    return apps === 0
      ? 'Todo al día. No hay aplicaciones pendientes.'
      : `${apps} ${apps === 1 ? 'aplicación pendiente de revisión' : 'aplicaciones pendientes de revisión'}.`
  }

  if (isRealtor) {
    if (leadsLoading) return 'Cargando oportunidades disponibles.'
    const leads = availableLeads ?? 0
    return leads === 0
      ? 'Sin oportunidades nuevas por ahora. Revisa el resumen de tus anuncios abajo.'
      : `${leads} ${leads === 1 ? 'oportunidad disponible' : 'oportunidades disponibles'} para agentes.`
  }

  return 'Aquí está el resumen de tus anuncios.'
}
