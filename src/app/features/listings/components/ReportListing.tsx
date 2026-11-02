// "Reportar anuncio" on the listing page (ADR-046 #5) — the app's six reasons
// and its two outcomes, word for word.
import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Modal } from '@/app/components/ui'
import { reportService } from '@/services/reportService'
import { REPORT_REASONS, type ReportReason } from '@/lib/reportReasons'

type Stage = 'closed' | 'choose' | 'sending' | 'sent' | 'failed'

/** Listings reported from this device (review 2026-11-02). Per-device only:
 *  the rules keep reports write-only, so the server cannot be asked. */
const REPORTED_KEY = 'oqupa_reported_listings_v1'

function reportedIds(): string[] {
  try {
    const raw = localStorage.getItem(REPORTED_KEY)
    const ids: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function markReported(listingId: string) {
  try {
    const ids = reportedIds()
    if (!ids.includes(listingId)) localStorage.setItem(REPORTED_KEY, JSON.stringify([...ids, listingId].slice(-200)))
  } catch {
    // A blocked storage only means the action stays available.
  }
}

export default function ReportListing({ listingId, ownerUserId }: { listingId: string; ownerUserId: string }) {
  const [stage, setStage] = useState<Stage>('closed')
  const [alreadyReported, setAlreadyReported] = useState(() => reportedIds().includes(listingId))

  async function send(reason: ReportReason) {
    setStage('sending')
    try {
      await reportService.reportListing({ listingId, ownerUserId, reason })
      markReported(listingId)
      setStage('sent')
    } catch {
      setStage('failed')
    }
  }

  const close = () => {
    if (stage === 'sending') return
    if (stage === 'sent') setAlreadyReported(true)
    setStage('closed')
  }
  const title =
    stage === 'sent' ? 'Reporte enviado' : stage === 'failed' ? 'No se pudo enviar' : 'Selecciona el motivo del reporte'

  if (alreadyReported && stage === 'closed') {
    return <p className="inline-flex min-h-11 items-center text-sm text-text-secondary">Ya reportaste este anuncio. Gracias.</p>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStage('choose')}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        Reportar anuncio
      </button>
      <Modal isOpen={stage !== 'closed'} onClose={close} title={title} placement="sheet">
        {(stage === 'choose' || stage === 'sending') && (
          <div className="flex flex-col">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                disabled={stage === 'sending'}
                onClick={() => send(reason)}
                className="flex min-h-12 items-center border-b border-border px-1 text-left text-base text-text-primary last:border-b-0 hover:bg-background-secondary disabled:opacity-50"
              >
                {reason}
              </button>
            ))}
          </div>
        )}
        {(stage === 'sent' || stage === 'failed') && (
          <div>
            <p className="text-sm text-text-secondary">
              {stage === 'sent'
                ? 'Gracias por tu reporte. Revisaremos este anuncio.'
                : 'No pudimos enviar tu reporte. Revisa tu conexión e inténtalo de nuevo.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (stage === 'sent') setAlreadyReported(true)
                setStage('closed')
              }}
              className="mt-4 h-12 w-full rounded-full border-[1.5px] border-secondary font-sans text-base font-bold uppercase tracking-[1px] text-secondary"
            >
              Entendido
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
