import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFunctions } from 'firebase/functions'
import { firestoreService } from '@/services/firestoreService'
import { getRecaptchaToken } from '@/lib/recaptcha'

interface FormData {
  name: string
  phone: string
  email: string
  city: string
  budget: string
  contactConsent: boolean
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
  city?: string
  budget?: string
  contactConsent?: string
}

interface UseWaitlistFormOptions {
  onSuccess?: () => void
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

function formatBudget(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (!digits) return ''
  const number = parseInt(digits, 10)
  return number.toLocaleString('en-US')
}

const RECAPTCHA_ENABLED = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY

export function useWaitlistForm(options?: UseWaitlistFormOptions) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    city: '',
    budget: '',
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
      newErrors.phone = 'Por favor ingresa tu numero de telefono'
    } else if (phoneDigits.length < 9) {
      newErrors.phone = 'El numero debe tener 9 digitos'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Por favor ingresa tu correo electronico'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un correo electronico valido'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Por favor ingresa tu ciudad de interes'
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
    } else if (name === 'budget') {
      formatted = formatBudget(value)
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
        city: formData.city.trim(),
        budget: formData.budget ? 'S/. ' + formData.budget + '.00' : '',
        contactConsent: formData.contactConsent,
      }

      if (RECAPTCHA_ENABLED) {
        const token = await getRecaptchaToken('waitlist_signup')
        const functions = getFunctions(undefined, 'southamerica-east1')
        const submitWaitlist = httpsCallable(functions, 'submitWaitlistWithCaptcha')
        await submitWaitlist({ token, ...entry })
      } else {
        await firestoreService.addWaitlistEntry(entry)
      }
      setIsSuccess(true)
      setFormData({ name: '', phone: '', email: '', city: '', budget: '', contactConsent: false })
      options?.onSuccess?.()
    } catch {
      setErrors({ name: 'Error al registrarse. Intentalo de nuevo.' })
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
