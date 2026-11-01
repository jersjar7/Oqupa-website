# Oqupa UI Guidance

Platform-agnostic visual reference for reproducing Oqupa's button and typography system. Written in graphic-design vocabulary — no code.

---

## Color Palette

| Name             | Hex       | Role                                                        |
|------------------|-----------|-------------------------------------------------------------|
| Brick Orange     | `#F47843` | Primary brand color. CTAs, links, active states.            |
| Sunshine Yellow  | `#FFCD60` | Accent. Avoid as text color unless on white or green.       |
| Pacific Green    | `#3A6A55` | Secondary brand color. Trust and modernity. Used freely.    |
| Stucco Cream     | `#FFF9F0` | Warm neutral page background. The only cream.               |
| Black            | `#000000` | Default text color.                                         |
| White            | `#FFFFFF` | Contrast color.                                             |
| Alert Red        | `#E63946` | Errors and destructive actions.                             |
| Boost Amber      | `#F59E0B` | Destacado (boosted) only. Same gold as boosted map pins.    |

**Cream.** `#FFF9F0`, the brand deck's cream, is the only cream — on the website, in the app and in emails
(founder, 2026-10-31). The older near-creams (`#FFFAF5`, `#FFF4E6`, `#FEFBF4`, `#FAF7F2`) are retired.

**Cards are pure white on cream.** Any card, sheet or panel that holds content sits on the cream page as
White (`#FFFFFF`) with a hairline border and a soft shadow. Do not tint cards cream.

### Neutrals

Only these greys are used. They replace the system greys each platform used to borrow (Apple's and
Tailwind's). Every text grey passes contrast (4.5:1) on both cream and white.

| Name             | Hex       | Role                                                   |
|------------------|-----------|--------------------------------------------------------|
| Ink              | `#1A1A1A` | Text. Also the label colour on amber (Destacado).      |
| Ink Secondary    | `#5C5C5C` | Secondary text.                                        |
| Ink Tertiary     | `#737373` | Captions, metadata, timestamps.                        |
| Surface Muted    | `#F4F1EC` | Quiet fills: read-only fields, neutral chips, hovers.  |
| Surface Strong   | `#E7E2DB` | Loading placeholders, progress tracks.                 |
| Border           | `#E8E0D6` | Hairlines around cards and fields.                     |
| Separator        | `#D4CCC2` | Stronger dividers, dashed drop zones.                  |

### Colour on colour

- On cream or white, only **green** and **black/ink** work as text. Orange and yellow are fills, never text.
- **Orange buttons keep a white label**, exactly as the deck specifies (founder, 2026-10-31: black on orange
  is too harsh). Do not change the label colour of an orange button.
- On an **amber or yellow fill**, the label is **Ink**, never white (white on amber is 2.15:1; ink is 6.9:1).
- **Alert Red** is for errors and destructive actions. Small red text on a pale red tint uses the darker
  `#C5303C` so it stays legible. The saved heart is Alert Red.
- Success is Pacific Green — there is no second green.

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
- **Size:** 22 px (the deck gives no size; 22 px settled across both apps on 2026-10-31)
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
- **Letter spacing:** 1 px
- **Case convention:** Uppercase
- **Use:** Label text inside all button components.

Roboto Serif headings are **Regular**, never bold — including page titles, section titles like
"Descripción", error-page titles and prices.

---

## Shared components (both apps, identical)

Settled 2026-10-31 (brand audit, batch 3). The app and the website must look the same here.

### Listing status badge

- Label: Gotham Medium, uppercase ("ACTIVO", "DESACTIVADO", "VENDIDO", "ALQUILADO").
- A small dot before the label: **green** for Activo; **neutral grey** for Desactivado, Vendido and Alquilado.
- Desactivado never gets a red dot — the owner chose it; it is not an error.

### Destacado

- One look everywhere: **Ink text on Boost Amber** (`#1A1A1A` on `#F59E0B`), Gotham Bold, uppercase **"DESTACADO"**.
- Solid amber — no pale amber chips, no white text, no orange.
- Buttons that buy or confirm a boost use the same pair: amber fill, ink label.

### Price

- The headline price of a listing is **Pacific Green**.
- On the property page and on owner cards it is set in **Roboto Serif Regular** (28 px on the page, 20 px on cards).
- On dense list cards (the map list, the small map card) it is **black Gotham Bold**.
- A price is never orange. The suffix ("/ mes") is Ink Secondary, Gotham Book.

### Venta / Alquiler toggle

- The selected option is a **Pacific Green** fill with a white label, on phone and computer alike.

### WhatsApp button

- Label uppercase. Fill is WhatsApp's own green with a white label — 1.98:1, which fails contrast.
  Left as is pending a decision (brand-level: WhatsApp's own button colours vs. our contrast rule).
