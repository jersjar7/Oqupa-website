import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { registerSchema, type RegisterFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { getRegisterAuthError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setError(null)
    try {
      await authService.registerWithEmailAndPassword(data.email, data.password)
      // Email verification is non-negotiable: kick off the action link before
      // the user leaves this page so the inbox is already waiting when they
      // hit the verify-email step.
      try {
        await authService.sendEmailVerificationToCurrentUser()
      } catch {
        // Non-fatal — the pipeline's "Reenviar correo" button can retry.
        // Surface a soft toast but still advance to the pipeline.
        toast.error('No pudimos enviar el correo de verificacion. Reenvialo desde el siguiente paso.')
      }
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

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Correo electronico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Contrasena"
            type="password"
            autoComplete="new-password"
            placeholder="Minimo 6 caracteres"
            error={errors.password?.message}
            revealToggle
            {...register('password')}
          />

          <Input
            label="Confirma la contrasena"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contrasena"
            error={errors.confirmPassword?.message}
            revealToggle
            {...register('confirmPassword')}
          />

          {error && <p className="text-sm text-error">{error}</p>}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Crear Cuenta
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Al crear una cuenta aceptas nuestros{' '}
          <Link to="/terms" className="underline hover:text-text-secondary">
            Terminos
          </Link>{' '}
          y nuestra{' '}
          <Link to="/privacy" className="underline hover:text-text-secondary">
            Politica de Privacidad
          </Link>
          .
        </p>

        <div className="mt-4 text-center">
          <span className="text-base text-text-secondary">
            Ya tienes cuenta?{' '}
          </span>
          <Link
            to="/app/login"
            className="text-base font-medium text-secondary hover:text-secondary-hover"
          >
            Inicia sesion
          </Link>
        </div>
      </div>
    </div>
  )
}
