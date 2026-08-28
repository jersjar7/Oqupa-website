import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { getLoginAuthError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'
import { emailEntryOutcome } from '../pipelineOrder'

// One door for everyone (docs/new-user-navigation-path.md, step 6): Google is
// the obvious action; "Continuar con correo" reveals email + password on the
// same screen. There is no sign-up vs sign-in choice up front — for Google the
// provider knows; for email, production hides whether an address has an
// account (enumeration protection, measured 2026-08-26), so a mismatch is the
// moment both ways forward are offered: create the account, or recover the
// password. After a successful sign-in the GuestGuard on this route sends the
// person into the pipeline or back to where they came from.

export default function PasswordLoginPage() {
  const location = useLocation()
  const [showEmail, setShowEmail] = useState(
    () => new URLSearchParams(location.search).get('correo') === '1',
  )
  const [error, setError] = useState<string | null>(null)
  const [offerWaysForward, setOfferWaysForward] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const typedEmail = watch('email', '')

  async function onGoogle() {
    setError(null)
    setGoogleBusy(true)
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error('No pudimos entrar con Google. Intenta de nuevo.')
      }
    } finally {
      setGoogleBusy(false)
    }
  }

  async function onSubmit(data: LoginFormData) {
    setError(null)
    setOfferWaysForward(false)
    try {
      await authService.loginWithEmailAndPassword(data.email, data.password)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
      const outcome = emailEntryOutcome(code)
      if (outcome === 'offer-create-or-recover') {
        setError('Ese correo y esa contraseña no coinciden.')
        setOfferWaysForward(true)
        return
      }
      const errorInfo = getLoginAuthError(err)
      setError(errorInfo.message)
      toast.error(errorInfo.message)
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
            {offerWaysForward && (
              <div className="rounded-xl bg-background-secondary/60 p-3 text-sm">
                <Link
                  to={`/app/register${typedEmail ? `?email=${encodeURIComponent(typedEmail)}` : ''}`}
                  className="block font-medium text-secondary hover:text-secondary-hover"
                >
                  ¿Nueva en Oqupa? Crea tu cuenta con este correo
                </Link>
                <Link
                  to="/app/forgot-password"
                  className="mt-2 block text-secondary hover:text-secondary-hover"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
                <p className="mt-2 text-xs text-text-tertiary">
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
            ¿Nueva en Oqupa? Crea tu cuenta
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
