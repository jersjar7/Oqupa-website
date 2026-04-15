import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { Button, Input } from '@/app/components/ui'

export default function PasswordLoginPage() {
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setError(null)
    try {
      await authService.loginWithEmailAndPassword(data.email, data.password)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesion'
      if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('user-not-found')) {
        setError('Correo o contrasena incorrectos')
      } else if (message.includes('too-many-requests')) {
        setError('Demasiados intentos. Intenta de nuevo mas tarde.')
      } else {
        setError('Error al iniciar sesion. Intenta de nuevo.')
      }
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Iniciar con Contrasena
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Ingresa a tu cuenta de Oqupa
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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
            autoComplete="current-password"
            placeholder="Tu contrasena"
            error={errors.password?.message}
            {...register('password')}
          />

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full"
          >
            Iniciar Sesion
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/app/forgot-password"
            className="text-base text-secondary hover:text-secondary-hover"
          >
            Olvidaste tu contrasena?
          </Link>
        </div>

        <div className="mt-6 border-t border-border pt-6 text-center">
          <Link
            to="/app/login"
            className="text-base text-text-tertiary hover:text-text-secondary"
          >
            Usar enlace magico
          </Link>
        </div>
      </div>
    </div>
  )
}
