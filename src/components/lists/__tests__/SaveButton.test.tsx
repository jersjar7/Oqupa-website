// @vitest-environment jsdom
// The heart on a listing card (Jerson, 2026-10-25, from his iPhone):
// - on the slim map card: no grey circle, just the heart — a faded red
//   outline, full red once saved;
// - a tap never reaches the card under it (which opens the listing).
// ADR-046 #1 (2026-11-02): one Guardados, the app's store
// (users/{uid}/favorites). An empty heart saves and a full heart un-saves, in
// one tap, like the app — the "Guardar en" list menu is gone.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SaveButton from '../SaveButton'
import { favoritesService } from '@/services/favoritesService'
import { toast } from 'sonner'

vi.mock('@/services/favoritesService', () => ({
  favoritesService: { add: vi.fn(async () => {}), remove: vi.fn(async () => {}) },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const state = vi.hoisted(() => ({ firebaseUser: null as unknown, user: null as unknown, ids: [] as string[], loadedUid: 'u1' as string | null, loadFailed: false }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: typeof state) => unknown) => sel(state),
}))
vi.mock('@/stores/favoritesStore', () => ({
  useFavoritesStore: (sel: (s: typeof state) => unknown) => sel(state),
}))

function setup(ids: string[], onCardClick = vi.fn()) {
  state.firebaseUser = { uid: 'u1', emailVerified: true }
  state.user = { name: 'Ana', isPhoneVerified: true }
  state.ids = ids
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
    setup([])
    const button = screen.getByRole('button', { name: /guardar propiedad/i })
    expect(button.className).not.toMatch(/bg-black/)
    const heart = button.querySelector('svg')!
    expect(heart.getAttribute('class')).toMatch(/text-error\/60/)
    expect(heart.getAttribute('class')).toMatch(/fill-transparent/)
  })
  it('saved: a full red heart', () => {
    setup(['L1'])
    const heart = screen.getByRole('button', { name: /quitar de guardados/i }).querySelector('svg')!
    expect(heart.getAttribute('class')).toMatch(/fill-error/)
  })
  it('an empty heart saves at once into Guardados, without a menu or reaching the card', async () => {
    const card = setup([])
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    await waitFor(() => expect(favoritesService.add).toHaveBeenCalledWith('u1', 'L1'))
    expect(screen.queryByText(/guardar en/i)).toBeNull()
    expect(card).not.toHaveBeenCalled()
    // "Guardado" on every save, as in the app (audit 2026-11-02).
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Guardado'))
  })
  it('a full heart un-saves in one tap, in the app’s words, without reaching the card', async () => {
    const card = setup(['L1'])
    fireEvent.click(screen.getByRole('button', { name: /quitar de guardados/i }))
    await waitFor(() => expect(favoritesService.remove).toHaveBeenCalledWith('u1', 'L1'))
    expect(screen.queryByText(/guardar en/i)).toBeNull()
    expect(card).not.toHaveBeenCalled()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Quitado de Guardados'))
  })
  it('a failed save or un-save says so', async () => {
    vi.mocked(favoritesService.add).mockRejectedValueOnce(new Error('offline'))
    setup([])
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo guardar'))
  })
  it('a failed un-save says so', async () => {
    vi.mocked(favoritesService.remove).mockRejectedValueOnce(new Error('offline'))
    setup(['L1'])
    fireEvent.click(screen.getByRole('button', { name: /quitar de guardados/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo quitar de Guardados. Vuelve a intentarlo.'))
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
    state.ids = []
    render(
      <MemoryRouter initialEntries={['/explorar']}>
        <SaveButton listingId="L9" variant="plain" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    expect(useDeviceSavesStore.getState().ids).toEqual(['L9'])
    const full = screen.getByRole('button', { name: /quitar de guardados/i })
    expect(full.querySelector('svg')!.getAttribute('class')).toMatch(/fill-error/)
    fireEvent.click(full)
    expect(useDeviceSavesStore.getState().ids).toEqual([])
    expect(favoritesService.add).not.toHaveBeenCalled()
  })
})

describe('SaveButton for an account still being set up', () => {
  it('keeps saving in the browser until the account is ready', () => {
    localStorage.clear()
    useDeviceSavesStore.setState({ ids: [], nudgeOpen: false })
    state.firebaseUser = { uid: 'u1', emailVerified: false }
    state.user = { name: 'Ana', isPhoneVerified: false }
    state.ids = []
    render(<MemoryRouter><SaveButton listingId="L7" variant="plain" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    expect(useDeviceSavesStore.getState().ids).toEqual(['L7'])
    expect(favoritesService.add).not.toHaveBeenCalled()
  })
})

// Re-review, 2026-10-25.
describe('SaveButton — edges from the re-review', () => {
  it('an account still being set up: a listing already in its Guardados shows saved, and one tap un-saves it there', async () => {
    useDeviceSavesStore.setState({ ids: [], nudgeOpen: false })
    state.firebaseUser = { uid: 'u1', emailVerified: true }
    state.user = { name: 'Ana', isPhoneVerified: false }
    state.ids = ['L1']
    render(<MemoryRouter><SaveButton listingId="L1" variant="plain" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /quitar de guardados/i }))
    await waitFor(() => expect(favoritesService.remove).toHaveBeenCalledWith('u1', 'L1'))
    expect(useDeviceSavesStore.getState().ids).toEqual([])
  })
  it("someone with an account never uses up the visitor's card", () => {
    localStorage.clear()
    useDeviceSavesStore.setState({ ids: ['x', 'y'], nudgeOpen: false })
    localStorage.setItem('oqupa_guardados', JSON.stringify(['x', 'y']))
    state.firebaseUser = { uid: 'u1', emailVerified: false }
    state.user = { name: 'Ana', isPhoneVerified: false }
    state.ids = []
    render(<MemoryRouter><SaveButton listingId="L3" variant="plain" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    expect(useDeviceSavesStore.getState().ids).toEqual(['x', 'y', 'L3'])
    expect(useDeviceSavesStore.getState().nudgeOpen).toBe(false)
    expect(localStorage.getItem('oqupa_guardados_aviso')).toBeNull()
  })
  it('a ready account whose Guardados has not arrived yet: the heart waits', async () => {
    state.firebaseUser = { uid: 'u1', emailVerified: true }
    state.user = { name: 'Ana', isPhoneVerified: true }
    state.ids = []
    state.loadedUid = null
    render(<MemoryRouter><SaveButton listingId="L4" variant="plain" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    await new Promise((r) => setTimeout(r, 0))
    expect(favoritesService.add).not.toHaveBeenCalled()
    state.loadedUid = 'u1'
  })
  it('Guardados failed to load: the heart says so instead of doing nothing (audit 2026-11-02)', async () => {
    state.firebaseUser = { uid: 'u1', emailVerified: true }
    state.user = { name: 'Ana', isPhoneVerified: true }
    state.ids = []
    state.loadedUid = null
    state.loadFailed = true
    render(<MemoryRouter><SaveButton listingId="L5" variant="plain" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No pudimos cargar tus guardados. Vuelve a intentarlo.'))
    expect(favoritesService.add).not.toHaveBeenCalled()
    state.loadedUid = 'u1'
    state.loadFailed = false
  })
})
