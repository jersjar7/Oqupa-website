import { toast } from 'sonner'
import { authService } from '@/services/authService'
import { CONTACT_GATE_STEPS, logContactMilestone, pendingContactErrand } from '@/app/features/listings/contactFunnel'

/**
 * Creates an email/password account and asks for the confirmation link —
 * the one way both doors create one ("Crea tu cuenta", and "Crea tu cuenta
 * con este correo" under a mismatch on "Entra a Oqupa", ADR-046 #9).
 * Email verification stays mandatory: the link goes out before the person
 * leaves the page, and the pipeline's "Reenviar correo" covers a failure.
 * Throws whatever creating the account threw.
 */
export async function createEmailAccount(email: string, password: string): Promise<void> {
  const errand = pendingContactErrand()
  await authService.registerWithEmailAndPassword(email, password)
  logContactMilestone(CONTACT_GATE_STEPS.signedIn, errand)
  try {
    await authService.sendEmailVerificationToCurrentUser()
  } catch {
    toast.error('No pudimos enviar el correo de verificación. Reenvíalo desde el siguiente paso.')
  }
}
