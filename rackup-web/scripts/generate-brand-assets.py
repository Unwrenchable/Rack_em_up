#!/usr/bin/env python3
"""Generate RackUp PNG brand assets (felt + gold) from the app palette.

Run from repo:  python3 rackup-web/scripts/generate-brand-assets.py
Fonts default to /tmp/fonts/{BebasNeue-Regular,Outfit-Regular}.ttf
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONTS = Path(os.environ.get("RACKUP_FONTS", "/tmp/fonts"))

BG = (5, 7, 6, 255)
BG_DEEP = (7, 10, 9, 255)
FELT = (12, 61, 46, 255)
FELT_BRIGHT = (20, 107, 78, 255)
FELT_MID = (16, 88, 64, 255)
GOLD = (224, 180, 90, 255)
GOLD_LIGHT = (245, 230, 184, 255)
GOLD_DARK = (154, 116, 32, 255)
WOOD = (28, 20, 8, 255)
WOOD_EDGE = (61, 46, 18, 255)
CREAM = (245, 240, 230, 255)
TEXT = (242, 245, 243, 255)
MUTED = (138, 154, 146, 255)

BALLS = [
    (241, 196, 15),  # yellow
    (41, 128, 185),  # blue
    (192, 57, 43),  # red
    (142, 68, 173),  # purple
    (230, 126, 34),  # orange
    (39, 174, 96),  # green
    (123, 36, 28),  # maroon
    (22, 22, 22),  # black
    (245, 240, 230),  # cream
]


def _font(name: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = FONTS / name
    if path.exists():
        try:
            font = ImageFont.truetype(str(path), size)
            setter = getattr(font, "set_variation_by_axes", None)
            if setter:
                try:
                    setter([400])
                except Exception:
                    pass
            return font
        except OSError:
            pass
    return ImageFont.load_default()


def _draw_words(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.ImageFont,
    fill,
    *,
    gap: float | None = None,
) -> float:
    """Draw text with explicit word gaps — some TTFs report 0-width spaces."""
    x, y = xy
    words = text.split()
    if gap is None:
        sample = font.getbbox("M")
        gap = max(8, (sample[2] - sample[0]) * 0.35)
    for i, word in enumerate(words):
        draw.text((x, y), word, font=font, fill=fill)
        box = font.getbbox(word)
        x += (box[2] - box[0]) + (gap if i < len(words) - 1 else 0)
    return x


def _hex(rgb: tuple[int, int, int] | tuple[int, int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb[:3])


def _circle(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)


def _diamond(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill) -> None:
    draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=fill)


def _ball(img: Image.Image, cx: float, cy: float, r: float, color: tuple[int, int, int]) -> None:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    _circle(sd, cx + r * 0.12, cy + r * 0.18, r, (0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(1, r * 0.12)))
    img.alpha_composite(shadow)

    _circle(d, cx, cy, r, (*color, 255))
    # glossy highlight
    hx, hy, hr = cx - r * 0.32, cy - r * 0.36, r * 0.34
    _circle(d, hx, hy, hr, (255, 255, 255, 95))
    _circle(d, hx - r * 0.08, hy - r * 0.08, hr * 0.45, (255, 255, 255, 140))
    img.alpha_composite(layer)


def _felt_fill(size: int, pad: int = 0) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG_DEEP)
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    glow_r = int(size * 0.72)
    _circle(d, size * 0.42, size * 0.38, glow_r, (*FELT_BRIGHT[:3], 70))
    overlay = overlay.filter(ImageFilter.GaussianBlur(size * 0.18))
    img.alpha_composite(overlay)
    if pad:
        pass
    return img


def draw_table(
    img: Image.Image,
    box: tuple[float, float, float, float],
    *,
    rack: bool,
    simple: bool,
) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    d = ImageDraw.Draw(img)
    rail = max(3.0, min(w, h) * 0.085)
    radius = max(4.0, min(w, h) * 0.08)

    d.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=WOOD)
    d.rounded_rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), radius=radius - 1, outline=WOOD_EDGE, width=max(1, int(rail * 0.18)))

    inner = (x0 + rail, y0 + rail, x1 - rail, y1 - rail)
    d.rounded_rectangle(inner, radius=max(2, radius * 0.45), fill=FELT)
    # felt highlight
    felt_glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(felt_glow)
    cx, cy = (inner[0] + inner[2]) / 2, (inner[1] + inner[3]) / 2
    _circle(gd, cx - w * 0.08, cy - h * 0.12, min(w, h) * 0.42, (*FELT_BRIGHT[:3], 80))
    felt_glow = felt_glow.filter(ImageFilter.GaussianBlur(max(2, min(w, h) * 0.08)))
    img.alpha_composite(felt_glow)

    # gold rail lip
    d.rounded_rectangle(inner, radius=max(2, radius * 0.45), outline=GOLD, width=max(1, int(rail * 0.22)))

    # diamond sights
    iw, ih = inner[2] - inner[0], inner[3] - inner[1]
    sight = max(1.4, min(iw, ih) * 0.028)
    sights = [
        (cx, inner[1] + sight * 0.2),
        (cx, inner[3] - sight * 0.2),
        (inner[0] + sight * 0.2, cy),
        (inner[2] - sight * 0.2, cy),
    ]
    if not simple:
        sights += [
            (inner[0] + iw * 0.25, inner[1] + sight * 0.2),
            (inner[0] + iw * 0.75, inner[1] + sight * 0.2),
            (inner[0] + iw * 0.25, inner[3] - sight * 0.2),
            (inner[0] + iw * 0.75, inner[3] - sight * 0.2),
        ]
    for sx, sy in sights:
        _diamond(d, sx, sy, sight, GOLD_LIGHT if simple else GOLD)

    # pockets
    pr = max(2.0, min(iw, ih) * 0.07)
    pockets = [
        (inner[0], inner[1]),
        (inner[2], inner[1]),
        (inner[0], inner[3]),
        (inner[2], inner[3]),
        (cx, inner[1]),
        (cx, inner[3]),
    ]
    for px, py in pockets:
        _circle(d, px, py, pr, (8, 8, 8, 230))

    if rack:
        # triangle rack of 6 + cue
        br = min(iw, ih) * 0.085
        rax = cx + iw * 0.06
        ray = cy + ih * 0.02
        rows = [
            [(0, -1.15)],
            [(-0.62, -0.05), (0.62, -0.05)],
            [(-1.24, 1.05), (0, 1.05), (1.24, 1.05)],
        ]
        idx = 0
        for row in rows:
            for dx, dy in row:
                _ball(img, rax + dx * br * 1.15, ray + dy * br * 1.15, br, BALLS[idx % len(BALLS)])
                idx += 1
        _ball(img, cx - iw * 0.22, cy + ih * 0.08, br * 1.05, BALLS[8][:3])
    else:
        # single cue ball — readable at 16–32px
        br = min(iw, ih) * 0.22
        _ball(img, cx, cy, br, BALLS[8][:3])


def make_icon(size: int, *, maskable: bool = False, simple: bool | None = None) -> Image.Image:
    if simple is None:
        simple = size <= 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if not maskable else BG_DEEP)
    if maskable:
        # full-bleed felt so Android adaptive crop still looks branded
        base = _felt_fill(size)
        img.alpha_composite(base)
        pad = int(size * 0.18)
    else:
        d = ImageDraw.Draw(img)
        corner = max(4, int(size * 0.18))
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=corner, fill=BG_DEEP)
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        _circle(gd, size * 0.45, size * 0.4, size * 0.55, (*FELT_BRIGHT[:3], 55))
        glow = glow.filter(ImageFilter.GaussianBlur(size * 0.16))
        img.alpha_composite(glow)
        pad = int(size * (0.06 if size <= 64 else 0.10))

    table_box = (pad, pad + size * 0.04, size - pad, size - pad - size * 0.02)
    # make table slightly wider than tall
    tw = table_box[2] - table_box[0]
    th = tw / 1.75
    midy = (table_box[1] + table_box[3]) / 2
    table_box = (table_box[0], midy - th / 2, table_box[2], midy + th / 2)
    draw_table(img, table_box, rack=not simple, simple=simple)
    return img


def make_og(width: int = 1200, height: int = 630) -> Image.Image:
    img = Image.new("RGBA", (width, height), BG)
    # atmospheric glows
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    _circle(gd, width * 0.28, height * 0.15, 380, (*FELT_BRIGHT[:3], 70))
    _circle(gd, width * 0.82, height * 0.55, 320, (*GOLD[:3], 28))
    _circle(gd, width * 0.08, height * 0.85, 220, (61, 255, 181, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img.alpha_composite(glow)

    d = ImageDraw.Draw(img)
    # gold hairline frame
    d.rounded_rectangle((28, 28, width - 29, height - 29), radius=28, outline=(*GOLD[:3], 70), width=2)

    table_box = (width * 0.52, height * 0.16, width * 0.94, height * 0.84)
    draw_table(img, table_box, rack=True, simple=False)

    bebas_lg = _font("BebasNeue-Regular.ttf", 148)
    bebas_sm = _font("BebasNeue-Regular.ttf", 44)
    outfit = _font("Outfit-Regular.ttf", 30)
    outfit_sm = _font("Outfit-Regular.ttf", 22)

    left = 72
    title = "RACKUP"
    d.text((left + 2, 118), title, font=bebas_lg, fill=(0, 0, 0, 120))
    d.text((left, 114), title, font=bebas_lg, fill=GOLD_LIGHT)
    d.text((left, 122), title, font=bebas_lg, fill=(*GOLD_DARK[:3], 40))

    _draw_words(d, (left, 268), "RACK OF CHAMPIONS", bebas_sm, GOLD, gap=12)

    _draw_words(d, (left, 330), "Find action, halls, and", outfit, TEXT, gap=10)
    _draw_words(d, (left, 372), "money sets near you.", outfit, TEXT, gap=10)

    d.text((left, 520), "rackofchampions.com", font=outfit_sm, fill=MUTED)

    pill = "POOL PLAYERS NETWORK"
    pw, ph = 292, 36
    d.rounded_rectangle((left, 78, left + pw, 78 + ph), radius=18, fill=(12, 61, 46, 180), outline=(*GOLD[:3], 90), width=1)
    _draw_words(d, (left + 16, 84), pill, outfit_sm, GOLD, gap=8)

    return img


def save_png(img: Image.Image, path: Path, *, scale_from: int | None = None, out_size: int | None = None) -> None:
    if scale_from and out_size and scale_from != out_size:
        img = img.resize((out_size, out_size), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = img.convert("RGBA")
    rgb.save(path, "PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)} ({rgb.size[0]}x{rgb.size[1]})")


def write_favicon_svg(path: Path) -> None:
    path.write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="RackUp">
  <defs>
    <radialGradient id="felt" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="{_hex(FELT_BRIGHT)}"/>
      <stop offset="100%" stop-color="{_hex(FELT)}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{_hex(GOLD_LIGHT)}"/>
      <stop offset="55%" stop-color="{_hex(GOLD)}"/>
      <stop offset="100%" stop-color="{_hex(GOLD_DARK)}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="{_hex(BG_DEEP)}"/>
  <rect x="3.2" y="6.2" width="25.6" height="19.6" rx="3.2" fill="{_hex(WOOD)}"/>
  <rect x="5.2" y="8.1" width="21.6" height="15.8" rx="2" fill="url(#felt)"/>
  <rect x="5.2" y="8.1" width="21.6" height="15.8" rx="2" fill="none" stroke="url(#gold)" stroke-width="1.15"/>
  <circle cx="16" cy="16" r="4.15" fill="{_hex(CREAM)}"/>
  <circle cx="14.7" cy="14.7" r="1.25" fill="#fff" opacity="0.55"/>
  <polygon points="16,8.55 16.7,9.25 16,9.95 15.3,9.25" fill="url(#gold)"/>
  <polygon points="16,22.05 16.7,22.75 16,23.45 15.3,22.75" fill="url(#gold)"/>
  <polygon points="6.55,16 7.25,16.7 6.55,17.4 5.85,16.7" fill="url(#gold)"/>
  <polygon points="25.45,16 26.15,16.7 25.45,17.4 24.75,16.7" fill="url(#gold)"/>
</svg>
""",
        encoding="utf-8",
    )
    print(f"wrote {path.relative_to(ROOT)}")


def write_icon_svg(path: Path) -> None:
    path.write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="RackUp">
  <defs>
    <radialGradient id="felt" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="{_hex(FELT_BRIGHT)}"/>
      <stop offset="100%" stop-color="{_hex(FELT)}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{_hex(GOLD_LIGHT)}"/>
      <stop offset="55%" stop-color="{_hex(GOLD)}"/>
      <stop offset="100%" stop-color="{_hex(GOLD_DARK)}"/>
    </linearGradient>
    <radialGradient id="ball" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="{_hex(CREAM)}"/>
      <stop offset="100%" stop-color="#cfc6b4"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="{_hex(BG_DEEP)}"/>
  <rect x="48" y="118" width="416" height="276" rx="36" fill="{_hex(WOOD)}"/>
  <rect x="78" y="146" width="356" height="220" rx="22" fill="url(#felt)"/>
  <rect x="78" y="146" width="356" height="220" rx="22" fill="none" stroke="url(#gold)" stroke-width="10"/>
  <g fill="url(#gold)">
    <polygon points="256,154 268,166 256,178 244,166"/>
    <polygon points="256,334 268,346 256,358 244,346"/>
    <polygon points="86,256 98,268 86,280 74,268"/>
    <polygon points="426,256 438,268 426,280 414,268"/>
  </g>
  <circle cx="168" cy="268" r="28" fill="url(#ball)"/>
  <circle cx="248" cy="232" r="24" fill="#f1c40f"/>
  <circle cx="292" cy="232" r="24" fill="#2980b9"/>
  <circle cx="226" cy="274" r="24" fill="#c0392b"/>
  <circle cx="270" cy="274" r="24" fill="#8e44ad"/>
  <circle cx="314" cy="274" r="24" fill="#e67e22"/>
  <circle cx="248" cy="316" r="24" fill="#27ae60"/>
  <circle cx="292" cy="316" r="24" fill="#161616"/>
</svg>
""",
        encoding="utf-8",
    )
    print(f"wrote {path.relative_to(ROOT)}")


def main() -> None:
    write_favicon_svg(PUBLIC / "favicon.svg")
    write_icon_svg(PUBLIC / "icon.svg")

    # Render icons at 4x then downscale for clean edges
    for size, name, simple in (
        (16, "favicon-16x16.png", True),
        (32, "favicon-32x32.png", True),
        (180, "apple-touch-icon.png", False),
        (192, "icon-192.png", False),
        (512, "icon-512.png", False),
    ):
        hi = make_icon(size * 4, simple=simple)
        save_png(hi, PUBLIC / name, scale_from=size * 4, out_size=size)

    for size, name in ((192, "icon-192-maskable.png"), (512, "icon-512-maskable.png")):
        hi = make_icon(size * 4, maskable=True, simple=False)
        save_png(hi, PUBLIC / name, scale_from=size * 4, out_size=size)

    og = make_og(1200, 630)
    save_png(og, PUBLIC / "og-image.png")


if __name__ == "__main__":
    main()
