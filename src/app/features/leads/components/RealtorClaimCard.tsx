import { MessageCircle, UserCheck } from 'lucide-react'
import { Badge, Button } from '@/app/components/ui'
import type { RealtorClaim } from '@/types/realtorClaim'

interface RealtorClaimCardProps {
  claim: RealtorClaim
  isAssigned: boolean
  hasAssignedRealtor: boolean
  onAssign?: () => void
  isAssigning: boolean
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      if (diffMinutes <= 0) return 'Ahora mismo'
      return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
    }
    return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  }
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} dias`
  const weeks = Math.floor(diffDays / 7)
  return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
}

export default function RealtorClaimCard({
  claim,
  isAssigned,
  hasAssignedRealtor,
  onAssign,
  isAssigning,
}: RealtorClaimCardProps) {
  const whatsappPhone = claim.realtorPhone.replace(/[^\d+]/g, '')

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-light ${isAssigned ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Realtor name */}
          <div className="flex items-center gap-2">
            <p className="font-medium text-text-primary">{claim.realtorName}</p>
            {isAssigned && <Badge variant="info">Asignado</Badge>}
          </div>

          {/* Business name */}
          <p className="mt-0.5 text-sm text-text-secondary">
            {claim.realtorBusinessName || 'Agente Independiente'}
          </p>

          {/* Phone */}
          <p className="mt-1 text-sm text-text-tertiary">{claim.realtorPhone}</p>

          {/* Claimed date */}
          <p className="mt-1 text-xs text-text-tertiary">
            Reclamo {formatRelativeDate(claim.claimedAt)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/${whatsappPhone}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="text" className="text-green-600 hover:text-green-700">
            <MessageCircle className="h-4 w-4" />
            Contactar por WhatsApp
          </Button>
        </a>

        {!hasAssignedRealtor && (
          <Button
            onClick={onAssign}
            isLoading={isAssigning}
          >
            <UserCheck className="h-4 w-4" />
            Trabajar con este Agente
          </Button>
        )}
      </div>
    </div>
  )
}
