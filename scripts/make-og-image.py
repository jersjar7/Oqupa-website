#!/usr/bin/env python3
"""
Regenerate public/og-image.png — the card WhatsApp, Instagram and Facebook show
when someone shares oqupa.com.

WHY THIS SCRIPT EXISTS
----------------------
The previous card read "Lanzamiento este 4 de Mayo". It was still saying that on
2026-08-10, three months after the launch and four days after the app was
approved in both stores. Every share advertised a date in the past, and nothing
about a picture goes stale loudly — you have to look at it.

So: no dates in the card. Nothing that expires on its own. If the wording needs
to change, edit HEADLINE/SUBLINE below and re-run:

    python3 scripts/make-og-image.py

Colours and fonts come from the Brand Deck (see ui_guidance.md): Roboto Serif
for the italic fine print, Gotham for everything else, Pacific Green for the
heading, Brick Orange for the rule.

WHEN YOU CHANGE THE CARD, CHANGE THE FILENAME TOO
-------------------------------------------------
Facebook, WhatsApp and Cloudflare all cache preview images by URL, so reusing a
filename can leave the old picture showing for days.

And do NOT request the new filename until the site is deployed. Cloudflare
answers a missing asset path with the SPA's index.html and caches THAT against
the URL — so one early curl leaves `og-card-*.png` serving HTML, and the
preview breaks even after the real file ships. That happened on 2026-08-10 to
the name this card had before this one, which is why it is on its second name.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent

# --- the words on the card -------------------------------------------------
HEADLINE = "Encuentra propiedades en Piura"
SUBLINE = "Publicar es gratis · Ya disponible en App Store y Google Play"

# --- brand ------------------------------------------------------------------
STUCCO_CREAM = (255, 250, 245)
WARM_CORNER = (255, 244, 230)
PACIFIC_GREEN = (58, 106, 85)
BRICK_ORANGE = (244, 120, 67)
FINE_PRINT = (99, 99, 102)

W, H = 1200, 630
FONTS = ROOT / "public" / "fonts"
LOGO = ROOT / "src" / "assets" / "images" / "Oqupa_FullLogo_multicolor.webp"
OUT = ROOT / "public" / "og-card-2026-08.png"


def background() -> Image.Image:
    """Cream, warming very slightly toward the bottom and the top right."""
    img = Image.new("RGB", (W, H), STUCCO_CREAM)
    px = img.load()
    for y in range(H):
        for x in range(0, W, 2):
            # distance from the top-right and the bottom edge, 0..1
            t = max((x / W) * 0.5 + (y / H) * 0.6, 0.0)
            t = min(t, 1.0) * 0.55
            c = tuple(
                round(STUCCO_CREAM[i] + (WARM_CORNER[i] - STUCCO_CREAM[i]) * t)
                for i in range(3)
            )
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    return img


def centred(draw, y, text, font, fill):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text(((W - (right - left)) / 2 - left, y), text, font=font, fill=fill)
    return bottom - top


def main() -> None:
    img = background()
    draw = ImageDraw.Draw(img)

    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 360
    logo = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.LANCZOS)
    img.paste(logo, ((W - logo.width) // 2, 150), logo)

    # The rule under the logo.
    rule_w, rule_h = 104, 5
    draw.rounded_rectangle(
        [(W - rule_w) // 2, 312, (W + rule_w) // 2, 312 + rule_h],
        radius=rule_h // 2,
        fill=BRICK_ORANGE,
    )

    heading_font = ImageFont.truetype(str(FONTS / "GothamBold.otf"), 54)
    sub_font = ImageFont.truetype(str(FONTS / "RobotoSerif-LightItalic.ttf"), 27)

    centred(draw, 358, HEADLINE, heading_font, PACIFIC_GREEN)
    centred(draw, 447, SUBLINE, sub_font, FINE_PRINT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}")
    print(f"  headline: {HEADLINE}")
    print(f"  subline:  {SUBLINE}")


if __name__ == "__main__":
    main()
