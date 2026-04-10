import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Upload, X, Loader2 } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useListingDetails } from '@/hooks/useListings'
import { storageService } from '@/services/storageService'
import { Button, Spinner } from '@/app/components/ui'

export default function AgentEditListingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: result, isLoading, error } = useListingDetails(id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [description, setDescription] = useState('')
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Pre-fill form with existing data
  useEffect(() => {
    if (!result || initialized) return
    setDescription(result.listing.description)
    setExistingPhotoUrls(result.property.media.propertyPhotoUrls)
    setInitialized(true)
  }, [result, initialized])

  const hasChanges = (() => {
    if (!result) return false
    const descChanged = description.trim() !== result.listing.description
    const origUrls = result.property.media.propertyPhotoUrls
    const urlsChanged = existingPhotoUrls.length !== origUrls.length ||
      existingPhotoUrls.some((url, i) => url !== origUrls[i])
    return descChanged || urlsChanged || newPhotos.length > 0
  })()

  const handleRemoveExisting = (index: number) => {
    setExistingPhotoUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveNew = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setNewPhotos(prev => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    const trimmedDesc = description.trim()
    if (!trimmedDesc) {
      setSubmitError('La descripcion no puede estar vacia')
      return
    }
    if (existingPhotoUrls.length === 0 && newPhotos.length === 0) {
      setSubmitError('Debes tener al menos una foto')
      return
    }
    if (!result || !id) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      let finalPhotoUrls = [...existingPhotoUrls]

      // Upload new photos if any
      if (newPhotos.length > 0) {
        setSubmitStatus('Subiendo fotos...')
        const uploadResults = await storageService.uploadMultiplePropertyPhotos(
          result.property.id,
          newPhotos,
          (p) => setSubmitStatus(`Subiendo fotos... (${Math.round(p)}%)`)
        )
        finalPhotoUrls = [...finalPhotoUrls, ...uploadResults.map(r => r.url)]
      }

      setSubmitStatus('Guardando cambios...')

      // Call Cloud Function
      const functions = getFunctions(undefined, 'southamerica-east1')
      const updateAsAgent = httpsCallable(functions, 'updateListingAsAgent')

      const params: Record<string, unknown> = { listingId: id }

      if (trimmedDesc !== result.listing.description) {
        params.description = trimmedDesc
      }

      const origUrls = result.property.media.propertyPhotoUrls
      const urlsChanged = finalPhotoUrls.length !== origUrls.length ||
        finalPhotoUrls.some((url, i) => url !== origUrls[i])
      if (urlsChanged) {
        params.propertyPhotoUrls = finalPhotoUrls
      }

      if (Object.keys(params).length > 1) {
        await updateAsAgent(params)
      }

      navigate('/app', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado'
      setSubmitError(message)
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
        <p className="text-center text-error">Error al cargar el anuncio</p>
      </div>
    )
  }

  // Verify this is an accepted assignment
  if (result.listing.assignmentStatus !== 'accepted') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-center text-error">
          Solo puedes editar anuncios que hayas aceptado como agente
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
          className="rounded-full p-1 text-text-secondary hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-sans text-[28px] font-medium text-text-primary">
          Editar Anuncio
        </h1>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
        <p className="text-sm text-blue-800">
          Como agente asignado, puedes editar la descripcion y las fotos.
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
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-200 p-3 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              {existingPhotoUrls.map((url, index) => (
                <div key={`existing-${index}`} className="group relative aspect-square">
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => handleRemoveExisting(index)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Principal
                    </span>
                  )}
                </div>
              ))}

              {/* New photos */}
              {newPhotos.map((file, index) => (
                <div key={`new-${index}`} className="group relative aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Nueva foto ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => handleRemoveNew(index)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add button */}
              {existingPhotoUrls.length + newPhotos.length < 20 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-primary hover:text-primary"
                >
                  <Upload className="h-6 w-6" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddPhotos}
              className="hidden"
            />
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
