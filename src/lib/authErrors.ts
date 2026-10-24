import { EMAIL_CHANGE_COPY } from './emailChange'

export interface AuthErrorInfo {
  message: string
  recoveryHint?: string
  isRetryable: boolean
}

function extractFirebaseErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/auth\/[\w-]+/)
  return match ? match[0] : ''
}

// Shared sentences, so the same failure reads the same on every screen.
const CONNECTION = 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.'
const TOO_MANY = 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.'
const DISABLED = 'Esta cuenta ha sido desactivada. Escríbenos a admin@oqupa.com si crees que es un error.'
const SESSION = 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.'
const COOKIES = 'Tu navegador está bloqueando las cookies o el almacenamiento que necesitamos para iniciar sesión.'
const COOKIES_HINT = 'Permite las cookies para oqupa.com o sal del modo privado estricto, y vuelve a intentarlo. También funciona en Chrome o Safari.'
const OURS = 'Hubo un problema de nuestro lado. Intenta de nuevo en un momento.'
const NOT_AVAILABLE = 'Esta forma de entrar no está disponible en este momento. Escríbenos a admin@oqupa.com.'
const WRONG_ADDRESS = 'Abre Oqupa desde su dirección oficial, oqupa.com, e intenta de nuevo.'
const PROFILE_REFUSED = 'No pudimos guardar tu perfil. Cierra sesión, vuelve a entrar e intenta de nuevo.'

/**
 * The generic sentence for a failure we have no message for yet, with the
 * code in brackets: the person still reads Spanish, and a screenshot is
 * enough for us to know what failed (Jerson, 2026-10-24: "the error text does
 * not tell me what the error was").
 */
function withCode(message: string, code: string): string {
  return code ? `${message} (${code})` : message
}

const PHONE_ERROR_MAP: Record<string, AuthErrorInfo> = {
  'auth/invalid-phone-number': {
    message: 'Número de teléfono inválido. Verifica que esté en formato correcto.',
    isRetryable: true,
  },
  'auth/too-many-requests': {
    message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
    isRetryable: false,
  },
  'auth/quota-exceeded': {
    message: 'Se excedió el límite de verificaciones. Intenta mañana.',
    isRetryable: false,
  },
  'auth/invalid-verification-code': {
    message: 'Código de verificación incorrecto. Revisa el código e intenta de nuevo.',
    isRetryable: true,
  },
  'auth/code-expired': {
    message: 'Código expirado. Usa "Reenviar código" para obtener uno nuevo.',
    isRetryable: true,
  },
  'auth/session-expired': {
    message: 'Código expirado. Usa "Reenviar código" para obtener uno nuevo.',
    isRetryable: true,
  },
  'auth/credential-already-in-use': {
    message: 'Este número ya está asociado a otra cuenta. Usa un número diferente.',
    isRetryable: false,
  },
  // What the web SDK actually throws when the number belongs to another
  // account (Identity Toolkit returns a temporaryProof instead of linking).
  'auth/account-exists-with-different-credential': {
    message: 'Este número ya está asociado a otra cuenta. Usa un número diferente.',
    isRetryable: false,
  },
  'auth/provider-already-linked': {
    message: 'Ya tienes un número vinculado a esta cuenta.',
    isRetryable: false,
  },
  'auth/requires-recent-login': {
    message: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
    isRetryable: false,
  },
  'auth/captcha-check-failed': {
    message: 'Una extensión o la configuración de privacidad de tu navegador está bloqueando la verificación de seguridad de Google.',
    recoveryHint: 'Desactiva las extensiones de privacidad para oqupa.com, prueba en modo incógnito, o usa Chrome o Safari. Si persiste, escríbenos a admin@oqupa.com.',
    isRetryable: true,
  },
  'auth/missing-client-identifier': {
    message: 'Una extensión o la configuración de privacidad de tu navegador está bloqueando la verificación de seguridad de Google.',
    recoveryHint: 'Desactiva las extensiones de privacidad para oqupa.com, prueba en modo incógnito, o usa Chrome o Safari. Si persiste, escríbenos a admin@oqupa.com.',
    isRetryable: true,
  },
  'auth/network-request-failed': {
    message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.',
    isRetryable: true,
  },
  'auth/missing-phone-number': {
    message: 'Ingresa tu número de celular para recibir el código.',
    isRetryable: true,
  },
  'auth/invalid-verification-id': {
    message: 'Este código ya no sirve. Pide un código nuevo con "Reenviar".',
    isRetryable: true,
  },
  'auth/missing-verification-id': {
    message: 'Este código ya no sirve. Pide un código nuevo con "Reenviar".',
    isRetryable: true,
  },
  'auth/missing-verification-code': {
    message: 'Ingresa los 6 dígitos que te enviamos por SMS.',
    isRetryable: true,
  },
  'auth/user-disabled': { message: DISABLED, isRetryable: false },
  'auth/user-token-expired': { message: SESSION, isRetryable: false },
  'auth/invalid-user-token': { message: SESSION, isRetryable: false },
  'auth/operation-not-allowed': {
    message: 'La verificación por SMS no está disponible en este momento. Escríbenos a admin@oqupa.com.',
    isRetryable: false,
  },
  'auth/unauthorized-domain': { message: WRONG_ADDRESS, isRetryable: false },
  'auth/invalid-app-credential': {
    message: 'La verificación de seguridad de Google no se completó. Recarga la página e intenta de nuevo.',
    isRetryable: true,
  },
  'auth/web-storage-unsupported': { message: COOKIES, recoveryHint: COOKIES_HINT, isRetryable: false },
  'auth/timeout': {
    message: 'La verificación tardó demasiado. Intenta de nuevo.',
    isRetryable: true,
  },
  'auth/internal-error': { message: OURS, isRetryable: true },
  // Firestore codes: the number was linked but saving the profile failed.
  'permission-denied': {
    message: 'Tu número quedó verificado, pero no pudimos guardar tu perfil. Recarga la página para continuar.',
    isRetryable: true,
  },
  unavailable: { message: CONNECTION, isRetryable: true },
}

export function getPhoneAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  return PHONE_ERROR_MAP[code] ?? {
    message: withCode('Error al verificar. Intenta de nuevo.', code),
    isRetryable: true,
  }
}

export function getLoginAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { message: 'Correo o contraseña incorrectos.', isRetryable: true }
    case 'auth/too-many-requests':
      return { message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.', isRetryable: false }
    case 'auth/user-disabled':
      return { message: 'Esta cuenta ha sido desactivada.', isRetryable: false }
    case 'auth/network-request-failed':
      return { message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.', isRetryable: true }
    case 'auth/invalid-email':
      return { message: 'Ingresa un correo válido.', isRetryable: true }
    case 'auth/missing-password':
      return { message: 'Ingresa tu contraseña.', isRetryable: true }
    case 'auth/account-exists-with-different-credential':
      return { message: 'Esta cuenta se creó con Google. Usa "Continuar con Google".', isRetryable: false }
    case 'auth/web-storage-unsupported':
      return { message: COOKIES, recoveryHint: COOKIES_HINT, isRetryable: false }
    case 'auth/operation-not-allowed':
      return { message: NOT_AVAILABLE, isRetryable: false }
    case 'auth/internal-error':
      return { message: OURS, isRetryable: true }
    default:
      return { message: withCode('Error al iniciar sesión. Intenta de nuevo.', code), isRetryable: true }
  }
}

export function getRegisterAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/email-already-in-use':
      return {
        message: 'Ya existe una cuenta con ese correo. Inicia sesión en su lugar.',
        isRetryable: false,
      }
    case 'auth/invalid-email':
      return { message: 'Ingresa un correo válido.', isRetryable: true }
    case 'auth/weak-password':
      return {
        message: 'La contraseña es muy débil. Usa al menos 6 caracteres.',
        isRetryable: true,
      }
    case 'auth/operation-not-allowed':
      return {
        message: 'El registro con correo y contraseña está deshabilitado. Contacta a soporte.',
        isRetryable: false,
      }
    case 'auth/too-many-requests':
      return {
        message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
        isRetryable: false,
      }
    case 'auth/network-request-failed':
      return {
        message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.',
        isRetryable: true,
      }
    case 'auth/missing-password':
      return { message: 'Crea una contraseña de al menos 6 caracteres.', isRetryable: true }
    case 'auth/web-storage-unsupported':
      return { message: COOKIES, recoveryHint: COOKIES_HINT, isRetryable: false }
    case 'auth/internal-error':
      return { message: OURS, isRetryable: true }
    case 'permission-denied':
      return { message: PROFILE_REFUSED, isRetryable: true }
    case 'unavailable':
      return { message: CONNECTION, isRetryable: true }
    default:
      return { message: withCode('No pudimos crear tu cuenta. Intenta de nuevo.', code), isRetryable: true }
  }
}

export function getMagicLinkAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/too-many-requests':
      return { message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.', isRetryable: false }
    case 'auth/unauthorized-domain':
    case 'auth/unauthorized-continue-uri':
      return { message: 'Dominio no autorizado. Contacta a soporte.', isRetryable: false }
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return { message: 'Este enlace ha expirado. Solicita uno nuevo.', isRetryable: true }
    case 'auth/invalid-email':
      return { message: 'El correo no coincide con el enlace. Intenta de nuevo.', isRetryable: true }
    case 'auth/network-request-failed':
      return { message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.', isRetryable: true }
    default:
      return { message: withCode('Error al enviar el enlace. Verifica tu correo.', code), isRetryable: true }
  }
}

export function getForgotPasswordAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/too-many-requests':
      return { message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.', isRetryable: false }
    // auth/user-not-found is deliberately NOT special-cased here — doing so
    // would tell the caller whether the address has an account, which is the
    // enumeration leak docs/forgot-password-enumeration-decision.md fixed.
    // It falls through to the generic default message below.
    case 'auth/network-request-failed':
      return { message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.', isRetryable: true }
    default:
      return { message: 'Error al enviar el correo. Verifica tu dirección.', isRetryable: true }
  }
}

/**
 * Google or Apple sign-in. Returns null when the person simply closed the
 * window — that is a choice, not an error, and shows nothing.
 */
export function getSocialSignInError(error: unknown): AuthErrorInfo | null {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null
    case 'auth/popup-blocked':
      return {
        message: 'Tu navegador bloqueó la ventana para entrar. Permite las ventanas emergentes para oqupa.com e intenta de nuevo.',
        isRetryable: true,
      }
    case 'auth/account-exists-with-different-credential':
      return {
        message: 'Ese correo ya tiene una cuenta con contraseña. Entra con tu correo y contraseña.',
        isRetryable: false,
      }
    case 'auth/user-disabled':
      return { message: DISABLED, isRetryable: false }
    case 'auth/network-request-failed':
    case 'unavailable':
      return { message: CONNECTION, isRetryable: true }
    case 'auth/too-many-requests':
      return { message: TOO_MANY, isRetryable: false }
    case 'auth/web-storage-unsupported':
      return { message: COOKIES, recoveryHint: COOKIES_HINT, isRetryable: false }
    case 'auth/operation-not-allowed':
      return { message: NOT_AVAILABLE, isRetryable: false }
    case 'auth/unauthorized-domain':
      return { message: WRONG_ADDRESS, isRetryable: false }
    case 'auth/internal-error':
      return { message: OURS, isRetryable: true }
    case 'permission-denied':
      return { message: PROFILE_REFUSED, isRetryable: true }
    default:
      return { message: withCode('No pudimos entrar. Intenta de nuevo.', code), isRetryable: true }
  }
}

/** Saving a step of the profile (the name) to the database. */
export function getProfileSaveError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return { message: CONNECTION, isRetryable: true }
    case 'permission-denied':
    case 'unauthenticated':
      return { message: 'No pudimos guardar tus datos. Vuelve a iniciar sesión e intenta de nuevo.', isRetryable: false }
    default:
      return { message: withCode('No pudimos guardar tus datos. Intenta de nuevo.', code), isRetryable: true }
  }
}

/** Resending the email-confirmation link. */
export function getEmailResendError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/too-many-requests':
      return {
        message: 'Ya te enviamos varios enlaces. Revisa tu bandeja de entrada y la carpeta de spam, y espera unos minutos antes de pedir otro.',
        isRetryable: false,
      }
    case 'auth/network-request-failed':
      return { message: CONNECTION, isRetryable: true }
    case 'auth/user-token-expired':
    case 'auth/invalid-user-token':
      return { message: SESSION, isRetryable: false }
    case 'auth/user-disabled':
      return { message: DISABLED, isRetryable: false }
    default:
      return { message: withCode('No pudimos reenviar el correo. Intenta de nuevo.', code), isRetryable: true }
  }
}

/** The delete-account request (the deleteUserAccount function). */
export function getAccountDeleteError(error: unknown): AuthErrorInfo {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''
  switch (code) {
    case 'functions/unauthenticated':
      return { message: SESSION, isRetryable: false }
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
    case 'auth/network-request-failed':
      return { message: CONNECTION, isRetryable: true }
    case 'functions/internal':
      return {
        message: 'No pudimos eliminar tu cuenta y no se borró nada. Intenta de nuevo en un momento.',
        isRetryable: true,
      }
    default:
      return { message: withCode('Error al eliminar la cuenta. Intenta de nuevo.', code), isRetryable: true }
  }
}

/** "Cámbialo" on the email step (email sign-up fix, step 2). */
export function getEmailChangeError(error: unknown): AuthErrorInfo & { needsPassword?: boolean } {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/requires-recent-login':
    case 'auth/user-token-expired':
      return { message: EMAIL_CHANGE_COPY.needsPassword, isRetryable: true, needsPassword: true }
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return { message: EMAIL_CHANGE_COPY.wrongPassword, isRetryable: true, needsPassword: true }
    case 'auth/invalid-email':
    case 'auth/invalid-new-email':
    case 'auth/missing-new-email':
      return { message: EMAIL_CHANGE_COPY.invalidEmail, isRetryable: true }
    case 'auth/email-already-in-use':
      return { message: EMAIL_CHANGE_COPY.taken, isRetryable: false }
    case 'auth/too-many-requests':
      return { message: TOO_MANY, isRetryable: false }
    case 'auth/network-request-failed':
      return { message: CONNECTION, isRetryable: true }
    case 'auth/user-disabled':
      return { message: DISABLED, isRetryable: false }
    default:
      return { message: withCode(EMAIL_CHANGE_COPY.failed, code), isRetryable: true }
  }
}

/** The confirmation link for a changed email, opened on the link page. */
export function getEmailChangeLinkError(error: unknown): string {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/email-already-in-use':
      return EMAIL_CHANGE_COPY.taken
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return EMAIL_CHANGE_COPY.linkExpired
    case 'auth/network-request-failed':
      return CONNECTION
    default:
      return withCode(EMAIL_CHANGE_COPY.linkFailed, code)
  }
}
