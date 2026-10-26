import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useListStore, isSavedInAnyList } from '@/stores/listStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { isAccountReady } from '@/lib/accountReady'
import { listService } from '@/services/listService'
import { Spinner } from '@/app/components/ui'
import type { UserList } from '@/types/userList'

interface SaveButtonProps {
  listingId: string
  className?: string
  /** 'card': white heart on a dark circle, over a photo. 'plain': just the
   *  heart — faded red outline, full red once saved — on a white card (the
   *  slim map card; Jerson, 2026-10-25). 'page': the labelled button. */
  variant?: 'card' | 'plain' | 'page'
}

/** Where the "Guardar en" menu goes (px from the top of the screen): below
 *  the heart, or above it when there is no room below — it ran off the bottom
 *  of the phone screen (2026-10-25). Never above the top of the screen. */
export function popoverTop({ anchorTop, anchorBottom, popoverHeight, viewportHeight, gap = 6, margin = 8 }: {
  anchorTop: number
  anchorBottom: number
  popoverHeight: number
  viewportHeight: number
  gap?: number
  margin?: number
}): number {
  const below = anchorBottom + gap
  if (below + popoverHeight <= viewportHeight - margin) return below
  return Math.max(margin, anchorTop - gap - popoverHeight)
}

export default function SaveButton({ listingId, className = '', variant = 'card' }: SaveButtonProps) {
  const authUser = useAuthStore((s) => s.firebaseUser)
  // Until the account is fully set up, hearts save in the browser; the saves
  // move in when it is ready (hostile review 2026-10-25).
  const ready = useAuthStore((s) => isAccountReady(s.firebaseUser, s.user))
  const firebaseUser = ready ? authUser : null
  const deviceIds = useDeviceSavesStore((s) => s.ids)
  const toggleDeviceSave = useDeviceSavesStore((s) => s.toggle)
  const lists = useListStore((s) => s.lists)
  const listsArrived = useListStore((s) => !!authUser && s.loadedUid === authUser.uid)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // A visitor's saves live in this browser (Guardados sin cuenta, 2026-10-25).
  // Someone mid set-up may also have account lists from before: a listing in
  // them shows saved too, and its heart opens the menu (re-review).
  const inAccount = !!authUser && isSavedInAnyList(lists, listingId)
  const inDevice = deviceIds.includes(listingId)
  const saved = firebaseUser ? isSavedInAnyList(lists, listingId) : inDevice || inAccount

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // A visitor (or an account mid set-up): the heart saves and un-saves in
    // this browser. The card after the third save is for visitors only.
    if (!firebaseUser) {
      if (inAccount && !inDevice) {
        setOpen((v) => !v)
        return
      }
      toggleDeviceSave(listingId, { canNudge: !authUser })
      return
    }

    // The account's lists have not arrived yet: wait, or "no lists" would
    // make a second Guardados (re-review).
    if (!listsArrived) return

    // An empty heart saves at once, to the default list; a full one opens
    // the menu to change lists or un-save (2026-10-25: an empty heart used to
    // open the menu instead of saving).
    if (lists.length > 0 && !saved) {
      const target = lists.find((l) => l.isDefault) ?? lists[0]!
      setBusy(true)
      try {
        await listService.addListing(firebaseUser.uid, target.id, listingId)
      } catch {
        toast.error('No se pudo guardar')
      } finally {
        setBusy(false)
      }
      return
    }

    if (lists.length === 0) {
      setBusy(true)
      try {
        const listId = await listService.ensureDefaultList(firebaseUser.uid)
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
        aria-label={saved ? (firebaseUser || (inAccount && !inDevice) ? 'Administrar listas' : 'Quitar de Guardados') : 'Guardar propiedad'}
        className={
          variant === 'page'
            ? `inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-sans text-sm font-medium uppercase tracking-wide transition-colors hover:bg-black/5 ${
                saved ? 'border-red-300 text-red-500' : 'border-border text-text-secondary'
              } ${className}`
            : variant === 'plain'
              ? `flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 ${className}`
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
        ) : variant === 'plain' ? (
          <Heart
            strokeWidth={2.25}
            className={`h-5 w-5 transition-colors ${
              saved ? 'fill-red-500 text-red-500' : 'fill-transparent text-red-500/60'
            }`}
          />
        ) : (
          <Heart
            className={`h-4 w-4 transition-colors ${
              saved ? 'fill-red-500 text-red-500' : 'fill-transparent text-white'
            }`}
          />
        )}
      </button>

      {open && authUser && (
        <ListPopover
          listingId={listingId}
          uid={authUser.uid}
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

  const [style, setStyle] = useState<React.CSSProperties>({ position: 'fixed', visibility: 'hidden', zIndex: 99999 })
  // Placed once it has its height, so it can open upward near the bottom of
  // the screen; the visible height leaves out the phone browser's bars.
  useLayoutEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const popoverW = 224
    const vw = window.innerWidth
    let left = rect.right - popoverW
    if (left < 8) left = 8
    if (left + popoverW > vw - 8) left = vw - popoverW - 8
    const top = popoverTop({
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
      popoverHeight: popoverRef.current?.offsetHeight ?? 0,
      viewportHeight: window.visualViewport?.height ?? window.innerHeight,
    })
    setStyle({ position: 'fixed', top, left, width: popoverW, zIndex: 99999 })
  }, [anchorRef, lists.length, creating])

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
      // The menu is moved to the end of the page, but React still passes its
      // taps to the card it came from — which opens the listing. Stop them.
      onClick={(e) => e.stopPropagation()}
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
