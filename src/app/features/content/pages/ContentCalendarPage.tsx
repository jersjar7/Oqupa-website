import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Trash2 } from 'lucide-react'
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

function LinkRow({
  link,
  onSave,
  onDelete,
}: {
  link: ContentLink
  onSave: (url: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(link.url)

  function commit() {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === link.url) {
      setDraft(link.url)
      return
    }
    onSave(next)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(link.url); setEditing(false) }
        }}
        aria-label="Editar enlace"
        className="w-full rounded border border-primary bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    )
  }

  return (
    <div className="group/link flex items-center gap-2">
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

      <button
        type="button"
        onClick={() => { setDraft(link.url); setEditing(true) }}
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
  onAdd: (url: string) => Promise<void>
  onSave: (link: ContentLink, url: string) => void
  onDelete: (link: ContentLink) => void
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const { weekday, day } = dayLabel(dateKeyValue)
  const today = isToday(dateKeyValue)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const url = draft.trim()
    if (!url || busy) return
    setBusy(true)
    try {
      await onAdd(url)
      setDraft('')
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
              onSave={(url) => onSave(link, url)}
              onDelete={() => onDelete(link)}
            />
            <p className="font-serif text-[11px] font-light italic text-text-tertiary">
              {creatorName(link.createdByEmail)}
            </p>
          </div>
        ))}

        {/* Always one empty box, so adding a second link to a day needs no
            extra button — you just fill the next one. */}
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={`Guardar enlace para el ${day}`}
            className="shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={links.length ? 'Añadir otro enlace…' : 'Pega el enlace de Drive…'}
            aria-label={`Añadir enlace para el ${day}`}
            disabled={busy}
            className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
          />
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
                onAdd={(url) =>
                  contentLinkService.create({
                    date: d,
                    url,
                    createdByEmail: email,
                  })
                }
                onSave={(link, url) =>
                  report(
                    () => contentLinkService.updateUrl(link.id, url),
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
