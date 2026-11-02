import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { registerSchema, type RegisterFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { getRegisterAuthError, getSocialSignInError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'
import PasswordRequirements from '@/app/components/ui/PasswordRequirements'
import { CONTACT_GATE_STEPS, logContactMilestone, pendingContactErrand } from '@/app/features/listings/contactFunnel'
import { createEmailAccount } from '../lib/createEmailAccount'
import TermsLine from '../components/TermsLine'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  // Google first, email one tap away — the same screen as sign-in and the
  // app's (email sign-up fix, step 1). Someone who already typed their email
  // on the sign-in screen gets the form open.
  const [showEmail, setShowEmail] = useState(() => Boolean(new URLSearchParams(location.search).get('email')))

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    // The entry screen hands over the email the person already typed.
    defaultValues: { email: new URLSearchParams(location.search).get('email') ?? '' },
  })

  const passwordValue = watch('password', '')

  async function onSubmit(data: RegisterFormData) {
    setError(null)
    try {
      await createEmailAccount(data.email, data.password)
      navigate('/app/verify', { replace: true })
    } catch (err) {
      const errorInfo = getRegisterAuthError(err)
      setError(errorInfo.message)
      toast.error(errorInfo.message)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Crea tu cuenta
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Empieza a publicar en Oqupa
        </p>

        <button
          type="button"
          onClick={async () => {
            setError(null)
            const errand = pendingContactErrand()
            try {
              await authService.signInWithGoogle()
              logContactMilestone(CONTACT_GATE_STEPS.signedIn, errand)
            } catch (err) {
              const info = getSocialSignInError(err)
              if (info) toast.error(info.message)
            }
          }}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-primary font-sans text-base font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-primary-hover"
        >
          Continuar con Google
        </button>
        {!showEmail && (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-secondary font-sans text-base font-medium uppercase text-secondary transition-colors hover:border-secondary-hover hover:text-secondary-hover"
          >
            Continuar con correo
          </button>
        )}
        {showEmail && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              error={errors.password?.message}
              revealToggle
              {...register('password')}
            />
            <PasswordRequirements password={passwordValue} />

            {error && <p className="text-sm text-error">{error}</p>}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Crear cuenta
            </Button>
          </form>
        )}

        <TermsLine />

        <div className="mt-4 text-center">
          <span className="text-base text-text-secondary">
            ¿Ya tienes cuenta?{' '}
          </span>
          <Link
            to="/app/login"
            className="text-base font-medium text-secondary hover:text-secondary-hover"
          >
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
