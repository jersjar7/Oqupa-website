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
  TEAMS,
  columnEmailFor,
  membersOf,
  teamsFor,
  type TeamId,
  type TeamMember,
} from '@/app/features/team/teamRoster'

/** "31 jul · 4:12 p. m." — compact enough to sit under a one-line task title. */
function formatStamp(date: Date): string {
  return date.toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/* ------------------------------------------------------------------ */
/* Task card (inside a person's column)                                */
/* ------------------------------------------------------------------ */

function TaskCard({
  task,
  onToggleDone,
  onUnassign,
  onDelete,
}: {
  task: TeamTask
  onToggleDone: () => void
  onUnassign: () => void
  onDelete: () => void
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

        <p
          className={`min-w-0 flex-1 break-words text-sm leading-snug ${
            isDone ? 'text-text-tertiary line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>

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
        <div>Creado {formatStamp(task.createdAt)}</div>
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
}: {
  member: TeamMember
  tasks: TeamTask[]
  onAdd: (title: string) => Promise<void>
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
          <Plus className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
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
}: {
  tasks: TeamTask[]
  members: TeamMember[]
  currentEmail: string | null
  onAdd: (title: string) => Promise<void>
  onAssign: (task: TeamTask, email: string) => void
  onDelete: (task: TeamTask) => void
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
          <Plus className="h-4 w-4 shrink-0 text-text-tertiary" />
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
                <p className="break-words text-sm text-text-primary md:text-base">
                  {task.title}
                </p>
                <p className="mt-0.5 font-serif text-[11px] font-light italic text-text-tertiary">
                  Creado {formatStamp(task.createdAt)}
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
    title: 'Equipo',
    subtitle: 'Tareas del equipo y en qué trabaja cada quien.',
  })

  const user = useAuthStore((s) => s.user)
  const email = user?.email ?? null
  const currentEmail = columnEmailFor(email)

  const myTeams = useMemo(() => teamsFor(email), [email])
  const [team, setTeam] = useState<TeamId>(() => teamsFor(email)[0] ?? 'dev')

  const members = useMemo(() => membersOf(team), [team])
  const { todo, byAssignee, isLoading, error } = useTeamTasks(team)

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
        team,
        assigneeEmail,
        createdByEmail: currentEmail!,
      })
    } catch {
      toast.error('No se pudo añadir la tarea')
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {myTeams.length > 1 && (
        <div
          role="tablist"
          aria-label="Equipo"
          className="inline-flex rounded-full border border-border bg-white p-1"
        >
          {TEAMS.filter((t) => myTeams.includes(t.id)).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={team === t.id}
              onClick={() => setTeam(t.id)}
              className={`rounded-full px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-[1px] transition-colors ${
                team === t.id
                  ? 'bg-secondary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

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
          />
        </>
      )}
    </div>
  )
}
