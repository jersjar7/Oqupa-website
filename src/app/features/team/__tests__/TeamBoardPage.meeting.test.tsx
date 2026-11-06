// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TeamTask } from '@/types/teamTask'

/**
 * The Equipo board after the weekly meeting of 2026-11-05:
 *  1. finished tasks are hidden from a person's column until asked for;
 *  2. every task has a priority (Alta / Normal / Cuando haya tiempo), and the
 *     shared list keeps "Cuando haya tiempo" (tech debt, bugs) in its own group;
 *  3. every task can carry a longer description under its title.
 */

const service = {
  setDone: vi.fn(async () => {}),
  assign: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  rename: vi.fn(async () => {}),
  create: vi.fn(async () => {}),
  setPriority: vi.fn(async () => {}),
  setDescription: vi.fn(async () => {}),
}
vi.mock('@/services/teamTaskService', () => ({ teamTaskService: service }))

let tasks: TeamTask[] = []
vi.mock('@/hooks/useTeamTasks', async () => {
  const { splitTodo, sortForColumn } = await import('../taskOrder')
  return {
    useTeamTasks: () => {
      const todo = tasks.filter((t) => !t.assigneeEmail)
      const byAssignee: Record<string, TeamTask[]> = {}
      for (const t of tasks.filter((x) => x.assigneeEmail)) (byAssignee[t.assigneeEmail!.toLowerCase()] ??= []).push(t)
      for (const k of Object.keys(byAssignee)) byAssignee[k] = sortForColumn(byAssignee[k]!)
      return { todo, ...splitTodo(todo), byAssignee, isLoading: false, error: null }
    },
  }
})
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: { user: { email: string } }) => unknown) => sel({ user: { email: 'admin@oqupa.com' } }),
}))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/app/components/ui', () => ({ Spinner: () => null }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

// jsdom has no ResizeObserver; the title clamp uses one.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

const { default: TeamBoardPage } = await import('../pages/TeamBoardPage')

let n = 0
function task(opts: Partial<TeamTask>): TeamTask {
  n++
  return {
    id: `t${n}`, title: `Tarea ${n}`, team: 'dev', assigneeEmail: null,
    createdAt: new Date(2026, 9, n), claimedAt: null, doneAt: null, createdByEmail: 'admin@oqupa.com',
    ...opts,
  }
}

beforeEach(() => {
  Object.values(service).forEach((f) => f.mockClear())
  try { localStorage.clear() } catch { /* jsdom */ }
})

describe('finished tasks are hidden until asked for', () => {
  beforeEach(() => {
    tasks = [
      task({ title: 'Revisar pagos', assigneeEmail: 'admin@oqupa.com' }),
      task({ title: 'Publicar notas', assigneeEmail: 'admin@oqupa.com', doneAt: new Date(2026, 10, 1) }),
      task({ title: 'Viejo', assigneeEmail: 'admin@oqupa.com', doneAt: new Date(2026, 9, 1) }),
    ]
  })

  it('a column shows only unfinished work by default, with a count of the finished', () => {
    render(<TeamBoardPage />)
    expect(screen.getByText('Revisar pagos')).toBeTruthy()
    expect(screen.queryByText('Publicar notas')).toBeNull()
    expect(screen.getByRole('button', { name: 'Mostrar terminadas (2)' })).toBeTruthy()
  })

  it('the switch shows them, and hides them again', () => {
    render(<TeamBoardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar terminadas (2)' }))
    expect(screen.getByText('Publicar notas')).toBeTruthy()
    expect(screen.getByText('Viejo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar terminadas' }))
    expect(screen.queryByText('Publicar notas')).toBeNull()
  })

  it('no switch when nothing is finished', () => {
    tasks = [task({ title: 'Revisar pagos', assigneeEmail: 'admin@oqupa.com' })]
    render(<TeamBoardPage />)
    expect(screen.queryByRole('button', { name: /terminadas/ })).toBeNull()
  })
})

describe('priority', () => {
  it('the shared list has a "Cuando haya tiempo" group of its own', () => {
    tasks = [task({ title: 'Urgente' , priority: 'alta' }), task({ title: 'Deuda técnica', priority: 'luego' })]
    render(<TeamBoardPage />)
    const later = screen.getByRole('region', { name: 'Cuando haya tiempo' })
    expect(within(later).getByText('Deuda técnica')).toBeTruthy()
    expect(within(later).queryByText('Urgente')).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Por hacer' })).getByText('Urgente')).toBeTruthy()
  })

  it('an Alta task is marked ALTA', () => {
    tasks = [task({ title: 'Urgente', priority: 'alta' })]
    render(<TeamBoardPage />)
    expect(screen.getAllByText('Alta').some((el) => el.tagName !== 'OPTION')).toBe(true)
  })

  it('changing a task\'s priority saves it', () => {
    tasks = [task({ id: 'x1', title: 'Algo' })]
    render(<TeamBoardPage />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Prioridad de "Algo"' }), { target: { value: 'luego' } })
    expect(service.setPriority).toHaveBeenCalledWith('x1', 'luego')
  })

  it('adding to "Cuando haya tiempo" creates the task with that priority', () => {
    tasks = []
    render(<TeamBoardPage />)
    const box = screen.getByRole('textbox', { name: 'Añadir tarea para cuando haya tiempo' })
    fireEvent.change(box, { target: { value: 'Limpiar código viejo' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Limpiar código viejo', assigneeEmail: null, priority: 'luego' }))
  })
})

describe('description', () => {
  it('a task with a description shows "Detalles"; opening it shows the text', () => {
    tasks = [task({ title: 'Algo', description: 'Pasos: uno, dos.' })]
    render(<TeamBoardPage />)
    expect(screen.queryByText('Pasos: uno, dos.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Detalles' }))
    expect(screen.getByText('Pasos: uno, dos.')).toBeTruthy()
  })

  it('a task without one offers "Añadir detalles"; saving writes it', () => {
    tasks = [task({ id: 'x2', title: 'Algo' })]
    render(<TeamBoardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir detalles' }))
    const box = screen.getByRole('textbox', { name: 'Detalles de "Algo"' })
    fireEvent.change(box, { target: { value: 'Qué significa y cómo hacerlo.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar detalles' }))
    expect(service.setDescription).toHaveBeenCalledWith('x2', 'Qué significa y cómo hacerlo.')
  })
})

