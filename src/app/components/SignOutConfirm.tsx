// "Cerrar sesión" asks first, with the app's words (profile_page.dart), on
// every surface that signs out (audit 2026-11-02, F.2).
import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'
import Button from '@/app/components/ui/Button'
import DialogActions from '@/app/components/ui/DialogActions'

export function useSignOutConfirm(onConfirm: () => Promise<void> | void) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const dialog = (
    <Modal isOpen={open} onClose={() => !busy && setOpen(false)} title="Cerrar sesión">
      <p className="text-sm text-text-secondary">¿Estás seguro que deseas cerrar sesión?</p>
      <DialogActions>
        <Button variant="text" disabled={busy} onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
            } finally {
              setBusy(false)
              setOpen(false)
            }
          }}
        >
          Sí, cerrar sesión
        </Button>
      </DialogActions>
    </Modal>
  )

  return { ask: () => setOpen(true), dialog }
}
