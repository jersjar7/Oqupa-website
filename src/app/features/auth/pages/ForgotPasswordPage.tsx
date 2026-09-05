import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/schemas/authSchema'
import { toast } from 'sonner'
import { authService } from '@/services/authService'
import { getForgotPasswordAuthError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setError(null)
    // Always attempt the reset and show the same confirmation regardless of
    // outcome — Firebase silently no-ops for an address with no account, so
    // this page never confirms whether a given email has one (email
    // enumeration protection). See docs/forgot-password-enumeration-decision.md.
    const email = data.email.trim()
    try {
      await authService.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      const errorInfo = getForgotPasswordAuthError(err)
      setError(errorInfo.message)
      toast.error(errorInfo.message)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <svg
              className="h-8 w-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-4 font-serif text-[28px] font-normal text-text-primary">
            Correo enviado
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Revisa tu bandeja de entrada y abre el enlace para crear o restablecer tu contraseña.
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Si no lo encuentras, revisa tu bandeja de spam.
          </p>
          <p className="mt-4 text-sm text-text-secondary">
            ¿No llega? Quizá no tienes cuenta con ese correo.{' '}
            <Link
              to="/app/register"
              className="font-medium text-secondary hover:text-secondary-hover"
            >
              Crear cuenta
            </Link>
          </p>
          <Link
            to="/app/login"
            className="mt-6 inline-block text-base font-medium text-secondary hover:text-secondary-hover"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Crear o recuperar contraseña
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Ingresa tu correo y te enviaremos un enlace para crear tu contraseña
          (si es tu primera vez) o para restablecerla.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full"
          >
            Enviar enlace
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/app/login"
            className="text-base text-secondary hover:text-secondary-hover"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
