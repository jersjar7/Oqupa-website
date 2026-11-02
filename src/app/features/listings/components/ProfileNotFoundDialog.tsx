import { SUPPORT_WHATSAPP_URL } from '@/app/features/help/HelpOptions'

/**
 * The contact refusal for a signed-in account with no saved profile (feature
 * audit 2026-11-02, "Perfil no está completo"; the server says
 * `unauthenticated` + "Tu perfil no está completo…").
 *
 * No sign-out and no return errand: in the realistic case — the account was
 * deleted elsewhere, or the sign-in repair is refused — signing in again
 * cannot fix it and would loop (coordinator's review, 2026-11-02). A person
 * fixes it, so the window sends them to Ayuda's WhatsApp. Same words as the
 * app's ProfileNotFoundCopy. Used on the listing page and on Oportunidades.
 */
export const PROFILE_NOT_FOUND_COPY = {
  title: 'No encontramos tu perfil',
  body: 'Escríbenos y lo arreglamos.',
  write: 'ESCRIBIR POR WHATSAPP',
  close: 'Cerrar',
} as const

export default function ProfileNotFoundDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={PROFILE_NOT_FOUND_COPY.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <h3 className="font-serif text-lg font-normal text-text-primary">{PROFILE_NOT_FOUND_COPY.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{PROFILE_NOT_FOUND_COPY.body}</p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-primary-hover active:scale-[0.97]"
          >
            {PROFILE_NOT_FOUND_COPY.write}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 w-full items-center justify-center rounded-xl px-6 py-2 text-sm text-text-secondary transition-colors hover:bg-black/5"
          >
            {PROFILE_NOT_FOUND_COPY.close}
          </button>
        </div>
      </div>
    </div>
  )
}
