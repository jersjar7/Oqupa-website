import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/appStoreLinks'

interface AppStoreBadgesProps {
  className?: string
}

export default function AppStoreBadges({ className = '' }: AppStoreBadgesProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 rounded-xl bg-black px-4 py-2.5 text-white transition-transform duration-200 hover:scale-[1.03]"
        aria-label="Descarga Oqupa en el App Store"
      >
        {/* Apple logo */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        <div className="text-left leading-tight">
          <div className="text-[10px] font-normal uppercase tracking-wide">
            Descarga en el
          </div>
          <div className="text-base font-semibold">App Store</div>
        </div>
      </a>

      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 rounded-xl bg-black px-4 py-2.5 text-white transition-transform duration-200 hover:scale-[1.03]"
        aria-label="Disponible en Google Play"
      >
        {/* Google Play triangle */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
          viewBox="0 0 512 512"
          aria-hidden="true"
        >
          <path
            fill="#34A853"
            d="M82.6 444.7c-9.6-5.6-15.4-15.6-15.4-26.4V93.7c0-10.8 5.8-20.8 15.4-26.4l217.6 188.5L82.6 444.7z"
          />
          <path
            fill="#FBBC04"
            d="M381.4 313.3l-81.2-57.5 81.2-57.5 76.7 41.2c12.5 6.7 12.5 24.6 0 31.3l-76.7 42.5z"
          />
          <path
            fill="#EA4335"
            d="M82.6 67.3c2.6-1.5 5.5-2.6 8.6-3.2 4.5-.9 9.2-.6 13.5 1l276.7 153-81.2 57.7L82.6 67.3z"
          />
          <path
            fill="#4285F4"
            d="M104.7 446.9c-4.4 1.6-9.1 1.9-13.5 1-3.1-.6-6-1.7-8.6-3.2l217.6-208.5 81.2 57.5-276.7 153.2z"
          />
        </svg>
        <div className="text-left leading-tight">
          <div className="text-[10px] font-normal uppercase tracking-wide">
            Disponible en
          </div>
          <div className="text-base font-semibold">Google Play</div>
        </div>
      </a>
    </div>
  )
}
