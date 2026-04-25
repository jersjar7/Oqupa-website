import { useState, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'

interface AnimatedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Extra classes for the wrapper div */
  wrapperClassName?: string
}

/**
 * Image component that fades in smoothly when loaded.
 * Replaces raw <img> tags to eliminate jarring pop-in.
 */
export default function AnimatedImage({
  wrapperClassName,
  className = '',
  onLoad,
  onError,
  style,
  ...props
}: AnimatedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-500`}
        style={style}
        role="img"
        aria-label={typeof props.alt === 'string' ? props.alt : 'Imagen no disponible'}
      >
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        <span className="px-2 text-center text-xs">No se pudo cargar la imagen</span>
      </div>
    )
  }

  return (
    <img
      {...props}
      className={`${className} transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={style}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
      onError={(e) => {
        setErrored(true)
        onError?.(e)
      }}
    />
  )
}
