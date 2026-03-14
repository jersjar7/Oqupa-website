import { useState } from 'react'
import { firestoreService } from '@/services/firestoreService'

interface FormData {
  name: string
  email: string
  intent: string
  privacyConsent: boolean
}

interface FormErrors {
  name?: string
  email?: string
  intent?: string
  privacyConsent?: string
}

export function useWaitlistForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    intent: '',
    privacyConsent: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Por favor ingresa tu nombre completo'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Por favor ingresa tu correo electrónico'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un correo electrónico válido'
    }

    if (!formData.intent) {
      newErrors.intent = 'Por favor selecciona qué te interesa más'
    }

    if (!formData.privacyConsent) {
      newErrors.privacyConsent = 'Debes aceptar la política de privacidad'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await firestoreService.addWaitlistEntry({
        name: formData.name.trim(),
        email: formData.email.trim(),
        intent: formData.intent as 'buscar' | 'publicar' | 'ambos',
        privacyConsent: formData.privacyConsent,
      })
      setIsSuccess(true)
      setFormData({ name: '', email: '', intent: '', privacyConsent: false })
    } catch {
      setErrors({ name: 'Error al registrarse. Inténtalo de nuevo.' })
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
