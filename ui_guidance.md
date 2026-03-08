# Oqupa UI Guidance

Platform-agnostic visual reference for reproducing Oqupa's button and typography system. Written in graphic-design vocabulary — no code.

---

## Color Palette

| Name             | Hex       | Role                                                        |
|------------------|-----------|-------------------------------------------------------------|
| Brick Orange     | `#F47843` | Primary brand color. CTAs, links, active states.            |
| Sunshine Yellow  | `#FFCD60` | Accent. Avoid as text color unless on white or green.       |
| Pacific Green    | `#3A6A55` | Secondary brand color. Trust and modernity. Used freely.    |
| Stucco Cream     | `#FFFAF5` | Warm neutral background. Use in place of pure white.        |
| Black            | `#000000` | Default text color.                                         |
| White            | `#FFFFFF` | Contrast color.                                             |
| Alert Red        | `#E63946` | Errors and destructive actions.                             |

---

## Buttons

### Primary Button

A pill-shaped outlined button with no fill.

- **Shape:** Capsule / stadium (fully rounded ends).
- **Height:** 48 px.
- **Corner radius:** 24 px (half of height, producing a perfect capsule).
- **Border:** 1.5 px solid stroke, Pacific Green (`#3A6A55`). No background fill — the interior is transparent.
- **Label:** Set in Gotham Bold 700 at 16 px, all-uppercase, colored Pacific Green (`#3A6A55`), centered horizontally and vertically within the capsule.
- **Optional icon:** When an icon is present, it sits to the left of the label with 8 px of space between icon and text.
- **Disabled state:** Border and label both change to Black at 20 % opacity (`#000000` / 0.20). The button ignores taps.
- **Loading state:** The label is replaced by a spinner (16 × 16 px Cupertino-style activity indicator, Pacific Green) followed by 12 px of space and the word "CARGANDO..." in the same Gotham Bold 700 / 16 px style. The button ignores taps while loading.

### Text Button

A borderless, backgroundless inline text link for secondary actions.

- **Shape:** No visible container — the tap target is the text itself plus minimal padding (8 px horizontal, 8 px vertical).
- **Minimum hit area:** None enforced beyond the padding; the button shrinks to fit its content.
- **Label:** Set in Gotham Book 400 at 16 px, mixed case (not forced uppercase), colored Pacific Green (`#3A6A55`) by default. A custom text color may be specified per instance.
- **Optional icon:** When present, sits to the left of the label with 6 px of space.
- **Disabled state:** Label color changes to Black at 20 % opacity (`#000000` / 0.20). The button ignores taps.

### Social Button

A square outlined button displaying only a provider logo (Google or Apple).

- **Shape:** Rounded square, 112 × 112 px.
- **Corner radius:** 24 px.
- **Border:** 1.5 px solid stroke, Pacific Green (`#3A6A55`). No background fill.
- **Content:** A centered provider logo (56 × 56 px for Google; double-size asset scaled to fit for Apple).
- **Loading state:** The logo is replaced by a centered Cupertino-style activity indicator (radius 10 px).

---

## Text Styles

All text defaults to Black (`#000000`) with no underline decoration unless otherwise styled.

### Header 1

- **Typeface:** Roboto Serif
- **Weight:** Regular (400)
- **Size:** 28 px
- **Case convention:** Title Case
- **Use:** Page titles and hero text.

### Header 2

- **Typeface:** Gotham
- **Weight:** Medium (500)
- **Size:** 28 px
- **Case convention:** Title Case
- **Use:** Section headings.

### Subhead

- **Typeface:** Gotham
- **Weight:** Medium (500)
- **Size:** 14 px
- **Case convention:** Uppercase
- **Use:** Labels, field headers, and category markers.

### Body

- **Typeface:** Gotham
- **Weight:** Book (400)
- **Size:** 16 px
- **Case convention:** Sentence case
- **Use:** Primary reading text and paragraphs.

### Caption

- **Typeface:** Roboto Serif
- **Weight:** Light Italic (300, italic)
- **Size:** 12 px
- **Case convention:** Sentence case
- **Use:** Secondary detail text and supporting information.

### Legal

- **Typeface:** Roboto Serif
- **Weight:** Light (300)
- **Size:** 12 px
- **Case convention:** Sentence case
- **Use:** Legal links (privacy policy, terms of service) and fine print.

### Button

- **Typeface:** Gotham
- **Weight:** Bold (700)
- **Size:** 16 px
- **Case convention:** Uppercase
- **Use:** Label text inside all button components.
