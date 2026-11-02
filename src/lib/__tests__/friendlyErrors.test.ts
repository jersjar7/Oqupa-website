// One place that turns a failed server call into words a person can act on
// (feature audit 2026-11-02, sections E–G): the cause and the next step, never
// the SDK's own English ("internal", "deadline-exceeded") nor raw server text.
import { describe, it, expect } from 'vitest'
import {
  OFFLINE_MESSAGE,
  GENERIC_MESSAGE,
  isOfflineError,
  callableErrorMessage,
  firestoreWriteErrorMessage,
} from '../friendlyErrors'

const fnErr = (code: string, message: string) => ({ code: `functions/${code}`, message })

describe('isOfflineError', () => {
  it('network-type codes from Functions and Firestore are offline', () => {
    expect(isOfflineError(fnErr('unavailable', 'unavailable'))).toBe(true)
    expect(isOfflineError(fnErr('deadline-exceeded', 'deadline-exceeded'))).toBe(true)
    expect(isOfflineError({ code: 'unavailable', message: 'x' })).toBe(true)
    expect(isOfflineError({ code: 'auth/network-request-failed' })).toBe(true)
  })
  it('the browser saying it is offline is offline', () => {
    expect(isOfflineError(new Error('x'), false)).toBe(true)
  })
  it('an internal server fault is not offline (review 2026-11-02)', () => {
    expect(isOfflineError(fnErr('internal', 'internal'))).toBe(false)
  })
  it('a business refusal is not offline', () => {
    expect(isOfflineError(fnErr('failed-precondition', 'No puedes'))).toBe(false)
    expect(isOfflineError(new Error('boom'), true)).toBe(false)
  })
})

describe('callableErrorMessage', () => {
  it('shows the server sentence for business refusals', () => {
    expect(callableErrorMessage(fnErr('resource-exhausted', 'Esta oportunidad ya no tiene cupos disponibles.'))).toBe(
      'Esta oportunidad ya no tiene cupos disponibles.',
    )
    expect(callableErrorMessage(fnErr('already-exists', 'Ya reclamaste esta oportunidad.'))).toBe(
      'Ya reclamaste esta oportunidad.',
    )
  })
  it('never shows the SDK words for a dropped connection', () => {
    expect(callableErrorMessage(fnErr('unavailable', 'unavailable'))).toBe(OFFLINE_MESSAGE)
    expect(callableErrorMessage(fnErr('deadline-exceeded', 'deadline-exceeded'))).toBe(OFFLINE_MESSAGE)
  })
  it('an internal fault: the catch-all, or the server sentence when it is Spanish', () => {
    expect(callableErrorMessage(fnErr('internal', 'internal'))).toBe(GENERIC_MESSAGE)
    expect(callableErrorMessage(fnErr('internal', 'Ocurrió un error al guardar.'))).toBe('Ocurrió un error al guardar.')
    expect(callableErrorMessage(fnErr('internal', 'Internal error'))).toBe(GENERIC_MESSAGE)
  })
  it('keeps Spanish server sentences that contain "error"', () => {
    expect(callableErrorMessage(fnErr('failed-precondition', 'Hubo un error con tu perfil.'))).toBe('Hubo un error con tu perfil.')
  })
  it('the English lookup wins over any other handling', () => {
    expect(callableErrorMessage(fnErr('internal', 'Listing not found'))).toBe('Esta publicación ya no existe.')
    expect(callableErrorMessage(fnErr('permission-denied', 'You do not own this property'))).toBe(
      'Por ahora solo el dueño puede agregar fotos nuevas.',
    )
  })
  it('translates the agent-edit server sentences that are still English', () => {
    expect(callableErrorMessage(fnErr('permission-denied', 'You are not assigned to this listing'))).toBe(
      'El dueño ya no te tiene asignado a esta publicación.',
    )
    expect(callableErrorMessage(fnErr('permission-denied', 'Assignment must be accepted before editing'))).toBe(
      'Primero acepta la invitación del dueño.',
    )
    expect(callableErrorMessage(fnErr('not-found', 'Listing not found'))).toBe('Esta publicación ya no existe.')
    expect(callableErrorMessage(fnErr('not-found', 'Property not found'))).toBe('Esta publicación ya no existe.')
  })
  it('never shows an untranslated English server sentence', () => {
    expect(callableErrorMessage(fnErr('invalid-argument', 'All photo URLs must be valid HTTPS URLs'))).toBe(GENERIC_MESSAGE)
    expect(callableErrorMessage(fnErr('unauthenticated', 'Must be logged in'))).toBe(
      'Tu sesión se cerró. Vuelve a iniciar sesión.',
    )
  })
  it('uses the given fallback, else the catch-all, for anything else', () => {
    expect(callableErrorMessage(new Error('boom'), { online: true })).toBe(GENERIC_MESSAGE)
    expect(callableErrorMessage(new Error('boom'), { online: true, fallback: 'No se pudo.' })).toBe('No se pudo.')
    expect(callableErrorMessage(fnErr('invalid-argument', 'listingId is required'))).toBe(GENERIC_MESSAGE)
  })
  it('says offline when the browser is offline, whatever the error', () => {
    expect(callableErrorMessage(new Error('boom'), { online: false })).toBe(OFFLINE_MESSAGE)
  })
})

describe('firestoreWriteErrorMessage', () => {
  it('offline', () => {
    expect(firestoreWriteErrorMessage({ code: 'unavailable' }, { online: true })).toBe(OFFLINE_MESSAGE)
  })
  it('a listing that is gone or not yours', () => {
    const gone = 'Esta publicación ya no existe o no es tuya. Actualiza la página.'
    expect(firestoreWriteErrorMessage({ code: 'permission-denied' }, { online: true })).toBe(gone)
    expect(firestoreWriteErrorMessage({ code: 'not-found' }, { online: true })).toBe(gone)
  })
  it('anything else', () => {
    expect(firestoreWriteErrorMessage(new Error('x'), { online: true })).toBe(
      'No se pudo guardar el cambio. Vuelve a intentarlo.',
    )
  })
})
