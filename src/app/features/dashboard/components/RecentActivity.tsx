/**
 * Recent activity feed for the dashboard. Composes activity from existing
 * data sources (no separate event log needed for v1):
 *   - Latest published listings (owner)
 *   - Latest completed boost payments (owner)
 *   - Latest agent assignments (realtor)
 *
 * Each item gets a relative timestamp ("hace 2h") and a click-through link
 * to the relevant page. Caps at 5 items, sorted newest first. Empty state
 * uses a friendly hint instead of an empty card.
 *
 * If/when the Cloud Functions start writing structured notifications to
 * users/{userId}/notifications/, swap this composition for that subscription.
 */
import { Link } from 'react-router-dom'
import { Plus, Zap, Briefcase, Inbox } from 'lucide-react'
import { useUserListingsWithProperties } from '@/hooks/useListings'
import { useUserBoostPayments } from '@/hooks/useBoost'
import { useAgentAssignments } from '@/hooks/useRealtorLeads'
import { Card } from '@/app/components/ui'

type Props = {
  userId: string | undefined
  isRealtor: boolean
}

type Activity = {
  id: string
  at: Date
  icon: React.ReactNode
  text: React.ReactNode
  to?: string
}

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const hr = Math.round(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const day = Math.round(hr / 24)
  if (day < 7) return `hace ${day} ${day === 1 ? 'día' : 'días'}`
  const wk = Math.round(day / 7)
  if (wk < 5) return `hace ${wk} ${wk === 1 ? 'semana' : 'semanas'}`
  return d.toLocaleDateString('es-PE')
}

export default function RecentActivity({ userId, isRealtor }: Props) {
  const listings = useUserListingsWithProperties(userId)
  const payments = useUserBoostPayments(userId)
  const assignments = useAgentAssignments(isRealtor ? userId : undefined)

  const activities: Activity[] = []

  // Owner: latest 3 published listings
  for (const { listing, property } of (listings.data ?? [])) {
    if (!listing.publishedAt) continue
    const propertyName = property?.location?.calle || 'tu anuncio'
    activities.push({
      id: `pub-${listing.id}`,
      at: listing.publishedAt,
      icon: <Plus className="h-4 w-4 text-secondary" />,
      text: (
        <>
          Publicaste <span className="font-medium text-text-primary">{propertyName}</span>
        </>
      ),
      to: `/app/listings`,
    })
  }

  // Owner: latest 3 completed boost payments
  for (const p of (payments.data ?? [])) {
    if (p.status !== 'completed' || !p.completedAt) continue
    activities.push({
      id: `pay-${p.id}`,
      at: p.completedAt,
      icon: <Zap className="h-4 w-4 text-primary" />,
      text: (
        <>
          Activaste un boost de{' '}
          <span className="font-medium text-text-primary">{p.boostTier === 'sevenDays' ? '7 días' : p.boostTier === 'fifteenDays' ? '15 días' : '30 días'}</span>
        </>
      ),
      to: `/app/payments`,
    })
  }

  // Realtor: latest ACCEPTED agent assignments. Pending invitations are
  // excluded — they haven't been committed to yet. Pending invites have
  // their own prominent CTA on the dashboard (InvitacionesCta banner) and
  // live on Oportunidades → Invitaciones for the real accept/decline flow.
  for (const { listing, property } of (assignments.data ?? [])) {
    if (listing.assignmentStatus !== 'accepted') continue
    const at = listing.updatedAt
    if (!at) continue
    const propertyName = property?.location?.calle || 'una propiedad'
    activities.push({
      id: `asg-${listing.id}`,
      at,
      icon: <Briefcase className="h-4 w-4 text-blue-600" />,
      text: (
        <>
          Aceptaste la asignación en{' '}
          <span className="font-medium text-text-primary">{propertyName}</span>
        </>
      ),
      to: `/app/listings?tab=asignadas`,
    })
  }

  activities.sort((a, b) => b.at.getTime() - a.at.getTime())
  const top = activities.slice(0, 5)

  const isLoading = listings.isLoading || payments.isLoading || (isRealtor && assignments.isLoading)

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Cargando actividad…</p>
      </Card>
    )
  }

  if (top.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Inbox className="h-5 w-5 shrink-0 text-text-tertiary mt-0.5" />
          <div>
            <p className="text-sm text-text-primary">Aún no hay actividad reciente.</p>
            <p className="font-serif text-xs italic text-text-tertiary mt-0.5">
              Publica un anuncio o activa un boost para ver tus eventos aquí.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="divide-y divide-border -my-2">
        {top.map((a) => {
          const inner = (
            <div className="flex items-center gap-3 py-3">
              <span className="shrink-0">{a.icon}</span>
              <p className="flex-1 min-w-0 text-sm text-text-secondary truncate">{a.text}</p>
              <span className="font-serif text-xs italic text-text-tertiary shrink-0">
                {relativeTime(a.at)}
              </span>
            </div>
          )
          return (
            <li key={a.id}>
              {a.to
                ? <Link to={a.to} className="block hover:bg-background-secondary -mx-4 px-4 rounded">{inner}</Link>
                : inner}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
