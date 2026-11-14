import { useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { MALFORMED_NUMBER, splitLocaleNumber, type LocaleNumberParts } from './localeNumber'

/**
 * The price and area boxes show thousands with commas WHILE the person types
 * — "250000" shows as "250,000" — and decimals after a point (ADR-061;
 * founder, 2026-11-13: "Commas as they type for consistency"). The same rules
 * as the app's GroupedNumberFormatter.
 *
 * What is shown always reads as the same number the shared rule
 * (parseLocaleNumber, ADR-043 step 3) reads from what was typed or pasted:
 *
 * - a digit typed anywhere is placed and the commas regrouped; the caret stays
 *   right after it;
 * - a point or comma typed after digits is the decimal point, shown as a
 *   point; once a third digit follows it, it was a thousands separator
 *   ("1.500" is 1500), exactly as the shared rule reads it;
 * - deleting a comma deletes the digit before it (backspace) or after it
 *   (forward delete);
 * - a paste is read whole by the shared rule and shown with commas; one it
 *   cannot read is kept as pasted, for the form to explain.
 */

/** The most whole digits the person can type (999,999,999,999). */
export const MAX_TYPED_WHOLE_DIGITS = 12

/** The box before the edit: its text and selection. */
export interface BoxState {
  text: string
  start: number
  end: number
}

/** The box after: what to show and where the caret goes. */
export interface BoxEdit {
  text: string
  caret: number
}

export type DeleteHint = 'backward' | 'forward' | null

/**
 * What one box remembers between keystrokes: the whole digits last made by a
 * separator read as thousands ("1.500" → "1500"). Only then may the next
 * separator plus three digits be thousands too ("1.500.000"); "1500.000"
 * typed without them is refused, never read as a number 1000 times bigger.
 */
export interface GroupingMemory {
  typedWhole: string | null
  /** The separator that made typedWhole thousands; "1,234.567" mixes kinds and is refused. */
  typedSeparator?: string | null
  /** The separator typed for the decimals now pending. */
  pendingSeparator?: string | null
}

/** Text this box itself produces (or plain digits). */
const CANONICAL = /^$|^(\d+|\d{1,3}(,\d{3})+)(\.\d{0,2})?$/

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** The offset in `text` right after its `count`-th digit (or point). */
function offsetAfter(text: string, count: number, digitsOnly = false): number {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c !== ',' && (!digitsOnly || c !== '.')) seen++
    if (seen === count) return i + 1
  }
  return text.length
}

/** `raw` with thousands commas and a decimal point, or null when it is no number. */
export function formatLocaleNumberText(raw: string): string | null {
  const split = splitLocaleNumber(raw)
  if (split === undefined || split === MALFORMED_NUMBER || typeof split === 'number') return null
  const { whole, decimals } = split as LocaleNumberParts
  const digits = whole.replace(/^0+(?=\d)/, '')
  return decimals === '' ? group(digits) : `${group(digits)}.${decimals}`
}

/** A saved number as the box shows it: "250,000", "1,500.5", "" for none. */
export function formatSavedNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** A paste (or anything not typed key by key): read whole, or kept as it is. */
function readWhole(next: BoxEdit, memory: GroupingMemory): BoxEdit {
  const split = splitLocaleNumber(next.text)
  // A pasted "1.500" is thousands written with separators, like typed.
  memory.typedWhole =
    typeof split === 'object' && split.decimals === '' && /[.,]/.test(next.text)
      ? split.whole.replace(/^0+(?=\d)/, '')
      : null
  const seps = next.text.match(/[.,]/g) ?? []
  memory.typedSeparator = memory.typedWhole === null || seps.length === 0 ? null : seps[0]!
  memory.pendingSeparator = seps.length === 0 ? null : seps[seps.length - 1]!
  const shown = formatLocaleNumberText(next.text)
  if (shown === null || shown === next.text) return next
  if (next.caret >= next.text.length) return { text: shown, caret: shown.length }
  const digitsBefore = (next.text.slice(0, next.caret).match(/\d/g) ?? []).length
  return { text: shown, caret: offsetAfter(shown, digitsBefore, true) }
}

function compose(prev: BoxState, left: string, inserted: string, right: string, memory: GroupingMemory): BoxEdit {
  const refuse = { text: prev.text, caret: prev.start }
  const before = left.replace(/,/g, '') + inserted
  let plain = before + right.replace(/,/g, '')
  let caret = before.length
  if (plain === '') {
    memory.typedWhole = null
    return { text: '', caret: 0 }
  }
  if ((plain.match(/\./g) ?? []).length > 1 || plain.startsWith('.')) return refuse
  const point = plain.indexOf('.')
  let madeThousands = false
  if (point >= 0) {
    const decimals = plain.length - point - 1
    const wholeDigits = plain.slice(0, point)
    if (decimals === 3) {
      // A separator then exactly three digits is thousands ("1.500"), as the
      // shared rule reads it — only when it could be: the digit lands last,
      // the whole part does not start with 0, and it is 1–3 digits or itself
      // thousands typed with separators. Otherwise a third decimal is refused.
      const couldBeThousands =
        caret === plain.length &&
        !wholeDigits.startsWith('0') &&
        (wholeDigits.length <= 3 ||
          (wholeDigits === memory.typedWhole && memory.pendingSeparator === memory.typedSeparator))
      if (!couldBeThousands) return refuse
      plain = plain.replace('.', '')
      caret--
      madeThousands = true
    } else if (decimals > 3) {
      return refuse
    }
  }
  let whole = plain.includes('.') ? plain.slice(0, plain.indexOf('.')) : plain
  const rest = plain.slice(whole.length)
  // Leading zeros typed go away ("05" → "5"); zeros left in front by a delete
  // stay, so the first digit can be changed: 1,000,000 → delete the 1 →
  // "000000" → type 2 → 2,000,000.
  if (inserted !== '') {
    const zeros = (whole.match(/^0+(?=\d)/) ?? [''])[0]!.length
    whole = whole.slice(zeros)
    caret -= Math.min(caret, zeros)
  }
  if (whole.length > MAX_TYPED_WHOLE_DIGITS) return refuse
  if (madeThousands) {
    memory.typedWhole = whole
    memory.typedSeparator = memory.pendingSeparator ?? null
  }
  else if (whole !== memory.typedWhole) memory.typedWhole = null
  const grouped = whole.length > 1 && whole.startsWith('0') ? whole : group(whole)
  const text = grouped + rest
  return { text, caret: offsetAfter(text, caret) }
}

/**
 * The box after one edit: `prev` is what it showed (with its selection), `next`
 * what the browser made of the keystroke or paste. `hint` says which delete key
 * was used, when the browser tells (InputEvent.inputType).
 */
export function groupedAsTyped(
  prev: BoxState,
  next: BoxEdit,
  hint: DeleteHint = null,
  memory: GroupingMemory = { typedWhole: null },
): BoxEdit {
  const oldText = prev.text
  const newText = next.text
  if (oldText === newText) return next
  if (!CANONICAL.test(oldText)) return readWhole(next, memory)

  const maxP = Math.min(oldText.length, newText.length)
  let p = 0
  // Never past the caret: in "000000" a delete at the front is at the front,
  // not wherever the repeated digits stop matching.
  // Nor past where the old selection started: "5,|000" + 0 is typed at the
  // comma, not after the first matching 0.
  const startCap = Math.min(next.caret, prev.start)
  while (p < maxP && p < startCap && oldText[p] === newText[p]) p++
  let s = 0
  while (s < maxP - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++
  const removed = oldText.slice(p, oldText.length - s)
  const inserted = newText.slice(p, newText.length - s)
  let left = oldText.slice(0, p)
  let right = oldText.slice(oldText.length - s)

  if (inserted === '' && removed === ',' && prev.start === prev.end) {
    const forward = hint === 'forward' || (hint === null && prev.start === prev.end && prev.start === p)
    if (forward) right = right.replace(/\d/, '')
    else left = left.slice(0, -1)
    return compose(prev, left, '', right, memory)
  }
  if (/^\d*$/.test(inserted)) return compose(prev, left, inserted, right, memory)
  if (inserted === '.' || inserted === ',') {
    memory.pendingSeparator = inserted
    return compose(prev, left, '.', right, memory)
  }
  return readWhole(next, memory)
}

function deleteHint(e: ChangeEvent<HTMLInputElement>): DeleteHint {
  const type = (e.nativeEvent as InputEvent | undefined)?.inputType
  if (type === 'deleteContentBackward') return 'backward'
  if (type === 'deleteContentForward') return 'forward'
  return null
}

/**
 * A text box that groups thousands as it is typed. Spread `inputProps` on the
 * <input>; `onText` hears every new text (after grouping), with the change
 * event whose target already holds it.
 */
export function useGroupedNumberBox(
  initialText: string,
  onText?: (text: string, e: ChangeEvent<HTMLInputElement>) => void,
) {
  const [text, setText] = useState(initialText)
  const selection = useRef<{ text: string; start: number; end: number } | null>(null)
  const memory = useRef<GroupingMemory>({ typedWhole: null })

  const remember = (e: SyntheticEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    selection.current = {
      text: el.value,
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length,
    }
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const sel = selection.current?.text === text ? selection.current : null
    const prev: BoxState = { text, start: sel?.start ?? text.length, end: sel?.end ?? text.length }
    const r = groupedAsTyped(
      prev,
      { text: el.value, caret: el.selectionStart ?? el.value.length },
      deleteHint(e),
      memory.current,
    )
    if (el.value !== r.text) el.value = r.text
    try {
      if (el.ownerDocument.activeElement === el) el.setSelectionRange(r.caret, r.caret)
    } catch {
      // Some input types refuse a selection; the text is still right.
    }
    selection.current = { text: r.text, start: r.caret, end: r.caret }
    setText(r.text)
    onText?.(r.text, e)
  }

  return {
    text,
    setText,
    inputProps: {
      value: text,
      onChange,
      onSelect: remember,
      onKeyDown: remember,
      onFocus: remember,
      onMouseUp: remember,
    },
  }
}
