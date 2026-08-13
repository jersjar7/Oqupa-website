import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { step4Schema, fullListingSchema, type Step4Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useRevealedFields } from '@/hooks/useRevealedFields'
import { useAuthStore } from '@/stores/authStore'
import { firestoreService } from '@/services/firestoreService'
import { storageService } from '@/services/storageService'
import { Button, Input, InfoTip } from '@/app/components/ui'
import Modal from '@/app/components/ui/Modal'
import ShareFormatModal from '@/components/ShareFormatModal'
import RevealField from './RevealField'
import { CURRENCY_SYMBOLS, type Currency } from '@/types/enums'
import { AnalyticsLogger } from '@/lib/analytics'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import { attributionForListing } from '@/lib/attribution'

function formatPriceDisplay(amount: number | undefined, currency: Currency): string {
  if (amount == null || isNaN(amount)) return ''
  const formatted = amount.toLocaleString('en-US')
  return `${CURRENCY_SYMBOLS[currency]} ${formatted}`
}

export default function WizardStep5() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data, prevStep, isEditMode, editListingId, editPropertyId, reset } =
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
  const amount = watch('amount')
  const wantsRealtorHelp = watch('wantsRealtorHelp')
  const isAlquiler = data.operationType === 'alquiler'
  const isShortTerm = data.rentalDurationType === 'shortTerm'

  const { isRevealed, wasInitial } = useRevealedFields(
    {
      price: true, // always visible
      realtorHelp: typeof amount === 'number' && amount > 0,
      submitAndError: typeof amount === 'number' && amount > 0,
    },
    isEditMode
  )

  async function onSubmit(formData: Step4Data) {
    if (!user) return

    // Pre-submission validation of all steps
    // Merge formData (current Step 5 values) since they haven't been saved to the store yet
    const fullResult = fullListingSchema.safeParse({
      ...data,
      ...formData,
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
      setSubmitError('No hay fotos seleccionadas (Paso 4)')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    let createdPropertyId: string | null = null

    try {

      if (isEditMode && editPropertyId && editListingId) {
        // UPDATE FLOW
        // Upload new photos if any
        let newPhotoKeys: string[] = []
        let newBlurHashes: string[] = []
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          const results = await storageService.uploadMultiplePropertyPhotos(
            editPropertyId,
            data.photos,
            (p) => setUploadProgress(`Subiendo fotos... (${Math.round(p)}%)`)
          )
          newPhotoKeys = results.map(r => r.objectKey)
          newBlurHashes = results.map(r => r.blurHash)
        }

        // Build ordered photo key + blurHash arrays using photoOrder from Step 4.
        // Both arrays are aligned position-for-position so the cover photo's
        // hash is at index 0, etc.
        let allPhotoKeys: string[]
        let allBlurHashes: string[]
        if (data.photoOrder.length > 0) {
          allPhotoKeys = data.photoOrder.map(entry =>
            entry.type === 'existing'
              ? data.existingPhotoUrls[entry.index]!
              : newPhotoKeys[entry.index]!
          )
          allBlurHashes = data.photoOrder.map(entry =>
            entry.type === 'existing'
              ? data.existingPhotoBlurHashes[entry.index] ?? ''
              : newBlurHashes[entry.index] ?? ''
          )
        } else {
          // Fallback for listings edited before photo ordering was added
          allPhotoKeys = [...data.existingPhotoUrls, ...newPhotoKeys]
          allBlurHashes = [...data.existingPhotoBlurHashes, ...newBlurHashes]
        }

        // Diff against the originals captured at edit-init time to find
        // photos the user removed in Step 4. Anything no longer kept must
        // be deleted from R2 after the Firestore writes succeed.
        const keptKeys = new Set(data.existingPhotoUrls)
        const removedKeys = data.originalExistingPhotoUrls.filter(
          (k) => !keptKeys.has(k)
        )

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
            propertyPhotoUrls: allPhotoKeys,
            photoKeys: allPhotoKeys,
            photoBlurHashes: allBlurHashes,
          },
        })

        await firestoreService.updateListing(editListingId, {
          // operationType is denormalized from Property → Listing so Firestore
          // can filter without joining. Must be re-written on edit, otherwise
          // the listing's tab assignment goes stale (see Phase 1 fix in
          // oqupa/docs/diagnostics/listing-denormalization-divergence.md).
          // Phase 2 will move this to a server-managed sync trigger and remove
          // the client write.
          operationType: data.operationType as Listing['operationType'],
          description: data.description,
          price: { amount: formData.amount, currency: formData.currency },
          role: data.role as Listing['role'],
          wantsRealtorHelp: formData.wantsRealtorHelp ?? false,
          maxRealtors: formData.wantsRealtorHelp ? (formData.maxRealtors ?? 3) : 3,
          media: {
            propertyPhotoUrls: allPhotoKeys,
            photoKeys: allPhotoKeys,
            photoBlurHashes: allBlurHashes,
          },
          contactInfo: user.contactInfo,
          showExactLocation: data.showExactLocation,
        })

        // Best-effort R2 cleanup. Failure here does not roll back the
        // listing update — the orphaned objects can be reaped later.
        if (removedKeys.length > 0) {
          try {
            await storageService.deleteR2Photos(removedKeys)
          } catch (cleanupErr) {
            console.warn('R2 cleanup failed for removed photos:', cleanupErr)
          }
        }
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
        let photoKeys: string[] = []
        let blurHashes: string[] = []
        let microThumb = ''
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          const results = await storageService.uploadMultiplePropertyPhotos(
            propertyId,
            data.photos,
            (p) => setUploadProgress(`Subiendo fotos... (${Math.round(p)}%)`)
          )
          photoKeys = results.map(r => r.objectKey)
          blurHashes = results.map(r => r.blurHash)
          microThumb = results[0]?.microThumb ?? ''

          // Update property with photo keys, BlurHash, and micro-thumbnail
          await firestoreService.updateProperty(propertyId, {
            media: {
              propertyPhotoUrls: photoKeys,
              photoKeys,
              photoBlurHashes: blurHashes,
              ...(microThumb ? { primaryPhotoMicroThumb: microThumb } : {}),
            },
          })
        }

        // Create listing
        setUploadProgress('Creando publicacion...')
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        // Read once: two calls could disagree if storage changes mid-publish.
        const arrivedFrom = attributionForListing()

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
            propertyPhotoUrls: photoKeys,
            photoKeys,
            photoBlurHashes: blurHashes,
            ...(microThumb ? { primaryPhotoMicroThumb: microThumb } : {}),
          },
          wantsRealtorHelp: formData.wantsRealtorHelp ?? false,
          maxRealtors: formData.wantsRealtorHelp ? (formData.maxRealtors ?? 3) : 3,
          currentClaimsCount: 0,
          contactClickCount: 0,
          operationType: data.operationType as Listing['operationType'],
          isBoosted: false,
          boostScore: 1,
          showExactLocation: data.showExactLocation,
          // Owner identity copied onto the listing (ADR-015 Phase 3.3) so
          // rendering a listing card needs no read of the owner's user record.
          // Phase 4 makes those records private; without this the publisher
          // name, photo and verified badge would vanish from every card.
          ...(user.name ? { ownerDisplayName: user.name } : {}),
          ...(user.photoUrl ? { ownerPhotoKey: user.photoUrl } : {}),
          ownerIsVerified: Boolean(user.isPhoneVerified || user.isIdentityVerified),
          ownerMemberSinceYear: user.createdAt.getFullYear(),
          // How this person first found Oqupa, carried from their first visit.
          //
          // This is the only durable answer to "did paid advertising produce a
          // listing?". Meta's own reporting cannot answer it — it credits a
          // conversion only when it recognises the browser, which ad blockers,
          // Safari and iOS increasingly prevent. Stamping it on the listing
          // means the answer lives in our own database and survives whatever
          // Meta can or cannot see.
          //
          // Campaign labels and a timestamp only; no personal data. Absent for
          // anyone whose browser blocks local storage, which is expected and
          // must never block a publish.
          ...(arrivedFrom ? { attribution: arrivedFrom } : {}),
        }

        const listingId = await firestoreService.createListing(listingData)

        // Build objects for the success modal share CTA
        const createdListing: Listing = {
          ...listingData,
          id: listingId,
          createdAt: now,
          updatedAt: now,
          viewCount: 0,
          contactClickCount: 0,
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
            propertyPhotoUrls: photoKeys,
            photoKeys,
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
      {/* Price — always visible */}
      <RevealField visible={isRevealed('price')} animate={!wasInitial('price')}>
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
              type="text"
              inputMode="numeric"
              placeholder={`Ej: ${CURRENCY_SYMBOLS[currency]} ${isAlquiler ? (isShortTerm ? '120' : '1,500') : '250,000'}`}
              error={errors.amount?.message}
              value={formatPriceDisplay(amount, currency)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '')
                const num = raw === '' ? undefined : Number(raw)
                setValue('amount', num as number, { shouldValidate: true })
              }}
            />
            {isAlquiler && (
              <p className="mt-1 text-xs text-text-tertiary">
                {isShortTerm ? 'Precio por noche' : 'Precio mensual'}
              </p>
            )}
          </div>
        </div>
      </RevealField>

      {/* Realtor Help */}
      <RevealField visible={isRevealed('realtorHelp')} animate={!wasInitial('realtorHelp')}>
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
                <InfoTip text="Limita cuántos agentes pueden solicitar ayudarte con tu propiedad. Puedes cambiar esto después de publicar." />
              </label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
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
      </RevealField>

      {/* Submit + Error */}
      <RevealField visible={isRevealed('submitAndError')} animate={!wasInitial('submitAndError')} delay={0.15}>
        <div className="space-y-6">
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
        </div>
      </RevealField>
    </form>
  )
}
