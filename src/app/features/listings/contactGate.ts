// The WhatsApp gate copy — what a person reads when they press "Escríbele por
// WhatsApp" without an account, or signed in without a verified phone.
//
// Approved in docs/new-user-navigation-path.md (2026-08-26). The app shows the
// same words (contact_gate_modal.dart); both test suites pin them so the two
// cannot drift apart. Not a security boundary: getListingContact refuses the
// number server-side regardless.

export interface GateAction {
  label: string
  to: string
}

export interface ContactGateCopy {
  title: string
  body: string
  primary: GateAction
  /** null when the only alternative is closing the dialog */
  secondary: GateAction | null
}

export function contactGateCopy({
  signedIn,
  emailVerified,
}: {
  signedIn: boolean
  emailVerified: boolean
}): ContactGateCopy {
  if (signedIn && !emailVerified) {
    // /app/verify will ask for the email link (and maybe a name) before the
    // phone, so this is more than one step — say so honestly.
    return {
      title: 'Escríbele al propietario',
      body: 'Para escribirle al propietario, termina de verificar tu cuenta.',
      primary: { label: 'VERIFICAR CUENTA', to: '/app/verify' },
      secondary: null,
    }
  }
  if (signedIn) {
    return {
      title: 'Escríbele al propietario',
      body: 'Para escribirle al propietario, verifica tu número. Solo esta vez.',
      primary: { label: 'VERIFICAR NÚMERO', to: '/app/verify' },
      secondary: null,
    }
  }
  return {
    title: 'Escríbele al propietario',
    body:
      'Para escribirle al propietario, crea tu cuenta y verifica tu número. Es gratis y toma unos minutos.',
    primary: { label: 'CREA TU CUENTA', to: '/app/register' },
    secondary: { label: 'Ya tengo cuenta', to: '/app/login' },
  }
}
