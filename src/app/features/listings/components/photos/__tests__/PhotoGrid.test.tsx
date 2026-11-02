// @vitest-environment jsdom
// ADR-043 D8 (approved 2026-11-01): one big AGREGAR FOTOS button, "Mínimo 3
// fotos" from the start, "Tocar para hacer portada" instead of dragging, a
// maximum of 20. This replaces the drag-to-reorder tests ("Reordenar foto N
// de M", the mouse / finger drag hints) and the "Sube al menos 3 fotos para
// continuar (2/3)" counter, which D8 removed.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PhotoGrid from '../PhotoGrid'
import { MAX_PHOTOS, type PhotoItem } from '../usePhotoQueue'

// imageUrl.card just echoes the key in tests; we don't load real images.
vi.mock('@/lib/imageUrl', () => ({
  card: (k: string) => k,
}))

function existing(id: string, url: string, hash = ''): PhotoItem {
  return { id, type: 'existing', url, blurHash: hash }
}
const three = () => [existing('p1', 'a'), existing('p2', 'b'), existing('p3', 'c')]

function props(items: PhotoItem[], extra: Partial<React.ComponentProps<typeof PhotoGrid>> = {}) {
  return {
    items,
    previewUrls: new Map<File, string>(),
    onAddFiles: vi.fn(),
    onRemove: vi.fn(),
    onReorder: vi.fn(),
    photoError: null,
    minPhotos: 3,
    ...extra,
  }
}

describe('PhotoGrid (D8)', () => {
  it('empty: one big AGREGAR FOTOS button and "Mínimo 3 fotos" from the start', () => {
    render(<PhotoGrid {...props([])} />)
    const add = screen.getAllByRole('button', { name: /agregar foto/i })
    expect(add).toHaveLength(1)
    expect(add[0]!.textContent).toBe('Agregar fotos')
    expect(add[0]!.className).toMatch(/\bh-14\b/)
    expect(screen.getByText('Mínimo 3 fotos')).toBeTruthy()
  })

  it('still one AGREGAR FOTOS button once there are photos, and the minimum stays in view', () => {
    render(<PhotoGrid {...props(three())} />)
    expect(screen.getAllByRole('button', { name: /agregar foto/i })).toHaveLength(1)
    expect(screen.getByText('Mínimo 3 fotos')).toBeTruthy()
  })

  it('never shows the count against the maximum, nor drag instructions', () => {
    render(<PhotoGrid {...props(three())} />)
    expect(document.body.textContent).not.toMatch(new RegExp(`/${MAX_PHOTOS}`))
    expect(document.body.textContent).not.toMatch(/arrastra|mantén presionada/i)
  })

  it('the first photo is the cover; the others say "Tocar para hacer portada"', () => {
    render(<PhotoGrid {...props(three())} />)
    expect(screen.getAllByText('Portada')).toHaveLength(1)
    expect(screen.getByText('Tocar para hacer portada')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hacer portada la foto 1' })).toBeNull()
  })

  it('tapping a photo makes it the cover', () => {
    const p = props(three())
    render(<PhotoGrid {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hacer portada la foto 3' }))
    expect(p.onReorder).toHaveBeenCalledWith(2, 0)
  })

  it('remove buttons are at least 48 px', () => {
    const p = props(three())
    render(<PhotoGrid {...p} />)
    const remove = screen.getByRole('button', { name: 'Eliminar foto 2' })
    expect(remove.className).toMatch(/\bh-12\b/)
    fireEvent.click(remove)
    expect(p.onRemove).toHaveBeenCalledWith(1)
  })

  it('at the maximum of 20 the add button goes and the page says so', () => {
    expect(MAX_PHOTOS).toBe(20)
    const items = Array.from({ length: 20 }, (_, i) => existing(`p${i}`, `k${i}`))
    render(<PhotoGrid {...props(items)} />)
    expect(screen.queryByRole('button', { name: /agregar foto/i })).toBeNull()
    expect(screen.getByText('Máximo 20 fotos')).toBeTruthy()
  })

  it('an edit that asks for fewer says so in the singular', () => {
    render(<PhotoGrid {...props([], { minPhotos: 1 })} />)
    expect(screen.getByText('Mínimo 1 foto')).toBeTruthy()
  })
})
