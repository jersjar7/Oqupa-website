import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Minimize2, Plus, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { useTeamTasks } from '@/hooks/useTeamTasks'
import { teamTaskService } from '@/services/teamTaskService'
import type { TaskPriority, TeamTask } from '@/types/teamTask'
import { PRIORITIES, PRIORITY_LABELS, priorityOf } from '@/app/features/team/taskOrder'
import {
  memberFor,
  membersOf,
  TEAM_MEMBERS,
  type TeamMember,
} from '@/app/features/team/teamRoster'

/**
 * Only the dev board exists today. `TeamId` is still carried on every task so a
 * second board can be added later without migrating documents.
 */
const BOARD = 'dev' as const
/** Must match the ceiling in firestore.rules (teamTasks title.size()). The
 *  client stops you before Firestore does, so a rejection never has to
 *  explain itself. Raised 500 -> 1000 on 2026-08-25 after a real task was
 *  refused at 500 with only a generic "could not add" toast. */
const MAX_TASK_TITLE = 1000
/** Must match firestore.rules (teamTasks description.size()). */
const MAX_TASK_DESCRIPTION = 5000

/**
 * A textarea that grows with its content instead of scrolling sideways.
 *
 * These fields hold real notes, not one-line titles — a 700-character task is
 * normal here — and a single-line input made them impossible to read back
 * while writing. Enter submits (the habit everyone already has on this
 * board); Shift+Enter starts a new line.
 */
function GrowingTextarea({
  value,
  onChange,
  onSubmit,
  onCancel,
  autoFocus,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  onCancel?: () => void
  autoFocus?: boolean
  placeholder?: string
  ariaLabel: string
  disabled?: boolean
  className: string
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  // Re-measure on every value change, including when the field is cleared
  // after a submit — otherwise the box keeps the height of the text just sent.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onSubmit()
        }
        if (e.key === 'Escape' && onCancel) onCancel()
      }}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      maxLength={MAX_TASK_TITLE}
      className={`${className} resize-none overflow-hidden`}
    />
  )
}


/**
 * Spanish relative time: "hace un momento", "hace 5 min", "hace 2 h",
 * "hace 3 días", then an absolute date once it stops being useful.
 *
 * The previous version used a short month name, so a task created today
 * rendered as "1 ago." — correct Spanish for "1 de agosto", but it reads as
 * the English word "ago" and tells you nothing about how recent it is. The
 * question on this board is always "how long has this been sitting there",
 * which is what relative time answers.
 */
function formatStamp(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (seconds < 45) return 'hace un momento'
  if (seconds < 3600) {
    const m = Math.round(seconds / 60)
    return `hace ${m} min`
  }
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600)
    return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`
  }
  if (seconds < 86400 * 7) {
    const d = Math.round(seconds / 86400)
    return `hace ${d} ${d === 1 ? 'día' : 'días'}`
  }
  // Older than a week: the exact date is more useful than "hace 23 días".
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
  })
}

/** First name of whoever created a task, for "Creado por Sarah". */
function creatorName(email: string): string {
  if (!email) return 'alguien'
  const member = TEAM_MEMBERS.find(
    (m) => m.email.toLowerCase() === email.toLowerCase(),
  )
  // Roster name first; otherwise the part before @, which is still more use
  // than a full address squeezed under a task title.
  return member ? member.name.split(' ')[0]! : email.split('@')[0]!
}


/**
 * Task title that can be edited in place. Click it, type, Enter saves, Escape
 * cancels, clicking away saves. Editing the wording was the one operation the
 * board could not do — the service supported renaming, nothing exposed it, so
 * a typo meant deleting the task and retyping it.
 */
function EditableTitle({
  title,
  done,
  onRename,
  className,
  clampLines,
}: {
  title: string
  done?: boolean
  onRename: (next: string) => Promise<void> | void
  className: string
  /** Lines shown before the text is cut with an expand chevron. */
  clampLines: 2 | 3
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [expanded, setExpanded] = useState(false)
  const [clipped, setClipped] = useState(false)
  const textRef = useRef<HTMLSpanElement | null>(null)

  // Whether the chevron is warranted can only be known after layout — and it
  // changes when the column is resized or the task is edited, so this re-runs
  // on both. Without the check every one-line task would carry a dead control.
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    const measure = () =>
      setClipped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [title, expanded, clampLines])

  async function commit() {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === title) {
      setDraft(title)   // empty or unchanged — never blank out a task
      return
    }
    await onRename(next)
  }

  if (editing) {
    return (
      <span onBlur={() => void commit()} className="block">
      <GrowingTextarea
        autoFocus
        value={draft}
        onChange={setDraft}
        onSubmit={() => void commit()}
        onCancel={() => { setDraft(title); setEditing(false) }}
        ariaLabel="Editar tarea"
        className={`${className} w-full rounded border border-primary bg-white px-1 focus:outline-none focus:ring-2 focus:ring-primary/20`}
      />
      </span>
    )
  }

  const clampClass =
    expanded ? '' : clampLines === 2 ? 'line-clamp-2' : 'line-clamp-3'

  return (
    <div className="flex items-start gap-1">
      <button
        type="button"
        onClick={() => { setDraft(title); setEditing(true) }}
        title="Clic para editar"
        className={`${className} min-w-0 flex-1 cursor-text rounded px-1 text-left hover:bg-background-secondary/60 ${
          done ? 'text-text-tertiary line-through' : ''
        }`}
      >
        <span ref={textRef} className={`block whitespace-pre-wrap ${clampClass}`}>
          {title}
        </span>
      </button>
      {(clipped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Mostrar menos' : 'Mostrar todo'}
          aria-expanded={expanded}
          title={expanded ? 'Mostrar menos' : 'Mostrar todo'}
          className="mt-0.5 shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:bg-background-secondary/60 hover:text-primary"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  )
}

/**
 * The column row.
 *
 * Minimized columns always collect into a single stack occupying the FIRST
 * slot, so folding one away never reshuffles the rest. What is left takes the
 * space to the right: a lone open column fills it, two or more keep a
 * comfortable fixed width and the row scrolls sideways rather than squeezing
 * them — a column narrow enough to fit four on a laptop is too narrow to read
 * a real task in.
 */
function BoardColumns({
  members,
  minimized,
  onExpand,
  activeCountFor,
  renderColumn,
}: {
  members: TeamMember[]
  minimized: Set<string>
  onMinimize: (email: string) => void
  onExpand: (email: string) => void
  activeCountFor: (email: string) => number
  renderColumn: (member: TeamMember) => React.ReactNode
}) {
  const open = members.filter((m) => !minimized.has(m.email))
  const folded = members.filter((m) => minimized.has(m.email))
  const soleOpen = open.length === 1

  const stack = folded.length > 0 && (
    <div className="flex w-full shrink-0 flex-col gap-2 md:w-72">
      {folded.map((m) => (
        <MinimizedColumn
          key={m.email}
          member={m}
          activeCount={activeCountFor(m.email)}
          onExpand={() => onExpand(m.email)}
        />
      ))}
    </div>
  )

  // Everything folded: the stack is the whole board, in the first slot.
  if (open.length === 0) {
    return <div className="flex gap-4">{stack}</div>
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {stack}
      {open.map((member) => (
        <div
          key={member.email}
          className={
            soleOpen
              ? 'min-w-0 flex-1'
              : 'w-[22rem] shrink-0'
          }
        >
          {renderColumn(member)}
        </div>
      ))}
    </div>
  )
}

/**
 * Which columns this person keeps folded away, remembered in their browser.
 *
 * Per person and per device on purpose: how you like the board arranged is
 * not something to impose on the other three.
 */
function useMinimizedColumns(currentEmail: string | null) {
  const key = `oqupa_team_minimized_${BOARD}_${currentEmail ?? 'anon'}`
  const [minimized, setMinimized] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key)
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set<string>()   // private mode, cleared storage — start open
    }
  })

  const update = useCallback(
    (next: Set<string>) => {
      setMinimized(next)
      try {
        localStorage.setItem(key, JSON.stringify([...next]))
      } catch {
        // Storage unavailable: the board still works, it just forgets.
      }
    },
    [key]
  )

  return [minimized, update] as const
}

/* ------------------------------------------------------------------ */
/* A minimized column — just the name and how much is on that plate     */
/* ------------------------------------------------------------------ */

function MinimizedColumn({
  member,
  activeCount,
  onExpand,
}: {
  member: TeamMember
  activeCount: number
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Abrir la columna de ${member.name}`}
      title="Abrir"
      className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-left shadow-light transition-colors hover:border-primary/40 hover:bg-background-secondary/40"
    >
      <span className="truncate font-sans text-sm font-medium uppercase tracking-wide text-secondary">
        {member.name}
      </span>
      <span className="shrink-0 font-sans text-xs text-text-tertiary">
        {activeCount} en curso
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Priority and details (meeting of 2026-11-05)                        */
/* ------------------------------------------------------------------ */

/** "ALTA" next to a task that should be taken first. */
function AltaPill() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-primary/15 px-2 py-0.5 font-sans text-[10.5px] font-medium uppercase tracking-[0.5px] text-text-primary">
      Alta
    </span>
  )
}

function PrioritySelect({ task, onChange }: { task: TeamTask; onChange: (p: TaskPriority) => void }) {
  return (
    <select
      value={priorityOf(task)}
      aria-label={`Prioridad de "${task.title}"`}
      onChange={(e) => onChange(e.target.value as TaskPriority)}
      className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-1.5 font-sans text-xs text-text-secondary md:flex-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {PRIORITY_LABELS[p]}
        </option>
      ))}
    </select>
  )
}

/**
 * The longer explanation under a title — what the task means and how to do it —
 * so whoever picks it up does not have to guess what a one-line title meant.
 */
function TaskDetails({ task, onSave }: { task: TeamTask; onSave: (description: string) => void }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.description ?? '')
  const has = !!task.description?.trim()

  function save() {
    const next = draft.trim()
    setEditing(false)
    if (next !== (task.description ?? '').trim()) onSave(next)
    setOpen(!!next)
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          autoFocus
          rows={4}
          value={draft}
          maxLength={MAX_TASK_DESCRIPTION}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(task.description ?? '')
              setEditing(false)
            }
          }}
          aria-label={`Detalles de "${task.title}"`}
          placeholder="Qué significa, por qué importa y cómo hacerlo…"
          className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setDraft(task.description ?? ''); setEditing(false) }}
            className="rounded-lg px-3 py-1.5 font-sans text-xs text-text-secondary hover:bg-background-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-secondary px-3 py-1.5 font-sans text-xs font-medium text-white hover:bg-secondary-hover"
          >
            Guardar detalles
          </button>
        </div>
      </div>
    )
  }

  if (!has) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(''); setEditing(true) }}
        className="mt-1 font-sans text-xs text-text-tertiary hover:text-secondary"
      >
        Añadir detalles
      </button>
    )
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-sans text-xs font-medium text-secondary hover:text-secondary-hover"
      >
        Detalles
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg bg-background-secondary/60 px-2.5 py-2">
          <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{task.description}</p>
          <button
            type="button"
            onClick={() => { setDraft(task.description ?? ''); setEditing(true) }}
            className="mt-1 font-sans text-xs text-text-tertiary hover:text-secondary"
          >
            Editar detalles
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Task card (inside a person's column)                                */
/* ------------------------------------------------------------------ */

function TaskCard({
  task,
  onToggleDone,
  onUnassign,
  onDelete,
  onRename,
  onDescription,
}: {
  task: TeamTask
  onToggleDone: () => void
  onUnassign: () => void
  onDelete: () => void
  onRename: (title: string) => void
  onDescription: (d: string) => void
}) {
  const isDone = task.doneAt !== null

  return (
    <div
      className={`group rounded-xl border p-3 transition-colors ${
        isDone ? 'border-border bg-background-secondary/50' : 'border-border bg-white'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onToggleDone}
          aria-label={isDone ? 'Marcar como pendiente' : 'Marcar como terminado'}
          aria-pressed={isDone}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
            isDone
              ? 'border-secondary bg-secondary text-white'
              : 'border-separator text-transparent hover:border-secondary'
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          {!isDone && priorityOf(task) === 'alta' && (
            <div className="mb-1 pl-1"><AltaPill /></div>
          )}
          <EditableTitle
            title={task.title}
            done={isDone}
            onRename={onRename}
            clampLines={3}
            className="w-full break-words text-sm leading-snug text-text-primary"
          />
          <div className="pl-1">
            <TaskDetails task={task} onSave={onDescription} />
          </div>
        </div>

        <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onUnassign}
            aria-label="Devolver a la lista de pendientes"
            title="Devolver a la lista"
            className="rounded-md p-1 text-text-tertiary hover:bg-background-secondary hover:text-text-secondary"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar tarea"
            title="Eliminar"
            className="rounded-md p-1 text-text-tertiary hover:bg-background-secondary hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 pl-[1.9rem] font-serif text-[11px] font-light italic leading-relaxed text-text-tertiary">
        <div>
          Creado por {creatorName(task.createdByEmail)} · {formatStamp(task.createdAt)}
        </div>
        {task.doneAt && <div>Terminado {formatStamp(task.doneAt)}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* One person's column                                                 */
/* ------------------------------------------------------------------ */

function MemberColumn({
  member,
  tasks,
  onAdd,
  onToggleDone,
  onUnassign,
  onDelete,
  onRename,
  onMinimize,
  onDescription,
}: {
  member: TeamMember
  tasks: TeamTask[]
  onMinimize: () => void
  onDescription: (task: TeamTask, d: string) => void
  onAdd: (title: string) => Promise<void>
  onRename: (task: TeamTask, title: string) => void
  onToggleDone: (task: TeamTask) => void
  onUnassign: (task: TeamTask) => void
  onDelete: (task: TeamTask) => void
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  // Finished work stays out of the way until asked for (meeting 2026-11-05):
  // a column used to fill with done tasks that had to be deleted one by one.
  const [showDone, setShowDone] = useState(false)
  const activeCount = tasks.filter((t) => !t.doneAt).length
  const doneCount = tasks.length - activeCount
  const visible = showDone ? tasks : tasks.filter((t) => !t.doneAt)

  // Optional event: the form's onSubmit passes one, the textarea's Enter key
  // calls it directly.
  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const title = draft.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      await onAdd(title)
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white shadow-light">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="truncate font-sans text-sm font-medium uppercase tracking-wide text-secondary">
          {member.name}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-sans text-xs text-text-tertiary">
            {activeCount} en curso
          </span>
          <button
            type="button"
            onClick={onMinimize}
            aria-label={`Minimizar la columna de ${member.name}`}
            title="Minimizar"
            className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-background-secondary/60 hover:text-primary"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <form onSubmit={submit} className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          {/* A real submit button. It used to be a bare icon, which looked
              clickable, did nothing, and left Enter as the only way to add a
              task — the first thing every tester tried and failed. */}
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={`Añadir tarea para ${member.name}`}
            className="shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <GrowingTextarea
            value={draft}
            onChange={setDraft}
            onSubmit={() => void submit()}
            placeholder="Añadir tarea…"
            ariaLabel={`Añadir tarea para ${member.name}`}
            disabled={busy}
            className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
          />
          {draft.length > 0 && (
            <span
              className={`shrink-0 font-sans text-xs tabular-nums ${
                draft.length > MAX_TASK_TITLE - 100
                  ? 'text-error'
                  : 'text-text-tertiary'
              }`}
            >
              {draft.length}/{MAX_TASK_TITLE}
            </span>
          )}
        </div>
      </form>

      {/* Fixed ceiling with internal scroll so one busy column can't stretch
          the whole row and push the TO DO list off the screen. */}
      <div className="max-h-[26rem] min-h-[6rem] space-y-2 overflow-y-auto p-3">
        {visible.length === 0 ? (
          <p className="px-1 py-4 text-center font-sans text-xs text-text-tertiary">
            {tasks.length === 0 ? 'Sin tareas todavía.' : 'Nada en curso.'}
          </p>
        ) : (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleDone={() => onToggleDone(task)}
              onUnassign={() => onUnassign(task)}
              onDelete={() => onDelete(task)}
              onRename={(title) => onRename(task, title)}
              onDescription={(d) => onDescription(task, d)}
            />
          ))
        )}
        {doneCount > 0 && (
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="w-full rounded-lg py-2 font-sans text-xs text-text-tertiary hover:bg-background-secondary/60 hover:text-secondary"
          >
            {showDone ? 'Ocultar terminadas' : `Mostrar terminadas (${doneCount})`}
          </button>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Shared TO DO container (full width, below the columns)              */
/* ------------------------------------------------------------------ */

function TodoContainer({
  now,
  later,
  members,
  currentEmail,
  onAdd,
  onAssign,
  onDelete,
  onRename,
  onPriority,
  onDescription,
}: {
  now: TeamTask[]
  later: TeamTask[]
  members: TeamMember[]
  currentEmail: string | null
  onAdd: (title: string, priority?: TaskPriority) => Promise<void>
  onAssign: (task: TeamTask, email: string) => void
  onDelete: (task: TeamTask) => void
  onRename: (task: TeamTask, title: string) => void
  onPriority: (task: TeamTask, p: TaskPriority) => void
  onDescription: (task: TeamTask, d: string) => void
}) {
  // The signed-in teammate goes first so claiming your own work is the
  // shortest path through the menu.
  const assignOptions = useMemo(() => {
    const mine = members.filter((m) => m.email === currentEmail)
    const others = members.filter((m) => m.email !== currentEmail)
    return [
      ...mine.map((m) => ({ email: m.email, label: `Tomar yo (${m.name})` })),
      ...others.map((m) => ({ email: m.email, label: m.name })),
    ]
  }, [members, currentEmail])

  const rowProps = { assignOptions, onAssign, onDelete, onRename, onPriority, onDescription }

  return (
    <div className="space-y-5">
      <TodoSection
        title="Por hacer"
        tasks={now}
        addLabel="Añadir tarea por hacer"
        placeholder="Añadir algo por hacer…"
        empty="Nada pendiente. Todo está asignado."
        onAdd={(title) => onAdd(title)}
        {...rowProps}
      />
      {/* Meeting 2026-11-05: tech debt, bugs and nice-to-haves live apart, so
          the list above says what matters and this one is never empty-handed. */}
      <TodoSection
        title="Cuando haya tiempo"
        subtitle="Deuda técnica, bugs y mejoras: para cuando termines lo tuyo."
        tasks={later}
        addLabel="Añadir tarea para cuando haya tiempo"
        placeholder="Añadir deuda técnica, un bug o una mejora…"
        empty="Nada aquí todavía."
        onAdd={(title) => onAdd(title, 'luego')}
        {...rowProps}
      />
    </div>
  )
}

function TodoSection({
  title,
  subtitle,
  tasks,
  addLabel,
  placeholder,
  empty,
  onAdd,
  assignOptions,
  onAssign,
  onDelete,
  onRename,
  onPriority,
  onDescription,
}: {
  title: string
  subtitle?: string
  tasks: TeamTask[]
  addLabel: string
  placeholder: string
  empty: string
  onAdd: (title: string) => Promise<void>
  assignOptions: { email: string; label: string }[]
  onAssign: (task: TeamTask, email: string) => void
  onDelete: (task: TeamTask) => void
  onRename: (task: TeamTask, title: string) => void
  onPriority: (task: TeamTask, p: TaskPriority) => void
  onDescription: (task: TeamTask, d: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  // Optional event: the form's onSubmit passes one, the textarea's Enter key
  // calls it directly.
  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const next = draft.trim()
    if (!next || busy) return
    setBusy(true)
    try {
      await onAdd(next)
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label={title} className="rounded-2xl border border-border bg-white shadow-light">
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">{title}</h2>
          {subtitle && <p className="mt-0.5 font-sans text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        <span className="shrink-0 font-sans text-xs text-text-tertiary">
          {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </header>

      <form onSubmit={submit} className="border-b border-border px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={addLabel}
            className="shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          <GrowingTextarea
            value={draft}
            onChange={setDraft}
            onSubmit={() => void submit()}
            placeholder={placeholder}
            ariaLabel={addLabel}
            disabled={busy}
            className="w-full bg-transparent py-1 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
          />
          {draft.length > 0 && (
            <span
              className={`shrink-0 font-sans text-xs tabular-nums ${
                draft.length > MAX_TASK_TITLE - 100 ? 'text-error' : 'text-text-tertiary'
              }`}
            >
              {draft.length}/{MAX_TASK_TITLE}
            </span>
          )}
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="px-4 py-8 text-center font-sans text-sm text-text-tertiary md:px-5">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 px-4 py-3 hover:bg-background-secondary/40 md:flex-row md:items-start md:gap-4 md:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {priorityOf(task) === 'alta' && <span className="mt-0.5"><AltaPill /></span>}
                  <div className="min-w-0 flex-1">
                    <EditableTitle
                      title={task.title}
                      onRename={(next) => onRename(task, next)}
                      clampLines={2}
                      className="w-full break-words text-sm text-text-primary md:text-base"
                    />
                  </div>
                </div>
                <p className="mt-0.5 pl-1 font-serif text-[11px] font-light italic text-text-tertiary">
                  Creado por {creatorName(task.createdByEmail)} · {formatStamp(task.createdAt)}
                </p>
                <div className="pl-1">
                  <TaskDetails task={task} onSave={(d) => onDescription(task, d)} />
                </div>
              </div>

              <div className="flex items-center gap-2 md:shrink-0">
                <PrioritySelect task={task} onChange={(p) => onPriority(task, p)} />
                <select
                  value=""
                  aria-label={`Asignar "${task.title}"`}
                  onChange={(e) => {
                    if (e.target.value) onAssign(task, e.target.value)
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 font-sans text-xs text-text-secondary md:flex-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Asignar a…</option>
                  {assignOptions.map((opt) => (
                    <option key={opt.email} value={opt.email}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onDelete(task)}
                  aria-label="Eliminar tarea"
                  title="Eliminar"
                  className="rounded-md p-1.5 text-text-tertiary hover:bg-background-secondary hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TeamBoardPage() {
  useSetPageMeta({
    title: 'Ing. de Software',
    subtitle: 'Tareas del equipo y en qué trabaja cada quien.',
    accessArea: 'dev',
  })

  const user = useAuthStore((s) => s.user)
  const currentEmail = memberFor(user?.email)?.email ?? null

  const members = useMemo(() => membersOf(BOARD), [])
  const [minimized, setMinimized] = useMinimizedColumns(currentEmail)
  const { now, later, byAssignee, isLoading, error } = useTeamTasks(BOARD)

  // TeamGuard already redirected anyone off-roster; this is the belt-and-braces
  // case where the roster changed mid-session.
  if (!currentEmail) return null

  function report(action: () => Promise<void>, failure: string) {
    action().catch((err) => {
      console.error(failure, err)
      toast.error(failure)
    })
  }

  const setPriority = (task: TeamTask, p: TaskPriority) =>
    report(() => teamTaskService.setPriority(task.id, p), 'No se pudo cambiar la prioridad')
  const setDescription = (task: TeamTask, d: string) =>
    report(() => teamTaskService.setDescription(task.id, d), 'No se pudieron guardar los detalles')

  async function addTo(assigneeEmail: string | null, title: string, priority?: TaskPriority) {
    if (title.length > MAX_TASK_TITLE) {
      toast.error(
        `La tarea es muy larga (${title.length} de ${MAX_TASK_TITLE} caracteres)`
      )
      return
    }
    try {
      await teamTaskService.create({
        title,
        team: BOARD,
        assigneeEmail,
        createdByEmail: currentEmail!,
        ...(priority ? { priority } : {}),
      })
    } catch (err) {
      // Swallowing this is what made a length rejection look like a
      // permissions fault for an afternoon: the toast said nothing and the
      // real Firebase message never reached the console.
      console.error('teamTasks create failed', err)
      toast.error('No se pudo añadir la tarea')
    }
  }

  return (
    // Soft grey behind the board (Jerson 2026-11-06, for readability): the
    // white columns stand out more than on cream. Internal page only.
    <div className="min-h-full space-y-5 bg-board p-4 md:p-6">
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 font-sans text-sm text-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <BoardColumns
            members={members}
            minimized={minimized}
            onMinimize={(email) =>
              setMinimized(new Set([...minimized, email]))
            }
            onExpand={(email) =>
              setMinimized(new Set([...minimized].filter((e) => e !== email)))
            }
            activeCountFor={(email) =>
              (byAssignee[email] ?? []).filter((t) => !t.doneAt).length
            }
            renderColumn={(member) => (
              <MemberColumn
                key={member.email}
                member={member}
                onMinimize={() => setMinimized(new Set([...minimized, member.email]))}
                tasks={byAssignee[member.email] ?? []}
                onAdd={(title) => addTo(member.email, title)}
                onToggleDone={(task) =>
                  report(
                    () => teamTaskService.setDone(task.id, task.doneAt === null),
                    'No se pudo actualizar la tarea',
                  )
                }
                onUnassign={(task) =>
                  report(
                    () => teamTaskService.assign(task.id, null),
                    'No se pudo devolver la tarea',
                  )
                }
                onDelete={(task) =>
                  report(
                    () => teamTaskService.remove(task.id),
                    'No se pudo eliminar la tarea',
                  )
                }
                onRename={(task, title) =>
                  report(
                    () => teamTaskService.rename(task.id, title),
                    'No se pudo renombrar la tarea',
                  )
                }
                onDescription={setDescription}
              />
            )}
          />

          <TodoContainer
            now={now}
            later={later}
            members={members}
            currentEmail={currentEmail}
            onAdd={(title, priority) => addTo(null, title, priority)}
            onAssign={(task, assignee) =>
              report(
                () => teamTaskService.assign(task.id, assignee),
                'No se pudo asignar la tarea',
              )
            }
            onDelete={(task) =>
              report(
                () => teamTaskService.remove(task.id),
                'No se pudo eliminar la tarea',
              )
            }
            onRename={(task, title) =>
              report(
                () => teamTaskService.rename(task.id, title),
                'No se pudo renombrar la tarea',
              )
            }
            onPriority={setPriority}
            onDescription={setDescription}
          />
        </>
      )}
    </div>
  )
}
