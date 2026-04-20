import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { setPasswordSchema, type SetPasswordFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { Button, Input } from '@/app/components/ui'

type VerificationState =
  | { kind: 'verifying' }
  | { kind: 'ready'; email: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'done' }

/**
 * Handles the "set your first password" flow for users migrating from the
 * magic-link sign-in to email/password. Arrives here with an `oobCode` in
 * the query string — either from Firebase's password-reset email, or from
 * the startPasswordSetup Cloud Function that redirected after verifying
 * the campaign CTA token.
 */
export default function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const oobCode = searchParams.get('oobCode')

  const [state, setState] = useState<VerificationState>({ kind: 'verifying' })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  })

  useEffect(() => {
    let cancelled = false
    async function verify() {
      if (!oobCode) {
        setState({
          kind: 'invalid',
          message: 'Falta el codigo de configuracion. Usa el enlace del correo.',
        })
        return
      }
      try {
        const email = await authService.verifySetPasswordCode(oobCode)
        if (!cancelled) setState({ kind: 'ready', email })
      } catch {
        if (!cancelled) {
          setState({
            kind: 'invalid',
            message:
              'Este enlace expiro o ya fue usado. Solicita uno nuevo desde "Olvidaste tu contrasena".',
          })
        }
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [oobCode])

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
          'Este enlace expiro. Solicita uno nuevo desde "Olvidaste tu contrasena".'
        )
      } else if (message.includes('weak-password')) {
        setSubmitError('La contrasena es muy debil. Usa al menos 6 caracteres.')
      } else {
        setSubmitError('No pudimos configurar tu contrasena. Intenta de nuevo.')
      }
    }
  }

  if (state.kind === 'verifying') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-base text-text-secondary">Verificando enlace...</p>
      </div>
    )
  }

  if (state.kind === 'invalid') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-[28px] font-normal text-text-primary">
            Enlace invalido
          </h1>
          <p className="mt-2 text-base text-text-secondary">{state.message}</p>
          <Link
            to="/app/forgot-password"
            className="mt-6 inline-block text-base font-medium text-secondary hover:text-secondary-hover"
          >
            Solicitar un nuevo enlace
          </Link>
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
          Crea tu contrasena
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Configurando la contrasena para{' '}
          <span className="font-medium text-text-primary">{state.email}</span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <Input
            label="Nueva contrasena"
            type="password"
            autoComplete="new-password"
            placeholder="Minimo 6 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirma la contrasena"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contrasena"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {submitError && <p className="text-sm text-error">{submitError}</p>}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Guardar y entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Al configurar tu contrasena podras iniciar sesion en un solo paso.
        </p>
      </div>
    </div>
  )
}
