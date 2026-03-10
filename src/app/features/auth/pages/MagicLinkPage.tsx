import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { magicLinkSchema, type MagicLinkFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { consumeReturnUrl } from '@/lib/utils'
import { Button, Input } from '@/app/components/ui'

export default function MagicLinkPage() {
  const navigate = useNavigate()
  const { firebaseUser, user, isInitialized, isLoading } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isInitialized || isLoading) return
    if (firebaseUser) {
      navigate(user?.isPhoneVerified ? (consumeReturnUrl() ?? '/app') : '/app/verify', { replace: true })
    }
  }, [firebaseUser, user, isInitialized, isLoading, navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  })

  const sendLink = useCallback(
    async (email: string) => {
      setError(null)
      try {
        await authService.sendMagicLink(email)
        setSentEmail(email)
        setCooldown(60)
      } catch (err) {
        console.error('Magic link error:', err)
        const message =
          err instanceof Error ? err.message : 'Error al enviar el enlace'
        if (message.includes('too-many-requests')) {
          setError('Demasiados intentos. Intenta de nuevo mas tarde.')
        } else if (message.includes('unauthorized-domain') || message.includes('unauthorized-continue-uri')) {
          setError('Dominio no autorizado. Agrega este dominio en Firebase Console.')
        } else {
          setError('Error al enviar el enlace. Verifica tu correo.')
        }
      }
    },
    []
  )

  async function onSubmit(data: MagicLinkFormData) {
    await sendLink(data.email)
  }

  // Link sent state
  if (sentEmail) {
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
            Revisa tu correo
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Enviamos un enlace de acceso a{' '}
            <span className="font-medium text-text-primary">{sentEmail}</span>
          </p>

          {error && (
            <p className="mt-4 text-sm text-error">{error}</p>
          )}

          <Button
            onClick={() => sendLink(sentEmail)}
            disabled={cooldown > 0}
            className="mt-6 w-full"
          >
            {cooldown > 0 ? `Reenviar enlace (${cooldown}s)` : 'Reenviar enlace'}
          </Button>

          <div className="mt-4">
            <button
              onClick={() => {
                setSentEmail(null)
                setError(null)
              }}
              className="text-base text-secondary hover:text-secondary-hover"
            >
              Usar otro correo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Email form state
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
          Ingresar
        </h1>
        <p className="mt-2 text-center text-base text-text-secondary">
          Te enviaremos un enlace para acceder a tu cuenta
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
            Enviar enlace
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-6 text-center">
          <Link
            to="/app/login/password"
            className="text-base text-text-tertiary hover:text-text-secondary"
          >
            Iniciar con contrasena
          </Link>
        </div>
      </div>
    </div>
  )
}
