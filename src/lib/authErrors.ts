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
  'auth/provider-already-linked': {
    message: 'Ya tienes un número vinculado a esta cuenta.',
    isRetryable: false,
  },
  'auth/requires-recent-login': {
    message: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
    isRetryable: false,
  },
  'auth/captcha-check-failed': {
    message: 'La verificación de seguridad de Google falló. Suele ser un bloqueador de anuncios o una extensión del navegador.',
    recoveryHint: 'Recarga la página, prueba en modo incógnito, o desde Chrome o Safari. Si persiste, escríbenos a admin@oqupa.com.',
    isRetryable: true,
  },
  'auth/missing-client-identifier': {
    message: 'La verificación de seguridad de Google falló. Suele ser un bloqueador de anuncios o una extensión del navegador.',
    recoveryHint: 'Recarga la página, prueba en modo incógnito, o desde Chrome o Safari. Si persiste, escríbenos a admin@oqupa.com.',
    isRetryable: true,
  },
  'auth/network-request-failed': {
    message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.',
    isRetryable: true,
  },
}

export function getPhoneAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  return PHONE_ERROR_MAP[code] ?? {
    message: 'Error al verificar. Intenta de nuevo.',
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
    default:
      return { message: 'Error al iniciar sesión. Intenta de nuevo.', isRetryable: true }
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
    default:
      return { message: 'No pudimos crear tu cuenta. Intenta de nuevo.', isRetryable: true }
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
      return { message: 'Error al enviar el enlace. Verifica tu correo.', isRetryable: true }
  }
}

export function getForgotPasswordAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/too-many-requests':
      return { message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.', isRetryable: false }
    case 'auth/user-not-found':
      return { message: 'No existe una cuenta con ese correo.', isRetryable: true }
    case 'auth/network-request-failed':
      return { message: 'Error de conexión a internet. Verifica tu conexión e intenta de nuevo.', isRetryable: true }
    default:
      return { message: 'Error al enviar el correo. Verifica tu dirección.', isRetryable: true }
  }
}
