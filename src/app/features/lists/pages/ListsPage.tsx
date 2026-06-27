import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Heart, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useListStore } from '@/stores/listStore'
import { listService } from '@/services/listService'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import type { UserList } from '@/types/userList'

export default function ListsPage() {
  useSetPageMeta({ title: 'Mis listas', subtitle: 'Colecciones de propiedades guardadas.' })

  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const lists = useListStore((s) => s.lists)
  const isLoading = useListStore((s) => s.isLoading)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  if (!firebaseUser) return null

  async function handleCreate() {
    const name = newListName.trim()
    if (!name) return
    setBusy('new')
    try {
      await listService.createList(firebaseUser!.uid, name)
      setCreating(false)
      setNewListName('')
    } catch {
      toast.error('No se pudo crear la lista')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(list: UserList) {
    if (!window.confirm(`¿Eliminar la lista "${list.name}"?`)) return
    setBusy(list.id)
    try {
      await listService.deleteList(firebaseUser!.uid, list.id)
      toast.success('Lista eliminada')
    } catch {
      toast.error('No se pudo eliminar la lista')
    } finally {
      setBusy(null)
    }
  }

  async function handleRename(listId: string) {
    const name = renameValue.trim()
    if (!name) return
    setBusy(listId)
    try {
      await listService.renameList(firebaseUser!.uid, listId, name)
      setRenaming(null)
    } catch {
      toast.error('No se pudo renombrar la lista')
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-[28px] font-normal text-text-primary">Mis listas</h1>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-sans text-sm font-bold uppercase tracking-[1px] text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva lista
        </button>
      </div>

      {creating && (
        <div className="mb-4 flex gap-2 rounded-xl border border-border bg-white p-4 shadow-small">
          <input
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') {
                setCreating(false)
                setNewListName('')
              }
            }}
            placeholder='Nombre de la lista (ej. "Casa de mis sueños")'
            className="flex-1 rounded-lg border border-border px-3 py-2 font-sans text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleCreate}
            disabled={!newListName.trim() || busy === 'new'}
            className="rounded-lg bg-primary px-4 py-2 font-sans text-sm font-bold uppercase text-white transition-opacity disabled:opacity-50"
          >
            {busy === 'new' ? <Spinner size="sm" /> : 'Crear'}
          </button>
          <button
            onClick={() => {
              setCreating(false)
              setNewListName('')
            }}
            className="rounded-lg border border-border px-3 py-2 font-sans text-sm text-text-secondary transition-colors hover:bg-background-secondary"
          >
            Cancelar
          </button>
        </div>
      )}

      {lists.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Heart className="mb-3 h-10 w-10 text-text-tertiary" />
          <p className="font-sans text-base text-text-secondary">No tienes listas todavía</p>
          <p className="mt-1 font-sans text-sm text-text-tertiary">
            Guarda propiedades que te gustan para verlas después
          </p>
          <Link
            to="/explorar"
            className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2 font-sans text-sm font-bold uppercase tracking-[1px] text-white transition-opacity hover:opacity-90"
          >
            Explorar propiedades
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-small transition-shadow hover:shadow-medium"
            >
              {renaming === list.id ? (
                <div className="mb-3 flex gap-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(list.id)
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                    className="flex-1 rounded-lg border border-border px-2 py-1 font-sans text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => handleRename(list.id)}
                    disabled={!renameValue.trim() || busy === list.id}
                    className="rounded-lg bg-primary px-2.5 py-1 font-sans text-xs font-bold text-white disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setRenaming(null)}
                    className="rounded-lg border border-border px-2 py-1 font-sans text-xs text-text-secondary"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="mb-1 font-sans text-base font-medium text-text-primary">
                  {list.name}
                </p>
              )}

              <p className="font-sans text-sm text-text-secondary">
                {list.listingIds.length}{' '}
                {list.listingIds.length === 1 ? 'propiedad' : 'propiedades'}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  to={`/app/lists/${list.id}`}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-center font-sans text-xs font-bold uppercase tracking-[1px] text-text-primary transition-colors hover:bg-background-secondary"
                >
                  Ver
                </Link>
                {!list.isDefault && renaming !== list.id && (
                  <>
                    <button
                      onClick={() => {
                        setRenaming(list.id)
                        setRenameValue(list.name)
                      }}
                      className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-background-secondary"
                      aria-label="Renombrar lista"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(list)}
                      disabled={busy === list.id}
                      className="rounded-lg border border-border p-2 text-error transition-colors hover:bg-red-50 disabled:opacity-50"
                      aria-label="Eliminar lista"
                    >
                      {busy === list.id ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
