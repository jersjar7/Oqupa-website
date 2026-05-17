import { useState } from 'react'
import { httpsCallable, getFunctions } from 'firebase/functions'
import { toast } from 'sonner'
import { firestoreService } from '@/services/firestoreService'
import { getRecaptchaToken } from '@/lib/recaptcha'
import { getCapturedErrors } from '@/lib/errorBuffer'

interface FormData {
  contact: string
  description: string
  technical: string
}

interface FormErrors {
  contact?: string
  description?: string
}

const RECAPTCHA_ENABLED = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY

export function useBugReportForm() {
  const [formData, setFormData] = useState<FormData>(() => ({
    contact: '',
    description: '',
    // Pre-fill with whatever errors were captured before the user got here.
    technical: getCapturedErrors(),
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.contact.trim()) {
      newErrors.contact = 'Déjanos un correo o teléfono para responderte'
    } else if (formData.contact.trim().length < 5) {
      newErrors.contact = 'Ingresa un correo o teléfono válido'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Cuéntanos qué pasó'
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Danos un poco más de detalle'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const report = {
        contact: formData.contact.trim(),
        description: formData.description.trim(),
        technical: formData.technical.trim(),
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }

      let submitted = false

      if (RECAPTCHA_ENABLED) {
        try {
          const token = await getRecaptchaToken('bug_report')
          const functions = getFunctions(undefined, 'southamerica-east1')
          const submitBugReport = httpsCallable(
            functions,
            'submitBugReportWithCaptcha'
          )
          await submitBugReport({ token, ...report })
          submitted = true
        } catch (recaptchaError) {
          // reCAPTCHA failed — fall through to direct write
          console.warn(
            'reCAPTCHA submission failed, falling back to direct write:',
            recaptchaError
          )
        }
      }

      if (!submitted) {
        await firestoreService.submitBugReport(report)
      }

      setIsSuccess(true)
      setFormData({ contact: '', description: '', technical: '' })
      toast.success('¡Gracias! Recibimos tu reporte.')
    } catch {
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
