// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { focusFirstError } from '../useWizardPageChange'

describe('focusFirstError', () => {
  it('waits for a message that renders late, then focuses it', async () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<form><button>Siguiente</button></form>'
    focusFirstError()
    vi.advanceTimersByTime(120) // the message is not there yet
    const msg = document.createElement('p')
    msg.setAttribute('data-wizard-error', '')
    msg.textContent = 'Elige si vendes o alquilas.'
    document.body.appendChild(msg)
    vi.advanceTimersByTime(200)
    expect(document.activeElement).toBe(msg)
    vi.useRealTimers()
  })
})
