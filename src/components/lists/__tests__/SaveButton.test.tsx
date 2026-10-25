// @vitest-environment jsdom
// The heart on a listing card (Jerson, 2026-10-25, from his iPhone):
// - on the slim map card: no grey circle, just the heart — a faded red
//   outline, full red once saved;
// - an empty heart saves at once (to "Guardados", the default list); a full
//   heart opens "Guardar en" to change lists or un-save — a tap on an empty
//   heart used to open the menu instead of saving;
// - the menu opens upward when there is no room below (it ran off the bottom
//   of the phone screen);
// - a tap inside the menu never reaches the card under it (which opens the
//   listing).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SaveButton, { popoverTop } from '../SaveButton'
import { listService } from '@/services/listService'
import type { UserList } from '@/types/userList'

vi.mock('@/services/listService', () => ({
  listService: { addListing: vi.fn(async () => {}), removeListing: vi.fn(async () => {}), createList: vi.fn(async () => 'new') },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const state = vi.hoisted(() => ({ firebaseUser: null as unknown, lists: [] as unknown[] }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: typeof state) => unknown) => sel(state),
}))
vi.mock('@/stores/listStore', () => ({
  useListStore: (sel: (s: typeof state) => unknown) => sel(state),
  isSavedInAnyList: (lists: { listingIds: string[] }[], id: string) => lists.some((l) => l.listingIds.includes(id)),
}))

const list = (id: string, name: string, listingIds: string[], isDefault = false): UserList =>
  ({ id, name, listingIds, isDefault, createdAt: new Date() })

function setup(lists: UserList[], onCardClick = vi.fn()) {
  state.firebaseUser = { uid: 'u1' }
  state.lists = lists
  render(
    <MemoryRouter>
      <div onClick={onCardClick}>
        <SaveButton listingId="L1" variant="plain" />
      </div>
    </MemoryRouter>,
  )
  return onCardClick
}

beforeEach(() => vi.clearAllMocks())

describe('SaveButton on the slim card', () => {
  it('no grey circle: an outline heart, faded red', () => {
    setup([list('d', 'Guardados', [], true)])
    const button = screen.getByRole('button', { name: /guardar propiedad/i })
    expect(button.className).not.toMatch(/bg-black/)
    const heart = button.querySelector('svg')!
    expect(heart.getAttribute('class')).toMatch(/text-red-500\/60/)
    expect(heart.getAttribute('class')).toMatch(/fill-transparent/)
  })
  it('saved: a full red heart', () => {
    setup([list('d', 'Guardados', ['L1'], true)])
    const heart = screen.getByRole('button', { name: /administrar listas/i }).querySelector('svg')!
    expect(heart.getAttribute('class')).toMatch(/fill-red-500/)
  })
  it('an empty heart saves at once to the default list, without a menu', async () => {
    const card = setup([list('other', 'Playa', []), list('d', 'Guardados', [], true)])
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    await waitFor(() => expect(listService.addListing).toHaveBeenCalledWith('u1', 'd', 'L1'))
    expect(screen.queryByText(/guardar en/i)).toBeNull()
    expect(card).not.toHaveBeenCalled()
  })
  it('a full heart opens "Guardar en"; a tap in it never reaches the card', () => {
    const card = setup([list('d', 'Guardados', ['L1'], true)])
    fireEvent.click(screen.getByRole('button', { name: /administrar listas/i }))
    expect(screen.getByText(/guardar en/i)).toBeDefined()
    fireEvent.click(screen.getByText('Guardados'))
    expect(listService.removeListing).toHaveBeenCalledWith('u1', 'd', 'L1')
    expect(card).not.toHaveBeenCalled()
  })
})

describe('popoverTop', () => {
  const vh = 800
  it('below the heart when it fits', () => {
    expect(popoverTop({ anchorTop: 100, anchorBottom: 132, popoverHeight: 150, viewportHeight: vh })).toBe(138)
  })
  it('above the heart when it would run off the bottom', () => {
    expect(popoverTop({ anchorTop: 700, anchorBottom: 732, popoverHeight: 150, viewportHeight: vh })).toBe(700 - 6 - 150)
  })
  it('never above the top of the screen', () => {
    expect(popoverTop({ anchorTop: 100, anchorBottom: 132, popoverHeight: 760, viewportHeight: vh })).toBeGreaterThanOrEqual(8)
  })
})

// "Guardados sin cuenta" (Jerson, 2026-10-25): a visitor's heart saves in this
// browser instead of sending them to the login page.
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
describe('SaveButton for a visitor', () => {
  it('saves on the device and stays on the page; a second tap un-saves', () => {
    localStorage.clear()
    useDeviceSavesStore.setState({ ids: [], nudgeOpen: false })
    state.firebaseUser = null
    state.lists = []
    render(
      <MemoryRouter initialEntries={['/explorar']}>
        <SaveButton listingId="L9" variant="plain" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    expect(useDeviceSavesStore.getState().ids).toEqual(['L9'])
    const full = screen.getByRole('button', { name: /quitar de guardados/i })
    expect(full.querySelector('svg')!.getAttribute('class')).toMatch(/fill-red-500/)
    fireEvent.click(full)
    expect(useDeviceSavesStore.getState().ids).toEqual([])
  })
})
