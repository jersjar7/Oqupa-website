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

// ADR-043 D8: no drag handles any more; a photo is its picture.
const tiles = () => screen.queryAllByRole('img', { name: /^Foto \d+$/ })

beforeEach(() => {
  urlCounter = 0
  created.length = 0
  revoked.length = 0
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => { const u = `blob:t-${urlCounter++}`; created.push(u); return u }),
    revokeObjectURL: vi.fn((u: string) => { revoked.push(u) }),
  }))
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
  localStorage.clear()
  sessionStorage.clear()
  useListingFormStore.getState().reset()
  useListingFormStore.getState().setStep(4)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PhotoStep — tap to make the cover (D8)', () => {
  it('tapping the third photo makes it the cover, and the order is kept in the draft', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: 'Hacer portada la foto 3' }))
    await waitFor(() =>
      expect(useListingFormStore.getState().data.photos.map((f) => f.name)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']),
    )
  })

  it('SIGUIENTE with too few photos stays and says so', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg')]))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Sube al menos 3 fotos')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(4)
  })
})

describe('PhotoStep — one photo is singular', () => {
  it('an edit of a one-photo listing asks for "al menos 1 foto"', async () => {
    const s = useListingFormStore.getState()
    s.startEdit('L1', 'P1')
    s.updateData({ existingPhotoUrls: [], originalExistingPhotoUrls: ['property-photos/P1/1-0.webp'] })
    s.setStep(4)
    render(<PhotoStep />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Sube al menos 1 foto')).toBeTruthy()
  })
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

function heic(name: string) {
  return new File(['x'], name, { type: 'image/heic' })
}

function preload(n: number) {
  useListingFormStore.getState().updateData({ photos: Array.from({ length: n }, (_, i) => jpg(`p${i}.jpg`)) })
}

describe('PhotoStep — over the maximum', () => {
  it('says how many fitted and which were added', async () => {
    preload(MAX_PHOTOS - 2)
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg'), jpg('d.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(MAX_PHOTOS))
    expect(screen.getByText('Solo cabían 2 fotos más; agregamos las primeras 2.')).toBeTruthy()
  })

  it('one more: singular', async () => {
    preload(MAX_PHOTOS - 1)
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(MAX_PHOTOS))
    expect(screen.getByText('Solo cabía 1 foto más; agregamos la primera.')).toBeTruthy()
  })

  it('nothing to say when everything fits', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(2))
    expect(screen.queryByText(/Solo cab/)).toBeNull()
  })
})

describe('PhotoStep — photos this browser cannot use (iPhone HEIC in Chrome)', () => {
  it('a single unusable photo is refused at once, in Spanish', async () => {
    render(<PhotoStep />)
    await act(async () => choose([heic('IMG_0001.HEIC')]))
    expect(await screen.findByText('Esta foto no se puede usar. Elige otra foto.')).toBeTruthy()
    expect(tiles()).toHaveLength(0)
  })

  it('the good ones are added, and it says how many were skipped', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), heic('b.heic'), heic('c.heic')]))
    await waitFor(() => expect(tiles()).toHaveLength(1))
    expect(screen.getByText('2 fotos no se pueden usar y no las agregamos. Elige otras fotos.')).toBeTruthy()
  })

  it('one skipped: singular', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), heic('b.heic')]))
    await waitFor(() => expect(tiles()).toHaveLength(1))
    expect(screen.getByText('1 foto no se puede usar y no la agregamos. Elige otra foto.')).toBeTruthy()
  })

  it('a browser that can open HEIC (Safari) keeps it', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close() {} })))
    render(<PhotoStep />)
    await act(async () => choose([heic('IMG_0001.HEIC')]))
    await waitFor(() => expect(tiles()).toHaveLength(1))
    expect(screen.queryByText(/no se puede usar/)).toBeNull()
  })

  it('a browser that cannot open it refuses it', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('decode') }))
    render(<PhotoStep />)
    await act(async () => choose([heic('IMG_0001.HEIC')]))
    expect(await screen.findByText('Esta foto no se puede usar. Elige otra foto.')).toBeTruthy()
  })
})

describe('PhotoStep — previews are released from memory', () => {
  it('a removed photo\'s preview is released', async () => {
    render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(3))
    const before = [...created]
    fireEvent.click(screen.getAllByRole('button', { name: /^Eliminar foto 1/ })[0]!)
    await waitFor(() => expect(tiles()).toHaveLength(2))
    expect(revoked).toHaveLength(1)
    expect(before).toContain(revoked[0])
  })

  it('leaving the page releases every preview', async () => {
    const { unmount } = render(<PhotoStep />)
    await act(async () => choose([jpg('a.jpg'), jpg('b.jpg')]))
    await waitFor(() => expect(tiles()).toHaveLength(2))
    unmount()
    expect(new Set(revoked)).toEqual(new Set(created))
  })
})
