import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Phone, Building2, MapPin, Clock, Quote } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { firestoreService } from '@/services/firestoreService'
import type { RealtorApplication } from '@/types/realtorApplication'
import type { RealtorApplicationStatus } from '@/types/enums'
import { Card, Badge, Button, Spinner, Modal } from '@/app/components/ui'

type FilterStatus = RealtorApplicationStatus | 'all'

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
]

const STATUS_BADGE: Record<RealtorApplicationStatus, { label: string; variant: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  approved: { label: 'Aprobada', variant: 'success' },
  rejected: { label: 'Rechazada', variant: 'error' },
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} dias`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatExperience(years: number): string {
  if (years === 0) return 'Sin experiencia'
  if (years === 1) return '1 ano'
  return `${years} anos`
}

export default function AdminApplicationsPage() {
  const user = useAuthStore((s) => s.user)

  const [applications, setApplications] = useState<RealtorApplication[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    application: RealtorApplication
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadApplications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statusFilter = filter === 'all' ? undefined : filter
      const results = await firestoreService.getAllRealtorApplications(statusFilter)
      setApplications(results)
    } catch (err) {
      console.error('[AdminApplicationsPage] Failed to load applications:', err)
      setError('Error al cargar las solicitudes. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  async function handleConfirmAction() {
    if (!confirmAction || !user) return

    setIsProcessing(true)
    try {
      if (confirmAction.type === 'approve') {
        await firestoreService.approveRealtorApplication(
          confirmAction.application.userId,
          user.id
        )
      } else {
        await firestoreService.rejectRealtorApplication(
          confirmAction.application.userId,
          user.id
        )
      }

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.userId === confirmAction.application.userId
            ? {
                ...app,
                status: confirmAction.type === 'approve' ? 'approved' as const : 'rejected' as const,
                reviewedAt: new Date(),
                reviewedBy: user.id,
              }
            : app
        )
      )

      setConfirmAction(null)
    } catch (err) {
      console.error('[AdminApplicationsPage] Action failed:', err)
      setError(
        confirmAction.type === 'approve'
          ? 'Error al aprobar la solicitud.'
          : 'Error al rechazar la solicitud.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <h1 className="text-[28px] font-medium text-text-primary">
        Solicitudes de Agentes
      </h1>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-primary text-white'
                : 'bg-black/5 text-text-secondary hover:bg-black/10'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card>
            <div className="text-center">
              <p className="text-error">{error}</p>
              <Button className="mt-4" onClick={loadApplications}>
                Reintentar
              </Button>
            </div>
          </Card>
        ) : applications.length === 0 ? (
          <Card>
            <p className="text-center text-text-secondary">
              {filter === 'all'
                ? 'No hay solicitudes aun.'
                : `No hay solicitudes con estado "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}".`}
            </p>
          </Card>
        ) : (
          applications.map((app) => {
            const isExpanded = expandedId === app.id
            const badge = STATUS_BADGE[app.status]

            return (
              <Card key={app.id} padding="none">
                {/* Collapsed header */}
                <button
                  onClick={() => toggleExpand(app.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-text-primary">
                        {app.fullName}
                      </span>
                      <span className="ml-2 text-sm text-text-tertiary">
                        {formatRelativeDate(app.submittedAt)}
                      </span>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="ml-3 h-5 w-5 flex-shrink-0 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="ml-3 h-5 w-5 flex-shrink-0 text-text-tertiary" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-5 pt-4">
                    {/* Contact info */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium uppercase text-text-secondary">
                        Contacto
                      </h3>
                      <div className="flex flex-col gap-1.5 text-sm text-text-primary">
                        <span className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-text-tertiary" />
                          {app.email}
                        </span>
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-text-tertiary" />
                          {app.phone}
                        </span>
                      </div>
                    </div>

                    {/* Professional info */}
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-medium uppercase text-text-secondary">
                        Informacion Profesional
                      </h3>
                      <div className="flex flex-col gap-1.5 text-sm text-text-primary">
                        {app.businessName && (
                          <span className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-text-tertiary" />
                            {app.businessName}
                          </span>
                        )}
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-text-tertiary" />
                          {formatExperience(app.yearsExperience)}
                        </span>
                        {app.serviceZones.length > 0 && (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                            {app.serviceZones.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Motivation */}
                    {app.motivation && (
                      <div className="mt-4 space-y-2">
                        <h3 className="text-sm font-medium uppercase text-text-secondary">
                          Motivacion
                        </h3>
                        <blockquote className="flex gap-2 rounded-lg bg-black/[0.03] px-4 py-3 text-sm italic text-text-secondary">
                          <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-tertiary" />
                          {app.motivation}
                        </blockquote>
                      </div>
                    )}

                    {/* Review info (for already reviewed) */}
                    {app.reviewedAt && (
                      <p className="mt-4 text-xs text-text-tertiary">
                        Revisada el {app.reviewedAt.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}

                    {/* Action buttons (only for pending) */}
                    {app.status === 'pending' && (
                      <div className="mt-5 flex gap-3">
                        <Button
                          onClick={() => setConfirmAction({ type: 'approve', application: app })}
                        >
                          Aprobar
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setConfirmAction({ type: 'reject', application: app })}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => !isProcessing && setConfirmAction(null)}
        title={confirmAction?.type === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
      >
        <p className="text-text-secondary">
          {confirmAction?.type === 'approve'
            ? `Vas a aprobar la solicitud de ${confirmAction.application.fullName}. Se le otorgara el rol de agente inmobiliario verificado.`
            : `Vas a rechazar la solicitud de ${confirmAction?.application.fullName}.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="text"
            onClick={() => setConfirmAction(null)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            variant={confirmAction?.type === 'approve' ? 'primary' : 'danger'}
            onClick={handleConfirmAction}
            isLoading={isProcessing}
          >
            {confirmAction?.type === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
