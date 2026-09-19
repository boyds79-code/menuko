#!/usr/bin/env python3
"""Generates the Menuko Staff app icon + splash assets: option 1 (scan
frame mark) + option A (cream background + scan mark + wordmark)."""

from PIL import Image, ImageDraw, ImageFont

ORANGE = (234, 124, 31, 255)      # #ea7c1f
CREAM = (255, 250, 243, 255)      # #fffaf3
INK = (35, 31, 26, 255)           # #231f1a
MUTED = (138, 124, 104, 255)      # #8a7c68
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

FONT_PATH = "/System/Library/Fonts/Avenir Next.ttc"


def font(index, size):
    return ImageFont.truetype(FONT_PATH, size, index=index)


def draw_scan_frame(draw, cx, cy, half, stroke, color, center_dot=True):
    """Draws the 4-corner viewfinder bracket mark, centered at (cx, cy),
    with each bracket arm spanning `half` px and a `half*0.65` leg length."""
    leg = int(half * 0.62)
    r = stroke // 2

    corners = [
        (cx - half, cy - half, 1, 1),   # top-left: arms go right + down
        (cx + half, cy - half, -1, 1),  # top-right
        (cx - half, cy + half, 1, -1),  # bottom-left
        (cx + half, cy + half, -1, -1),  # bottom-right
    ]
    for corner_x, corner_y, dx, dy in corners:
        p_corner = (corner_x, corner_y)
        p_h = (corner_x + dx * leg, corner_y)
        p_v = (corner_x, corner_y + dy * leg)
        draw.line([p_v, p_corner, p_h], fill=color, width=stroke, joint="curve")
        for p in (p_corner, p_h, p_v):
            draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)

    if center_dot:
        d = int(stroke * 2.3)
        draw.rounded_rectangle(
            [cx - d, cy - d, cx + d, cy + d], radius=d * 0.35, fill=color
        )


def make_icon():
    size = 1024
    im = Image.new("RGB", (size, size), CREAM[:3])
    draw = ImageDraw.Draw(im)
    draw_scan_frame(draw, size // 2, size // 2, half=210, stroke=52, color=ORANGE[:3])
    im.save("assets/icon.png")
    print("wrote assets/icon.png")


def make_android_foreground():
    size = 1024
    im = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(im)
    # Android adaptive icons get masked to a centered ~66% safe zone —
    # keep the mark smaller/more centered than the plain icon.
    draw_scan_frame(draw, size // 2, size // 2, half=170, stroke=44, color=ORANGE)
    im.save("assets/android-icon-foreground.png")
    print("wrote assets/android-icon-foreground.png")


def make_android_background():
    size = 1024
    im = Image.new("RGBA", (size, size), CREAM)
    im.save("assets/android-icon-background.png")
    print("wrote assets/android-icon-background.png")


def make_android_monochrome():
    size = 1024
    im = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(im)
    draw_scan_frame(draw, size // 2, size // 2, half=170, stroke=44, color=WHITE)
    im.save("assets/android-icon-monochrome.png")
    print("wrote assets/android-icon-monochrome.png")


def make_favicon():
    size = 256
    im = Image.new("RGB", (size, size), CREAM[:3])
    draw = ImageDraw.Draw(im)
    draw_scan_frame(draw, size // 2, size // 2, half=54, stroke=13, color=ORANGE[:3])
    im.save("assets/favicon.png")
    print("wrote assets/favicon.png")


def make_splash():
    # Transparent square logo lockup — expo-splash-screen centers this via
    # resizeMode "contain" on top of the configured cream backgroundColor.
    w, h = 900, 900
    im = Image.new("RGBA", (w, h), TRANSPARENT)
    draw = ImageDraw.Draw(im)

    mark_cy = 360
    draw_scan_frame(draw, w // 2, mark_cy, half=150, stroke=38, color=ORANGE)

    word_font = font(8, 100)  # Heavy
    tag_font = font(0, 34)    # Bold

    text = "Menuko"
    bbox = draw.textbbox((0, 0), text, font=word_font)
    tw = bbox[2] - bbox[0]
    draw.text((w / 2 - tw / 2 - bbox[0], 560), text, font=word_font, fill=INK)

    tag = "S T A F F"
    bbox2 = draw.textbbox((0, 0), tag, font=tag_font)
    tw2 = bbox2[2] - bbox2[0]
    draw.text((w / 2 - tw2 / 2 - bbox2[0], 690), tag, font=tag_font, fill=MUTED)

    im.save("assets/splash-icon.png")
    print("wrote assets/splash-icon.png")


if __name__ == "__main__":
    make_icon()
    make_android_foreground()
    make_android_background()
    make_android_monochrome()
    make_favicon()
    make_splash()
