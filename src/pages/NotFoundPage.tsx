import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página no encontrada - Oqupa'
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="font-serif mt-4 text-2xl font-bold text-text-primary">
        Página no encontrada
      </h2>
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
