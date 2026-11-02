import { useEffect, useState } from 'react'
import { searchAddresses, MIN_SEARCH_LENGTH, type AddressResult } from '@/lib/map/addressSearch'

const TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined) ?? ''

interface WizardAddressSearchProps {
  near: { lat: number; lng: number } | null
  onChoose: (result: AddressResult) => void
}

type State =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'found'; results: AddressResult[] }
  | { kind: 'none' }
  | { kind: 'failed' }

/** "Busca tu dirección" (ADR-043 D6): places in Piura, picked from a short list. */
export default function WizardAddressSearch({ near, onChoose }: WizardAddressSearchProps) {
  const [text, setText] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [chosen, setChosen] = useState<string | null>(null)

  useEffect(() => {
    const q = text.trim()
    if (q.length < MIN_SEARCH_LENGTH || q === chosen) {
      setState({ kind: 'idle' })
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      setState({ kind: 'searching' })
      searchAddresses(q, { token: TOKEN || 'missing', near: near ?? undefined, signal: ctrl.signal })
        .then((results) => {
          if (!ctrl.signal.aborted) setState(results.length ? { kind: 'found', results } : { kind: 'none' })
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setState({ kind: 'failed' })
        })
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // `near` only biases the order; a new search is for new words.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, chosen])

  return (
    <div>
      <label htmlFor="address-search" className="mb-1.5 block font-sans text-sm font-medium uppercase text-text-primary">
        Busca tu dirección
      </label>
      <input
        id="address-search"
        type="search"
        autoComplete="off"
        value={text}
        placeholder="Ej: Av. Grau 123, Castilla"
        onChange={(e) => {
          setChosen(null)
          setText(e.target.value)
        }}
        className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-base text-text-primary placeholder:text-text-tertiary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
      />
      {state.kind === 'searching' && <p className="mt-1.5 text-sm text-text-tertiary">Buscando…</p>}
      {state.kind === 'none' && (
        <p className="mt-1.5 text-sm text-text-secondary">No encontramos esa dirección. Toca el mapa donde está tu propiedad.</p>
      )}
      {state.kind === 'failed' && (
        <p className="mt-1.5 text-sm text-text-secondary">No pudimos buscar. Toca el mapa donde está tu propiedad.</p>
      )}
      {state.kind === 'found' && (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {state.results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setChosen(r.name)
                  setText(r.name)
                  setState({ kind: 'idle' })
                  onChoose(r)
                }}
                className="flex min-h-12 w-full flex-col items-start justify-center px-4 py-2 text-left hover:bg-cream-strong"
              >
                <span className="text-base text-text-primary">{r.name}</span>
                {r.place && <span className="text-sm text-text-secondary">{r.place}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
