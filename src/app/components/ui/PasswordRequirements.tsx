type Pill = {
  label: string
  met: boolean
}

export default function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null

  const pills: Pill[] = [
    { label: '8+', met: password.length >= 8 },
    { label: 'A-Z', met: /[A-Z]/.test(password) },
    { label: 'a-z', met: /[a-z]/.test(password) },
    { label: '1-9', met: /\d/.test(password) },
    { label: '!@#', met: /[!@#$%^&*()_+\-=[\]{};:"\\|,.<>/?`~]/.test(password) },
  ]

  return (
    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      {pills.map(({ label, met }) => (
        <div key={label} className="flex items-center gap-1">
          {met ? (
            <svg className="h-3.5 w-3.5 text-secondary" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm4.47 7.28a.75.75 0 0 0-1.06-1.06l-4.67 4.67-1.91-1.91a.75.75 0 0 0-1.06 1.06l2.44 2.44a.75.75 0 0 0 1.06 0l5.2-5.2z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
          <span className={`font-serif text-xs italic ${met ? 'font-semibold text-secondary' : 'font-normal text-text-tertiary'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
