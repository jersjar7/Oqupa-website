import { Upload, ImagePlus } from 'lucide-react'

interface PhotoDropzoneProps {
  variant: 'tile' | 'empty'
  onClick: () => void
}

export default function PhotoDropzone({ variant, onClick }: PhotoDropzoneProps) {
  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-border text-text-tertiary transition-colors hover:border-primary/30 hover:text-primary"
      >
        <ImagePlus className="h-6 w-6" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-text-secondary transition-colors hover:border-primary/30 hover:text-primary"
    >
      <Upload className="h-5 w-5" />
      Subir fotos
    </button>
  )
}
