// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import FillingButton, { type FillStatus } from '../FillingButton'

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('reduce'), media: q,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    onchange: null, dispatchEvent: () => false,
  }))
}

const fillOf = () =>
  Number(document.querySelector('[data-status]')!.getAttribute('data-fill') ?? '0')
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

beforeEach(() => {
  vi.useFakeTimers()
  mockReducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function Harness({ initial = 'idle' as FillStatus, progress = 0, onDone = () => {} }) {
  const [status, setStatus] = useState<FillStatus>(initial)
  return (
    <>
      <FillingButton status={status} progress={progress} onDone={onDone} onClick={() => setStatus('filling')}>
        Publicar
      </FillingButton>
      <button onClick={() => setStatus('done')}>saved</button>
      <button onClick={() => setStatus('error')}>failed</button>
    </>
  )
}

describe('FillingButton', () => {
  it('at rest is the primary button: green outline, bold uppercase tracked label', () => {
    render(<FillingButton status="idle">Publicar</FillingButton>)
    const b = screen.getByRole('button', { name: 'Publicar' })
    expect(b.className).toMatch(/\bborder-secondary\b/)
    expect(b.className).toMatch(/\bfont-bold\b/)
    expect(b.className).toMatch(/\buppercase\b/)
    expect(b.className).toMatch(/tracking-\[1px\]/)
    expect(b.className).not.toMatch(/gray-|green-|red-|#/)
  })

  it('while filling: pale green track, brand green fill, white label on the fill, "PUBLICANDO…"', () => {
    render(<FillingButton status="filling">Publicar</FillingButton>)
    const b = screen.getByRole('button')
    expect(b.className).toMatch(/\bbg-secondary-pale\b/)
    expect(screen.getByTestId('filling-bar').className).toMatch(/\bbg-secondary\b/)
    expect(b.textContent).toContain('PUBLICANDO…')
    expect(b.querySelector('.text-white')).not.toBeNull()
  })

  it('cannot be clicked while filling — and does not submit its form', () => {
    const onClick = vi.fn()
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <FillingButton type="submit" status="filling" onClick={onClick}>Publicar</FillingButton>
      </form>,
    )
    const b = screen.getByRole('button')
    expect(b.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(b)
    expect(onClick).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps keyboard focus when it starts filling (not natively disabled)', () => {
    const { rerender } = render(<FillingButton status="idle">Publicar</FillingButton>)
    const b = screen.getByRole('button') as HTMLButtonElement
    b.focus()
    rerender(<FillingButton status="filling">Publicar</FillingButton>)
    expect(b.disabled).toBe(false)
    expect(document.activeElement).toBe(b)
    rerender(<FillingButton status="done">Publicar</FillingButton>)
    expect(document.activeElement).toBe(b)
  })

  it('fills on the time curve, never decreases, and waits at 0.90', async () => {
    render(<FillingButton status="filling">Publicar</FillingButton>)
    let last = 0
    for (let t = 0; t < 60000; t += 250) {
      await advance(250)
      const f = fillOf()
      expect(f).toBeGreaterThanOrEqual(last)
      last = f
    }
    expect(last).toBeCloseTo(0.9, 2)
    expect(last).toBeLessThanOrEqual(0.9)
  })

  it('reaches about 0.70 in 4 seconds', async () => {
    render(<FillingButton status="filling">Publicar</FillingButton>)
    await advance(4000)
    expect(fillOf()).toBeGreaterThan(0.65)
    expect(fillOf()).toBeLessThan(0.75)
  })

  it('follows real progress when ahead, but never past 0.90 before success', async () => {
    const { rerender } = render(<FillingButton status="filling" progress={0}>Publicar</FillingButton>)
    rerender(<FillingButton status="filling" progress={0.6}>Publicar</FillingButton>)
    await advance(60)
    expect(fillOf()).toBeGreaterThanOrEqual(0.6)
    rerender(<FillingButton status="filling" progress={1}>Publicar</FillingButton>)
    await advance(60)
    expect(fillOf()).toBe(0.9)
    // Real progress going down does not pull the bar back.
    rerender(<FillingButton status="filling" progress={0.1}>Publicar</FillingButton>)
    await advance(60)
    expect(fillOf()).toBe(0.9)
    expect(screen.queryByText(/PUBLICADO!/)).toBeNull()
  })

  it('only on success: full, then "¡PUBLICADO!" with a check, then onDone', async () => {
    const onDone = vi.fn()
    render(<Harness onDone={onDone} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await advance(2000)
    expect(screen.queryByText('¡PUBLICADO!')).toBeNull()
    fireEvent.click(screen.getByText('saved'))
    await advance(10)
    expect(fillOf()).toBe(1)
    expect(screen.queryByText('¡PUBLICADO!')).toBeNull() // still filling the last stretch
    await advance(300)
    expect(screen.getAllByText('¡PUBLICADO!').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button')[0]!.querySelector('svg')).not.toBeNull()
    expect(onDone).not.toHaveBeenCalled()
    await advance(600)
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('on error it stops and becomes REINTENTAR, clickable again', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await advance(1000)
    fireEvent.click(screen.getByText('failed'))
    const b = screen.getByRole('button', { name: 'REINTENTAR' }) as HTMLButtonElement
    expect(b.disabled).toBe(false)
    expect(b.getAttribute('data-fill')).toBeNull()
    fireEvent.click(b)
    expect(screen.getAllByRole('button')[0]!.textContent).toContain('PUBLICANDO…')
  })

  it('never shows a number or a percentage', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    for (let i = 0; i < 20; i++) {
      await advance(500)
      expect(document.body.textContent).not.toMatch(/%|\d/)
    }
    fireEvent.click(screen.getByText('saved'))
    await advance(400)
    expect(document.body.textContent).not.toMatch(/%|\d/)
  })

  it('announces "Publicando" and then "Publicado" to screen readers', async () => {
    render(<Harness />)
    const live = screen.getByRole('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    expect(screen.getByRole('status').textContent).toBe('Publicando')
    fireEvent.click(screen.getByText('saved'))
    await advance(300)
    expect(screen.getByRole('status').textContent).toBe('Publicado')
  })

  it('announces the failure too', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    fireEvent.click(screen.getByText('failed'))
    expect(screen.getByRole('status').textContent).toBe('No pudimos publicar')
  })

  it('with reduced motion: no animation, and success jumps straight to full and "¡PUBLICADO!"', async () => {
    mockReducedMotion(true)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    expect((screen.getByTestId('filling-bar') as HTMLElement).style.transition).toBe('none')
    // No stepped movement: straight to the held value, and it stays there.
    await advance(1)
    expect(fillOf()).toBe(0.9)
    await advance(3000)
    expect(fillOf()).toBe(0.9)
    fireEvent.click(screen.getByText('saved'))
    await advance(1)
    expect(fillOf()).toBe(1)
    expect(screen.getAllByText('¡PUBLICADO!').length).toBeGreaterThan(0)
  })

  it('labels can be changed for other long actions', () => {
    render(
      <FillingButton status="filling" fillingLabel="GUARDANDO…" fillingAnnouncement="Guardando">
        Guardar
      </FillingButton>,
    )
    expect(screen.getByRole('button').textContent).toContain('GUARDANDO…')
    expect(screen.getByRole('status').textContent).toBe('Guardando')
  })
})
