import { useEffect } from 'react'

interface DocumentMeta {
  title: string
  description?: string
  image?: string
  url?: string
}

/**
 * Sets document title and Open Graph / Twitter Card meta tags.
 * Tags are created if they don't exist, updated if they do.
 * Resets document.title to "Oqupa" on unmount.
 */
export function useDocumentMeta({ title, description, image, url }: DocumentMeta) {
  useEffect(() => {
    document.title = title

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(
        `meta[property="${property}"]`,
      ) as HTMLMetaElement | null
      if (!el) {
        el = document.querySelector(
          `meta[name="${property}"]`,
        ) as HTMLMetaElement | null
      }
      if (!el) {
        el = document.createElement('meta')
        if (property.startsWith('og:')) {
          el.setAttribute('property', property)
        } else {
          el.setAttribute('name', property)
        }
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    if (description) {
      setMeta('description', description)
      setMeta('og:description', description)
      setMeta('twitter:description', description)
    }
    if (image) {
      setMeta('og:image', image)
      setMeta('twitter:image', image)
    }
    setMeta('og:title', title)
    setMeta('og:type', 'website')
    setMeta('og:site_name', 'Oqupa')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    if (url) setMeta('og:url', url)

    // Say which page this is.
    //
    // Every route serves the same index.html, so without this the homepage,
    // /explorar and /privacy are byte-for-byte identical to a crawler. Google
    // reported exactly that on 2026-08-10: "Duplicate without user-selected
    // canonical". A self-referencing canonical per route settles it.
    const canonicalHref = url ?? `https://oqupa.com${window.location.pathname}`
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', canonicalHref)

    return () => {
      document.title = 'Oqupa'
    }
  }, [title, description, image, url])
}
