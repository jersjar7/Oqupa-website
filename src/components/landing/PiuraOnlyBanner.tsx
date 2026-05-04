import { MapPin } from 'lucide-react'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

export default function PiuraOnlyBanner() {
  const { ref, isVisible } = useAnimateOnScroll()

  return (
    <section className="bg-secondary/5 py-6 lg:py-10">
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
          Lanzamos en{' '}
          <span className="font-bold text-text-primary">Piura</span>{' '}
          y aprendemos de nuestros clientes antes de expandirnos a más
          departamentos.
        </p>

        <a
          href="#expansion"
          className="mt-4 inline-block text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
        >
          ¿Estás fuera de Piura? ¡Cuéntanos que quieres Oqupa en tu departamento!
        </a>
      </div>
    </section>
  )
}
