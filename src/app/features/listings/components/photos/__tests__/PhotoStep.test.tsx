// @vitest-environment jsdom
// ADR-043 step 3 — the Fotos page of the publishing wizard.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PhotoStep from '../PhotoStep'
import { MAX_PHOTOS } from '../usePhotoQueue'
import { useListingFormStore } from '@/stores/listingFormStore'

let urlCounter = 0
const created: string[] = []
const revoked: string[] = []

function jpg(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' })
}

function choose(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files } })
}

const tiles = () => screen.queryAllByRole('button', { name: /^Reordenar foto/ })

beforeEach(() => {
  urlCounter = 0
  created.length = 0
  revoked.length = 0
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => { const u = `blob:t-${urlCounter++}`; created.push(u); return u }),
    revokeObjectURL: vi.fn((u: string) => { revoked.push(u) }),
  }))
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
  sessionStorage.clear()
  useListingFormStore.getState().reset()
  useListingFormStore.getState().setStep(4)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PhotoStep — ATRÁS', () => {
  it('ATRÁS keeps every photo', async () => {
    const { unmount } = render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
    expect(useListingFormStore.getState().step).toBe(3)
    expect(useListingFormStore.getState().data.photos.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    unmount()

    useListingFormStore.getState().setStep(4)
    render(<PhotoStep />)
    expect(tiles()).toHaveLength(3)
  })

  it('a new order is kept too', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(3))
    fireEvent.click(screen.getAllByRole('button', { name: /^Eliminar foto 1/ })[0]!)
    fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
    expect(useListingFormStore.getState().data.photos.map((f) => f.name)).toEqual(['b.jpg', 'c.jpg'])
  })
})

export { MAX_PHOTOS }
