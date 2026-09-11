// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { addWaitlistEntryMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  addWaitlistEntryMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    addWaitlistEntry: (...args: unknown[]) => addWaitlistEntryMock(...args),
  },
}))

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock, error: toastErrorMock } }))

vi.mock('@/lib/recaptcha', () => ({
  getRecaptchaToken: vi.fn().mockResolvedValue(''),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
  getFunctions: vi.fn(() => ({})),
}))

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }))

import { useExpansionForm } from '../useExpansionForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

type ChangeTarget = { name: string; value: string; type?: string; checked?: boolean }

function makeEvent(target: ChangeTarget): React.ChangeEvent<HTMLInputElement | HTMLSelectElement> {
  return { target } as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
}

function makeSubmitEvent(): React.FormEvent {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent
}

// Fill the form with values that pass all validation
function fillValidForm(result: { current: ReturnType<typeof useExpansionForm> }) {
  act(() => {
    result.current.handleChange(makeEvent({ name: 'name', value: 'Juan García' }))
    result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
    result.current.handleChange(makeEvent({ name: 'email', value: 'juan@example.com' }))
    result.current.handleChange(makeEvent({ name: 'departamento', value: 'Lima' }))
    result.current.handleChange(makeEvent({ name: 'contactConsent', value: '', type: 'checkbox', checked: true }))
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useExpansionForm', () => {
  beforeEach(() => {
    addWaitlistEntryMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    addWaitlistEntryMock.mockResolvedValue(undefined)
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with all fields empty/false', () => {
      const { result } = renderHook(() => useExpansionForm())
      expect(result.current.formData.name).toBe('')
      expect(result.current.formData.phone).toBe('')
      expect(result.current.formData.email).toBe('')
      expect(result.current.formData.departamento).toBe('')
      expect(result.current.formData.contactConsent).toBe(false)
    })

    it('starts with no errors', () => {
      const { result } = renderHook(() => useExpansionForm())
      expect(result.current.errors).toEqual({})
    })

    it('starts not submitting and not in success state', () => {
      const { result } = renderHook(() => useExpansionForm())
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSuccess).toBe(false)
    })

    it('returns all required API fields', () => {
      const { result } = renderHook(() => useExpansionForm())
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
    it('updates the name field', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'María' }))
      })
      expect(result.current.formData.name).toBe('María')
    })

    it('updates the email field', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'email', value: 'test@test.com' }))
      })
      expect(result.current.formData.email).toBe('test@test.com')
    })

    it('updates the departamento field', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'departamento', value: 'Lima' }))
      })
      expect(result.current.formData.departamento).toBe('Lima')
    })

    it('formats the phone number as XXX-XXX-XXX', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
      })
      expect(result.current.formData.phone).toBe('987-654-321')
    })

    it('formats phone with 4 digits as XXX-X', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'phone', value: '9876' }))
      })
      expect(result.current.formData.phone).toBe('987-6')
    })

    it('formats phone with 7 digits as XXX-XXX-X', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'phone', value: '9876543' }))
      })
      expect(result.current.formData.phone).toBe('987-654-3')
    })

    it('strips non-digit characters from phone and keeps only digit characters', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        // Input: '987-654-321' (dashes are stripped, digits remain: 987654321)
        result.current.handleChange(makeEvent({ name: 'phone', value: '987-654-321' }))
      })
      // After stripping dashes and re-formatting: 987654321 → '987-654-321'
      expect(result.current.formData.phone).toBe('987-654-321')
    })

    it('caps phone at 9 digits', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'phone', value: '98765432100' }))
      })
      expect(result.current.formData.phone).toBe('987-654-321')
    })

    it('handles phone with 3 or fewer digits without dashes', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'phone', value: '987' }))
      })
      expect(result.current.formData.phone).toBe('987')
    })

    it('handles checkbox input for contactConsent', () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(
          makeEvent({ name: 'contactConsent', value: '', type: 'checkbox', checked: true })
        )
      })
      expect(result.current.formData.contactConsent).toBe(true)
    })

    it('clears an existing error when the user edits the corresponding field', async () => {
      const { result } = renderHook(() => useExpansionForm())
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.name).toBeTruthy()

      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'J' }))
      })
      expect(result.current.errors.name).toBeUndefined()
    })
  })

  // ── Validation ────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('sets name error when name is empty', async () => {
      const { result } = renderHook(() => useExpansionForm())
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.name).toBe('Por favor ingresa tu nombre')
    })

    it('sets name error when name is too short (< 2 chars)', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'J' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.name).toBe('El nombre debe tener al menos 2 caracteres')
    })

    it('sets phone error when phone is empty', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.phone).toBe('Por favor ingresa tu número de teléfono')
    })

    it('sets phone error when phone has fewer than 9 digits', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
        result.current.handleChange(makeEvent({ name: 'phone', value: '12345' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.phone).toBe('El número debe tener 9 dígitos')
    })

    it('sets email error when email is empty', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
        result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.email).toBe('Por favor ingresa tu correo electrónico')
    })

    it('sets email error when email is invalid', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
        result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
        result.current.handleChange(makeEvent({ name: 'email', value: 'not-an-email' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.email).toBe('Por favor ingresa un correo electrónico válido')
    })

    it('sets departamento error when departamento is empty', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
        result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
        result.current.handleChange(makeEvent({ name: 'email', value: 'juan@test.com' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.departamento).toBe('Selecciona tu departamento')
    })

    it('sets departamento error when departamento is not in the allowed list', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
        result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
        result.current.handleChange(makeEvent({ name: 'email', value: 'juan@test.com' }))
        result.current.handleChange(makeEvent({ name: 'departamento', value: 'InvalidPlace' }))
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.departamento).toBe('Selecciona un departamento válido')
    })

    it('sets contactConsent error when consent is not checked', async () => {
      const { result } = renderHook(() => useExpansionForm())
      act(() => {
        result.current.handleChange(makeEvent({ name: 'name', value: 'Juan' }))
        result.current.handleChange(makeEvent({ name: 'phone', value: '987654321' }))
        result.current.handleChange(makeEvent({ name: 'email', value: 'juan@test.com' }))
        result.current.handleChange(makeEvent({ name: 'departamento', value: 'Lima' }))
        // contactConsent remains false
      })
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.contactConsent).toBe('Debes aceptar ser contactado')
    })

    it('does not call the service when validation fails', async () => {
      const { result } = renderHook(() => useExpansionForm())
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(addWaitlistEntryMock).not.toHaveBeenCalled()
    })
  })

  // ── handleSubmit — success ────────────────────────────────────────────────

  describe('handleSubmit — success', () => {
    it('calls addWaitlistEntry with the trimmed form data including +51 prefix', async () => {
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(addWaitlistEntryMock).toHaveBeenCalledOnce()
      const payload = addWaitlistEntryMock.mock.calls[0][0]
      expect(payload.name).toBe('Juan García')
      expect(payload.phone).toContain('+51')
      expect(payload.email).toBe('juan@example.com')
      expect(payload.departamento).toBe('Lima')
      expect(payload.contactConsent).toBe(true)
    })

    it('sets isSuccess=true after submission', async () => {
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSuccess).toBe(true)
    })

    it('clears the form after successful submission', async () => {
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.formData.name).toBe('')
      expect(result.current.formData.phone).toBe('')
      expect(result.current.formData.email).toBe('')
      expect(result.current.formData.contactConsent).toBe(false)
    })

    it('shows success toast after submission', async () => {
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(toastSuccessMock).toHaveBeenCalledWith('¡Recibimos tu solicitud!')
    })

    it('isSubmitting is false after successful submission', async () => {
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSubmitting).toBe(false)
    })

    it('calls the onSuccess callback when provided', async () => {
      const onSuccess = vi.fn()
      const { result } = renderHook(() => useExpansionForm({ onSuccess }))
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('does not throw when no onSuccess callback is provided', async () => {
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await expect(
        act(async () => {
          await result.current.handleSubmit(makeSubmitEvent())
        })
      ).resolves.toBeUndefined()
    })

    it('calls preventDefault on the submit event', async () => {
      const { result } = renderHook(() => useExpansionForm())
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
    it('shows error toast when service throws', async () => {
      addWaitlistEntryMock.mockRejectedValue(new Error('network error'))
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(toastErrorMock).toHaveBeenCalledWith('Error al enviar. Inténtalo de nuevo.')
    })

    it('sets a name error message on failure', async () => {
      addWaitlistEntryMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.errors.name).toBe('Error al enviar. Inténtalo de nuevo.')
    })

    it('isSuccess remains false after failure', async () => {
      addWaitlistEntryMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSuccess).toBe(false)
    })

    it('isSubmitting returns to false after failure', async () => {
      addWaitlistEntryMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useExpansionForm())
      fillValidForm(result)
      await act(async () => {
        await result.current.handleSubmit(makeSubmitEvent())
      })
      expect(result.current.isSubmitting).toBe(false)
    })
  })
})

// ── RECAPTCHA_ENABLED = true (lines 129-137) ──────────────────────────────────
//
// RECAPTCHA_ENABLED is a module-level const: !!import.meta.env.VITE_RECAPTCHA_SITE_KEY
// The only way to set it to true is to stub the env var, reset modules, and
// re-import the hook via a dynamic import so the module is re-evaluated.
//
// After vi.resetModules(), each vi.mock() factory is re-run on the next import.
// The `@/lib/recaptcha` factory creates a fresh vi.fn() — import it after the
// hook to get the same module instance and spy on it with vi.mocked().
// The `firebase/functions` factory also creates fresh vi.fn()s — same pattern.

describe('useExpansionForm — RECAPTCHA_ENABLED branch (lines 129-137)', () => {
  beforeEach(() => {
    addWaitlistEntryMock.mockReset()
    addWaitlistEntryMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function importWithRecaptchaEnabled() {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key')
    vi.resetModules()
    const hookMod = await import('../useExpansionForm')
    // Import the mocked modules AFTER the hook so we get the same freshly-created
    // module instances that the hook will use at call time.
    const recaptchaMod = await import('@/lib/recaptcha')
    const functionsMod = await import('firebase/functions')
    return { hookMod, recaptchaMod, functionsMod }
  }

  it('calls getRecaptchaToken and httpsCallable when RECAPTCHA_ENABLED is true (happy path)', async () => {
    const { hookMod, recaptchaMod, functionsMod } = await importWithRecaptchaEnabled()
    const { useExpansionForm: useForm } = hookMod

    const submitWaitlistCallable = vi.fn().mockResolvedValue({})
    vi.mocked(recaptchaMod.getRecaptchaToken).mockResolvedValue('test-token')
    vi.mocked(functionsMod.httpsCallable).mockReturnValue(
      submitWaitlistCallable as ReturnType<typeof functionsMod.httpsCallable>
    )

    const { result } = renderHook(() => useForm())
    fillValidForm(result)

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    expect(recaptchaMod.getRecaptchaToken).toHaveBeenCalledWith('waitlist_signup')
    expect(submitWaitlistCallable).toHaveBeenCalled()
    // submitted = true → the fallback direct write should NOT be called
    expect(addWaitlistEntryMock).not.toHaveBeenCalled()
    expect(result.current.isSuccess).toBe(true)
  })

  it('falls back to direct write when getRecaptchaToken throws (catch block, line 135-138)', async () => {
    const { hookMod, recaptchaMod } = await importWithRecaptchaEnabled()
    const { useExpansionForm: useForm } = hookMod

    vi.mocked(recaptchaMod.getRecaptchaToken).mockRejectedValue(new Error('reCAPTCHA blocked'))

    const { result } = renderHook(() => useForm())
    fillValidForm(result)

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    // reCAPTCHA threw → catch swallows it → submitted stays false → fallback direct write
    expect(addWaitlistEntryMock).toHaveBeenCalledOnce()
    expect(result.current.isSuccess).toBe(true)
  })

  it('falls back to direct write when httpsCallable throws (inner catch block, line 135-138)', async () => {
    const { hookMod, recaptchaMod, functionsMod } = await importWithRecaptchaEnabled()
    const { useExpansionForm: useForm } = hookMod

    const failingCallable = vi.fn().mockRejectedValue(new Error('cloud function error'))
    vi.mocked(recaptchaMod.getRecaptchaToken).mockResolvedValue('token-ok')
    vi.mocked(functionsMod.httpsCallable).mockReturnValue(
      failingCallable as ReturnType<typeof functionsMod.httpsCallable>
    )

    const { result } = renderHook(() => useForm())
    fillValidForm(result)

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    // callable threw → catch swallows it → submitted stays false → fallback direct write
    expect(addWaitlistEntryMock).toHaveBeenCalledOnce()
    expect(result.current.isSuccess).toBe(true)
  })
})
