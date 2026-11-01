import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /**
   * `center` (default): a centred dialog at every width. `sheet`: a bottom
   * sheet on a phone, the same centred dialog from `sm` up — the website's
   * version of the app's bottom sheets.
   */
  placement?: 'center' | 'sheet'
  /** `white` (default) or the brand `cream`, as the app's cream sheets. */
  surface?: 'white' | 'cream'
  /** Names the dialog for screen readers when it has no title. */
  ariaLabel?: string
  /** Extra `data-*` attributes on the <dialog> (e.g. to mark which dialog it is). */
  dataAttributes?: Record<`data-${string}`, string>
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  placement = 'center',
  surface = 'white',
  ariaLabel,
  dataAttributes,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  const sheet = placement === 'sheet'
  const dialogClass = sheet
    ? 'mx-0 mb-0 mt-auto w-full max-w-none border-none bg-transparent p-0 shadow-none backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md'
    : 'm-auto w-full max-w-lg rounded-2xl border-none bg-transparent p-0 shadow-none backdrop:bg-black/50 backdrop:backdrop-blur-sm'
  const panelClass = [
    surface === 'cream' ? 'bg-cream' : 'bg-white',
    'shadow-large',
    sheet ? 'rounded-t-[22px] sm:rounded-2xl' : 'rounded-2xl',
  ].join(' ')
  const offscreen = sheet ? { opacity: 0, y: 24 } : { opacity: 0, scale: 0.95, y: 8 }

  return (
    <AnimatePresence>
      {isOpen && (
        <dialog
          ref={dialogRef}
          className={dialogClass}
          aria-label={title ? undefined : ariaLabel}
          {...dataAttributes}
          onClick={(e) => {
            if (e.target === dialogRef.current) onClose()
          }}
        >
          <motion.div
            initial={offscreen}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={offscreen}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={panelClass}
          >
            <div className={sheet ? 'p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-6' : 'p-6'}>
              {/* Header */}
              <div className="flex items-center justify-between">
                {title && (
                  <h2 className="text-[28px] font-medium text-text-primary">{title}</h2>
                )}
                <button
                  onClick={onClose}
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className={sheet ? 'mt-2' : 'mt-4'}>{children}</div>
            </div>
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>
  )
}
