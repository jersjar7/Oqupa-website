/** A wizard page's question or section title: Roboto Serif Regular, Header 2 size. */
export const WIZARD_HEADING = 'font-serif text-[22px] font-normal text-text-primary'

/**
 * A big choice button (Venta, Sí / No, S/ / US$): 56 px tall, green when
 * chosen (ADR-038: Venta / Alquiler selected is green), white on cream when not.
 */
export function choiceClass(on: boolean): string {
  return `min-h-14 rounded-xl border-2 px-4 py-3 text-base font-medium transition-colors ${
    on ? 'border-secondary bg-secondary text-white' : 'border-border bg-white text-text-primary hover:border-secondary/40'
  }`
}
