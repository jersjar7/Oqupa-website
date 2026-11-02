import { useState } from 'react'
import { toast } from 'sonner'
import { authService } from '@/services/authService'
import { getPasswordChangeError } from '@/lib/authErrors'
import { passwordNeedsSentence } from '@/lib/passwordRules'
import { Button, Card, Input } from '@/app/components/ui'
import PasswordRequirements from '@/app/components/ui/PasswordRequirements'

/** Accounts that have a password to change — Google-only accounts have none. */
export function isPasswordAccount(
  firebaseUser: { providerData: ReadonlyArray<{ providerId: string }> } | null | undefined,
): boolean {
  return Boolean(firebaseUser?.providerData.some((p) => p.providerId === 'password'))
}

/**
 * "Cambiar contraseña" in Mi perfil (ADR-046 #13): the app's three fields and
 * the same rule. Passwords are never trimmed — a space is a character.
 */
export default function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({})
  const [saving, setSaving] = useState(false)

  function reset() {
    setCurrent('')
    setNext('')
    setConfirm('')
    setErrors({})
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const found: typeof errors = {}
    if (!current) found.current = 'La contraseña actual es requerida'
    const missing = passwordNeedsSentence(next)
    if (missing) found.next = missing
    else if (next === current) found.next = 'La nueva contraseña debe ser diferente'
    if (!confirm) found.confirm = 'Confirma tu nueva contraseña'
    else if (confirm !== next) found.confirm = 'Las contraseñas no coinciden'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    try {
      await authService.changePasswordWithCurrent(current, next)
      toast.success('Contraseña cambiada correctamente')
      reset()
      setOpen(false)
    } catch (err) {
      const info = getPasswordChangeError(err)
      setErrors(info.field === 'current' ? { current: info.message } : { form: info.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-medium uppercase text-text-secondary">Seguridad</h2>
      {!open ? (
        <div className="mt-4">
          <Button onClick={() => setOpen(true)}>
            Cambiar contraseña
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
          <Input
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            revealToggle
            value={current}
            error={errors.current}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            revealToggle
            value={next}
            error={errors.next}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNext(e.target.value)}
          />
          <PasswordRequirements password={next} />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            revealToggle
            value={confirm}
            error={errors.confirm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
          />
          {errors.form && <p className="text-sm text-error">{errors.form}</p>}
          <div className="flex gap-3">
            <Button type="submit" isLoading={saving}>
              Cambiar contraseña
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={() => {
                reset()
                setOpen(false)
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
