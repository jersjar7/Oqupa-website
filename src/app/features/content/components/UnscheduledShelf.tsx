import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Spinner } from '@/app/components/ui'
import type { ContentLink } from '@/types/contentLink'
import { FIELD_BOX, LABEL_FIELD_WIDTH } from './fieldStyles'

/**
 * "Sin programar" — finished material with no publish day yet.
 *
 * WHY A LIST AND NOT A SECOND CALENDAR, which is what was originally proposed:
 * a calendar earns its complexity when position carries meaning — where a thing
 * sits tells you when it happens. For unscheduled material the only date
 * available is the day it was MADE, which is the one fact nobody needs. You
 * would scroll through October to find a reel you made in October in order to
 * schedule it for December. A flat list answers the real question, "what have I
 * got?", in one screen.
 *
 * It is its OWN VIEW rather than a strip on top of the calendar (Jerson's call,
 * 2026-08-08). The count rides on the tab so waiting material is still visible
 * without opening it — which was the one thing the strip did better.
 *
 * One item stays ONE record throughout: giving it a day moves the same record
 * onto the calendar rather than copying it. Two copies would have to be kept in
 * agreement by a person, and people forget.
 */
export default function UnscheduledShelf({
  shelved,
  isLoading,
  error,
  renderRow,
  onAdd,
}: {
  shelved: ContentLink[]
  isLoading: boolean
  error: string | null
  /** The saved-link row, passed in so this and the calendar cannot drift apart. */
  renderRow: (link: ContentLink) => React.ReactNode
  onAdd: (fields: { label: string; url: string }) => Promise<void>
}) {
  const [labelDraft, setLabelDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const url = urlDraft.trim()
    // The address is what makes the row worth saving; the label is a courtesy
    // to whoever reads it next, so it is never required.
    if (!url || busy) return
    setBusy(true)
    try {
      await onAdd({ label: labelDraft.trim(), url })
      setLabelDraft('')
      setUrlDraft('')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-light">
        <div className="space-y-2 px-4 py-4 md:px-5">
          {!error && shelved.length === 0 && (
            <p className="font-serif text-sm font-light italic text-text-tertiary">
              Cuando termines algo y todavía no sepas qué día se publica, guárdalo aquí.
              Después le asignas la fecha.
            </p>
          )}

          {shelved.map((link) => (
            <div key={link.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
              {renderRow(link)}
            </div>
          ))}

          {/* Same two-box shape as a day on the calendar, so it reads as the
              same kind of thing — just without a day yet. */}
          <form onSubmit={submit} className="flex items-start gap-1.5 pt-1">
            <button
              type="submit"
              disabled={busy || !urlDraft.trim()}
              aria-label="Guardar material sin programar"
              className="mt-1 shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder="Qué es"
                aria-label="Etiqueta del material sin programar"
                disabled={busy}
                className={`${FIELD_BOX} ${LABEL_FIELD_WIDTH}`}
              />
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="Pega el enlace de Drive…"
                aria-label="Enlace del material sin programar"
                disabled={busy}
                className={`${FIELD_BOX} w-full min-w-0 flex-1`}
              />
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
