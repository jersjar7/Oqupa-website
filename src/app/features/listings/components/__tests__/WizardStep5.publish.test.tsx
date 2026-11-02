// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Publishing the same draft twice must never make two listings (ADR-043).
 *
 * Measured 2026-11-01: 3 duplicate listings among 91 live. On the website the
 * cause was traced to every attempt minting new ids, and to the draft only
 * being cleared when the success dialog closed.
 *
 * These tests drive the REAL wizard step, the REAL storage and Firestore
 * services, and fake only the network edge (Firestore, the upload-URL
 * function, the photo PUTs), so they hold for whatever the step does inside.
 */

// ── The network edge ─────────────────────────────────────────────────────────

const net = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  // Every document path ever written, in order. Deleting does not remove it:
  // a listing that existed for a moment was still a listing.
  written: [] as string[],
  // One entry per atomic write (a setDoc, an updateDoc or a whole transaction).
  commits: [] as string[][],
  puts: [] as string[],
  putBehaviour: (_url: string, _n: number): 'ok' | 'fail' | 'hang' => 'ok',
  urlCalls: 0,
}))

vi.mock('@/lib/firebase', () => ({ db: { __db: true }, functions: {}, storage: {}, auth: {} }))

vi.mock('firebase/firestore', async (importOriginal) => {
  const real = await importOriginal<typeof import('firebase/firestore')>()
  type Ref = { path: string; id: string }
  const write = (paths: string[], apply: () => void) => {
    apply()
    net.written.push(...paths)
    net.commits.push(paths)
  }
  const snap = (ref: Ref) => ({
    id: ref.id,
    exists: () => net.docs.has(ref.path),
    data: () => net.docs.get(ref.path),
  })
  return {
    ...real,
    serverTimestamp: () => '__ts__',
    doc: (_db: unknown, coll: string, id: string): Ref => ({ path: `${coll}/${id}`, id }),
    getDoc: async (ref: Ref) => snap(ref),
    setDoc: async (ref: Ref, data: Record<string, unknown>) =>
      write([ref.path], () => net.docs.set(ref.path, data)),
    updateDoc: async (ref: Ref, data: Record<string, unknown>) => {
      if (!net.docs.has(ref.path)) throw new Error('not-found')
      write([ref.path], () => net.docs.set(ref.path, { ...net.docs.get(ref.path), ...data }))
    },
    deleteDoc: async (ref: Ref) => { net.docs.delete(ref.path) },
    writeBatch: () => {
      const ops: Array<[Ref, Record<string, unknown>]> = []
      return {
        set: (ref: Ref, data: Record<string, unknown>) => { ops.push([ref, data]) },
        commit: async () =>
          write(ops.map(([r]) => r.path), () => ops.forEach(([r, d]) => net.docs.set(r.path, d))),
      }
    },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      const ops: Array<[Ref, Record<string, unknown>]> = []
      const tx = {
        get: async (ref: Ref) => snap(ref),
        set: (ref: Ref, data: Record<string, unknown>) => { ops.push([ref, data]); return tx },
      }
      const result = await fn(tx)
      if (ops.length) {
        write(ops.map(([r]) => r.path), () => ops.forEach(([r, d]) => net.docs.set(r.path, d)))
      }
      return result
    },
  }
})

vi.mock('firebase/functions', () => ({
  httpsCallable: (_f: unknown, name: string) => async (req: { entityId: string; fileCount: number }) => {
    if (name !== 'getUploadUrl') return { data: {} }
    net.urlCalls += 1
    const call = net.urlCalls
    return {
      data: {
        uploads: Array.from({ length: req.fileCount }, (_, i) => {
          const objectKey = `property-photos/${req.entityId}/${call}-${i}.webp`
          return { objectKey, uploadUrl: `https://r2.test/${objectKey}` }
        }),
      },
    }
  },
}))

vi.mock('browser-image-compression', () => ({
  default: async (file: File, opts?: { onProgress?: (p: number) => void }) => {
    opts?.onProgress?.(100)
    return file
  },
}))
vi.mock('@/lib/blurhash', () => ({ generateBlurHash: async () => 'HASH' }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: new Proxy({}, { get: () => () => {} }),
}))

class FakeXHR {
  static count = 0
  status = 200
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  url = ''
  open(_m: string, url: string) { this.url = url }
  setRequestHeader() {}
  abort() { this.onabort?.() }
  send() {
    const n = FakeXHR.count++
    const how = net.putBehaviour(this.url, n)
    if (how === 'hang') return
    setTimeout(() => {
      if (how === 'fail') { this.onerror?.(); return }
      net.puts.push(this.url)
      this.upload.onprogress?.({ lengthComputable: true, loaded: 10, total: 10 })
      this.onload?.()
    }, 0)
  }
}

// ── The wizard ───────────────────────────────────────────────────────────────

import WizardStep5 from '../WizardStep5'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useAuthStore } from '@/stores/authStore'

const MESSAGE =
  'No pudimos publicar. Revisa tu conexión y vuelve a intentarlo. Tu anuncio no se duplicará.'

function photos(n: number) {
  return Array.from({ length: n }, (_, i) => new File([`img${i}`], `foto${i}.jpg`, { type: 'image/jpeg', lastModified: 1 }))
}

function fillDraft() {
  useListingFormStore.getState().reset()
  useListingFormStore.getState().updateData({
    propertyType: 'terreno',
    operationType: 'venta',
    role: 'owner',
    description: 'Terreno amplio con todos los servicios cerca de la avenida',
    totalAreaInSquareMeters: 200,
    latitude: -5.19,
    longitude: -80.63,
    calle: 'Av. Grau 123',
    distrito: 'Piura',
    provincia: 'Piura',
    departamento: 'Piura',
    amount: 50000,
    currency: 'USD',
    photos: photos(3),
  })
  useListingFormStore.getState().setStep(5)
}

function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname}</div>
}

function renderStep() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/listings/new']}>
        <Routes>
          <Route path="/app/listings/new" element={<WizardStep5 />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ids = (coll: string) => new Set(net.written.filter((p) => p.startsWith(`${coll}/`)))
const publishButton = () => screen.getByRole('button', { name: /reintentar|publicar/i })

beforeEach(() => {
  net.docs.clear()
  net.written.length = 0
  net.commits.length = 0
  net.puts.length = 0
  net.urlCalls = 0
  net.putBehaviour = () => 'ok'
  FakeXHR.count = 0
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  sessionStorage.clear()
  useAuthStore.setState({
    user: {
      id: 'owner-1', email: 'o@x.pe', name: 'Ana', createdAt: new Date('2025-01-01'),
      updatedAt: new Date(), isActive: true, isPhoneVerified: true, isIdentityVerified: false,
      isVerifiedRealtor: false, claimsThisMonth: 0, claimMonth: '2026-11',
      contactInfo: { phoneNumber: '+51999999999' },
    },
  } as never)
  fillDraft()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('WizardStep5 — publishing never duplicates (ADR-043)', () => {
  it('a double click writes one property and one listing, together in one commit', async () => {
    renderStep()
    const btn = publishButton()
    fireEvent.click(btn)
    fireEvent.click(btn)
    await waitFor(() => expect(ids('listings').size).toBe(1), { timeout: 3000 })
    await new Promise((r) => setTimeout(r, 50))
    expect(ids('listings').size).toBe(1)
    expect(ids('properties').size).toBe(1)
    // The property and the listing reach the database in ONE atomic write.
    const both = net.commits.filter((c) => c.some((p) => p.startsWith('listings/')))
    expect(both).toHaveLength(1)
    expect(both[0]!.some((p) => p.startsWith('properties/'))).toBe(true)
    // Photos go first, then the save: no property was ever written without them.
    expect(net.commits[0]).toEqual(both[0])
  })

  it('both documents are named from the draft identity', async () => {
    const id = useListingFormStore.getState().publishId
    renderStep()
    fireEvent.click(publishButton())
    await waitFor(() => expect(ids('listings').size).toBe(1), { timeout: 3000 })
    expect([...ids('listings')]).toEqual([`listings/listing_${id}`])
    expect([...ids('properties')]).toEqual([`properties/property_${id}`])
  })

  it('a retry after an error reuses the same documents and skips photos already uploaded', async () => {
    // The third photo fails on the first attempt only.
    net.putBehaviour = (url, n) => (n === 2 && url.endsWith('-2.webp') ? 'fail' : 'ok')
    renderStep()
    fireEvent.click(publishButton())
    await waitFor(() => expect(net.urlCalls).toBe(1))
    await waitFor(() => expect((publishButton() as HTMLButtonElement).disabled).toBe(false), { timeout: 3000 })
    expect(ids('listings').size).toBe(0)
    expect(net.puts).toHaveLength(2)

    fireEvent.click(publishButton())
    await waitFor(() => expect(ids('listings').size).toBe(1), { timeout: 3000 })
    expect(ids('properties').size).toBe(1)
    // Only the photo that failed was sent again.
    expect(net.puts).toHaveLength(3)
    const listing = [...net.docs.entries()].find(([p]) => p.startsWith('listings/'))![1]
    expect((listing.media as { photoKeys: string[] }).photoKeys).toHaveLength(3)
  })

  it('a failed publish tells the person, in Spanish, that it will not duplicate', async () => {
    net.putBehaviour = () => 'fail'
    renderStep()
    fireEvent.click(publishButton())
    expect(await screen.findByText(MESSAGE, {}, { timeout: 3000 })).toBeTruthy()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/upload|failed|error al/i)
  })

  it('a retry after a time-out writes one listing, and the person reads Spanish', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    net.putBehaviour = (_url, n) => (n === 0 ? 'hang' : 'ok')
    renderStep()
    fireEvent.click(publishButton())
    await act(async () => { await vi.advanceTimersByTimeAsync(31000) })
    expect(await screen.findByText(MESSAGE)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/timed out|failed|error/i)

    fireEvent.click(screen.getByRole('button', { name: /reintentar|publicar/i }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    await waitFor(() => expect(ids('listings').size).toBe(1))
    expect(ids('properties').size).toBe(1)
  })

  it('a save that fails is retried onto the same documents', async () => {
    let failSave = true
    const realRun = (await import('firebase/firestore')).runTransaction as unknown as (...a: unknown[]) => Promise<unknown>
    const fs = await import('firebase/firestore')
    vi.spyOn(fs, 'runTransaction').mockImplementation((async (...args: unknown[]) => {
      if (failSave) { failSave = false; throw new Error('unavailable') }
      return realRun(...args)
    }) as never)
    renderStep()
    fireEvent.click(publishButton())
    expect(await screen.findByText(MESSAGE, {}, { timeout: 3000 })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /reintentar|publicar/i }))
    await waitFor(() => expect(ids('listings').size).toBe(1), { timeout: 3000 })
    expect(ids('properties').size).toBe(1)
    // The photos were not sent twice.
    expect(net.puts).toHaveLength(3)
  })

  it('after success the draft is gone at once, nothing can publish again, and the person lands on the listing', async () => {
    const id = useListingFormStore.getState().publishId
    renderStep()
    fireEvent.click(publishButton())
    await waitFor(() => expect(ids('listings').size).toBe(1), { timeout: 3000 })
    // Cleared the moment the write succeeded — not when a dialog closes.
    expect(sessionStorage.getItem('oqupa-listing-form')).toBeNull()
    expect((await screen.findAllByText('¡PUBLICADO!', {}, { timeout: 2000 })).length).toBeGreaterThan(0)
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe(`/property/listing_${id}`), { timeout: 3000 })
    expect(ids('listings').size).toBe(1)
  })

  it('once saved, the button cannot be clicked again', async () => {
    renderStep()
    const btn = publishButton() as HTMLButtonElement
    fireEvent.click(btn)
    await waitFor(() => expect(ids('listings').size).toBe(1), { timeout: 3000 })
    await waitFor(() => expect(btn.getAttribute('data-status')).toBe('done'))
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(btn)
    fireEvent.submit(btn.closest('form')!)
    await new Promise((r) => setTimeout(r, 100))
    expect(net.commits.filter((c) => c.some((p) => p.startsWith('listings/')))).toHaveLength(1)
  })

  it('a wizard reopened on an already-published draft does not publish it again', async () => {
    useListingFormStore.getState().markPublished('listing_already')
    renderStep()
    fireEvent.submit(document.querySelector('form')!)
    await new Promise((r) => setTimeout(r, 100))
    expect(net.commits).toHaveLength(0)
  })

  it('warns before leaving only while publishing', async () => {
    net.putBehaviour = () => 'hang'
    const added = vi.spyOn(window, 'addEventListener')
    const removed = vi.spyOn(window, 'removeEventListener')
    const before = added.mock.calls.filter(([t]) => t === 'beforeunload').length
    renderStep()
    expect(added.mock.calls.filter(([t]) => t === 'beforeunload').length).toBe(before)
    fireEvent.click(publishButton())
    await waitFor(() =>
      expect(added.mock.calls.filter(([t]) => t === 'beforeunload').length).toBe(before + 1))
    const unloads = added.mock.calls.filter(([t]) => t === 'beforeunload')
    const handler = unloads[unloads.length - 1]![1] as (e: Event) => void
    const e = new Event('beforeunload', { cancelable: true })
    handler(e)
    expect(e.defaultPrevented).toBe(true)
    expect(removed.mock.calls.some(([t, h]) => t === 'beforeunload' && h === handler)).toBe(false)
  })
})
