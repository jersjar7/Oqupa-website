import { useEffect, useRef, useState } from 'react'
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
import { publishListing, PUBLISH_FAILED_MESSAGE, type ListingDoc, type PropertyDoc } from '@/services/publishService'
import { Button, Input, InfoTip, FillingButton } from '@/app/components/ui'
import type { FillStatus } from '@/app/components/ui/FillingButton'
import RevealField from './RevealField'
import { CURRENCY_SYMBOLS, type Currency } from '@/types/enums'
import { AnalyticsLogger } from '@/lib/analytics'
import { publishRealProgress } from '@/lib/fillProgress'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import { attributionForListing } from '@/lib/attribution'
import { normalizedAddressOnEdit, publicLocationOnEdit } from '../editLocation'
import { coverMicroThumbOnEdit } from '../editMedia'

function formatPriceDisplay(amount: number | undefined, currency: Currency): string {
  if (amount == null || isNaN(amount)) return ''
  const formatted = amount.toLocaleString('en-US')
  return `${CURRENCY_SYMBOLS[currency]} ${formatted}`
}

export default function WizardStep5() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const {
    data, prevStep, isEditMode, editListingId, editPropertyId, reset,
    publishId, recordUploadedPhoto, persistDraft, markPublished, publishedListingId,
  } = useListingFormStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  // The new-listing publish (ADR-043). A draft already published cannot
  // publish again: the button stays done and the person moves on.
  const [publishStatus, setPublishStatus] = useState<FillStatus>(
    publishedListingId ? 'done' : 'idle',
  )
  const [publishProgress, setPublishProgress] = useState(0)
  // Set synchronously on the first click, so a second click that lands
  // before React re-renders cannot start a second publish.
  const publishingRef = useRef(false)

  // Leaving while photos and the listing are on their way would lose them.
  useEffect(() => {
    if (publishStatus !== 'filling') return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [publishStatus])

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

    if (!isEditMode) {
      await publishNew(formData)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (editPropertyId && editListingId) {
        // UPDATE FLOW
        // Upload new photos if any
        let newPhotoKeys: string[] = []
        let newBlurHashes: string[] = []
        let newMicroThumbs: string[] = []
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          const results = await storageService.uploadMultiplePropertyPhotos(
            editPropertyId,
            data.photos,
          )
          newPhotoKeys = results.map(r => r.objectKey)
          newBlurHashes = results.map(r => r.blurHash)
          newMicroThumbs = results.map(r => r.microThumb)
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

        // The cover's blurred preview: rewriting `media` without it dropped it.
        const coverMicroThumb = coverMicroThumbOnEdit({
          photoOrder: data.photoOrder,
          existingPhotoUrls: data.existingPhotoUrls,
          newMicroThumbs,
          originalCoverKey: data.originalExistingPhotoUrls[0],
          originalCoverMicroThumb: data.originalCoverMicroThumb ?? '',
        })
        const editedMedia = {
          propertyPhotoUrls: allPhotoKeys,
          photoKeys: allPhotoKeys,
          photoBlurHashes: allBlurHashes,
          ...(coverMicroThumb ? { primaryPhotoMicroThumb: coverMicroThumb } : {}),
        }

        setUploadProgress('Actualizando propiedad...')
        const publicLocation = publicLocationOnEdit(data)
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
            ...publicLocation,
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
          // The address text went stale after an address change: an edit
          // never rewrote it.
          normalizedAddress: normalizedAddressOnEdit(publicLocation.calle, data),
          media: editedMedia,
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
          media: editedMedia,
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
      }

      await queryClient.invalidateQueries({ queryKey: ['listings'] })
      reset()
      navigate('/app')
    } catch (err) {
      console.error('Submission error:', err)

      // Invalidate queries even on error so dashboard reflects any partial changes
      await queryClient.invalidateQueries({ queryKey: ['listings'] })

      const message = err instanceof Error ? err.message : ''
      if (message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
        setSubmitError('No tienes permisos para realizar esta acción.')
      } else if (message.includes('not-found')) {
        setSubmitError('No se encontró la publicación. Puede haber sido eliminada.')
      } else if (/storage|upload/i.test(message)) {
        // Case-insensitive: the upload error says "Upload failed", which the
        // old lowercase check never matched.
        setSubmitError('Error al subir las fotos. Verifica tu conexión e intenta de nuevo.')
      } else if (!navigator.onLine) {
        setSubmitError('Sin conexión a internet. Verifica tu conexión e intenta de nuevo.')
      } else {
        setSubmitError('Error al guardar. Intenta de nuevo.')
      }
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  // CREATE FLOW (ADR-043): photos first under the draft's identity, then the
  // property and the listing in one write. Every attempt for this draft
  // targets the same two documents, so a retry can never duplicate.
  async function publishNew(formData: Step4Data) {
    if (!user || publishingRef.current || useListingFormStore.getState().publishedListingId) return
    publishingRef.current = true
    setSubmitError(null)
    setPublishProgress(0)
    setPublishStatus('filling')
    // The identity must be stored with the draft before anything is sent.
    persistDraft()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    // Read once: two calls could disagree if storage changes mid-publish.
    const arrivedFrom = attributionForListing()

    try {
      const outcome = await publishListing({
        publishId,
        photos: data.photos,
        uploadedPhotos: useListingFormStore.getState().uploadedPhotos,
        onPhotoUploaded: recordUploadedPhoto,
        onProgress: (stage, fraction) => setPublishProgress(publishRealProgress(stage, fraction)),
        buildDocs: ({ propertyId, media }) => {
          const mediaDoc = {
            propertyPhotoUrls: media.photoKeys,
            photoKeys: media.photoKeys,
            photoBlurHashes: media.blurHashes,
            ...(media.microThumb ? { primaryPhotoMicroThumb: media.microThumb } : {}),
          }
          const property: PropertyDoc = {
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
            media: mediaDoc,
            isAvailable: true,
          }
          const listing: ListingDoc = {
            role: data.role as Listing['role'],
            ownerId: user.id,
            propertyId,
            description: data.description,
            price: { amount: formData.amount, currency: formData.currency },
            contactInfo: user.contactInfo,
            status: 'active' as const,
            publishedAt: now,
            expiresAt,
            media: mediaDoc,
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
          return { property, listing }
        },
      })

      // Saved. The draft goes now — not when some dialog closes — so a
      // refresh, a back button or a second tab cannot publish it again.
      markPublished(outcome.listingId)
      if (!outcome.alreadyPublished) AnalyticsLogger.listingCreated(data.operationType)
      void queryClient.invalidateQueries({ queryKey: ['listings'] })
      setPublishStatus('done')
    } catch (err) {
      console.error('Publish error:', err)
      publishingRef.current = false
      // One Spanish sentence, whatever went wrong. The retry reuses the
      // same identity and skips the photos that already arrived.
      setSubmitError(PUBLISH_FAILED_MESSAGE)
      setPublishStatus('error')
    }
  }

  // After "¡PUBLICADO!": the new listing's page, which offers to share it.
  const handlePublishedShown = () => {
    const listingId = useListingFormStore.getState().publishedListingId
    if (!listingId) return
    navigate(`/property/${listingId}`, { replace: true, state: { justPublished: true } })
    reset()
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
                Agentes verificados podrán contactarte para ayudar a vender tu propiedad
              </p>
            </div>
          </label>

          {wantsRealtorHelp && (
            <div className="mt-4">
              <label className="text-sm font-medium uppercase text-text-primary">
                Máximo de agentes
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

          {/* Edit mode: what is being saved */}
          {isEditMode && uploadProgress && (
            <p className="text-sm text-primary">{uploadProgress}</p>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="text"
              onClick={prevStep}
              disabled={isSubmitting || publishStatus === 'filling' || publishStatus === 'done'}
              className="flex-1"
            >
              Atrás
            </Button>
            {isEditMode ? (
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="flex-1"
              >
                Guardar Cambios
              </Button>
            ) : (
              <FillingButton
                type="submit"
                status={publishStatus}
                progress={publishProgress}
                onDone={handlePublishedShown}
                className="flex-1"
              >
                Publicar
              </FillingButton>
            )}
          </div>
        </div>
      </RevealField>
    </form>
  )
}
