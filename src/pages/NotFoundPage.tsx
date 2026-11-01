import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página no encontrada - Oqupa'
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {/* No giant orange "404": orange text on cream is 2.66:1 (brand audit
          C7). The code is a green Subhead label; the title is Header 1. */}
      <p className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">Error 404</p>
      <h1 className="mt-3 font-serif text-[28px] font-normal text-text-primary">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-text-secondary leading-relaxed">
        La página que buscas no existe o ha sido movida. Verifica la dirección o
        regresa a la página principal.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
