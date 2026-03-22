import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { magicLinkSchema, type MagicLinkFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { consumeReturnUrl } from '@/lib/utils'
import { Button, Input } from '@/app/components/ui'

import appleLogo from '@/assets/images/apple-logo.webp'
import googleLogo from '@/assets/images/google-logo.webp'

export default function MagicLinkPage() {
  const navigate = useNavigate()
  const { firebaseUser, user, isInitialized, isLoading } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [oauthLoading, setOauthLoading] = useState(false)

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

  async function handleAppleSignIn() {
    setOauthLoading(true)
    setError(null)
    try {
      await authService.signInWithApple()
    } catch (err) {
      console.error('Apple sign-in error:', err)
      setError('Error al iniciar sesion con Apple. Intenta de nuevo.')
    } finally {
      setOauthLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setOauthLoading(true)
    setError(null)
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in error:', err)
      setError('Error al iniciar sesion con Google. Intenta de nuevo.')
    } finally {
      setOauthLoading(false)
    }
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
          <p className="mt-1 text-sm text-text-tertiary">
            Si no lo encuentras, revisa tu bandeja de spam.
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
          Iniciar Sesion
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

        {/* OAuth divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-text-tertiary">o continuar con</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* OAuth buttons */}
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={oauthLoading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-black bg-black text-base font-medium text-white hover:bg-black/90 disabled:opacity-50"
          >
            <img src={appleLogo} alt="Apple" className="h-5 w-5 brightness-0 invert" />
            Continuar con Apple
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={oauthLoading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-border bg-white text-base font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50"
          >
            <img src={googleLogo} alt="Google" className="h-5 w-5" />
            Continuar con Google
          </button>
        </div>

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
