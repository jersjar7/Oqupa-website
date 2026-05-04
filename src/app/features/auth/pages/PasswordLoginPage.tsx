import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginFormData } from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { getLoginAuthError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'

export default function PasswordLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [legacyNotice, setLegacyNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setError(null)
    setLegacyNotice(null)
    try {
      // Smart recovery: if this account only has the emailLink provider
      // (a legacy magic-link user), they don't have a password yet.
      // Send them the set-password flow instead of failing with
      // "wrong password" — matches the auth migration campaign.
      const methods = await authService.getSignInMethods(data.email)
      const hasPassword = methods.includes('password')
      const hasEmailLinkOnly =
        methods.length > 0 && !hasPassword && methods.includes('emailLink')
      if (hasEmailLinkOnly) {
        await authService.sendPasswordSetupEmail(data.email)
        setLegacyNotice(
          'Tu cuenta aun no tiene contrasena. Te enviamos un enlace a ' +
            data.email +
            ' para crear una en un solo paso.'
        )
        return
      }

      await authService.loginWithEmailAndPassword(data.email, data.password)
    } catch (err) {
      // Master introduced centralized auth-error handling via getLoginAuthError
      // + sonner toast. Keep that path; it subsumes the earlier ad-hoc
      // message-matching code development had.
      const errorInfo = getLoginAuthError(err)
      setError(errorInfo.message)
      toast.error(errorInfo.message)
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

        {/* Migration notice — visible to all users so legacy users (who */}
        {/* previously signed in with magic link) know what's changed and */}
        {/* how to set up their new password. Collapsed by default so it */}
        {/* doesn't distract users who already have a password. */}
        <details className="mt-6 rounded-xl border border-border bg-background-secondary/60 p-3 text-sm [&[open]>summary>.arrow]:rotate-180">
          <summary className="flex cursor-pointer list-none items-start gap-2 text-text-primary [&::-webkit-details-marker]:hidden">
            <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="flex-1">
              <strong>¿Usabas enlace mágico para entrar?</strong>{' '}
              <span className="text-text-secondary">Ahora entramos con contraseña.</span>{' '}
              <span className="font-medium text-secondary">Ver pasos</span>
              <svg aria-hidden="true" className="arrow ml-1 inline-block h-3 w-3 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </summary>
          <div className="mt-3 border-t border-border pt-3 text-text-secondary">
            <p className="mb-2">
              Si creaste tu cuenta con enlace mágico antes del <strong>20 de abril de 2026</strong>, aún no tienes contraseña. Crea la tuya así:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Haz clic en{' '}
                <Link to="/app/forgot-password" className="font-medium text-secondary underline">
                  ¿Olvidaste tu contraseña?
                </Link>{' '}
                abajo.
              </li>
              <li>Ingresa tu correo de Oqupa.</li>
              <li>Abre el enlace que te enviemos por correo.</li>
              <li>Elige tu nueva contraseña y listo.</li>
            </ol>
          </div>
        </details>

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
            autoComplete="current-password"
            placeholder="Tu contrasena"
            error={errors.password?.message}
            revealToggle
            {...register('password')}
          />

          {error && <p className="text-sm text-error">{error}</p>}

          {legacyNotice && (
            <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
              <p className="text-sm text-text-primary">{legacyNotice}</p>
              <p className="mt-1 text-xs text-text-secondary">
                Revisa tu bandeja de entrada (y spam). El enlace expira en 1 hora.
              </p>
            </div>
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

        <div className="mt-6 border-t border-border pt-4 text-center">
          <span className="text-base text-text-secondary">
            No tienes cuenta?{' '}
          </span>
          <Link
            to="/app/register"
            className="text-base font-medium text-secondary hover:text-secondary-hover"
          >
            Crea una
          </Link>
        </div>
      </div>
    </div>
  )
}
