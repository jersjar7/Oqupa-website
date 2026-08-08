import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { useContentLinks, useShelvedLinks, dateKey, daysInMonth } from '@/hooks/useContentLinks'
import UnscheduledShelf from '@/app/features/content/components/UnscheduledShelf'
import DayPickerDialog from '@/app/features/content/components/DayPickerDialog'
import { FIELD_BOX, LABEL_FIELD_WIDTH } from '@/app/features/content/components/fieldStyles'
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


/**
 * "hecho el 5 de agosto" — when a piece of material was finished.
 *
 * Only shown on the shelf. On the calendar the row already sits under its day,
 * so the made-on date would be noise; on the shelf it is the only time
 * information there is, and it is what tells you something has been waiting.
 * No new field needed — every link has always recorded when it was created.
 */
function madeOn(created: Date): string {
  return `hecho el ${created.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}`
}

/** "14 de agosto" from a date key — built locally, never through UTC. */
function humanDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
  })
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          className={`${FIELD_BOX} ${LABEL_FIELD_WIDTH} border-primary`}
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
          className={`${FIELD_BOX} w-full min-w-0 flex-1 border-primary`}
        />
      </div>
    )
  }

  return (
    <div className="group/link flex items-center gap-2">
      {/* Its own box, same width as the field that created it, so a saved row
          reads as the same two things the form asked for. Fixed width also
          means labels line up and every address starts at the same place. */}
      <span
        className="w-44 shrink-0 truncate rounded-md bg-background-secondary px-2 py-1 font-sans text-sm font-medium text-text-primary"
        title={link.label || undefined}
      >
        {link.label || <span className="font-normal text-text-tertiary">Sin etiqueta</span>}
      </span>

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm text-secondary hover:border-border hover:underline"
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

          {/* Two boxed fields, same widths as a saved row, so it is obvious
              which box becomes which column once saved. */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Qué es"
              aria-label={`Etiqueta del contenido para el ${day}`}
              disabled={busy}
              className={`${FIELD_BOX} ${LABEL_FIELD_WIDTH}`}
            />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={links.length ? 'Añadir otro enlace de Drive…' : 'Pega el enlace de Drive…'}
              aria-label={`Añadir enlace para el ${day}`}
              disabled={busy}
              className={`${FIELD_BOX} w-full min-w-0 flex-1`}
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

/**
 * Three views. Calendario and Sin programar are two halves of the same job —
 * where the assets live — so they share a toggle on the left. Plan is a
 * different job entirely, so it sits apart on the right rather than pretending
 * to be a third option in the same group.
 */
type View = 'plan' | 'calendario' | 'sin-programar'

export default function ContentCalendarPage() {
  // Defaults to the plan — the daily question is "what do I do today", and the
  // calendar is reference material you go looking for.
  const [view, setView] = useState<View>('plan')

  useSetPageMeta({
    title: 'Contenido',
    subtitle:
      view === 'plan'
        ? 'Qué hacer hoy para crecer.'
        : view === 'sin-programar'
          ? 'Material listo, todavía sin fecha de publicación.'
          : 'Dónde vive el contenido de cada día.',
    accessArea: 'marketing',
  })

  const { user } = useAuthStore()
  const email = user?.email?.toLowerCase() ?? ''

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { byDate, isLoading, error } = useContentLinks(year, month)
  // Not scoped to the month on purpose — material made in July is exactly what
  // gets lost if the shelf hides behind month navigation.
  const { shelved, isLoading: shelfLoading, error: shelfError } = useShelvedLinks()
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

  // Which item the day picker is open for. Held here rather than inside the
  // shelf so the same dialog can later be opened from a calendar row too.
  const [scheduling, setScheduling] = useState<ContentLink | null>(null)

  function assign(link: ContentLink, date: string) {
    setScheduling(null)
    report(async () => {
      await contentLinkService.setDate(link.id, date)
      // Confirms where it went. Without this the row simply vanishes from the
      // shelf and it is not obvious anything succeeded.
      toast.success(`Programado para el ${humanDay(date)}`)
    }, 'No se pudo programar el contenido')
  }

  const filledDays = days.filter((d) => (byDate[d]?.length ?? 0) > 0).length

  return (
    // `<main>` in the shell carries no horizontal padding — each page supplies
    // its own. This one had none, so the tabs, the Plan button and every row
    // sat flush against the window edge. Matches TeamBoardPage.
    <div className="space-y-4 p-4 md:p-6">
      {/* Left: the two halves of "where the assets live". Right: the plan,
          which is a different job and is kept visually apart from the pair. */}
      <div className="flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Vista del contenido"
          className="inline-flex gap-1 rounded-lg bg-background-secondary p-1"
        >
          {(['calendario', 'sin-programar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[1px] transition-colors ${
                view === v
                  ? 'bg-white text-text-primary shadow-light'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {v === 'calendario' ? 'Calendario' : 'Sin programar'}
              {/* The count rides on the tab so material waiting to be
                  scheduled is visible without opening the view — the thing a
                  separate tab would otherwise hide. */}
              {v === 'sin-programar' && shelved.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-primary">
                  {shelved.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-pressed={view === 'plan'}
          onClick={() => setView('plan')}
          className={`shrink-0 rounded-lg px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[1px] transition-colors ${
            view === 'plan'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Plan
        </button>
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

      {view === 'sin-programar' && (
        <UnscheduledShelf
          shelved={shelved}
          isLoading={shelfLoading}
          error={shelfError}
          renderRow={(link) => (
            <>
              <LinkRow
                link={link}
                onSave={(fields) =>
                  report(
                    () => contentLinkService.update(link.id, fields),
                    'No se pudo guardar el enlace',
                  )
                }
                onDelete={() =>
                  report(
                    () => contentLinkService.remove(link.id),
                    'No se pudo eliminar el enlace',
                  )
                }
              />
              <p className="font-serif text-[11px] font-light italic text-text-tertiary">
                {creatorName(link.createdByEmail)} · {madeOn(link.createdAt)}
              </p>
            </>
          )}
          onAdd={({ label, url }) =>
            contentLinkService.create({
              date: null,
              label,
              url,
              createdByEmail: email,
            })
          }
          onSchedule={setScheduling}
        />
      )}

      <DayPickerDialog
        open={scheduling !== null}
        itemLabel={scheduling?.label?.trim() || scheduling?.url || ''}
        currentDate={scheduling?.date ?? null}
        onPick={(date) => scheduling && assign(scheduling, date)}
        onClose={() => setScheduling(null)}
      />
    </div>
  )
}
