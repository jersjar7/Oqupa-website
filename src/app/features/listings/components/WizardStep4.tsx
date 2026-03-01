import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { step4Schema, type Step4Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useAuthStore } from '@/stores/authStore'
import { firestoreService } from '@/services/firestoreService'
import { storageService } from '@/services/storageService'
import { Button, Input } from '@/app/components/ui'
import { CURRENCY_SYMBOLS, type Currency } from '@/types/enums'
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
      amount: data.amount ?? undefined,
      currency: (data.currency || 'PEN') as Currency,
      wantsRealtorHelp: data.wantsRealtorHelp,
      maxRealtors: data.maxRealtors,
    },
  })

  const currency = watch('currency')
  const wantsRealtorHelp = watch('wantsRealtorHelp')

  async function onSubmit(formData: Step4Data) {
    if (!user) return

    setIsSubmitting(true)
    setSubmitError(null)

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
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          newPhotoUrls = await storageService.uploadMultiplePropertyPhotos(
            editPropertyId,
            data.photos,
            (i, p) => setUploadProgress(`Subiendo foto ${i + 1}/${data.photos.length} (${Math.round(p)}%)`)
          )
        }

        const allPhotoUrls = [...data.existingPhotoUrls, ...newPhotoUrls]

        setUploadProgress('Actualizando propiedad...')
        await firestoreService.updateProperty(editPropertyId, {
          propertyType: data.propertyType as Property['propertyType'],
          operationType: data.operationType as Property['operationType'],
          specs: {
            totalAreaInSquareMeters: data.totalAreaInSquareMeters!,
            bedroomCount: data.bedroomCount ?? undefined,
            bathroomCount: data.bathroomCount ?? undefined,
            availableParkingSpaces: data.availableParkingSpaces,
            propertyAmenities: data.propertyAmenities,
          },
          location: {
            latitude: data.latitude!,
            longitude: data.longitude!,
            calle: data.calle,
            distrito: data.distrito,
            provincia: data.provincia,
            departamento: data.departamento,
            countryIsoCode: 'PE',
          },
          currentPrice: {
            amount: formData.amount,
            currency: formData.currency,
          },
          media: { propertyPhotoUrls: allPhotoUrls },
        })

        await firestoreService.updateListing(editListingId, {
          description: data.description,
          price: { amount: formData.amount, currency: formData.currency },
          role: data.role as Listing['role'],
          wantsRealtorHelp: formData.wantsRealtorHelp ?? false,
          maxRealtors: formData.wantsRealtorHelp ? (formData.maxRealtors ?? 3) : 3,
          media: { propertyPhotoUrls: allPhotoUrls },
          contactInfo: user.contactInfo,
        })
      } else {
        // CREATE FLOW
        setUploadProgress('Creando propiedad...')
        const propertyId = await firestoreService.createProperty({
          listedByUserId: user.id,
          propertyType: data.propertyType as Property['propertyType'],
          operationType: data.operationType as Property['operationType'],
          specs: {
            totalAreaInSquareMeters: data.totalAreaInSquareMeters!,
            bedroomCount: data.bedroomCount ?? undefined,
            bathroomCount: data.bathroomCount ?? undefined,
            availableParkingSpaces: data.availableParkingSpaces,
            propertyAmenities: data.propertyAmenities,
          },
          location: {
            latitude: data.latitude!,
            longitude: data.longitude!,
            calle: data.calle,
            distrito: data.distrito,
            provincia: data.provincia,
            departamento: data.departamento,
            countryIsoCode: 'PE',
          },
          currentPrice: {
            amount: formData.amount,
            currency: formData.currency,
          },
          normalizedAddress: `${data.calle}, ${data.distrito}, ${data.provincia}, ${data.departamento}`,
          media: { propertyPhotoUrls: [] },
          isAvailable: true,
        })

        // Upload photos
        let photoUrls: string[] = []
        if (data.photos.length > 0) {
          setUploadProgress('Subiendo fotos...')
          photoUrls = await storageService.uploadMultiplePropertyPhotos(
            propertyId,
            data.photos,
            (i, p) => setUploadProgress(`Subiendo foto ${i + 1}/${data.photos.length} (${Math.round(p)}%)`)
          )

          // Update property with photo URLs
          await firestoreService.updateProperty(propertyId, {
            media: { propertyPhotoUrls: photoUrls },
          })
        }

        // Create listing
        setUploadProgress('Creando publicacion...')
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        await firestoreService.createListing({
          role: data.role as Listing['role'],
          ownerId: user.id,
          propertyId,
          description: data.description,
          price: { amount: formData.amount, currency: formData.currency },
          contactInfo: user.contactInfo,
          status: 'active',
          publishedAt: now,
          expiresAt,
          media: { propertyPhotoUrls: photoUrls },
          wantsRealtorHelp: formData.wantsRealtorHelp ?? false,
          maxRealtors: formData.wantsRealtorHelp ? (formData.maxRealtors ?? 3) : 3,
          currentClaimsCount: 0,
        })
      }

      // Invalidate queries and navigate
      await queryClient.invalidateQueries({ queryKey: ['listings'] })
      reset()
      navigate('/app')
    } catch (err) {
      console.error('Submission error:', err)
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Price */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">Precio</h3>

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
            placeholder={`Ej: ${data.operationType === 'alquiler' ? '1500' : '250000'}`}
            error={errors.amount?.message}
            {...register('amount', { valueAsNumber: true })}
          />
          {data.operationType === 'alquiler' && (
            <p className="mt-1 text-xs text-text-tertiary">Precio mensual</p>
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
            <span className="text-sm font-medium text-text-primary">
              Quiero ayuda de corredores
            </span>
            <p className="text-xs text-text-secondary">
              Corredores verificados podran contactarte para ayudar a vender tu propiedad
            </p>
          </div>
        </label>

        {wantsRealtorHelp && (
          <div className="mt-4">
            <label className="text-sm font-medium text-text-primary">
              Maximo de corredores
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
          variant="ghost"
          size="lg"
          onClick={prevStep}
          disabled={isSubmitting}
          className="flex-1"
        >
          Atras
        </Button>
        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="flex-1"
        >
          {isEditMode ? 'Guardar Cambios' : 'Publicar'}
        </Button>
      </div>
    </form>
  )
}
