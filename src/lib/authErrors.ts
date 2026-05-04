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
    message: 'Numero de telefono invalido. Verifica que este en formato correcto.',
    isRetryable: true,
  },
  'auth/too-many-requests': {
    message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
    isRetryable: false,
  },
  'auth/quota-exceeded': {
    message: 'Se excedio el limite de verificaciones. Intenta manana.',
    isRetryable: false,
  },
  'auth/invalid-verification-code': {
    message: 'Codigo de verificacion incorrecto. Revisa el codigo e intenta de nuevo.',
    isRetryable: true,
  },
  'auth/code-expired': {
    message: 'Codigo expirado. Usa "Reenviar codigo" para obtener uno nuevo.',
    isRetryable: true,
  },
  'auth/session-expired': {
    message: 'Codigo expirado. Usa "Reenviar codigo" para obtener uno nuevo.',
    isRetryable: true,
  },
  'auth/credential-already-in-use': {
    message: 'Este numero ya esta asociado a otra cuenta. Usa un numero diferente.',
    isRetryable: false,
  },
  'auth/provider-already-linked': {
    message: 'Ya tienes un numero vinculado a esta cuenta.',
    isRetryable: false,
  },
  'auth/requires-recent-login': {
    message: 'Tu sesion ha expirado. Inicia sesion nuevamente.',
    isRetryable: false,
  },
  'auth/captcha-check-failed': {
    message: 'La verificacion de seguridad fallo. Recarga la pagina e intenta de nuevo.',
    recoveryHint: 'Si persiste, intenta desde otro navegador.',
    isRetryable: true,
  },
  'auth/missing-client-identifier': {
    message: 'La verificacion de seguridad fallo. Recarga la pagina e intenta de nuevo.',
    recoveryHint: 'Si persiste, intenta desde otro navegador.',
    isRetryable: true,
  },
  'auth/network-request-failed': {
    message: 'Error de conexion a internet. Verifica tu conexion e intenta de nuevo.',
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
      return { message: 'Correo o contrasena incorrectos.', isRetryable: true }
    case 'auth/too-many-requests':
      return { message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.', isRetryable: false }
    case 'auth/user-disabled':
      return { message: 'Esta cuenta ha sido desactivada.', isRetryable: false }
    case 'auth/network-request-failed':
      return { message: 'Error de conexion a internet. Verifica tu conexion e intenta de nuevo.', isRetryable: true }
    default:
      return { message: 'Error al iniciar sesion. Intenta de nuevo.', isRetryable: true }
  }
}

export function getRegisterAuthError(error: unknown): AuthErrorInfo {
  const code = extractFirebaseErrorCode(error)
  switch (code) {
    case 'auth/email-already-in-use':
      return {
        message: 'Ya existe una cuenta con ese correo. Inicia sesion en su lugar.',
        isRetryable: false,
      }
    case 'auth/invalid-email':
      return { message: 'Ingresa un correo valido.', isRetryable: true }
    case 'auth/weak-password':
      return {
        message: 'La contrasena es muy debil. Usa al menos 6 caracteres.',
        isRetryable: true,
      }
    case 'auth/operation-not-allowed':
      return {
        message: 'El registro con correo y contrasena esta deshabilitado. Contacta a soporte.',
        isRetryable: false,
      }
    case 'auth/too-many-requests':
      return {
        message: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
        isRetryable: false,
      }
    case 'auth/network-request-failed':
      return {
        message: 'Error de conexion a internet. Verifica tu conexion e intenta de nuevo.',
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
      return { message: 'Error de conexion a internet. Verifica tu conexion e intenta de nuevo.', isRetryable: true }
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
      return { message: 'Error de conexion a internet. Verifica tu conexion e intenta de nuevo.', isRetryable: true }
    default:
      return { message: 'Error al enviar el correo. Verifica tu direccion.', isRetryable: true }
  }
}
