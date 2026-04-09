import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { step4Schema, fullListingSchema, type Step4Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useAuthStore } from '@/stores/authStore'
import { firestoreService } from '@/services/firestoreService'
import { storageService } from '@/services/storageService'
import { Button, Input } from '@/app/components/ui'
import Modal from '@/app/components/ui/Modal'
import ShareFormatModal from '@/components/ShareFormatModal'
import { CURRENCY_SYMBOLS, type Currency } from '@/types/enums'
import { AnalyticsLogger } from '@/lib/analytics'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

export default function WizardStep4() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data, updateData, prevStep, isEditMode, editListingId, editPropertyId, reset } =
    useListingFormStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    listing: Listing
    property: Property
    focusLat: number | null
    focusLng: number | null
  } | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      operationType: data.operationType,
      rentalDurationType: data.rentalDurationType || undefined,
      propertyType: data.propertyType || undefined,
      amount: data.amount ?? undefined,
      currency: (data.currency || 'PEN') as Currency,
      wantsRealtorHelp: data.wantsRealtorHelp,
      maxRealtors: data.maxRealtors,
    },
  })

  const currency = watch('currency')
  const wantsRealtorHelp = watch('wantsRealtorHelp')
  const isAlquiler = data.operationType === 'alquiler'
  const isShortTerm = data.rentalDurationType === 'shortTerm'

  async function onSubmit(formData: Step4Data) {
    if (!user) return

    // Pre-submission validation of all steps
    // Merge formData into store data since store hasn't been updated yet
    const fullResult = fullListingSchema.safeParse({
      ...data,
      amount: formData.amount,
      currency: formData.currency,
      wantsRealtorHelp: formData.wantsRealtorHelp,
      maxRealtors: formData.maxRealtors,
      totalAreaInSquareMeters: data.totalAreaInSquareMeters ?? undefined,
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
    })

    if (!fullResult.success) {
      const message = fullResult.error.issues[0]?.message ?? 'Faltan datos obligatorios'
      setSubmitError(message)
      return
    }

    if (!isEditMode && data.photos.length === 0 && data.existingPhotoUrls.length === 0) {
      setSubmitError('No hay fotos seleccionadas (Paso 3)')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    let createdPropertyId: string | null = null

    try {
      updateData({
        amount: formData.amount,
        currency: formData.currency,
        wantsRealtorHelp: formData.wantsRealtorHelp,
        maxRealtors: formData.maxRealtors,
      })

      if (isEditMode && editPropertyId && editListingId) {
        // UPDATE FLOW
        // Upload new photos if any
        let newPhotoUrls: string[] = []
        let newBlurHashes: string[] = []
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          const results = await storageService.uploadMultiplePropertyPhotos(
            editPropertyId,
            data.photos,
            (p) => setUploadProgress(`Subiendo fotos... (${Math.round(p)}%)`)
          )
          newPhotoUrls = results.map(r => r.url)
          newBlurHashes = results.map(r => r.blurHash)
        }

        const allPhotoUrls = [...data.existingPhotoUrls, ...newPhotoUrls]

        setUploadProgress('Actualizando propiedad...')
        await firestoreService.updateProperty(editPropertyId, {
          propertyType: data.propertyType as Property['propertyType'],
          operationType: data.operationType as Property['operationType'],
          ...(data.operationType === 'alquiler' && data.rentalDurationType
            ? { rentalDurationType: data.rentalDurationType as Property['rentalDurationType'] }
            : {}),
          specs: {
            totalAreaInSquareMeters: data.totalAreaInSquareMeters!,
            bedroomCount: data.bedroomCount ?? undefined,
            bathroomCount: data.bathroomCount ?? undefined,
            availableParkingSpaces: data.availableParkingSpaces,
            propertyAmenities: data.propertyAmenities,
            ...(data.propertyType === 'habitacion' ? { hasPrivateBathroom: data.hasPrivateBathroom } : {}),
          },
          location: {
            latitude: data.latitude!,
            longitude: data.longitude!,
            calle: data.calle,
            urbanizacion: data.urbanizacion,
            distrito: data.distrito,
            provincia: data.provincia,
            departamento: data.departamento,
            countryIsoCode: 'PE',
          },
          currentPrice: {
            amount: formData.amount,
            currency: formData.currency,
          },
          media: {
            propertyPhotoUrls: allPhotoUrls,
            ...(newBlurHashes.length > 0 ? { photoBlurHashes: newBlurHashes } : {}),
          },
        })

        await firestoreService.updateListing(editListingId, {
          description: data.description,
          price: { amount: formData.amount, currency: formData.currency },
          role: data.role as Listing['role'],
          wantsRealtorHelp: formData.wantsRealtorHelp ?? false,
          maxRealtors: formData.wantsRealtorHelp ? (formData.maxRealtors ?? 3) : 3,
          media: {
            propertyPhotoUrls: allPhotoUrls,
            ...(newBlurHashes.length > 0 ? { photoBlurHashes: newBlurHashes } : {}),
          },
          contactInfo: user.contactInfo,
          showExactLocation: data.showExactLocation,
        })
      } else {
        // CREATE FLOW
        setUploadProgress('Creando propiedad...')
        const propertyId = await firestoreService.createProperty({
          listedByUserId: user.id,
          propertyType: data.propertyType as Property['propertyType'],
          operationType: data.operationType as Property['operationType'],
          ...(data.operationType === 'alquiler' && data.rentalDurationType
            ? { rentalDurationType: data.rentalDurationType as Property['rentalDurationType'] }
            : {}),
          specs: {
            totalAreaInSquareMeters: data.totalAreaInSquareMeters!,
            bedroomCount: data.bedroomCount ?? undefined,
            bathroomCount: data.bathroomCount ?? undefined,
            availableParkingSpaces: data.availableParkingSpaces,
            propertyAmenities: data.propertyAmenities,
            ...(data.propertyType === 'habitacion' ? { hasPrivateBathroom: data.hasPrivateBathroom } : {}),
          },
          location: {
            latitude: data.latitude!,
            longitude: data.longitude!,
            calle: data.calle,
            urbanizacion: data.urbanizacion,
            distrito: data.distrito,
            provincia: data.provincia,
            departamento: data.departamento,
            countryIsoCode: 'PE',
          },
          currentPrice: {
            amount: formData.amount,
            currency: formData.currency,
          },
          normalizedAddress: `${data.calle}${data.urbanizacion ? ', ' + data.urbanizacion : ''}, ${data.distrito}, ${data.provincia}, ${data.departamento}`,
          media: { propertyPhotoUrls: [] },
          isAvailable: true,
        })
        createdPropertyId = propertyId

        // Upload photos
        let photoUrls: string[] = []
        let blurHashes: string[] = []
        let microThumb = ''
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          const results = await storageService.uploadMultiplePropertyPhotos(
            propertyId,
            data.photos,
            (p) => setUploadProgress(`Subiendo fotos... (${Math.round(p)}%)`)
          )
          photoUrls = results.map(r => r.url)
          blurHashes = results.map(r => r.blurHash)
          microThumb = results[0]?.microThumb ?? ''

          // Update property with photo URLs, BlurHash, and micro-thumbnail
          await firestoreService.updateProperty(propertyId, {
            media: {
              propertyPhotoUrls: photoUrls,
              photoBlurHashes: blurHashes,
              ...(microThumb ? { primaryPhotoMicroThumb: microThumb } : {}),
            },
          })
        }

        // Create listing
        setUploadProgress('Creando publicacion...')
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const listingData = {
          role: data.role as Listing['role'],
          ownerId: user.id,
          propertyId,
          description: data.description,
          price: { amount: formData.amount, currency: formData.currency },
          contactInfo: user.contactInfo,
          status: 'active' as const,
          publishedAt: now,
          expiresAt,
          media: {
            propertyPhotoUrls: photoUrls,
            photoBlurHashes: blurHashes,
            ...(microThumb ? { primaryPhotoMicroThumb: microThumb } : {}),
          },
          wantsRealtorHelp: formData.wantsRealtorHelp ?? false,
          maxRealtors: formData.wantsRealtorHelp ? (formData.maxRealtors ?? 3) : 3,
          currentClaimsCount: 0,
          operationType: data.operationType as Listing['operationType'],
          isBoosted: false,
          boostScore: 1,
          showExactLocation: data.showExactLocation,
        }

        const listingId = await firestoreService.createListing(listingData)

        // Build objects for the success modal share CTA
        const createdListing: Listing = {
          ...listingData,
          id: listingId,
          createdAt: now,
          updatedAt: now,
          viewCount: 0,
        }
        const createdProperty: Property = {
          id: propertyId,
          listedByUserId: user.id,
          propertyType: data.propertyType as Property['propertyType'],
          operationType: data.operationType as Property['operationType'],
          ...(data.operationType === 'alquiler' && data.rentalDurationType
            ? { rentalDurationType: data.rentalDurationType as Property['rentalDurationType'] }
            : {}),
          specs: {
            totalAreaInSquareMeters: data.totalAreaInSquareMeters!,
            bedroomCount: data.bedroomCount ?? undefined,
            bathroomCount: data.bathroomCount ?? undefined,
            availableParkingSpaces: data.availableParkingSpaces,
            propertyAmenities: data.propertyAmenities,
            ...(data.propertyType === 'habitacion' ? { hasPrivateBathroom: data.hasPrivateBathroom } : {}),
          },
          location: {
            latitude: data.latitude!,
            longitude: data.longitude!,
            calle: data.calle,
            urbanizacion: data.urbanizacion,
            distrito: data.distrito,
            provincia: data.provincia,
            departamento: data.departamento,
            countryIsoCode: 'PE',
          },
          currentPrice: { amount: formData.amount, currency: formData.currency },
          normalizedAddress: `${data.calle}${data.urbanizacion ? ', ' + data.urbanizacion : ''}, ${data.distrito}`,
          media: {
            propertyPhotoUrls: photoUrls,
            photoBlurHashes: blurHashes,
            ...(microThumb ? { primaryPhotoMicroThumb: microThumb } : {}),
          },
          updatedAt: now,
          isAvailable: true,
        }

        AnalyticsLogger.listingCreated(data.operationType)
        await queryClient.invalidateQueries({ queryKey: ['listings'] })

        // Show success modal with share CTA instead of navigating immediately
        setSuccessData({
          listing: createdListing,
          property: createdProperty,
          focusLat: data.latitude ?? null,
          focusLng: data.longitude ?? null,
        })
        return
      }

      // Edit mode: navigate immediately
      await queryClient.invalidateQueries({ queryKey: ['listings'] })
      reset()
      navigate('/app')
    } catch (err) {
      console.error('Submission error:', err)

      // Clean up orphaned Property if create flow failed after Property was created
      if (createdPropertyId) {
        try {
          await firestoreService.deleteProperty(createdPropertyId)
        } catch {
          console.warn('Failed to cleanup orphaned property:', createdPropertyId)
        }
      }

      // Invalidate queries even on error so dashboard reflects any partial changes
      await queryClient.invalidateQueries({ queryKey: ['listings'] })

      const message = err instanceof Error ? err.message : ''
      if (message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
        setSubmitError('No tienes permisos para realizar esta accion.')
      } else if (message.includes('not-found')) {
        setSubmitError('No se encontro la publicacion. Puede haber sido eliminada.')
      } else if (message.includes('storage') || message.includes('upload')) {
        setSubmitError('Error al subir las fotos. Verifica tu conexion e intenta de nuevo.')
      } else if (!navigator.onLine) {
        setSubmitError('Sin conexion a internet. Verifica tu conexion e intenta de nuevo.')
      } else {
        setSubmitError('Error al guardar. Intenta de nuevo.')
      }
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  const handleNavigateAfterCreation = () => {
    if (!successData) return
    const { focusLat, focusLng } = successData
    reset()
    if (focusLat != null && focusLng != null) {
      navigate('/explorar', { state: { focusLat, focusLng } })
    } else {
      navigate('/app')
    }
  }

  // Show success modal after listing creation
  if (successData) {
    return (
      <>
        <Modal
          isOpen={!showShareModal}
          onClose={handleNavigateAfterCreation}
          title="¡Publicado!"
        >
          <p className="text-text-secondary">
            ¡Comparte tu anuncio en todas tus redes sociales!
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleNavigateAfterCreation}
              className="flex-1 rounded-xl border border-border px-4 py-3 font-medium text-text-secondary transition-colors hover:bg-black/5"
            >
              Ahora no
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 rounded-xl bg-primary px-4 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
            >
              Compartir
            </button>
          </div>
        </Modal>
        <ShareFormatModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            handleNavigateAfterCreation()
          }}
          listing={successData.listing}
          property={successData.property}
        />
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Price */}
      <div>
        <h3 className="text-sm font-medium uppercase text-text-primary">Precio</h3>

        {/* Currency toggle */}
        <div className="mt-3 flex rounded-xl border border-border">
          {(['PEN', 'USD'] as const).map((cur) => (
            <button
              key={cur}
              type="button"
              onClick={() => setValue('currency', cur)}
              className={`flex-1 py-2 text-sm font-medium transition-colors first:rounded-l-xl last:rounded-r-xl ${
                currency === cur
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              {CURRENCY_SYMBOLS[cur]} ({cur})
            </button>
          ))}
        </div>

        <div className="mt-3">
          <Input
            type="number"
            placeholder={`Ej: ${isAlquiler ? (isShortTerm ? '120' : '1500') : '250000'}`}
            error={errors.amount?.message}
            {...register('amount', { valueAsNumber: true })}
          />
          {isAlquiler && (
            <p className="mt-1 text-xs text-text-tertiary">
              {isShortTerm ? 'Precio por noche' : 'Precio mensual'}
            </p>
          )}
        </div>
      </div>

      {/* Realtor Help */}
      <div className="rounded-xl border border-border p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            {...register('wantsRealtorHelp')}
          />
          <div>
            <span className="text-sm font-medium uppercase text-text-primary">
              Quiero ayuda de agentes
            </span>
            <p className="text-xs text-text-secondary">
              Agentes verificados podran contactarte para ayudar a vender tu propiedad
            </p>
          </div>
        </label>

        {wantsRealtorHelp && (
          <div className="mt-4">
            <label className="text-sm font-medium uppercase text-text-primary">
              Maximo de agentes
            </label>
            <div className="mt-2 flex gap-2">
              {[1, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValue('maxRealtors', n)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    watch('maxRealtors') === n
                      ? 'bg-primary text-white'
                      : 'border border-border text-text-secondary hover:border-primary/30'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit error */}
      {submitError && (
        <p className="text-sm text-error">{submitError}</p>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <p className="text-sm text-primary">{uploadProgress}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="text"
          onClick={prevStep}
          disabled={isSubmitting}
          className="flex-1"
        >
          Atras
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="flex-1"
        >
          {isEditMode ? 'Guardar Cambios' : 'Publicar'}
        </Button>
      </div>
    </form>
  )
}
