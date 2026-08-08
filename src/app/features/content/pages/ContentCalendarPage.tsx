import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { useContentLinks, dateKey, daysInMonth } from '@/hooks/useContentLinks'
import { contentLinkService } from '@/services/contentLinkService'
import { memberFor } from '@/app/features/team/teamRoster'
import GrowthPlanView from '@/app/features/plan/components/GrowthPlanView'
import type { ContentLink } from '@/types/contentLink'

/** "vie 1" — weekday and day number, the only two things the row needs. */
function dayLabel(key: string): { weekday: string; day: string } {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return {
    weekday: date.toLocaleDateString('es-PE', { weekday: 'short' }),
    day: String(d),
  }
}

function isToday(key: string): boolean {
  const now = new Date()
  return key === dateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

function isWeekend(key: string): boolean {
  const [y, m, d] = key.split('-').map(Number)
  const dow = new Date(y!, m! - 1, d!).getDay()
  return dow === 0 || dow === 6
}

function creatorName(email: string): string {
  if (!email) return 'alguien'
  return memberFor(email)?.name ?? email.split('@')[0]!
}

/* ------------------------------------------------------------------ */
/* One saved link                                                      */
/* ------------------------------------------------------------------ */

/**
 * Copy-to-clipboard button.
 *
 * Confirms in place for a moment rather than firing a toast: the whole point is
 * to grab an address and leave, and a copy that gives no feedback gets clicked
 * three times because nobody can tell whether it worked.
 */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Older browsers and any non-secure origin reject the clipboard API.
      const el = document.createElement('textarea')
      el.value = value
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
      title={copied ? 'Copiado' : 'Copiar enlace'}
      className={`shrink-0 rounded p-1 transition-colors hover:bg-background-secondary ${
        copied ? 'text-success' : 'text-text-tertiary hover:text-primary'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function LinkRow({
  link,
  onSave,
  onDelete,
}: {
  link: ContentLink
  onSave: (fields: { label: string; url: string }) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState(link.label ?? '')
  const [urlDraft, setUrlDraft] = useState(link.url)

  function reset() {
    setLabelDraft(link.label ?? '')
    setUrlDraft(link.url)
  }

  function commit() {
    const url = urlDraft.trim()
    const label = labelDraft.trim()
    setEditing(false)
    // An empty address would leave a row pointing nowhere; a label may be blank.
    if (!url || (url === link.url && label === (link.label ?? ''))) {
      reset()
      return
    }
    onSave({ label, url })
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
        <input
          autoFocus
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { reset(); setEditing(false) }
          }}
          placeholder="Qué es"
          aria-label="Editar etiqueta"
          className="w-full rounded border border-primary bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-40 sm:shrink-0"
        />
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { reset(); setEditing(false) }
          }}
          placeholder="Enlace de Drive"
          aria-label="Editar enlace"
          className="w-full min-w-0 rounded border border-primary bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    )
  }

  return (
    <div className="group/link flex items-center gap-2">
      {/* Fixed width so labels line up down the page and the addresses start
          at the same place, which is what makes a long list scannable. */}
      <span
        className="w-40 shrink-0 truncate font-sans text-sm font-medium text-text-primary"
        title={link.label || undefined}
      >
        {link.label || <span className="font-normal text-text-tertiary">Sin etiqueta</span>}
      </span>

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-secondary hover:underline"
        title={link.url}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{link.url}</span>
      </a>

      {/* Always visible, unlike Editar/Eliminar — copying is the common action
          and should not require hunting for a control that appears on hover. */}
      <CopyButton value={link.url} />

      <button
        type="button"
        onClick={() => { reset(); setEditing(true) }}
        className="shrink-0 rounded px-1.5 py-0.5 font-sans text-xs text-text-tertiary opacity-0 transition-opacity hover:bg-background-secondary group-hover/link:opacity-100 focus:opacity-100"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Eliminar enlace"
        title="Eliminar"
        className="shrink-0 rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-background-secondary hover:text-error group-hover/link:opacity-100 focus:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* One day                                                             */
/* ------------------------------------------------------------------ */

function DayRow({
  dateKeyValue,
  links,
  onAdd,
  onSave,
  onDelete,
}: {
  dateKeyValue: string
  links: ContentLink[]
  onAdd: (fields: { label: string; url: string }) => Promise<void>
  onSave: (link: ContentLink, fields: { label: string; url: string }) => void
  onDelete: (link: ContentLink) => void
}) {
  const [labelDraft, setLabelDraft] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const { weekday, day } = dayLabel(dateKeyValue)
  const today = isToday(dateKeyValue)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const url = draft.trim()
    // The address is what makes the row worth saving; the label is a courtesy
    // to whoever reads it next, so it is never required.
    if (!url || busy) return
    setBusy(true)
    try {
      await onAdd({ label: labelDraft.trim(), url })
      setDraft('')
      setLabelDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start md:gap-4 md:px-5 ${
        today ? 'bg-primary/5' : isWeekend(dateKeyValue) ? 'bg-background-secondary/30' : ''
      }`}
    >
      {/* Date — fixed width so every link lines up down the page. */}
      <div className="flex w-20 shrink-0 items-baseline gap-2 md:w-24">
        <span
          className={`font-serif text-xl leading-none ${
            today ? 'text-primary' : 'text-text-primary'
          }`}
        >
          {day}
        </span>
        <span className="font-sans text-xs uppercase tracking-wide text-text-tertiary">
          {weekday.replace('.', '')}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {links.map((link) => (
          <div key={link.id}>
            <LinkRow
              link={link}
              onSave={(fields) => onSave(link, fields)}
              onDelete={() => onDelete(link)}
            />
            <p className="font-serif text-[11px] font-light italic text-text-tertiary">
              {creatorName(link.createdByEmail)}
            </p>
          </div>
        ))}

        {/* Always one empty box, so adding a second link to a day needs no
            extra button — you just fill the next one. */}
        <form onSubmit={submit} className="flex items-start gap-1.5">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={`Guardar enlace para el ${day}`}
            className="mt-1 shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Two fields, same widths as a saved row, so it is obvious which
              box becomes which column once saved. */}
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Qué es (ej. Reel casa Castilla)"
              aria-label={`Etiqueta del contenido para el ${day}`}
              disabled={busy}
              className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50 sm:w-40 sm:shrink-0"
            />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={links.length ? 'Añadir otro enlace de Drive…' : 'Pega el enlace de Drive…'}
              aria-label={`Añadir enlace para el ${day}`}
              disabled={busy}
              className="w-full min-w-0 bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
            />
          </div>
        </form>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** The two things this tab holds: what to do, and where the assets live. */
type View = 'plan' | 'calendario'

export default function ContentCalendarPage() {
  // Defaults to the plan — the daily question is "what do I do today", and the
  // calendar is reference material you go looking for.
  const [view, setView] = useState<View>('plan')

  useSetPageMeta({
    title: 'Contenido',
    subtitle:
      view === 'plan'
        ? 'Qué hacer hoy para crecer.'
        : 'Dónde vive el contenido de cada día.',
    accessArea: 'marketing',
  })

  const { user } = useAuthStore()
  const email = user?.email?.toLowerCase() ?? ''

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { byDate, isLoading, error } = useContentLinks(year, month)
  const days = useMemo(() => daysInMonth(year, month), [year, month])

  // es-PE gives "agosto de 2026". Tailwind's `capitalize` would upper-case
  // every word — "Agosto De 2026" — so capitalise only the first letter.
  const rawMonth = new Date(year, month, 1).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  })
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  function report(action: () => Promise<void>, failure: string) {
    void action().catch((err) => {
      console.error(failure, err)
      toast.error(failure)
    })
  }

  const filledDays = days.filter((d) => (byDate[d]?.length ?? 0) > 0).length

  return (
    <div className="space-y-4">
      {/* Plan / Calendario — one tab, two jobs, deliberately not merged. */}
      <div
        role="tablist"
        aria-label="Vista"
        className="inline-flex gap-1 rounded-lg bg-background-secondary p-1"
      >
        {(['plan', 'calendario'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[1px] transition-colors ${
              view === v
                ? 'bg-white text-text-primary shadow-light'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {v === 'plan' ? 'Plan' : 'Calendario'}
          </button>
        ))}
      </div>

      {view === 'plan' && <GrowthPlanView />}

      {view === 'calendario' && (
      <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-background-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[11rem] text-center font-serif text-[22px] text-text-primary">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-background-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <span className="shrink-0 whitespace-nowrap font-sans text-xs text-text-tertiary">
          {filledDays} de {days.length} días con contenido
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-light">
          <ul className="divide-y divide-border">
            {days.map((d) => (
              <DayRow
                key={d}
                dateKeyValue={d}
                links={byDate[d] ?? []}
                onAdd={({ label, url }) =>
                  contentLinkService.create({
                    date: d,
                    label,
                    url,
                    createdByEmail: email,
                  })
                }
                onSave={(link, fields) =>
                  report(
                    () => contentLinkService.update(link.id, fields),
                    'No se pudo guardar el enlace',
                  )
                }
                onDelete={(link) =>
                  report(
                    () => contentLinkService.remove(link.id),
                    'No se pudo eliminar el enlace',
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}
      </>
      )}
    </div>
  )
}
