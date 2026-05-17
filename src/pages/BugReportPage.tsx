import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBugReportForm } from '@/hooks/useBugReportForm'

const inputBase =
  'w-full rounded-xl border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20'

const labelBase =
  'mb-1.5 block font-sans text-sm font-medium uppercase tracking-wide text-text-secondary'

export default function BugReportPage() {
  const { formData, errors, isSubmitting, isSuccess, handleChange, handleSubmit } =
    useBugReportForm()

  // Stable across re-renders: did we auto-capture errors before the user arrived?
  const [autoFilled] = useState(() => formData.technical.trim().length > 0)

  useEffect(() => {
    document.title = 'Reportar un problema - Oqupa'
  }, [])

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
        <h1 className="font-serif text-2xl font-bold text-text-primary">
          ¡Gracias por avisarnos!
        </h1>
        <p className="mt-3 text-gray-600 leading-relaxed">
          Recibimos tu reporte y nuestro equipo lo revisará pronto. Si dejaste
          un correo o teléfono, te contactaremos si necesitamos más detalles.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large"
        >
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-text-primary">
        Reportar un problema
      </h1>
      <p className="mt-3 text-gray-600 leading-relaxed">
        ¿Encontraste un error en la web? Cuéntanos qué pasó y lo
        solucionaremos. Solo toma un minuto.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        {/* Contact */}
        <div>
          <label htmlFor="contact" className={labelBase}>
            Cómo contactarte
          </label>
          <input
            id="contact"
            name="contact"
            type="text"
            value={formData.contact}
            onChange={handleChange}
            placeholder="Correo o teléfono"
            autoComplete="email"
            className={`${inputBase} ${
              errors.contact ? 'border-error' : 'border-border'
            }`}
          />
          {errors.contact && (
            <p className="mt-1 text-xs text-error">{errors.contact}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelBase}>
            ¿Qué pasó?
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            placeholder="Describe el problema: qué intentabas hacer y qué salió mal."
            className={`${inputBase} resize-y ${
              errors.description ? 'border-error' : 'border-border'
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-error">{errors.description}</p>
          )}
        </div>

        {/* Optional technical details */}
        <details className="rounded-xl border border-border bg-gray-50/50 px-4 py-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-text-secondary">
            Detalles técnicos (opcional)
          </summary>
          <div className="mt-3 space-y-3">
            {autoFilled ? (
              <p className="text-xs text-text-tertiary">
                Adjuntamos automáticamente los errores técnicos detectados en
                tu navegador. No necesitas hacer nada — puedes editarlos o
                borrarlos si quieres.
              </p>
            ) : (
              <p className="text-xs text-text-tertiary">
                Si sabes cómo, puedes pegar aquí lo que aparece en la consola
                del navegador (clic derecho → Inspeccionar → pestaña Console).
                Es opcional.
              </p>
            )}
            <textarea
              id="technical"
              name="technical"
              value={formData.technical}
              onChange={handleChange}
              rows={6}
              placeholder="Información técnica (opcional)"
              className={`${inputBase} resize-y border-border font-mono text-xs`}
            />
          </div>
        </details>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </form>
    </div>
  )
}
