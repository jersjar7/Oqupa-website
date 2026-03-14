import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { magicLinkSchema, type MagicLinkFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { consumeReturnUrl } from '@/lib/utils'
import { Button, Input } from '@/app/components/ui'

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

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
            <AppleIcon />
            Continuar con Apple
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={oauthLoading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-border bg-white text-base font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50"
          >
            <GoogleIcon />
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
