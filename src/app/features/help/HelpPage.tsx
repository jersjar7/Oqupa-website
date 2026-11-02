// Ayuda in the signed-in website (ADR-046 #16).
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { Card } from '@/app/components/ui'
import HelpOptions from './HelpOptions'

export default function HelpPage() {
  useSetPageMeta({ title: 'Ayuda' })
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="mb-4 text-base text-text-secondary">¿Necesitas ayuda? Escríbenos o cuéntanos qué pasó.</p>
      <Card>
        <HelpOptions />
      </Card>
    </div>
  )
}
