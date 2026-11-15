/**
 * The small raised "BETA" beside a tab label (Analítica, Jerson 2026-11-14).
 * Gotham Medium uppercase like every label, brand green — never orange.
 * `size` follows the label it sits beside: the sidebar's 14 px text or the phone bar's 10 px.
 * Raised by position, never `align-super`, and never inside a clipping (`truncate`) wrapper:
 * the super baseline overflowed the line box and the menu label's overflow cut it off (Jerson, 2026-11-15).
 * Hidden from screen readers: the link it sits in names itself "Analítica (beta)" (break-it #1).
 */
export default function BetaMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <sup
      aria-hidden="true"
      className={`relative -top-1.5 ml-0.5 align-baseline font-sans font-medium uppercase leading-none text-secondary ${
        size === 'sm' ? 'text-[7px] tracking-[0.3px]' : 'text-[9px] tracking-[0.3px]'
      }`}
    >
      BETA
    </sup>
  )
}
