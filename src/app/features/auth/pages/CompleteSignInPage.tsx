import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { magicLinkSchema, type MagicLinkFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { consumeReturnUrl } from '@/lib/utils'
import { Button, Input, Spinner } from '@/app/components/ui'

type PageState = 'completing' | 'needs-email' | 'error'

export default function CompleteSignInPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuthStore()
  const [state, setState] = useState<PageState>('completing')
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  })

  useEffect(() => {
    const url = window.location.href

    if (!authService.isSignInLink(url)) {
      navigate('/app/login', { replace: true })
      return
    }

    const email = localStorage.getItem('oqupa_signInEmail')
    if (!email) {
      setState('needs-email')
      return
    }

    completeSignIn(email, url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function completeSignIn(email: string, url: string) {
    setState('completing')
    setError(null)
    try {
      await authService.completeMagicLinkSignIn(email, url)
      await refreshUser()
      const { user } = useAuthStore.getState()
      if (!user?.isPhoneVerified) {
        navigate('/app/verify', { replace: true })
      } else {
        navigate(consumeReturnUrl() ?? '/app', { replace: true })
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesion'
      if (message.includes('expired') || message.includes('invalid-action-code')) {
        setError('Este enlace ha expirado. Solicita uno nuevo.')
      } else if (message.includes('invalid-email')) {
        setError('El correo no coincide con el enlace. Intenta de nuevo.')
      } else {
        setError('Error al iniciar sesion. Intenta de nuevo.')
      }
      setState('error')
    }
  }

  async function onSubmit(data: MagicLinkFormData) {
    await completeSignIn(data.email, window.location.href)
  }

  if (state === 'completing') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-text-secondary">
            Iniciando sesion...
          </p>
        </div>
      </div>
    )
  }

  if (state === 'needs-email') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
            Confirma tu correo
          </h1>
          <p className="mt-2 text-center text-base text-text-secondary">
            Ingresa el correo con el que solicitaste el enlace
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

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              Continuar
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <svg
            className="h-8 w-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="mt-4 font-serif text-[28px] font-normal text-text-primary">
          Enlace no valido
        </h1>
        <p className="mt-2 text-base text-text-secondary">{error}</p>
        <Link
          to="/app/login"
          className="mt-6 inline-block text-base font-medium text-secondary hover:text-secondary-hover"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    </div>
  )
}
