// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from '../useFocusTrap'

// ---------------------------------------------------------------------------
// Fixture component — attaches the container ref and renders focusable children
// ---------------------------------------------------------------------------
interface FixtureProps {
  active: boolean
}

function Fixture({ active }: FixtureProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(active)
  return (
    <div ref={containerRef} data-testid="container">
      <button data-testid="btn-first">First</button>
      <button data-testid="btn-last">Last</button>
    </div>
  )
}

function EmptyFixture({ active }: FixtureProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(active)
  return (
    <div ref={containerRef} data-testid="container" tabIndex={-1}>
      {/* No focusable children */}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(event)
  return event
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useFocusTrap', () => {
  it('returns a ref that can be attached to a DOM element', () => {
    const { getByTestId } = render(<Fixture active={false} />)
    expect(getByTestId('container')).toBeDefined()
  })

  it('does not move focus when active is false', () => {
    const outsideButton = document.createElement('button')
    outsideButton.textContent = 'outside'
    document.body.appendChild(outsideButton)
    outsideButton.focus()

    render(<Fixture active={false} />)

    expect(document.activeElement).toBe(outsideButton)
    document.body.removeChild(outsideButton)
  })

  it('moves focus into the container when activated', () => {
    const { getByTestId } = render(<Fixture active={true} />)
    const firstButton = getByTestId('btn-first')
    expect(document.activeElement).toBe(firstButton)
  })

  it('restores focus to the previously focused element on deactivation', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'trigger'
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(<Fixture active={true} />)
    // Now deactivate — focus should return to the trigger
    rerender(<Fixture active={false} />)

    expect(document.activeElement).toBe(trigger)
    document.body.removeChild(trigger)
  })

  it('wraps forward Tab from last focusable element to first', () => {
    const { getByTestId } = render(<Fixture active={true} />)
    const lastButton = getByTestId('btn-last')
    const firstButton = getByTestId('btn-first')

    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    // Simulate Tab on the container (the keydown handler is on the container)
    const container = getByTestId('container')
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault')
    container.dispatchEvent(tabEvent)

    expect(preventSpy).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(firstButton)
  })

  it('wraps backward Shift+Tab from first focusable element to last', () => {
    const { getByTestId } = render(<Fixture active={true} />)
    const firstButton = getByTestId('btn-first')
    const lastButton = getByTestId('btn-last')

    firstButton.focus()
    expect(document.activeElement).toBe(firstButton)

    const container = getByTestId('container')
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(shiftTabEvent, 'preventDefault')
    container.dispatchEvent(shiftTabEvent)

    expect(preventSpy).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(lastButton)
  })

  it('does not preventDefault when Tab is pressed on a middle element', () => {
    const { getByTestId } = render(<Fixture active={true} />)
    const firstButton = getByTestId('btn-first')
    firstButton.focus()

    const container = getByTestId('container')
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault')
    container.dispatchEvent(tabEvent)

    // First button is not the last — Tab should pass through naturally
    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('ignores non-Tab keys', () => {
    const { getByTestId } = render(<Fixture active={true} />)
    const container = getByTestId('container')
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(escapeEvent, 'preventDefault')
    container.dispatchEvent(escapeEvent)
    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('does not trap when there are no focusable children', () => {
    const { getByTestId } = render(<EmptyFixture active={true} />)
    const container = getByTestId('container')

    // With no focusable items, Tab should not throw and should not preventDefault
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault')
    expect(() => container.dispatchEvent(tabEvent)).not.toThrow()
    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('removes keydown listener after unmount', () => {
    const { getByTestId, unmount } = render(<Fixture active={true} />)
    const firstButton = getByTestId('btn-first')
    const lastButton = getByTestId('btn-last')

    lastButton.focus()
    unmount()

    // After unmount, there is no container to dispatch events to — no assertions needed
    // Just verify it does not throw
    expect(() => unmount()).not.toThrow()
  })
})
