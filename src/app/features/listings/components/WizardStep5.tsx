import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { step4Schema, fullListingSchema, type Step4Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useAuthStore } from '@/stores/authStore'
import { auth } from '@/lib/firebase'
import { firestoreService } from '@/services/firestoreService'
import { storageService } from '@/services/storageService'
import {
  publishListing,
  PublishError,
  PUBLISH_ERROR_MESSAGES,
  type ListingDoc,
  type PropertyDoc,
} from '@/services/publishService'
import { Input, FillingButton } from '@/app/components/ui'
import type { FillStatus } from '@/app/components/ui/FillingButton'
import WizardNav, { WIZARD_BUTTON } from './WizardNav'
import { WIZARD_HEADING, choiceClass } from './wizardStyles'
import type { Currency } from '@/types/enums'
import { parseLocaleNumber } from '@/lib/localeNumber'
import { AnalyticsLogger } from '@/lib/analytics'
import { publishRealProgress } from '@/lib/fillProgress'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import { attributionForListing } from '@/lib/attribution'
import { normalizedAddressOnEdit, publicLocationOnEdit } from '../editLocation'
import { coverMicroThumbOnEdit } from '../editMedia'
import { editAwareResolver, issuesThatCount } from '../editLimits'
import { storeWayBackFor } from '@/lib/returnPath'
import { authService } from '@/services/authService'

/** Shown when the draft was changed after an earlier attempt had already landed. */
export const ALREADY_PUBLISHED_NOTICE = 'Tu anuncio ya se había publicado. Puedes editarlo aquí.'

/** The price box says S/ and US$ (ADR-043 D9). */
const CURRENCY_WORDS: Record<Currency, string> = { PEN: 'S/', USD: 'US$' }
/** The currency buttons say the word too (Jerson, 2026-11-02). */
const CURRENCY_BUTTONS: Record<Currency, string> = { PEN: 'S/ Soles', USD: 'US$ Dólares' }

/** The price as shown once the person leaves the box: "250,000", "1,500.5". */
function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return ''
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export default function WizardStep5() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const {
    data, prevStep, updateData, isEditMode, editListingId, editPropertyId, reset,
    recordUploadedPhoto, persistDraft, markPublished, claimPublishIdentity, renewPublishIdentity,
  } = useListingFormStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // The sign-in ended before or during PUBLICAR: offer INICIAR SESIÓN.
  const [sessionClosed, setSessionClosed] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  // The new-listing publish (ADR-043). Always starts idle: a draft that is
  // already published is cleared by CreateListingPage and refused by
  // publishNew — mounting must never replay "¡PUBLICADO!" and jump to it.
  const [publishStatus, setPublishStatus] = useState<FillStatus>('idle')
  // False when storage refused the draft's identity (private mode, full).
  const [identityStored, setIdentityStored] = useState(true)
  const [publishProgress, setPublishProgress] = useState(0)
  // Set synchronously on the first click, so a second click that lands
  // before React re-renders cannot start a second publish.
  const publishingRef = useRef(false)

  // Leaving while photos and the listing are on their way would lose them.
  //
  // If the identity could not be stored, a refresh would come back with a
  // NEW identity while an earlier save may still land (a timed-out save can
  // commit later) — a duplicate. We chose to keep publishing with the
  // identity held in memory rather than refuse to publish, and instead keep
  // this warning up for the whole publish, errors included, until it
  // succeeds or the person leaves on purpose.
  // While publishing or saving, the browser's back button stays on this page
  // (it would otherwise go to Fotos in the middle of the save).
  const busy = isSubmitting || publishStatus === 'filling' || publishStatus === 'done'
  useEffect(() => {
    useListingFormStore.getState().setNavigationLocked(busy)
    return () => useListingFormStore.getState().setNavigationLocked(false)
  }, [busy])

  const guardLeaving = publishStatus === 'filling' || (publishStatus === 'error' && !identityStored)
  useEffect(() => {
    if (!guardLeaving) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [guardLeaving])

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Step4Data>({
    resolver: editAwareResolver(zodResolver(step4Schema)),
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
  // The box shows exactly what is typed. Reformatting it on every keystroke
  // ("S/. 15,000") threw the cursor to the end; the thousands are shown when
  // the person leaves the box.
  const [priceText, setPriceText] = useState(() => formatAmount(data.amount))

  // The price, currency and agent choice go into the draft as they change, so
  // a refresh in this tab, ATRÁS or the back button keep them.
  useEffect(() => {
    const sub = watch((v) => {
      updateData({
        amount: typeof v.amount === 'number' && Number.isFinite(v.amount) ? v.amount : null,
        currency: (v.currency ?? 'PEN') as Currency,
      })
    })
    return () => sub.unsubscribe()
  }, [watch, updateData])
  const isAlquiler = data.operationType === 'alquiler'
  const isShortTerm = data.rentalDurationType === 'shortTerm'


  // INICIAR SESIÓN after the publish was refused because the sign-in ended:
  // keep the draft in this tab, end the stale session (otherwise the sign-in
  // page sends a still-signed-in person straight back here, in a loop), and
  // go to sign-in, which returns here once the same account is back. A
  // different account gets a clean wizard (draftOwnerWatch).
  async function signInAgain() {
    persistDraft()
    // The way back belongs to this account only (third review #2): someone
    // else signing in on this computer is not sent into this wizard.
    if (user) storeWayBackFor(user.id, `${location.pathname}${location.search}`)
    try {
      await authService.endStaleSession()
    } catch {
      // Signing out of a session that is already gone can fail; go on.
    }
    navigate('/app/login')
  }

  async function onSubmit(formData: Step4Data) {
    // Unreachable in the app: the route's guards send a signed-out person to
    // sign-in (and back here afterwards, review #3). Kept for the types.
    if (!user) return
    setSessionClosed(false)

    // Pre-submission validation of all steps
    // Merge formData (current Step 5 values) since they haven't been saved to the store yet
    const checked = {
      ...data,
      ...formData,
      totalAreaInSquareMeters: data.totalAreaInSquareMeters ?? undefined,
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
    }
    const fullResult = fullListingSchema.safeParse(checked)
    // Editing: limits only on what the owner changed (review #6).
    const blocking = fullResult.success ? [] : issuesThatCount(fullResult.error.issues, checked)

    if (blocking.length > 0) {
      const message = blocking[0]?.message ?? 'Faltan datos obligatorios'
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
          // Agent help is changed from Mis Propiedades now (D10): an edit
          // keeps what the listing has.
          wantsRealtorHelp: data.wantsRealtorHelp ?? false,
          maxRealtors: data.maxRealtors ?? 3,
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
    // The identity, claimed for this account (a draft another account left
    // in this browser gets a fresh one), stored with the draft before
    // anything is sent.
    let publishId = claimPublishIdentity(user.id)
    setIdentityStored(persistDraft())

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    // Read once: two calls could disagree if storage changes mid-publish.
    const arrivedFrom = attributionForListing()

    try {
      const attempt = (id: string) => publishListing({
        publishId: id,
        photos: data.photos,
        uploadedPhotos: useListingFormStore.getState().uploadedPhotos,
        onPhotoUploaded: recordUploadedPhoto,
        onProgress: (stage, fraction) => setPublishProgress(publishRealProgress(stage, fraction)),
        isSignedIn: () => auth.currentUser !== null,
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
            // D10: agent help is offered after publishing, off until the
            // owner turns it on in Mis Propiedades.
            wantsRealtorHelp: false,
            maxRealtors: 3,
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

      let outcome
      try {
        outcome = await attempt(publishId)
      } catch (err) {
        // The ids belong to another account: nothing the person did.
        // Take a fresh identity and try once more, without telling anyone.
        if (!(err instanceof PublishError) || err.kind !== 'id-taken') throw err
        publishId = renewPublishIdentity(user.id)
        setIdentityStored(persistDraft())
        outcome = await attempt(publishId)
      }

      if (outcome.contentChanged) {
        // An earlier attempt landed after its time limit, and the draft was
        // changed since. Those changes are NOT in the listing: say so, and
        // take the person to the listing that exists, where they can edit.
        const listingId = outcome.listingId
        markPublished(listingId)
        void queryClient.invalidateQueries({ queryKey: ['listings'] })
        toast(ALREADY_PUBLISHED_NOTICE, {
          duration: 10000,
          action: { label: 'Editar', onClick: () => navigate(`/app/listings/${listingId}/edit`) },
        })
        navigate(`/property/${listingId}`, { replace: true })
        reset()
        return
      }

      // Saved. The draft goes now — not when some dialog closes — so a
      // refresh, a back button or a second tab cannot publish it again.
      markPublished(outcome.listingId)
      if (!outcome.alreadyPublished) AnalyticsLogger.listingCreated(data.operationType)
      void queryClient.invalidateQueries({ queryKey: ['listings'] })
      setPublishStatus('done')
    } catch (err) {
      console.error('Publish error:', err)
      publishingRef.current = false
      // One Spanish sentence saying what went wrong. The retry reuses the
      // same identity and skips the photos that already arrived.
      setSubmitError(err instanceof PublishError ? err.message : PUBLISH_ERROR_MESSAGES.other)
      setSessionClosed(err instanceof PublishError && err.failure === 'session')
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section>
        <h2 className={WIZARD_HEADING}>Precio</h2>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {(['PEN', 'USD'] as const).map((cur) => (
            <button
              key={cur}
              type="button"
              aria-pressed={currency === cur}
              onClick={() => setValue('currency', cur)}
              className={choiceClass(currency === cur)}
            >
              {CURRENCY_BUTTONS[cur]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-start gap-2">
            <span className="pt-2.5 text-base font-medium text-text-primary" aria-hidden="true">
              {CURRENCY_WORDS[currency]}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`Precio en ${CURRENCY_WORDS[currency]}`}
              placeholder={`Ej: ${isAlquiler ? (isShortTerm ? '120' : '1,500') : '250,000'}`}
              error={errors.amount?.message}
              value={priceText}
              onChange={(e) => {
                setPriceText(e.target.value)
                setValue('amount', parseLocaleNumber(e.target.value) as number, { shouldValidate: true })
              }}
              onBlur={() => {
                const n = getValues('amount')
                if (typeof n === 'number' && Number.isFinite(n)) setPriceText(formatAmount(n))
              }}
            />
          </div>
          {isAlquiler && (
            <p className="mt-1 text-sm text-text-secondary">
              {isShortTerm ? 'Precio por noche' : 'Precio mensual'}
            </p>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {submitError && (
          <p role="alert" className="text-sm text-error">{submitError}</p>
        )}
        {sessionClosed && (
          <button
            type="button"
            onClick={() => void signInAgain()}
            className={`${WIZARD_BUTTON} w-full bg-secondary text-white hover:bg-secondary-hover`}
          >
            Iniciar sesión
          </button>
        )}

        {/* Edit mode: what is being saved */}
        {isEditMode && uploadProgress && (
          <p className="text-sm text-secondary">{uploadProgress}</p>
        )}

        <WizardNav onBack={prevStep} backDisabled={busy}>
          {isEditMode ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${WIZARD_BUTTON} flex-[2] bg-secondary text-white hover:bg-secondary-hover disabled:opacity-60`}
            >
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          ) : (
            <FillingButton
              type="submit"
              status={publishStatus}
              progress={publishProgress}
              onDone={handlePublishedShown}
              solid
              className="h-14 flex-[2]"
            >
              Publicar
            </FillingButton>
          )}
        </WizardNav>
      </div>
    </form>
  )
}
