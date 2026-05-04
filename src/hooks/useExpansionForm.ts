import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'
import { toast } from 'sonner'
import { firestoreService } from '@/services/firestoreService'
import { getRecaptchaToken } from '@/lib/recaptcha'
import {
  PERU_DEPARTAMENTOS_EXCEPT_PIURA,
  type PeruDepartamento,
} from '@/lib/peruDepartamentos'

interface FormData {
  name: string
  phone: string
  email: string
  departamento: PeruDepartamento | ''
  contactConsent: boolean
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
  departamento?: string
  contactConsent?: string
}

interface UseExpansionFormOptions {
  onSuccess?: () => void
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

const RECAPTCHA_ENABLED = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY

export function useExpansionForm(options?: UseExpansionFormOptions) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    departamento: '',
    contactConsent: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Por favor ingresa tu nombre'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres'
    }

    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (!phoneDigits) {
      newErrors.phone = 'Por favor ingresa tu número de teléfono'
    } else if (phoneDigits.length < 9) {
      newErrors.phone = 'El número debe tener 9 dígitos'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Por favor ingresa tu correo electrónico'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un correo electrónico válido'
    }

    if (!formData.departamento) {
      newErrors.departamento = 'Selecciona tu departamento'
    } else if (
      !PERU_DEPARTAMENTOS_EXCEPT_PIURA.includes(formData.departamento as PeruDepartamento)
    ) {
      newErrors.departamento = 'Selecciona un departamento válido'
    }

    if (!formData.contactConsent) {
      newErrors.contactConsent = 'Debes aceptar ser contactado'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    let formatted: string | boolean
    if (type === 'checkbox') {
      formatted = checked
    } else if (name === 'phone') {
      formatted = formatPhone(value)
    } else {
      formatted = value
    }

    setFormData((prev) => ({ ...prev, [name]: formatted }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const entry = {
        name: formData.name.trim(),
        phone: '+51 ' + formData.phone.trim(),
        email: formData.email.trim(),
        departamento: formData.departamento as PeruDepartamento,
        contactConsent: formData.contactConsent,
      }

      let submitted = false

      if (RECAPTCHA_ENABLED) {
        try {
          const token = await getRecaptchaToken('waitlist_signup')
          const functions = getFunctions(undefined, 'southamerica-east1')
          const submitWaitlist = httpsCallable(functions, 'submitWaitlistWithCaptcha')
          await submitWaitlist({ token, ...entry })
          submitted = true
        } catch (recaptchaError) {
          // reCAPTCHA failed — fall through to direct write
          console.warn('reCAPTCHA submission failed, falling back to direct write:', recaptchaError)
        }
      }

      if (!submitted) {
        await firestoreService.addWaitlistEntry(entry)
      }
      setIsSuccess(true)
      setFormData({ name: '', phone: '', email: '', departamento: '', contactConsent: false })
      toast.success('¡Recibimos tu solicitud!')
      options?.onSuccess?.()
    } catch {
      setErrors({ name: 'Error al enviar. Inténtalo de nuevo.' })
      toast.error('Error al enviar. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    handleChange,
    handleSubmit,
  }
}
