"""
Generate synthetic car inspection test images.

Produces two folders:
  test_images/pre/   – clean vehicle photos for each position
  test_images/post/  – same positions; some have visible damage

Run:  python generate_test_images.py
Output images land in:  backend/test_images/{pre,post}/*.jpg
"""
from __future__ import annotations
import math, pathlib, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 900, 600
OUT = pathlib.Path(__file__).parent / "test_images"
(OUT / "pre").mkdir(parents=True, exist_ok=True)
(OUT / "post").mkdir(parents=True, exist_ok=True)

# ── Colours ───────────────────────────────────────────────────────────────────
SKY      = (210, 225, 245)
ROAD     = (130, 130, 130)
CAR_BODY = (48,  84,  150)    # deep blue
CAR_DARK = (30,  55,  105)
GLASS    = (160, 200, 230, 180)
TYRE     = (35,  35,  35)
RIM      = (200, 200, 210)
LIGHT_F  = (255, 240, 180)
LIGHT_R  = (230, 60,  60)
CHROME   = (200, 205, 215)
SCRATCH  = (80,  45,  20)
DENT_S   = (20,  50,  110)

POSITIONS = [
    "Front",
    "Front-Left Corner",
    "Left Side",
    "Rear-Left Corner",
    "Rear",
    "Rear-Right Corner",
    "Right Side",
    "Front-Right Corner",
    "Interior Front",
    "Interior Rear",
    "Roof",
    "Hood",
    "Trunk",
    "Undercarriage",
    "Dashboard",
]

# Which positions get damage in the POST photos
DAMAGED = {
    "Front-Left Corner": "deep_scratch",
    "Left Side":         "door_dent",
    "Rear":              "scratch_cluster",
    "Hood":              "hail_dents",
    "Trunk":             "crack",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def gradient_bg(draw: ImageDraw.ImageDraw, top: tuple, bottom: tuple) -> None:
    for y in range(H):
        t = y / H
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


def draw_tyre(draw, cx, cy, r=52):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=TYRE)
    ri = int(r * 0.62)
    draw.ellipse([cx-ri, cy-ri, cx+ri, cy+ri], fill=RIM)
    for ang in range(0, 360, 60):
        rad = math.radians(ang)
        draw.line(
            [cx + int(ri*0.3*math.cos(rad)), cy + int(ri*0.3*math.sin(rad)),
             cx + int(ri*0.88*math.cos(rad)), cy + int(ri*0.88*math.sin(rad))],
            fill=TYRE, width=5)
    draw.ellipse([cx-10, cy-10, cx+10, cy+10], fill=TYRE)


def label_overlay(img: Image.Image, text: str, sub: str) -> Image.Image:
    d = ImageDraw.Draw(img)
    # semi-transparent bar at bottom
    d.rectangle([0, H-52, W, H], fill=(0, 0, 0, 170))
    try:
        fnt_big = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        fnt_sm  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except Exception:
        fnt_big = fnt_sm = ImageFont.load_default()
    d.text((18, H-46), text,  font=fnt_big, fill=(255, 255, 255))
    d.text((18, H-22), sub,   font=fnt_sm,  fill=(190, 210, 255))
    return img


# ── Scene renderers ───────────────────────────────────────────────────────────

def render_side(draw, facing="left"):
    """Full side profile."""
    gradient_bg(draw, SKY, (170, 185, 205))
    draw.rectangle([0, H//2, W, H], fill=ROAD)
    # shadow
    draw.ellipse([80, H//2+4, W-80, H//2+26], fill=(100, 100, 100))

    bx1, bx2, by1, by2 = 90, 810, 200, 400
    # body
    pts = [(bx1+60, by2), (bx1+60, by1+80), (bx1+200, by1+10),
           (bx2-200, by1+10), (bx2-60, by1+80), (bx2-60, by2)]
    draw.polygon(pts, fill=CAR_BODY)
    # roof
    roof = [(bx1+220, by1+80), (bx1+260, by1+15),
            (bx2-180, by1+15), (bx2-140, by1+80)]
    draw.polygon(roof, fill=CAR_DARK)
    # windows
    win1 = [(bx1+235, by1+78), (bx1+268, by1+24),
            (bx1+420, by1+24), (bx1+420, by1+78)]
    draw.polygon(win1, fill=GLASS)
    win2 = [(bx1+435, by1+78), (bx2-150, by1+24),
            (bx2-145, by1+78)]
    draw.polygon(win2, fill=GLASS)
    # door lines
    for x in [bx1+435]:
        draw.line([(x, by1+78), (x, by2)], fill=CAR_DARK, width=3)
    # headlights
    if facing == "left":
        draw.rectangle([bx2-80, by1+110, bx2-62, by1+145], fill=LIGHT_F)
        draw.rectangle([bx1+62, by1+100, bx1+90, by1+135], fill=LIGHT_R)
    else:
        draw.rectangle([bx1+62, by1+110, bx1+80, by1+145], fill=LIGHT_F)
        draw.rectangle([bx2-90, by1+100, bx2-62, by1+135], fill=LIGHT_R)
    # bumpers
    draw.rectangle([bx1+55, by1+140, bx1+75, by1+200], fill=CHROME)
    draw.rectangle([bx2-75, by1+140, bx2-55, by1+200], fill=CHROME)
    # tyres
    draw_tyre(draw, bx1+185, H//2+8)
    draw_tyre(draw, bx2-185, H//2+8)


def render_front(draw):
    gradient_bg(draw, SKY, (165, 180, 200))
    draw.rectangle([0, H//2, W, H], fill=ROAD)
    draw.ellipse([220, H//2+2, 680, H//2+22], fill=(100, 100, 100))
    # body
    bpts = [(200, H//2-10), (190, 300), (220, 220), (680, 220),
            (710, 300), (700, H//2-10)]
    draw.polygon(bpts, fill=CAR_BODY)
    # roof
    roof = [(300, 220), (320, 150), (580, 150), (600, 220)]
    draw.polygon(roof, fill=CAR_DARK)
    # windshield
    wpts = [(305, 218), (323, 158), (577, 158), (595, 218)]
    draw.polygon(wpts, fill=GLASS)
    # grille
    draw.rectangle([310, 320, 590, 380], fill=(20, 20, 20))
    for gx in range(330, 590, 35):
        draw.rectangle([gx, 325, gx+20, 375], fill=(45, 45, 45))
    # headlights
    draw.rectangle([205, 290, 295, 345], fill=LIGHT_F, outline=CHROME, width=3)
    draw.rectangle([605, 290, 695, 345], fill=LIGHT_F, outline=CHROME, width=3)
    # bumper bar
    draw.rectangle([200, 370, 700, 400], fill=CHROME)
    # number plate
    draw.rectangle([370, 372, 530, 398], fill=(255, 255, 255))
    # tyres
    draw_tyre(draw, 225, H//2+4, 46)
    draw_tyre(draw, 675, H//2+4, 46)


def render_rear(draw):
    gradient_bg(draw, (195, 215, 235), (150, 165, 185))
    draw.rectangle([0, H//2, W, H], fill=ROAD)
    draw.ellipse([220, H//2+2, 680, H//2+22], fill=(95, 95, 95))
    bpts = [(195, H//2-10), (188, 305), (215, 225), (685, 225),
            (712, 305), (705, H//2-10)]
    draw.polygon(bpts, fill=CAR_BODY)
    roof = [(298, 225), (318, 155), (582, 155), (602, 225)]
    draw.polygon(roof, fill=CAR_DARK)
    # rear window
    wpts = [(305, 223), (322, 162), (578, 162), (595, 223)]
    draw.polygon(wpts, fill=GLASS)
    # taillights
    draw.rectangle([200, 290, 300, 350], fill=LIGHT_R, outline=CAR_DARK, width=2)
    draw.rectangle([600, 290, 700, 350], fill=LIGHT_R, outline=CAR_DARK, width=2)
    # trunk line
    draw.line([(215, 355), (685, 355)], fill=CAR_DARK, width=3)
    # bumper
    draw.rectangle([210, 370, 690, 400], fill=CHROME)
    # plate
    draw.rectangle([370, 373, 530, 397], fill=(255, 255, 255))
    draw_tyre(draw, 228, H//2+4, 46)
    draw_tyre(draw, 672, H//2+4, 46)


def render_corner(draw, which="fl"):
    """Front-left, front-right, rear-left, rear-right."""
    is_front = "f" in which
    is_left  = "l" in which
    gradient_bg(draw, SKY, (160, 178, 198))
    draw.rectangle([0, H//2, W, H], fill=ROAD)
    draw.ellipse([150, H//2+2, 750, H//2+20], fill=(100, 100, 100))
    # angled body blob
    if is_left:
        pts = [(120,H//2-5),(110,320),(180,230),(700,200),(750,280),(760,H//2-5)]
    else:
        pts = [(780,H//2-5),(790,320),(720,230),(200,200),(150,280),(140,H//2-5)]
    draw.polygon(pts, fill=CAR_BODY)
    roof = [(280,200),(310,135),(620,135),(650,200)]
    draw.polygon(roof, fill=CAR_DARK)
    wpts = [(290,198),(315,143),(615,143),(640,198)]
    draw.polygon(wpts, fill=GLASS)
    # lights
    lc = LIGHT_F if is_front else LIGHT_R
    if is_left:
        draw.rectangle([115,290,220,345], fill=lc, outline=CHROME, width=2)
    else:
        draw.rectangle([680,290,785,345], fill=lc, outline=CHROME, width=2)
    draw.rectangle([210,370,690,400], fill=CHROME)
    draw_tyre(draw, 220, H//2+5, 50)
    draw_tyre(draw, 680, H//2+5, 50)


def render_interior(draw, front=True):
    gradient_bg(draw, (240,235,228), (200,195,185))
    # seats
    if front:
        draw.rectangle([100, 280, 400, H-30], fill=(50,45,40))
        draw.rectangle([500, 280, 800, H-30], fill=(50,45,40))
        draw.rectangle([110, 200, 390, 290], fill=(60,55,50))
        draw.rectangle([510, 200, 790, 290], fill=(60,55,50))
        # headrests
        draw.rectangle([200, 160, 300, 205], fill=(45,40,35))
        draw.rectangle([600, 160, 700, 205], fill=(45,40,35))
        # gear/console
        draw.rectangle([415, 330, 485, H-30], fill=(30,28,25))
        draw.ellipse([435,370,465,400], fill=(200,200,200))
    else:
        draw.rectangle([80, 260, 820, H-30], fill=(50,45,40))
        draw.rectangle([90, 180, 810, 265], fill=(60,55,50))
        draw.rectangle([200,140,350,185], fill=(45,40,35))
        draw.rectangle([550,140,700,185], fill=(45,40,35))


def render_roof(draw):
    gradient_bg(draw, (80,100,130), (110,125,150))
    draw.rounded_rectangle([100,80, W-100, H-80], radius=60,
                           fill=CAR_BODY, outline=CAR_DARK, width=4)
    draw.rounded_rectangle([140,115, W-140, H-115], radius=40, fill=CAR_DARK)
    # sunroof outline
    draw.rounded_rectangle([320,160, 580, 360], radius=20,
                           fill=(155,195,225), outline=CHROME, width=3)


def render_hood(draw):
    gradient_bg(draw, (190,205,225), (150,165,185))
    draw.polygon([(150,H-40),(100,200),(450,80),(W-100,200),(W-150,H-40)],
                 fill=CAR_BODY, outline=CAR_DARK)
    # hood vents
    for vx in [350, 450, 550]:
        draw.rounded_rectangle([vx,200,vx+30,320], radius=5,
                               fill=CAR_DARK, outline=CHROME, width=2)


def render_trunk(draw):
    gradient_bg(draw, (185,200,220), (145,160,180))
    draw.polygon([(160,H-40),(120,210),(450,120),(W-120,210),(W-160,H-40)],
                 fill=CAR_BODY, outline=CAR_DARK)
    draw.rectangle([350,280,W-350,320], fill=CHROME)
    draw.rectangle([370,282,W-370,318], fill=(255,255,255))


def render_undercarriage(draw):
    gradient_bg(draw, (40,40,45), (60,60,65))
    # frame rails
    draw.rectangle([100,120, 160, H-60], fill=(70,70,75))
    draw.rectangle([W-160,120, W-100, H-60], fill=(70,70,75))
    draw.rectangle([100,250, W-100, 290], fill=(65,65,70))
    draw.rectangle([100,380, W-100, 420], fill=(65,65,70))
    # exhaust
    draw.rectangle([W-140,H-120, W-90, H-60], fill=(90,90,95))
    draw.ellipse([W-138,H-118, W-92, H-62], fill=(80,80,85))


def render_dashboard(draw):
    gradient_bg(draw, (35,30,28), (50,45,40))
    # dash panel
    draw.rounded_rectangle([60, 120, W-60, H-80], radius=20,
                           fill=(45,40,38), outline=(80,75,70), width=3)
    # speedo + tacho dials
    for cx in [250, 650]:
        draw.ellipse([cx-90, 155, cx+90, 340], fill=(20,20,22), outline=(100,100,110), width=3)
        draw.ellipse([cx-70, 175, cx+70, 320], fill=(15,15,18))
        # needle
        draw.line([cx, 248, cx+45, 205], fill=(220,60,60), width=4)
        for ang in range(0, 300, 30):
            r = math.radians(ang - 30)
            draw.line([cx+int(55*math.cos(r)), 248+int(55*math.sin(r)),
                       cx+int(65*math.cos(r)), 248+int(65*math.sin(r))],
                      fill=(160,165,175), width=2)
    # centre screen
    draw.rounded_rectangle([340,175, W-340,330], radius=8,
                           fill=(10,10,12), outline=(80,80,90), width=2)
    draw.text_bbox = lambda *a, **kw: (0,0,0,0)  # silence
    # air vents
    for vx in [160, 380, W-380, W-160]:
        draw.rounded_rectangle([vx-25, H-130, vx+25, H-90],
                               radius=4, fill=(55,50,48), outline=(90,85,80))


# ── Damage painters ───────────────────────────────────────────────────────────

def add_deep_scratch(img: Image.Image) -> Image.Image:
    d = ImageDraw.Draw(img)
    random.seed(7)
    for _ in range(5):
        x0 = random.randint(320, 420)
        y0 = random.randint(220, 300)
        x1 = x0 + random.randint(60, 130)
        y1 = y0 + random.randint(20, 60)
        d.line([(x0,y0),(x1,y1)], fill=SCRATCH, width=random.randint(3,6))
        # lighter highlight
        d.line([(x0+1,y0+1),(x1+1,y1+1)], fill=(150,120,90), width=1)
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


def add_door_dent(img: Image.Image) -> Image.Image:
    d = ImageDraw.Draw(img)
    # dent = dark ellipse + highlight arc
    cx, cy = 450, 300
    d.ellipse([cx-55, cy-30, cx+55, cy+30], fill=DENT_S, outline=(15,38,88), width=2)
    d.arc([cx-52, cy-27, cx+52, cy+27], start=200, end=340,
          fill=(100,130,200), width=3)
    # small crack lines
    for ang in [30, 145, 250]:
        r = math.radians(ang)
        d.line([cx, cy,
                cx+int(62*math.cos(r)), cy+int(32*math.sin(r))],
               fill=DENT_S, width=2)
    return img


def add_scratch_cluster(img: Image.Image) -> Image.Image:
    d = ImageDraw.Draw(img)
    random.seed(13)
    for _ in range(9):
        x0 = random.randint(250, 620)
        y0 = random.randint(240, 380)
        x1 = x0 + random.randint(-80, 80)
        y1 = y0 + random.randint(-30, 30)
        d.line([(x0,y0),(x1,y1)], fill=SCRATCH, width=random.randint(2,5))
    img = img.filter(ImageFilter.GaussianBlur(0.3))
    return img


def add_hail_dents(img: Image.Image) -> Image.Image:
    d = ImageDraw.Draw(img)
    random.seed(42)
    for _ in range(22):
        cx = random.randint(160, W-160)
        cy = random.randint(120, H-150)
        r  = random.randint(8, 20)
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=DENT_S, outline=(10,35,90))
        d.arc([cx-r+2, cy-r+2, cx+r-2, cy+r-2], start=30, end=160,
              fill=(90,120,190), width=2)
    return img


def add_crack(img: Image.Image) -> Image.Image:
    d = ImageDraw.Draw(img)
    random.seed(99)
    pts = [(430, 240)]
    x, y = 430, 240
    for _ in range(14):
        x += random.randint(-18, 18)
        y += random.randint(8, 22)
        pts.append((x, y))
    d.line(pts, fill=SCRATCH, width=4)
    # branch
    mid = pts[6]
    d.line([mid, (mid[0]+35, mid[1]+45)], fill=SCRATCH, width=2)
    img = img.filter(ImageFilter.GaussianBlur(0.3))
    return img


DAMAGE_FNS = {
    "deep_scratch":   add_deep_scratch,
    "door_dent":      add_door_dent,
    "scratch_cluster": add_scratch_cluster,
    "hail_dents":     add_hail_dents,
    "crack":          add_crack,
}

RENDER_FNS = {
    "Front":               render_front,
    "Front-Left Corner":   lambda d: render_corner(d, "fl"),
    "Left Side":           lambda d: render_side(d, "left"),
    "Rear-Left Corner":    lambda d: render_corner(d, "rl"),
    "Rear":                render_rear,
    "Rear-Right Corner":   lambda d: render_corner(d, "rr"),
    "Right Side":          lambda d: render_side(d, "right"),
    "Front-Right Corner":  lambda d: render_corner(d, "fr"),
    "Interior Front":      lambda d: render_interior(d, front=True),
    "Interior Rear":       lambda d: render_interior(d, front=False),
    "Roof":                render_roof,
    "Hood":                render_hood,
    "Trunk":               render_trunk,
    "Undercarriage":       render_undercarriage,
    "Dashboard":           render_dashboard,
}


# ── Main ──────────────────────────────────────────────────────────────────────

def make_image(pos: str, phase: str) -> Image.Image:
    img  = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    fn   = RENDER_FNS.get(pos)
    if fn:
        fn(draw)
    # Add noise / slight texture
    random.seed(hash(pos + phase))
    for _ in range(800):
        px = random.randint(0, W-1)
        py = random.randint(0, H-1)
        v  = random.randint(-6, 6)
        old = img.getpixel((px, py))
        img.putpixel((px, py), tuple(max(0, min(255, c+v)) for c in old))

    sub = f"{'✓ Clean' if phase == 'pre' else ('⚠ Damaged' if pos in DAMAGED else '✓ Clean')}"
    label_overlay(img, pos, f"{'Pre-Inspection' if phase == 'pre' else 'Post-Inspection'}  ·  {sub}")
    return img


def generate():
    print("Generating test images…\n")
    for pos in POSITIONS:
        safe = pos.replace(" ", "_").replace("-", "_")

        # PRE — always clean
        img = make_image(pos, "pre")
        path = OUT / "pre" / f"{safe}.jpg"
        img.save(path, "JPEG", quality=88)
        print(f"  pre/{safe}.jpg")

        # POST — damage applied where configured
        img = make_image(pos, "post")
        dmg = DAMAGED.get(pos)
        if dmg:
            fn = DAMAGE_FNS[dmg]
            img = fn(img)
            # re-stamp label so "Damaged" shows
            d = ImageDraw.Draw(img)
            d.rectangle([0, H-52, W, H], fill=(0, 0, 0, 200))
            try:
                fnt_big = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
                fnt_sm  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
            except Exception:
                fnt_big = fnt_sm = ImageFont.load_default()
            d.text((18, H-46), pos,              font=fnt_big, fill=(255, 255, 255))
            d.text((18, H-22), f"Post-Inspection  ·  ⚠ Damaged ({dmg.replace('_', ' ')})",
                   font=fnt_sm, fill=(255, 180, 80))

        path = OUT / "post" / f"{safe}.jpg"
        img.save(path, "JPEG", quality=88)
        print(f"  post/{safe}.jpg {'← DAMAGED' if dmg else ''}")

    print(f"\nDone. Images saved to: {OUT.resolve()}")
    print(f"  pre/  → {len(POSITIONS)} clean images")
    print(f"  post/ → {len(POSITIONS)} images ({len(DAMAGED)} with damage)")
    print()
    print("Positions with damage:")
    for p, t in DAMAGED.items():
        print(f"  {p:25s} → {t.replace('_', ' ')}")


if __name__ == "__main__":
    generate()
