import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { Button, Input } from '@/app/components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { firebaseUser, user, isInitialized } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isInitialized) return
    if (firebaseUser) {
      navigate(user?.isPhoneVerified ? '/app' : '/app/verify', { replace: true })
    }
  }, [firebaseUser, user, isInitialized, navigate])

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
      navigate('/app/verify')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al crear cuenta'
      if (message.includes('email-already-in-use')) {
        setError('Este correo ya tiene una cuenta. Intenta iniciar sesion.')
      } else if (message.includes('weak-password')) {
        setError('La contrasena es muy debil. Usa al menos 6 caracteres.')
      } else {
        setError('Error al crear cuenta. Intenta de nuevo.')
      }
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Crear Cuenta
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Registrate para publicar propiedades en Oqupa
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
            autoComplete="new-password"
            placeholder="Minimo 6 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirmar contrasena"
            type="password"
            autoComplete="new-password"
            placeholder="Repite tu contrasena"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full"
          >
            Crear Cuenta
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-6 text-center">
          <p className="text-base text-text-secondary">
            Ya tienes cuenta?{' '}
            <Link
              to="/app/login"
              className="font-medium text-secondary hover:text-secondary-hover"
            >
              Iniciar Sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
