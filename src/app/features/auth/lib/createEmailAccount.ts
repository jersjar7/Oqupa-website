import { toast } from 'sonner'
import { authService } from '@/services/authService'
import { accountCreation } from '@/lib/accountCreation'
import { CONTACT_GATE_STEPS, logContactMilestone, pendingContactErrand } from '@/app/features/listings/contactFunnel'

/** The account exists; only saving its profile failed (offline, refused). */
export function isProfileSaveFailure(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { profileSaveFailed?: unknown }).profileSaveFailed)
}

async function afterProfileSaved(): Promise<void> {
  // Email verification is non-negotiable: the link goes out once the
  // profile exists; the pipeline's "Reenviar correo" covers a failure.
  try {
    await authService.sendEmailVerificationToCurrentUser()
  } catch {
    toast.error('No pudimos enviar el correo de verificación. Reenvíalo desde el siguiente paso.')
  }
  // The store read the profile before it existed. Imported when needed, so
  // the sign-in pages do not load the auth store (and Firebase) just by
  // being imported.
  const { useAuthStore } = await import('@/stores/authStore')
  await useAuthStore.getState().refreshUser().catch(() => {})
  accountCreation.end()
}

/**
 * Creates an email/password account and asks for the confirmation link —
 * the one way both doors create one ("Crea tu cuenta", and "Crea tu cuenta
 * con este correo" under a mismatch on "Entra a Oqupa", ADR-046 #9).
 *
 * The page is held (accountCreation) until the profile is saved. If the
 * account was created but its profile could not be saved, this throws with
 * isProfileSaveFailure() true and the page stays held: it shows why and
 * offers retryNewProfile(). Hostile review 2026-11-02, item 1a.
 */
export async function createEmailAccount(email: string, password: string): Promise<void> {
  const errand = pendingContactErrand()
  accountCreation.begin()
  try {
    await authService.registerWithEmailAndPassword(email, password)
  } catch (err) {
    if (!isProfileSaveFailure(err)) accountCreation.end()
    throw err
  }
  logContactMilestone(CONTACT_GATE_STEPS.signedIn, errand)
  await afterProfileSaved()
}

/** "Reintentar" after a failed profile save. Throws if it fails again. */
export async function retryNewProfile(): Promise<void> {
  await authService.saveNewEmailProfile()
  await afterProfileSaved()
}
