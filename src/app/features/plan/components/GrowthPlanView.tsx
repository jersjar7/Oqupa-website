import { useEffect, useState } from 'react'
import { Check, ChevronDown, Clock, Target } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { useGrowthPlan, todayKey, type PlanWeek } from '@/hooks/useGrowthPlan'
import { growthPlanService } from '@/services/growthPlanService'
import type { GrowthPlanDay } from '@/types/growthPlan'

const PLAN_GOAL =
  'One listing and one interested buyer that nobody on the team recruited.'

function weekdayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function report(action: () => Promise<void>, failure: string) {
  void action().catch((err) => {
    console.error(failure, err)
    toast.error(failure)
  })
}

/* ------------------------------------------------------------------ */
/* Notes — saved on blur, so typing never fights a network round-trip  */
/* ------------------------------------------------------------------ */

function NotesField({ day }: { day: GrowthPlanDay }) {
  const [draft, setDraft] = useState(day.notes)

  // Keep in step when another device edits the same day.
  useEffect(() => setDraft(day.notes), [day.notes])

  function commit() {
    const next = draft.trim()
    if (next === day.notes) return
    report(
      () => growthPlanService.setNotes(day.date, next),
      'Could not save the note.',
    )
  }

  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      rows={2}
      placeholder="How it went…"
      aria-label={`Notes for day ${day.day}`}
      className="w-full resize-y rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
    />
  )
}

/* ------------------------------------------------------------------ */
/* One day                                                             */
/* ------------------------------------------------------------------ */

function DayRow({ day, isToday }: { day: GrowthPlanDay; isToday: boolean }) {
  const [open, setOpen] = useState(isToday)
  const { user } = useAuthStore()
  const email = user?.email?.toLowerCase() ?? ''
  const done = day.status === 'done'
  const skipped = day.status === 'skipped'

  function toggle() {
    report(
      () =>
        growthPlanService.setStatus(
          day.date,
          done ? 'pending' : 'done',
          email,
        ),
      'Could not update the day.',
    )
  }

  return (
    <li
      className={`border-t border-border first:border-t-0 ${
        isToday ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3 md:px-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={done ? `Mark day ${day.day} not done` : `Mark day ${day.day} done`}
          aria-pressed={done}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            done
              ? 'border-primary bg-primary text-white'
              : 'border-border text-transparent hover:border-primary'
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Day {day.day}
            </span>
            <span className="font-sans text-[11px] uppercase tracking-wide text-text-tertiary">
              {weekdayLabel(day.date)}
            </span>
            {isToday && (
              <span className="rounded bg-primary px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white">
                Today
              </span>
            )}
          </div>

          <p
            className={`mt-1 text-sm leading-snug ${
              done || skipped
                ? 'text-text-tertiary line-through'
                : 'text-text-primary'
            }`}
          >
            {day.action}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 font-sans text-[11px] text-text-tertiary">
              <Clock className="h-3 w-3" />
              {day.minutes} min
            </span>
            <span className="font-sans text-[11px] uppercase tracking-wide text-text-tertiary">
              {day.category}
            </span>
            {day.spend > 0 && (
              <span className="font-sans text-[11px] text-text-tertiary">
                ${day.spend}
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex items-center gap-0.5 font-sans text-[11px] text-primary hover:underline"
            >
              {open ? 'Less' : 'Why & done when'}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {open && (
            <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                {day.why}
              </p>
              <p className="text-[13px] leading-relaxed text-text-primary">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
                  Done when
                </span>
                <br />
                {day.doneWhen}
              </p>
              <NotesField day={day} />
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* One week                                                            */
/* ------------------------------------------------------------------ */

function WeekSection({ week, today }: { week: PlanWeek; today: string }) {
  const [open, setOpen] = useState(week.isCurrent)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background-secondary/40 md:px-5"
      >
        <span className="font-serif text-lg text-text-primary">
          Week {week.week}
        </span>
        <span className="min-w-0 flex-1 truncate font-sans text-xs uppercase tracking-wide text-text-tertiary">
          {week.theme}
        </span>
        <span className="shrink-0 font-sans text-xs tabular-nums text-text-tertiary">
          {week.doneCount}/{week.days.length}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <ul className="border-t border-border">
          {week.days.map((d) => (
            <DayRow key={d.date} day={d} isToday={d.date === today} />
          ))}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* The view                                                            */
/* ------------------------------------------------------------------ */

export default function GrowthPlanView() {
  const { days, weeks, today, doneCount, isLoading, error } = useGrowthPlan()
  const key = todayKey()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl border border-border bg-background p-6 text-sm text-text-secondary">
        {error}
      </p>
    )
  }

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-background p-6 text-sm text-text-secondary">
        The plan has not been loaded yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* The goal, stated once, at the top — everything else serves it. */}
      <div className="rounded-xl border border-border bg-background p-4 md:p-5">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Six-week goal
            </p>
            <p className="mt-1 font-serif text-lg leading-snug text-text-primary">
              {PLAN_GOAL}
            </p>
          </div>
          <span className="shrink-0 font-sans text-sm tabular-nums text-text-secondary">
            {doneCount}/{days.length}
          </span>
        </div>
      </div>

      {/* Today, pulled out — the page exists to answer "what do I do now". */}
      {today && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-primary">
            Today · Day {today.day} · {today.minutes} min
          </p>
          <p className="mt-1.5 text-[15px] leading-snug text-text-primary">
            {today.action}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
              Done when
            </span>
            <br />
            {today.doneWhen}
          </p>
        </div>
      )}

      {weeks.map((w) => (
        <WeekSection key={w.week} week={w} today={key} />
      ))}
    </div>
  )
}
