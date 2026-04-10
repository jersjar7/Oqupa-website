import { MapPin } from 'lucide-react'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

export default function PiuraOnlyBanner() {
  const { ref, isVisible } = useAnimateOnScroll()

  return (
    <section className="bg-secondary/5 py-10 lg:py-16">
      <div
        ref={ref}
        className={`mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8 transition-all duration-700 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <MapPin className="mx-auto h-8 w-8 text-secondary" />

        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          Estamos lanzando en{' '}
          <span className="font-bold text-text-primary">Piura</span>{' '}
          mientras aprendemos de nuestros clientes antes de expandirnos a mas
          departamentos.
        </p>

        <a
          href="mailto:admin@oqupa.com?subject=Quiero Oqupa en mi ciudad"
          className="mt-4 inline-block text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
        >
          Fuera de Piura? Cuentanos que quieres Oqupa en tu ciudad!
        </a>
      </div>
    </section>
  )
}
