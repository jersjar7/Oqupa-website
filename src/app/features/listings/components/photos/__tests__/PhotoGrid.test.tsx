// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PhotoGrid from '../PhotoGrid'
import type { PhotoItem } from '../usePhotoQueue'

// InfoTip pulls in unrelated UI deps — stub it.
vi.mock('@/app/components/ui', () => ({
  InfoTip: () => null,
}))

// imageUrl.card just echoes the key in tests; we don't load real images.
vi.mock('@/lib/imageUrl', () => ({
  card: (k: string) => k,
}))

function existing(id: string, url: string, hash = ''): PhotoItem {
  return { id, type: 'existing', url, blurHash: hash }
}

function defaultProps(items: PhotoItem[]) {
  return {
    items,
    previewUrls: new Map<File, string>(),
    onAddFiles: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onReorder: vi.fn(),
    onMakeCover: vi.fn(),
    photoError: null,
    canContinue: items.length >= 3,
    minPhotos: 3,
  }
}

describe('PhotoGrid', () => {
  it('renders one sortable tile per item with Spanish "Reordenar foto N de M" label', () => {
    const items = [
      existing('p1', 'a'),
      existing('p2', 'b'),
      existing('p3', 'c'),
    ]
    render(<PhotoGrid {...defaultProps(items)} />)

    expect(screen.getByLabelText('Reordenar foto 1 de 3')).toBeTruthy()
    expect(screen.getByLabelText('Reordenar foto 2 de 3')).toBeTruthy()
    expect(screen.getByLabelText('Reordenar foto 3 de 3')).toBeTruthy()
  })

  it('shows the PORTADA badge only on the first tile', () => {
    const items = [
      existing('p1', 'a'),
      existing('p2', 'b'),
      existing('p3', 'c'),
    ]
    render(<PhotoGrid {...defaultProps(items)} />)

    const badges = screen.getAllByText('Portada')
    expect(badges).toHaveLength(1)
  })

  it('shows "Hacer portada" only on non-cover tiles and fires onMakeCover with the tile index', () => {
    const items = [
      existing('p1', 'a'),
      existing('p2', 'b'),
      existing('p3', 'c'),
    ]
    const props = defaultProps(items)
    render(<PhotoGrid {...props} />)

    const buttons = screen.getAllByRole('button', { name: 'Hacer portada' })
    expect(buttons).toHaveLength(2)

    fireEvent.click(buttons[1]!) // tile index 2
    expect(props.onMakeCover).toHaveBeenCalledWith(2)
  })

  it('shows the "sube al menos 3" hint while below the threshold', () => {
    const items = [existing('p1', 'a'), existing('p2', 'b')]
    const props = { ...defaultProps(items), canContinue: false }
    render(<PhotoGrid {...props} />)

    expect(
      screen.getByText(/Sube al menos 3 fotos para continuar \(2\/3\)/i)
    ).toBeTruthy()
  })

  it('hides the count hint once canContinue is true', () => {
    const items = [
      existing('p1', 'a'),
      existing('p2', 'b'),
      existing('p3', 'c'),
    ]
    render(<PhotoGrid {...defaultProps(items)} />)

    expect(screen.queryByText(/Sube al menos 3 fotos/i)).toBeNull()
  })
})
