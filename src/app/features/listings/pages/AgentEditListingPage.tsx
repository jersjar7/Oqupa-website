import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, X, Loader2 } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useListingDetails } from '@/hooks/useListings'
import { card as cardUrl } from '@/lib/imageUrl'
import { Button, Spinner } from '@/app/components/ui'
import { callableErrorMessage } from '@/lib/friendlyErrors'
import { agentEditParams } from '../agentEdit'

export default function AgentEditListingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data: result, isLoading, error } = useListingDetails(id)

  const [description, setDescription] = useState('')
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Pre-fill form with existing data
  useEffect(() => {
    if (!result || initialized) return
    setDescription(result.listing.description)
    setExistingPhotoUrls(result.property.media.photoKeys ?? result.property.media.propertyPhotoUrls)
    setInitialized(true)
  }, [result, initialized])

  const hasChanges = (() => {
    if (!result) return false
    const descChanged = description.trim() !== result.listing.description
    const origRefs = result.property.media.photoKeys ?? result.property.media.propertyPhotoUrls
    const refsChanged = existingPhotoUrls.length !== origRefs.length ||
      existingPhotoUrls.some((ref, i) => ref !== origRefs[i])
    return descChanged || refsChanged
  })()

  const handleRemoveExisting = (index: number) => {
    setExistingPhotoUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const trimmedDesc = description.trim()
    if (!trimmedDesc) {
      setSubmitError('La descripción no puede estar vacía')
      return
    }
    if (existingPhotoUrls.length === 0) {
      setSubmitError('Debes tener al menos una foto')
      return
    }
    if (!result || !id) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const finalPhotoUrls = [...existingPhotoUrls]

      setSubmitStatus('Guardando cambios...')

      // Call Cloud Function
      const functions = getFunctions(undefined, 'southamerica-east1')
      const updateAsAgent = httpsCallable(functions, 'updateListingAsAgent')

      // Photos go as photoKeys, as the app sends them (audit 2026-11-02).
      const params = agentEditParams({
        listingId: id,
        description: trimmedDesc,
        originalDescription: result.listing.description,
        photoRefs: finalPhotoUrls,
        originalPhotoRefs: result.property.media.photoKeys ?? result.property.media.propertyPhotoUrls,
      })

      if (params) {
        await updateAsAgent(params)
      }

      // Invalidate cached data so dashboard and detail pages show updated content
      await queryClient.invalidateQueries({ queryKey: ['listings'] })
      await queryClient.invalidateQueries({ queryKey: ['leads'] })

      navigate('/app', { replace: true })
    } catch (err) {
      // Never the server's English or the SDK's own words.
      setSubmitError(callableErrorMessage(err))
    } finally {
      setIsSubmitting(false)
      setSubmitStatus('')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center text-error">
          No pudimos abrir esta publicación. Revisa tu internet o vuelve a Mis propiedades.
        </p>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => navigate('/app/listings')}>Volver a Mis propiedades</Button>
        </div>
      </div>
    )
  }

  // Verify the current user is the accepted assigned agent
  if (
    result.listing.assignmentStatus !== 'accepted' ||
    result.listing.assignedRealtorId !== user?.id
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center text-error">
          Solo puedes editar publicaciones que hayas aceptado como agente.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-[28px] font-normal text-text-primary">
          Editar publicación
        </h1>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-secondary/30 bg-secondary/10 p-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
        <p className="text-sm text-text-primary">
          Como agente asignado, puedes editar la descripción y quitar fotos.
        </p>
      </div>

      {isSubmitting ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-text-secondary">{submitStatus || 'Guardando...'}</p>
        </div>
      ) : (
        <>
          {/* Description */}
          <div className="mb-6">
            <label className="mb-2 block font-sans text-sm font-medium uppercase text-text-secondary">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-border p-3 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Describe la propiedad..."
            />
          </div>

          {/* Photos */}
          <div className="mb-6">
            <label className="mb-2 block font-sans text-sm font-medium uppercase text-text-secondary">
              Fotos
            </label>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {/* Existing photos */}
              {existingPhotoUrls.map((ref, index) => (
                <div key={`existing-${index}`} className="group relative aspect-square">
                  <img
                    src={cardUrl(ref)}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => handleRemoveExisting(index)}
                    aria-label={`Eliminar foto ${index + 1}`}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-error text-white shadow-light">
                      <X className="h-4 w-4" />
                    </span>
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* getUploadUrl is owner-only for now (review 2026-11-02). */}
            <p className="mt-3 text-sm text-text-secondary">Por ahora solo el dueño puede agregar fotos nuevas.</p>
          </div>

          {/* Error */}
          {submitError && (
            <p className="mb-4 text-sm text-error">{submitError}</p>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!hasChanges}
              className="flex-1"
            >
              Guardar Cambios
            </Button>
            <Button
              variant="text"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
