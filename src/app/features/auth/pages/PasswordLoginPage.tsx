import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { getLoginAuthError, getSocialSignInError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'
import { emailEntryOutcome } from '../pipelineOrder'
import { EMAIL_CHANGE_COPY, clearPendingEmailChange, readEmailChangeArrival } from '@/lib/emailChange'
import { CONTACT_GATE_STEPS, logContactMilestone, pendingContactErrand } from '@/app/features/listings/contactFunnel'
import PasswordRequirements from '@/app/components/ui/PasswordRequirements'
import { passwordNeedsSentence } from '@/lib/passwordRules'
import { getRegisterAuthError } from '@/lib/authErrors'
import { createEmailAccount, isProfileSaveFailure } from '../lib/createEmailAccount'
import ProfileSaveRetry from '../components/ProfileSaveRetry'
import TermsLine from '../components/TermsLine'

// One door for everyone (docs/new-user-navigation-path.md, step 6): Google is
// the obvious action; "Continuar con correo" reveals email + password on the
// same screen. There is no sign-up vs sign-in choice up front — for Google the
// provider knows; for email, production hides whether an address has an
// account (enumeration protection, measured 2026-08-26), so a mismatch is the
// moment both ways forward are offered: create the account, or recover the
// password. After a successful sign-in the GuestGuard on this route sends the
// person into the pipeline or back to where they came from.

const MISMATCH = 'Ese correo y esa contraseña no coinciden.'

export default function PasswordLoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showEmail, setShowEmail] = useState(
    () => new URLSearchParams(location.search).get('correo') === '1',
  )
  // ?email= prefills the form; ?cambio=1 means the person just confirmed a new
  // email, which ended their session ("Cámbialo", email sign-up fix).
  const [arrival] = useState(() => readEmailChangeArrival(location.search))
  useEffect(() => {
    if (arrival.changed) clearPendingEmailChange()
  }, [arrival.changed])
  const [error, setError] = useState<string | null>(null)
  const [offerWaysForward, setOfferWaysForward] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [profileSaveFailed, setProfileSaveFailed] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: arrival.email },
  })
  const typedPassword = watch('password', '')

  async function onGoogle() {
    setError(null)
    setGoogleBusy(true)
    // Captured first: once signed in, the guard may send the person back and
    // consume the errand before this function resumes.
    const errand = pendingContactErrand()
    try {
      await authService.signInWithGoogle()
      logContactMilestone(CONTACT_GATE_STEPS.signedIn, errand)
    } catch (err) {
      const info = getSocialSignInError(err)
      if (info) toast.error(info.message)
    } finally {
      setGoogleBusy(false)
    }
  }

  async function onSubmit(data: LoginFormData) {
    setError(null)
    setOfferWaysForward(false)
    const errand = pendingContactErrand()
    try {
      await authService.loginWithEmailAndPassword(data.email, data.password)
      logContactMilestone(CONTACT_GATE_STEPS.signedIn, errand)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
      const outcome = emailEntryOutcome(code)
      if (outcome === 'offer-create-or-recover') {
        setError(MISMATCH)
        setOfferWaysForward(true)
        return
      }
      const errorInfo = getLoginAuthError(err)
      setError(errorInfo.message)
      toast.error(errorInfo.message)
    }
  }

  // "Crea tu cuenta con este correo": created right here with what was typed
  // (ADR-046 #9) — the same as the app, no second screen, no second password.
  async function onCreateHere() {
    if (creating) return
    const { email, password } = getValues()
    const missing = passwordNeedsSentence(password)
    if (missing) {
      setError(`Para crear tu cuenta, ${missing.charAt(0).toLowerCase()}${missing.slice(1)}`)
      setShowRules(true)
      return
    }
    setError(null)
    setCreating(true)
    try {
      await createEmailAccount(email.trim(), password)
      navigate('/app/verify', { replace: true })
    } catch (err) {
      if (isProfileSaveFailure(err)) {
        setOfferWaysForward(false)
        setProfileSaveFailed(true)
        return
      }
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
      // The address has an account after all, so the sign-in failed on the
      // password — the ordinary typo, said as one (as the app does). Any
      // other failure (connection, disabled…) is said on its own, without
      // the create button and hints (second review 2026-11-02, item 6).
      if (code === 'auth/email-already-in-use') {
        setError(MISMATCH)
      } else {
        setOfferWaysForward(false)
        setError(getRegisterAuthError(err).message)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Entra a Oqupa
        </h1>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={onGoogle}
            disabled={googleBusy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-primary font-sans text-base font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <GoogleMark />
            {googleBusy ? 'Entrando…' : 'Continuar con Google'}
          </button>

          {!showEmail && (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-secondary font-sans text-base font-medium uppercase text-secondary transition-colors hover:border-secondary-hover hover:text-secondary-hover"
            >
              Continuar con correo
            </button>
          )}
        </div>

        <TermsLine />

        {arrival.changed && (
          <p className="mt-4 rounded-xl bg-background-secondary/60 p-3 text-center text-sm text-text-secondary">
            {EMAIL_CHANGE_COPY.changedSignIn}
          </p>
        )}

        {showEmail && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="tu@correo.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              error={errors.password?.message}
              revealToggle
              {...register('password')}
            />
            {error && <p className="text-sm text-error">{error}</p>}
            {showRules && <PasswordRequirements password={typedPassword} />}
            {profileSaveFailed && <ProfileSaveRetry onDone={() => navigate('/app/verify', { replace: true })} />}
            {offerWaysForward && (
              <div className="rounded-xl bg-background-secondary/60 p-3 text-base">
                <button
                  type="button"
                  onClick={onCreateHere}
                  disabled={creating}
                  className="block min-h-11 w-full text-left font-medium text-secondary hover:text-secondary-hover disabled:opacity-60"
                >
                  {creating ? 'Creando tu cuenta…' : '¿Primera vez en Oqupa? Crea tu cuenta con este correo'}
                </button>
                <Link
                  to="/app/forgot-password"
                  className="flex min-h-11 items-center text-secondary hover:text-secondary-hover"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
                <p className="mt-1 text-sm text-text-secondary">
                  ¿Entraste antes con Google o Apple? Usa «Continuar con Google»; con Apple, entra desde la app de Oqupa.
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  ¿Entrabas con enlace por correo? Esa cuenta aún no tiene contraseña:
                  créala con &ldquo;¿Olvidaste tu contraseña?&rdquo;.
                </p>
              </div>
            )}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Continuar
            </Button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-text-secondary">
          <Link to="/app/register" className="text-secondary hover:text-secondary-hover">
            ¿Primera vez en Oqupa? Crea tu cuenta
          </Link>
          {showEmail && (
            <>
              <span className="mx-2 text-text-tertiary">·</span>
              <Link to="/app/forgot-password" className="text-secondary hover:text-secondary-hover">
                ¿Olvidaste tu contraseña?
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M21.35 11.1H12v2.9h5.35c-.25 1.4-1.6 4.1-5.35 4.1a6.1 6.1 0 1 1 0-12.2c1.75 0 2.9.75 3.55 1.4l2.4-2.3A9.6 9.6 0 0 0 12 2.4a9.6 9.6 0 1 0 0 19.2c5.55 0 9.2-3.9 9.2-9.4 0-.6-.05-1.05-.15-1.1z" />
    </svg>
  )
}
