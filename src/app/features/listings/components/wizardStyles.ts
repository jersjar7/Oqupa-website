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

/**
 * A choice that reads like an Oqupa button and like the app's choice buttons
 * (OqupaChoiceButtons): a pill, Gotham Bold, upper case, tracked 1 px
 * (ADR-038) — VENTA / ALQUILER, SÍ / NO, S/ SOLES / US$ DÓLARES. The
 * accessible name stays in normal case; only the look is upper case.
 */
export function choiceButtonClass(on: boolean): string {
  return choiceClass(on)
    .replace('rounded-xl', 'rounded-full')
    .replace('font-medium', 'font-sans font-bold uppercase tracking-[1px]')
}
