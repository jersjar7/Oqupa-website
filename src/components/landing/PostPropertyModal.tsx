import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import Modal from '@/app/components/ui/Modal'
import { setReturnUrl } from '@/lib/utils'

interface PostPropertyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PostPropertyModal({ isOpen, onClose }: PostPropertyModalProps) {
  const navigate = useNavigate()

  const handlePublish = () => {
    onClose()
    setReturnUrl('/app/listings/new')
    navigate('/app/listings/new')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="h-7 w-7 text-primary" />
        </div>

        <h2 className="text-2xl font-medium text-text-primary">
          Publica tu propiedad
        </h2>

        <p className="text-base leading-relaxed text-text-secondary">
          El dia oficial de publicacion es el{' '}
          <span className="font-bold text-text-primary">4 de mayo</span>, pero
          puedes adelantarte a todos y publicar ahora mientras es completamente
          gratis.
        </p>

        <button
          onClick={handlePublish}
          className="mt-2 w-full rounded-xl bg-primary px-8 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5"
        >
          Publicar Ahora
        </button>

        <p className="text-sm text-text-tertiary">
          Es gratis. Sin comisiones. Sin limites.
        </p>
      </div>
    </Modal>
  )
}
