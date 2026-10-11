// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Hoisted mocks (accessible inside vi.mock factories) ───────────────────────

const { submitBugReportMock, toastSuccessMock, toastErrorMock, getCapturedErrorsMock } = vi.hoisted(() => ({
  submitBugReportMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  getCapturedErrorsMock: vi.fn(() => ''),
}))

vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    submitBugReport: (...args: unknown[]) => submitBugReportMock(...args),
  },
}))

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock, error: toastErrorMock } }))

vi.mock('@/lib/errorBuffer', () => ({
  getCapturedErrors: getCapturedErrorsMock,
  initErrorBuffer: vi.fn(),
}))

vi.mock('@/lib/recaptcha', () => ({
  getRecaptchaToken: vi.fn().mockResolvedValue(''),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
  getFunctions: vi.fn(() => ({})),
}))

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }))

import { useBugReportForm } from '../useBugReportForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<HTMLInputElement> = {}): React.ChangeEvent<HTMLInputElement> {
  return {
    target: { name: 'contact', value: '', ...overrides },
  } as unknown as React.ChangeEvent<HTMLInputElement>
}

function makeSubmitEvent(): React.FormEvent {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useBugReportForm', () => {
  beforeEach(() => {
    submitBugReportMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    getCapturedErrorsMock.mockReturnValue('')
    submitBugReportMock.mockResolvedValue(undefined)
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty contact and description fields', () => {
      const { result } = renderHook(() => useBugReportForm())
      expect(result.current.formData.contact).toBe('')
      expect(result.current.formData.description).toBe('')
    })

    it('starts with empty errors', () => {
      const { result } = renderHook(() => useBugReportForm())
      expect(result.current.errors).toEqual({})
    })

    it('starts not submitting', () => {
      const { result } = renderHook(() => useBugReportForm())
      expect(result.current.isSubmitting).toBe(false)
    })

    it('starts not in success state', () => {
      const { result } = renderHook(() => useBugReportForm())
      expect(result.current.isSuccess).toBe(false)
    })

    it('technical field is pre-filled from getCapturedErrors', () => {
      getCapturedErrorsMock.mockReturnValue('captured error log')
      const { result } = renderHook(() => useBugReportForm())
      expect(result.current.formData.technical).toBe('captured error log')
    })

    it('returns all required fields in the API', () => {
      const { result } = renderHook(() => useBugReportForm())
      expect(result.current).toHaveProperty('formData')
      expect(result.current).toHaveProperty('errors')
      expect(result.current).toHaveProperty('isSubmitting')
      expect(result.current).toHaveProperty('isSuccess')
      expect(result.current).toHaveProperty('handleChange')
      expect(result.current).toHaveProperty('handleSubmit')
    })
  })

  // ── handleChange ─────────────────────────────────────────────────────────

  describe('handleChange', () => {
    it('updates the contact field', () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'test@example.com' }))
      })
      expect(result.current.formData.contact).toBe('test@example.com')
    })

    it('updates the description field', () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'description', value: 'Something broke' }))
      })
      expect(result.current.formData.description).toBe('Something broke')
    })

    it('updates the technical field', () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'technical', value: 'Error stack trace' }))
      })
      expect(result.current.formData.technical).toBe('Error stack trace')
    })

    it('clears an existing field error when the user types in that field', async () => {
      const { result } = renderHook(() => useBugReportForm())
      // Trigger a validation error first
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.contact).toBeTruthy()

      // Now type something to clear the error
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'x' }))
      })
      expect(result.current.errors.contact).toBeUndefined()
    })

    it('does not clear errors for a different field', async () => {
      const { result } = renderHook(() => useBugReportForm())
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      // Both contact and description errors should be set
      expect(result.current.errors.description).toBeTruthy()

      // Typing in contact should not clear description error
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'x' }))
      })
      expect(result.current.errors.description).toBeTruthy()
    })
  })

  // ── Validation ────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('sets a contact error when contact is empty', async () => {
      const { result } = renderHook(() => useBugReportForm())
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.contact).toBe('Déjanos un correo o teléfono para responderte')
    })

    it('sets a contact error when contact is too short (< 5 chars)', async () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'ab' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.contact).toBe('Ingresa un correo o teléfono válido')
    })

    it('accepts contact with exactly 5 characters', async () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'a@b.c' }))
        result.current.handleChange(makeEvent({ name: 'description', value: 'More than ten chars!' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.contact).toBeUndefined()
    })

    it('sets a description error when description is empty', async () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'test@example.com' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.description).toBe('Cuéntanos qué pasó')
    })

    it('sets a description error when description is too short (< 10 chars)', async () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'test@example.com' }))
        result.current.handleChange(makeEvent({ name: 'description', value: 'Short' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.description).toBe('Danos un poco más de detalle')
    })

    it('does not call the service when validation fails', async () => {
      const { result } = renderHook(() => useBugReportForm())
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(submitBugReportMock).not.toHaveBeenCalled()
    })
  })

  // ── handleSubmit — success ────────────────────────────────────────────────

  describe('handleSubmit — success', () => {
    function fillValidForm(result: { current: ReturnType<typeof useBugReportForm> }) {
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'test@example.com' }))
        result.current.handleChange(
          makeEvent({ name: 'description', value: 'The login button does nothing when clicked' })
        )
      })
    }

    it('calls submitBugReport with contact, description, technical, pageUrl, and userAgent', async () => {
      const { result } = renderHook(() => useBugReportForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(submitBugReportMock).toHaveBeenCalledOnce()
      const payload = submitBugReportMock.mock.calls[0]![0]
      expect(payload.contact).toBe('test@example.com')
      expect(payload.description).toBe('The login button does nothing when clicked')
      expect(payload).toHaveProperty('technical')
      expect(payload).toHaveProperty('pageUrl')
      expect(payload).toHaveProperty('userAgent')
    })

    it('trims whitespace from contact and description before submitting', async () => {
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: '  user@test.com  ' }))
        result.current.handleChange(
          makeEvent({ name: 'description', value: '  Something is broken here  ' })
        )
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      const payload = submitBugReportMock.mock.calls[0]![0]
      expect(payload.contact).toBe('user@test.com')
      expect(payload.description).toBe('Something is broken here')
    })

    it('sets isSuccess=true after successful submission', async () => {
      const { result } = renderHook(() => useBugReportForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSuccess).toBe(true)
    })

    it('clears the form fields after successful submission', async () => {
      const { result } = renderHook(() => useBugReportForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.formData.contact).toBe('')
      expect(result.current.formData.description).toBe('')
    })

    it('shows a success toast after submission', async () => {
      const { result } = renderHook(() => useBugReportForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(toastSuccessMock).toHaveBeenCalledWith('¡Gracias! Recibimos tu reporte.')
    })

    it('isSubmitting is false after successful submission', async () => {
      const { result } = renderHook(() => useBugReportForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSubmitting).toBe(false)
    })

    it('calls preventDefault on the form event', async () => {
      const { result } = renderHook(() => useBugReportForm())
      fillValidForm(result)
      const event = makeSubmitEvent()
      await act(async () => {
        await result.current.handleSubmit(event)
      })
      expect(event.preventDefault).toHaveBeenCalledOnce()
    })
  })

  // ── handleSubmit — failure ────────────────────────────────────────────────

  describe('handleSubmit — failure', () => {
    it('shows error toast when the service throws', async () => {
      submitBugReportMock.mockRejectedValue(new Error('network error'))
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'user@test.com' }))
        result.current.handleChange(
          makeEvent({ name: 'description', value: 'Something is broken here long enough' })
        )
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(toastErrorMock).toHaveBeenCalledWith('Error al enviar. Inténtalo de nuevo.')
    })

    it('isSuccess remains false after failure', async () => {
      submitBugReportMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'user@test.com' }))
        result.current.handleChange(
          makeEvent({ name: 'description', value: 'Something is broken here long enough' })
        )
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSuccess).toBe(false)
    })

    it('isSubmitting returns to false after failure', async () => {
      submitBugReportMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useBugReportForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'contact', value: 'user@test.com' }))
        result.current.handleChange(
          makeEvent({ name: 'description', value: 'Something is broken here long enough' })
        )
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSubmitting).toBe(false)
    })
  })
})

// ── RECAPTCHA_ENABLED = true (lines 79-90) ────────────────────────────────────
//
// Same pattern as useExpansionForm: RECAPTCHA_ENABLED is a module-level const.
// Stub the env var, reset modules, and re-import to exercise the reCAPTCHA path.

describe('useBugReportForm — RECAPTCHA_ENABLED branch (lines 79-90)', () => {
  beforeEach(() => {
    submitBugReportMock.mockReset()
    submitBugReportMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function importWithRecaptchaEnabled() {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key')
    vi.resetModules()
    const hookMod = await import('../useBugReportForm')
    const recaptchaMod = await import('@/lib/recaptcha')
    const functionsMod = await import('firebase/functions')
    return { hookMod, recaptchaMod, functionsMod }
  }

  function fillValidBugReport(result: { current: ReturnType<typeof import('../useBugReportForm').useBugReportForm> }) {
    act(() => {
      result.current.handleChange(makeEvent({ name: 'contact', value: 'user@test.com' }))
      result.current.handleChange(
        makeEvent({ name: 'description', value: 'The login button does nothing when clicked' })
      )
    })
  }

  it('calls getRecaptchaToken and httpsCallable when RECAPTCHA_ENABLED is true (happy path)', async () => {
    const { hookMod, recaptchaMod, functionsMod } = await importWithRecaptchaEnabled()
    const { useBugReportForm: useForm } = hookMod

    const submitCallable = vi.fn().mockResolvedValue({})
    vi.mocked(recaptchaMod.getRecaptchaToken).mockResolvedValue('test-token')
    vi.mocked(functionsMod.httpsCallable).mockReturnValue(
      submitCallable as unknown as ReturnType<typeof functionsMod.httpsCallable>
    )

    const { result } = renderHook(() => useForm())
    fillValidBugReport(result)

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    expect(recaptchaMod.getRecaptchaToken).toHaveBeenCalledWith('bug_report')
    expect(submitCallable).toHaveBeenCalled()
    // submitted = true → fallback direct write should NOT be called
    expect(submitBugReportMock).not.toHaveBeenCalled()
    expect(result.current.isSuccess).toBe(true)
  })

  it('falls back to direct write when getRecaptchaToken throws (inner catch block)', async () => {
    const { hookMod, recaptchaMod } = await importWithRecaptchaEnabled()
    const { useBugReportForm: useForm } = hookMod

    vi.mocked(recaptchaMod.getRecaptchaToken).mockRejectedValue(new Error('reCAPTCHA blocked'))

    const { result } = renderHook(() => useForm())
    fillValidBugReport(result)

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    // reCAPTCHA threw → catch swallows → submitted stays false → fallback direct write
    expect(submitBugReportMock).toHaveBeenCalledOnce()
    expect(result.current.isSuccess).toBe(true)
  })

  it('falls back to direct write when httpsCallable throws (inner catch block)', async () => {
    const { hookMod, recaptchaMod, functionsMod } = await importWithRecaptchaEnabled()
    const { useBugReportForm: useForm } = hookMod

    const failingCallable = vi.fn().mockRejectedValue(new Error('cloud function error'))
    vi.mocked(recaptchaMod.getRecaptchaToken).mockResolvedValue('token-ok')
    vi.mocked(functionsMod.httpsCallable).mockReturnValue(
      failingCallable as unknown as ReturnType<typeof functionsMod.httpsCallable>
    )

    const { result } = renderHook(() => useForm())
    fillValidBugReport(result)

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    // callable threw → catch swallows → submitted stays false → fallback direct write
    expect(submitBugReportMock).toHaveBeenCalledOnce()
    expect(result.current.isSuccess).toBe(true)
  })
})
