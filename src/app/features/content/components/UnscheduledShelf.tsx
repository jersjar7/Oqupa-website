import { useState } from 'react'
import { ChevronDown, ChevronRight, Inbox, Plus } from 'lucide-react'
import type { ContentLink } from '@/types/contentLink'

/**
 * The "sin programar" shelf — finished material with no publish day yet.
 *
 * WHY A SHELF AND NOT A SECOND CALENDAR. A calendar earns its complexity when
 * position carries meaning: where a thing sits tells you when it happens. For
 * unscheduled material the only date available is the day it was MADE, which is
 * the one fact nobody needs — you would scroll through October to find a reel
 * you made in October in order to schedule it for December. A flat list answers
 * the real question ("what have I got?") in one screen.
 *
 * WHY IT SITS ON TOP OF THE CALENDAR RATHER THAN IN ITS OWN TAB. The failure
 * this exists to prevent is material getting made and then forgotten. A count
 * you cannot avoid seeing does that; a tab you have to remember to open does
 * not. It collapses so it never buries the calendar.
 *
 * One item is ONE record throughout: giving it a day moves the same record onto
 * the calendar rather than copying it. Two copies would have to be kept in
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
  /** The saved-link row, passed in so the shelf and the calendar stay identical. */
  renderRow: (link: ContentLink) => React.ReactNode
  onAdd: (fields: { label: string; url: string }) => Promise<void>
}) {
  // Open by default when there is something waiting — the whole point is that
  // it is hard to ignore. Closed when empty so it stays out of the way.
  const [open, setOpen] = useState(true)
  const [labelDraft, setLabelDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const url = urlDraft.trim()
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

  const count = shelved.length

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-border bg-background-secondary/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-background-secondary/70 md:px-5"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
        )}
        <Inbox className="h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="font-sans text-sm font-medium uppercase tracking-wide text-text-primary">
          Sin programar
        </span>
        {count > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs font-medium text-primary">
            {count}
          </span>
        )}
        <span className="ml-auto font-serif text-xs font-light italic text-text-tertiary">
          {isLoading
            ? 'Cargando…'
            : count === 0
              ? 'Nada pendiente'
              : 'Material listo, sin fecha de publicación'}
        </span>
      </button>

      {open && (
        <div className="space-y-1.5 border-t border-border px-4 pb-3 pt-3 md:px-5">
          {error && (
            <p className="font-sans text-sm text-error" role="alert">
              {error}
            </p>
          )}

          {!error && !isLoading && count === 0 && (
            <p className="font-serif text-sm font-light italic text-text-tertiary">
              Cuando termines algo y todavía no sepas qué día se publica, guárdalo aquí.
            </p>
          )}

          {shelved.map((link) => (
            <div key={link.id}>{renderRow(link)}</div>
          ))}

          {/* Same two-box shape as a day row, so it is obvious this is the
              same kind of thing, just without a day yet. */}
          <form onSubmit={submit} className="flex items-start gap-1.5 pt-1">
            <button
              type="submit"
              disabled={busy || !urlDraft.trim()}
              aria-label="Guardar material sin programar"
              className="mt-1 shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder="Qué es (ej. Reel casa Castilla)"
                aria-label="Etiqueta del material sin programar"
                disabled={busy}
                className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50 sm:w-40 sm:shrink-0"
              />
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="Pega el enlace de Drive…"
                aria-label="Enlace del material sin programar"
                disabled={busy}
                className="w-full min-w-0 bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
              />
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
