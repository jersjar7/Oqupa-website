import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import Modal from '@/app/components/ui/Modal'

interface SearchPropertyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchPropertyModal({ isOpen, onClose }: SearchPropertyModalProps) {
  const navigate = useNavigate()

  const handleExplore = () => {
    onClose()
    navigate('/explorar')
  }

  const handleOpenWaitlist = () => {
    onClose()
    window.dispatchEvent(new CustomEvent('expand-waitlist-popup'))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
          <Search className="h-7 w-7 text-secondary" />
        </div>

        <h2 className="text-2xl font-medium text-text-primary">
          Busca propiedades en Piura
        </h2>

        <p className="text-base leading-relaxed text-text-secondary">
          El{' '}
          <span className="font-bold text-text-primary">11 de mayo</span>{' '}
          lanzamos la app móvil para buscar propiedades. Mientras tanto, puedes
          explorar las opciones disponibles en la web, aunque aún son pocas.
        </p>

        <button
          onClick={handleExplore}
          className="mt-2 w-full rounded-xl bg-secondary px-8 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-secondary-hover hover:shadow-large hover:-translate-y-0.5"
        >
          Explorar Ahora
        </button>

        <button
          onClick={handleOpenWaitlist}
          className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
        >
          Unirme a la lista de espera y que me avisen
        </button>
      </div>
    </Modal>
  )
}
