import { useState, type ImgHTMLAttributes } from 'react'

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
  style,
  ...props
}: AnimatedImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      {...props}
      className={`${className} transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={style}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
    />
  )
}
