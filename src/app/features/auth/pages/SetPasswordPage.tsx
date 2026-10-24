import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { setPasswordSchema, type SetPasswordFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { Button, Input } from '@/app/components/ui'
import PasswordRequirements from '@/app/components/ui/PasswordRequirements'
import { EMAIL_CHANGE_COPY, loginUrlAfterEmailChange } from '@/lib/emailChange'
import { getEmailChangeLinkError } from '@/lib/authErrors'

type ActionMode = 'resetPassword' | 'verifyEmail' | 'verifyAndChangeEmail' | 'recoverEmail' | 'unknown'

type VerificationState =
  | { kind: 'verifying' }
  | { kind: 'ready'; email: string }                    // password setup form
  | { kind: 'emailVerified'; email: string }            // verifyEmail success
  | { kind: 'emailChanged'; email: string }             // verifyAndChangeEmail success
  | { kind: 'emailRestored'; email: string }            // recoverEmail success
  | { kind: 'invalid'; message: string }
  | { kind: 'done' }

/**
 * Auth-action landing page used by Firebase email links. Branches on the
 * `mode` query param:
 *
 *   - mode=resetPassword (or unset) — set/reset the user's password
 *   - mode=verifyEmail              — apply the email-verification code
 *   - mode=verifyAndChangeEmail     — "Cámbialo": switch to the new email and
 *                                     confirm it (ends the old session)
 *   - mode=recoverEmail             — the undo link sent to the old address
 *
 * The email-verification branch is what Flutter's
 * `firebaseUser.sendEmailVerification()` triggers. The Firebase Console
 * email template is configured to point at this same URL for both modes,
 * so we read the mode at runtime and dispatch.
 */
export default function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const oobCode = searchParams.get('oobCode')
  const mode = (searchParams.get('mode') ?? 'resetPassword') as ActionMode

  const [state, setState] = useState<VerificationState>({ kind: 'verifying' })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  })

  const passwordValue = watch('password', '')

  useEffect(() => {
    let cancelled = false

    async function verify() {
      if (!oobCode) {
        setState({
          kind: 'invalid',
          message: 'Falta el código de configuración. Usa el enlace del correo.',
        })
        return
      }

      try {
        if (mode === 'verifyAndChangeEmail') {
          const { newEmail } = await authService.applyEmailChangeCode(oobCode)
          if (!cancelled) setState({ kind: 'emailChanged', email: newEmail })
          return
        }
        if (mode === 'recoverEmail') {
          const { restoredEmail } = await authService.applyRecoverEmailCode(oobCode)
          if (!cancelled) setState({ kind: 'emailRestored', email: restoredEmail })
          return
        }
        if (mode === 'verifyEmail') {
          // Email verification flow: read email + apply code
          const email = await authService.checkEmailVerificationCode(oobCode)
          await authService.applyEmailVerificationCode(oobCode)
          if (!cancelled) setState({ kind: 'emailVerified', email })
        } else {
          // Password setup / reset flow (existing behavior)
          const email = await authService.verifySetPasswordCode(oobCode)
          if (!cancelled) setState({ kind: 'ready', email })
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'invalid',
            message:
              mode === 'verifyAndChangeEmail' || mode === 'recoverEmail'
                ? getEmailChangeLinkError(err)
                : mode === 'verifyEmail'
                ? 'Este enlace de verificación expiró o ya fue usado. Solicita uno nuevo desde la app.'
                : 'Este enlace expiró o ya fue usado. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".',
          })
        }
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [oobCode, mode])

  async function onSubmit(data: SetPasswordFormData) {
    if (state.kind !== 'ready' || !oobCode) return
    setSubmitError(null)
    try {
      await authService.confirmSetPassword(oobCode, data.password, state.email)
      setState({ kind: 'done' })
      navigate('/app', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error'
      if (message.includes('expired-action-code')) {
        setSubmitError(
          'Este enlace expiró. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".'
        )
      } else if (message.includes('weak-password')) {
        setSubmitError('La contraseña es muy débil. Usa al menos 6 caracteres.')
      } else {
        setSubmitError('No pudimos configurar tu contraseña. Intenta de nuevo.')
      }
    }
  }

  if (state.kind === 'verifying') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-base text-text-secondary">
          {mode === 'resetPassword' || mode === 'unknown' ? 'Verificando enlace...' : 'Verificando tu correo...'}
        </p>
      </div>
    )
  }

  if (state.kind === 'invalid') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-[28px] font-normal text-text-primary">
            Enlace inválido
          </h1>
          <p className="mt-2 text-base text-text-secondary">{state.message}</p>
          {(mode === 'resetPassword' || mode === 'unknown') && (
            <Link
              to="/app/forgot-password"
              className="mt-6 inline-block text-base font-medium text-secondary hover:text-secondary-hover"
            >
              Solicitar un nuevo enlace
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (state.kind === 'emailChanged') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-[28px] font-normal text-text-primary">
            {EMAIL_CHANGE_COPY.linkDoneTitle}
          </h1>
          <p className="mt-2 text-base text-text-secondary">{EMAIL_CHANGE_COPY.linkDone(state.email)}</p>
          <Button
            type="button"
            onClick={() => navigate(loginUrlAfterEmailChange(state.email), { replace: true })}
            className="mt-6 w-full"
          >
            Entrar
          </Button>
          <p className="mt-4 text-sm text-text-tertiary">
            Si empezaste en la app de Oqupa en tu teléfono, vuelve a la app y entra ahí.
          </p>
        </div>
      </div>
    )
  }

  if (state.kind === 'emailRestored') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-[28px] font-normal text-text-primary">Correo restaurado</h1>
          <p className="mt-2 text-base text-text-secondary">
            Restauramos tu correo{' '}
            <span className="font-medium text-text-primary">{state.email}</span>. Si no pediste el
            cambio, crea una contraseña nueva desde &ldquo;¿Olvidaste tu contraseña?&rdquo;.
          </p>
          <Link
            to="/app/forgot-password"
            className="mt-6 inline-block text-base font-medium text-secondary hover:text-secondary-hover"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    )
  }

  if (state.kind === 'emailVerified') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-[28px] font-normal text-text-primary">
            Correo verificado
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Tu correo{' '}
            <span className="font-medium text-text-primary">{state.email}</span>{' '}
            quedó verificado.
          </p>
          <Button
            type="button"
            onClick={() => navigate('/app/verify', { replace: true })}
            className="mt-6 w-full"
          >
            Continuar
          </Button>
          <p className="mt-4 text-sm text-text-tertiary">
            Si llegaste aquí desde la app de Oqupa en tu teléfono, vuelve a
            la app: detectará la verificación automáticamente.
          </p>
        </div>
      </div>
    )
  }

  // `kind === 'done'` is a momentary state before navigate() unmounts this page.
  // Render nothing to avoid a flash of the form and satisfy type narrowing.
  if (state.kind === 'done') return null

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Crea tu contraseña
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Configurando la contraseña para{' '}
          <span className="font-medium text-text-primary">{state.email}</span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            revealToggle
            {...register('password')}
          />
          <PasswordRequirements password={passwordValue} />

          <Input
            label="Confirma la contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            error={errors.confirmPassword?.message}
            revealToggle
            {...register('confirmPassword')}
          />

          {submitError && <p className="text-sm text-error">{submitError}</p>}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Guardar y entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Al configurar tu contraseña podrás iniciar sesión en un solo paso.
        </p>
      </div>
    </div>
  )
}
