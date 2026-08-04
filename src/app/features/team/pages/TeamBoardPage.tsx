import { useMemo, useState } from 'react'
import { Check, Plus, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { useTeamTasks } from '@/hooks/useTeamTasks'
import { teamTaskService } from '@/services/teamTaskService'
import type { TeamTask } from '@/types/teamTask'
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
}: {
  title: string
  done?: boolean
  onRename: (next: string) => Promise<void> | void
  className: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

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
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit() }
          if (e.key === 'Escape') { setDraft(title); setEditing(false) }
        }}
        aria-label="Editar tarea"
        className={`${className} rounded border border-primary bg-white px-1 focus:outline-none focus:ring-2 focus:ring-primary/20`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(title); setEditing(true) }}
      title="Clic para editar"
      className={`${className} cursor-text rounded px-1 text-left hover:bg-background-secondary/60 ${
        done ? 'text-text-tertiary line-through' : ''
      }`}
    >
      {title}
    </button>
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
}: {
  task: TeamTask
  onToggleDone: () => void
  onUnassign: () => void
  onDelete: () => void
  onRename: (title: string) => void
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
          <EditableTitle
            title={task.title}
            done={isDone}
            onRename={onRename}
            className="w-full break-words text-sm leading-snug text-text-primary"
          />
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
}: {
  member: TeamMember
  tasks: TeamTask[]
  onAdd: (title: string) => Promise<void>
  onRename: (task: TeamTask, title: string) => void
  onToggleDone: (task: TeamTask) => void
  onUnassign: (task: TeamTask) => void
  onDelete: (task: TeamTask) => void
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const activeCount = tasks.filter((t) => !t.doneAt).length

  async function submit(e: React.FormEvent) {
    e.preventDefault()
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
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">
          {member.name}
        </h2>
        <span className="font-sans text-xs text-text-tertiary">
          {activeCount} en curso
        </span>
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
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Añadir tarea…"
            aria-label={`Añadir tarea para ${member.name}`}
            disabled={busy}
            className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
          />
        </div>
      </form>

      {/* Fixed ceiling with internal scroll so one busy column can't stretch
          the whole row and push the TO DO list off the screen. */}
      <div className="max-h-[26rem] min-h-[6rem] space-y-2 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          <p className="px-1 py-4 text-center font-sans text-xs text-text-tertiary">
            Sin tareas todavía.
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleDone={() => onToggleDone(task)}
              onUnassign={() => onUnassign(task)}
              onDelete={() => onDelete(task)}
              onRename={(title) => onRename(task, title)}
            />
          ))
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Shared TO DO container (full width, below the columns)              */
/* ------------------------------------------------------------------ */

function TodoContainer({
  tasks,
  members,
  currentEmail,
  onAdd,
  onAssign,
  onDelete,
  onRename,
}: {
  tasks: TeamTask[]
  members: TeamMember[]
  currentEmail: string | null
  onAdd: (title: string) => Promise<void>
  onAssign: (task: TeamTask, email: string) => void
  onDelete: (task: TeamTask) => void
  onRename: (task: TeamTask, title: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
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
    <section className="rounded-2xl border border-border bg-white shadow-light">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3 md:px-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">
          Por hacer
        </h2>
        <span className="font-sans text-xs text-text-tertiary">
          {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </header>

      <form onSubmit={submit} className="border-b border-border px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Añadir tarea por hacer"
            className="shrink-0 rounded text-text-tertiary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Añadir algo por hacer…"
            aria-label="Añadir tarea por hacer"
            disabled={busy}
            className="w-full bg-transparent py-1 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
          />
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="px-4 py-8 text-center font-sans text-sm text-text-tertiary md:px-5">
          Nada pendiente. Todo está asignado.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 px-4 py-3 hover:bg-background-secondary/40 md:flex-row md:items-center md:gap-4 md:px-5"
            >
              <div className="min-w-0 flex-1">
                <EditableTitle
                  title={task.title}
                  onRename={(title) => onRename(task, title)}
                  className="w-full break-words text-sm text-text-primary md:text-base"
                />
                <p className="mt-0.5 pl-1 font-serif text-[11px] font-light italic text-text-tertiary">
                  Creado por {creatorName(task.createdByEmail)} · {formatStamp(task.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value=""
                  aria-label={`Asignar "${task.title}"`}
                  onChange={(e) => {
                    if (e.target.value) onAssign(task, e.target.value)
                  }}
                  className="rounded-lg border border-border bg-white px-2.5 py-1.5 font-sans text-xs text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
  const { todo, byAssignee, isLoading, error } = useTeamTasks(BOARD)

  // TeamGuard already redirected anyone off-roster; this is the belt-and-braces
  // case where the roster changed mid-session.
  if (!currentEmail) return null

  function report(action: () => Promise<void>, failure: string) {
    action().catch(() => toast.error(failure))
  }

  async function addTo(assigneeEmail: string | null, title: string) {
    try {
      await teamTaskService.create({
        title,
        team: BOARD,
        assigneeEmail,
        createdByEmail: currentEmail!,
      })
    } catch {
      toast.error('No se pudo añadir la tarea')
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {members.map((member) => (
              <MemberColumn
                key={member.email}
                member={member}
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
              />
            ))}
          </div>

          <TodoContainer
            tasks={todo}
            members={members}
            currentEmail={currentEmail}
            onAdd={(title) => addTo(null, title)}
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
          />
        </>
      )}
    </div>
  )
}
