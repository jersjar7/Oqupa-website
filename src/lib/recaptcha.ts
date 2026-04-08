const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

let scriptLoaded = false

export function loadRecaptchaScript(): Promise<void> {
  if (scriptLoaded || !RECAPTCHA_SITE_KEY) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('reCAPTCHA script load timeout')), 5000)
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`
    script.async = true
    script.onload = () => {
      clearTimeout(timeout)
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('reCAPTCHA script failed to load'))
    }
    document.head.appendChild(script)
  })
}

export async function getRecaptchaToken(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) return ''

  await loadRecaptchaScript()

  if (!window.grecaptcha?.enterprise) {
    throw new Error('reCAPTCHA Enterprise failed to load')
  }

  // Race the reCAPTCHA call against a timeout to prevent hanging
  const tokenPromise = new Promise<string>((resolve, reject) => {
    window.grecaptcha.enterprise.ready(() => {
      window.grecaptcha.enterprise
        .execute(RECAPTCHA_SITE_KEY, { action })
        .then(resolve)
        .catch(reject)
    })
  })

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('reCAPTCHA token timeout')), 5000)
  })

  return Promise.race([tokenPromise, timeoutPromise])
}

// Type augmentation for window.grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      enterprise: {
        ready: (cb: () => void) => void
        execute: (siteKey: string, options: { action: string }) => Promise<string>
      }
    }
  }
}
