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
  phoneNeedsReverification = false,
}: {
  signedIn: boolean
  emailVerified: boolean
  /** The server found no phone attached to this account, though our own
   *  record claims one. Checked FIRST: it is the thing the server actually
   *  refused on, and the person is looking at a profile page that tells them
   *  their number is verified. */
  phoneNeedsReverification?: boolean
}): ContactGateCopy {
  if (signedIn && phoneNeedsReverification) {
    // "Otra vez" is doing real work here. Without it the sentence contradicts
    // the screen they just came from, which says the number IS verified.
    return {
      title: 'Escríbele al propietario',
      body: 'Para escribirle al propietario, verifica tu número otra vez.',
      primary: { label: 'VERIFICAR NÚMERO', to: '/app/verify?reverify=phone' },
      secondary: null,
    }
  }
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
    // The entry screen — Google first, email on request — never the old
    // email-only form (Jerson on staging, 2026-08-27).
    primary: { label: 'CREA TU CUENTA', to: '/app/login' },
    secondary: { label: 'Ya tengo cuenta', to: '/app/login' },
  }
}

/** The return address stashed by the gate: the listing, plus the intent. */
export function contactReturnUrl(pathname: string): string {
  return `${pathname}#contactar`
}

/** True when the person came back to a listing to contact — open WhatsApp
 *  for them, no second tap (docs/new-user-navigation-path.md). */
export function wantsAutoContact(hash: string): boolean {
  return hash === '#contactar'
}
