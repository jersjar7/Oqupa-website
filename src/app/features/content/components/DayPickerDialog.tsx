import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Spinner } from '@/app/components/ui'
import { useContentLinks, dateKey } from '@/hooks/useContentLinks'
import type { ContentLink } from '@/types/contentLink'

/**
 * Pick a day for a piece of material, with the month laid out as a grid and
 * every day showing what is ALREADY on it.
 *
 * WHY A GRID AND NOT A PLAIN DATE FIELD (Jerson, 2026-08-08). A date field asks
 * you to choose blind: you type the 14th and only discover afterwards that
 * three reels are already stacked there. Publishing decisions are about
 * spacing, so the thing you need while choosing is exactly what a bare field
 * hides.
 *
 * READ-ONLY BY DESIGN. The cells show what is scheduled but nothing here edits
 * it. A dialog you opened to answer "which day?" should not also be a place
 * where a stray click renames someone else's reel.
 *
 * The week starts on SUNDAY: `new Intl.Locale('es-PE').getWeekInfo()` reports
 * firstDay 7 with the weekend on Saturday and Sunday. Hardcoded from that
 * verified value rather than called at runtime, because getWeekInfo is still
 * missing in some browsers and a silent fallback would shift the whole grid by
 * a day — a bug nobody would report, they would just mis-schedule things.
 */

/** Sunday-first, matching es-PE. */
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function monthTitle(year: number, month: number): string {
  const raw = new Date(year, month, 1).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/**
 * The cells for a month grid: leading blanks so the 1st lands under its real
 * weekday, then every day of the month.
 */
function gridCells(year: number, month: number): (string | null)[] {
  const leading = new Date(year, month, 1).getDay() // 0 = Sunday, matches WEEKDAYS
  const count = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: count }, (_, i) => dateKey(year, month, i + 1)),
  ]
}

function labelOf(link: ContentLink): string {
  return link.label?.trim() || 'Sin etiqueta'
}

export default function DayPickerDialog({
  open,
  itemLabel,
  currentDate,
  onPick,
  onClose,
}: {
  open: boolean
  /** What is being scheduled, so the dialog says what it is deciding about. */
  itemLabel: string
  /** The day it already sits on, if any — highlighted so a move is obvious. */
  currentDate?: string | null
  onPick: (date: string) => void
  onClose: () => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Opening on the month the item is already on, when it has one — otherwise
  // moving something from March means three clicks before you can even see it.
  useEffect(() => {
    if (!open) return
    const [y, m] = (currentDate ?? '').split('-').map(Number)
    if (y && m) {
      setYear(y)
      setMonth(m - 1)
    } else {
      setYear(today.getFullYear())
      setMonth(today.getMonth())
    }
    // Deliberately keyed on `open` alone: re-running when the date changes
    // would yank the month back mid-navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const { byDate, isLoading } = useContentLinks(year, month)
  const cells = useMemo(() => gridCells(year, month), [year, month])
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

  if (!open) return null

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Elegir día para ${itemLabel}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Elegir día
            </p>
            <p className="truncate font-serif text-lg text-text-primary" title={itemLabel}>
              {itemLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-background-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex items-center justify-center gap-1 px-4 py-3 md:px-5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Mes anterior"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-background-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="min-w-[11rem] text-center font-serif text-[20px] text-text-primary">
            {monthTitle(year, month)}
          </h3>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Mes siguiente"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-background-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="pb-1 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-text-tertiary"
              >
                {w}
              </div>
            ))}

            {cells.map((key, i) => {
              if (!key) return <div key={`blank-${i}`} />

              const links = byDate[key] ?? []
              const dayNum = Number(key.slice(-2))
              const isTodayCell = key === todayKey
              const isCurrent = key === currentDate

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPick(key)}
                  aria-label={
                    links.length
                      ? `${dayNum}, ${links.length} ya programado${links.length > 1 ? 's' : ''}`
                      : `${dayNum}, libre`
                  }
                  className={`flex min-h-[62px] flex-col items-stretch gap-0.5 rounded-lg border p-1 text-left transition-colors sm:min-h-[76px] ${
                    isCurrent
                      ? 'border-primary bg-primary/10'
                      : isTodayCell
                        ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                        : 'border-border bg-white hover:border-primary hover:bg-background-secondary'
                  }`}
                >
                  <span
                    className={`font-serif text-sm leading-none ${
                      isTodayCell || isCurrent ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Labels are the whole point — they are what a plain date
                      field cannot show. Hidden on the narrowest screens where
                      seven columns leave no room for words; the count dot still
                      says the day is taken. */}
                  <span className="hidden flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                    {links.slice(0, 2).map((l) => (
                      <span
                        key={l.id}
                        title={labelOf(l)}
                        className="truncate rounded bg-secondary/10 px-1 text-[10px] leading-4 text-secondary"
                      >
                        {labelOf(l)}
                      </span>
                    ))}
                    {links.length > 2 && (
                      <span className="px-1 text-[10px] leading-4 text-text-tertiary">
                        +{links.length - 2} más
                      </span>
                    )}
                  </span>

                  {links.length > 0 && (
                    <span className="mt-auto flex gap-0.5 sm:hidden" aria-hidden="true">
                      <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                      {links.length > 1 && (
                        <span className="text-[9px] leading-none text-text-tertiary">
                          {links.length}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          )}

          <p className="pt-3 font-serif text-xs font-light italic text-text-tertiary">
            Toca un día para programar. Lo que ya está en cada día se muestra solo como
            referencia; desde aquí no se edita.
          </p>
        </div>
      </div>
    </div>
  )
}
