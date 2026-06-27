import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Heart, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useListStore, isSavedInAnyList } from '@/stores/listStore'
import { listService } from '@/services/listService'
import { setReturnUrl } from '@/lib/utils'
import { Spinner } from '@/app/components/ui'
import type { UserList } from '@/types/userList'

interface SaveButtonProps {
  listingId: string
  className?: string
  variant?: 'card' | 'page'
}

export default function SaveButton({ listingId, className = '', variant = 'card' }: SaveButtonProps) {
  const navigate = useNavigate()
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const lists = useListStore((s) => s.lists)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const saved = isSavedInAnyList(lists, listingId)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!firebaseUser) {
      setReturnUrl(window.location.pathname)
      navigate('/app/login')
      return
    }

    if (lists.length === 0) {
      setBusy(true)
      try {
        const listId = await listService.createList(firebaseUser.uid, 'Guardados', true)
        await listService.addListing(firebaseUser.uid, listId, listingId)
        toast.success('Guardado')
      } catch {
        toast.error('No se pudo guardar')
      } finally {
        setBusy(false)
      }
      return
    }

    setOpen((v) => !v)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={busy}
        aria-label={saved ? 'Administrar listas' : 'Guardar propiedad'}
        className={
          variant === 'page'
            ? `inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-sans text-sm font-medium uppercase tracking-wide transition-colors hover:bg-black/5 ${
                saved ? 'border-red-300 text-red-500' : 'border-border text-text-secondary'
              } ${className}`
            : `flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60 ${className}`
        }
      >
        {busy ? (
          <Spinner size="sm" />
        ) : variant === 'page' ? (
          <>
            <Heart className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
            {saved ? 'Guardado' : 'Guardar'}
          </>
        ) : (
          <Heart
            className={`h-4 w-4 transition-colors ${
              saved ? 'fill-red-500 text-red-500' : 'fill-transparent text-white'
            }`}
          />
        )}
      </button>

      {open && firebaseUser && (
        <ListPopover
          listingId={listingId}
          uid={firebaseUser.uid}
          lists={lists}
          anchorRef={buttonRef}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

interface ListPopoverProps {
  listingId: string
  uid: string
  lists: UserList[]
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function ListPopover({ listingId, uid, lists, anchorRef, onClose }: ListPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const style = useMemo(() => {
    const el = anchorRef.current
    if (!el) return {}
    const rect = el.getBoundingClientRect()
    const popoverW = 224
    const vw = window.innerWidth
    let left = rect.right - popoverW
    if (left < 8) left = 8
    if (left + popoverW > vw - 8) left = vw - popoverW - 8
    const top = rect.bottom + 6
    return { position: 'fixed' as const, top, left, width: popoverW, zIndex: 99999 }
  }, [anchorRef])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (
        !popoverRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose()
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, anchorRef])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  async function toggle(list: UserList) {
    setBusy(list.id)
    const contains = list.listingIds.includes(listingId)
    try {
      if (contains) {
        await listService.removeListing(uid, list.id, listingId)
      } else {
        await listService.addListing(uid, list.id, listingId)
      }
    } catch {
      toast.error('Error al actualizar la lista')
    } finally {
      setBusy(null)
    }
  }

  async function handleCreate() {
    const name = newListName.trim()
    if (!name) return
    setBusy('new')
    try {
      const listId = await listService.createList(uid, name)
      await listService.addListing(uid, listId, listingId)
      setCreating(false)
      setNewListName('')
      toast.success(`Agregado a "${name}"`)
    } catch {
      toast.error('No se pudo crear la lista')
    } finally {
      setBusy(null)
    }
  }

  return createPortal(
    <div
      ref={popoverRef}
      style={style}
      className="overflow-hidden rounded-xl border border-border bg-white shadow-large"
    >
      <div className="p-2">
        <p className="px-2 pb-1 pt-0.5 font-sans text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          Guardar en
        </p>

        {lists.map((list) => {
          const checked = list.listingIds.includes(listingId)
          return (
            <button
              key={list.id}
              onClick={() => toggle(list)}
              disabled={busy === list.id}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-background-secondary"
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  checked ? 'border-primary bg-primary' : 'border-border'
                }`}
              >
                {checked && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="flex-1 truncate font-sans text-sm text-text-primary">
                {list.name}
              </span>
              {busy === list.id && <Spinner size="sm" />}
            </button>
          )
        })}

        <div className="my-1 border-t border-border" />

        {creating ? (
          <div className="flex gap-1.5 px-1 pb-1 pt-0.5">
            <input
              ref={inputRef}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewListName('')
                }
              }}
              placeholder="Nombre de la lista"
              className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1.5 font-sans text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleCreate}
              disabled={!newListName.trim() || busy === 'new'}
              className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 font-sans text-xs font-bold uppercase text-white transition-opacity disabled:opacity-50"
            >
              {busy === 'new' ? <Spinner size="sm" /> : 'OK'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 font-sans text-sm text-primary transition-colors hover:bg-background-secondary"
          >
            <Plus className="h-4 w-4" />
            Nueva lista
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
