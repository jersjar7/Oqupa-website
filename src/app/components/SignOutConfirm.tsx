// "Cerrar sesión" asks first, with the app's words (profile_page.dart), on
// every surface that signs out (audit 2026-11-02, F.2).
import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'

export function useSignOutConfirm(onConfirm: () => Promise<void> | void) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const dialog = (
    <Modal isOpen={open} onClose={() => !busy && setOpen(false)} title="Cerrar sesión">
      <p className="text-sm text-text-secondary">¿Estás seguro que deseas cerrar sesión?</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="h-12 flex-1 rounded-full border-[1.5px] border-secondary font-sans text-sm font-bold uppercase tracking-[1px] text-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
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
          className="h-12 flex-1 rounded-full border-[1.5px] border-error font-sans text-sm font-bold uppercase tracking-[1px] text-error"
        >
          Sí, cerrar sesión
        </button>
      </div>
    </Modal>
  )

  return { ask: () => setOpen(true), dialog }
}
