import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/app/components/ui'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Plus className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mt-6 font-serif text-xl font-bold text-text-primary">
        No tienes publicaciones
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Crea tu primera publicacion para que miles de personas vean tu propiedad.
      </p>
      <Link to="/app/listings/new" className="mt-6">
        <Button size="lg">
          <Plus className="h-5 w-5" />
          Crear Publicacion
        </Button>
      </Link>
    </div>
  )
}
