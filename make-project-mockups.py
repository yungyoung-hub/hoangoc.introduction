"""Flat-lay mockups for the featured projects (Tết "Mở" gift set, NTT ceremony).
Run from the repo root:  python make-project-mockups.py
Needs Pillow (pip install pillow). Output: assets/projects/<project>/mockup-*.jpg
"""
import math, random, pathlib
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent
T = ROOT / 'assets/projects/tet-gift'
N = ROOT / 'assets/projects/ntt'


def backdrop(w, h, top, bottom, seed=3):
    """Paper-like background: vertical gradient, soft vignette, fine grain."""
    bg = Image.new('RGB', (w, h))
    px = bg.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    vig = Image.new('L', (w, h), 0)
    ImageDraw.Draw(vig).ellipse((-w * .25, -h * .3, w * 1.25, h * 1.3), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(min(w, h) // 5))
    dark = ImageOps.colorize(Image.new('L', (w, h), 0), (0, 0, 0), (0, 0, 0))
    bg = Image.composite(bg, Image.blend(bg, dark, .22), vig)
    rnd = random.Random(seed)
    noise = Image.effect_noise((w, h), 18).convert('RGB')
    return Image.blend(bg, ImageChops.overlay(bg, noise), .08)


def rounded(im, r):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    im = im.convert('RGBA'); im.putalpha(m)
    return im


def place(canvas, art, center, width=None, height=None, angle=0, radius=6, shadow=26, depth=18, sheen=True):
    art = art.convert('RGB')
    if width: art = art.resize((width, round(art.height * width / art.width)), Image.LANCZOS)
    elif height: art = art.resize((round(art.width * height / art.height), height), Image.LANCZOS)
    if sheen:  # light falling from the top-left
        g = Image.linear_gradient('L').rotate(-35, expand=False).resize(art.size)
        art = Image.composite(Image.blend(art, Image.new('RGB', art.size, 'white'), .07), art, g)
    card = rounded(art, radius)
    card = card.rotate(angle, resample=Image.BICUBIC, expand=True)
    a = card.split()[-1]
    pad = shadow * 3
    sh = Image.new('L', (card.width + pad * 2, card.height + pad * 2), 0)
    sh.paste(a, (pad, pad))
    sh = sh.filter(ImageFilter.GaussianBlur(shadow)).point(lambda v: int(v * .55))
    x, y = int(center[0] - card.width / 2), int(center[1] - card.height / 2)
    canvas.paste((40, 28, 20), (x - pad + depth // 3, y - pad + depth), sh)
    canvas.paste(card, (x, y), card)


def save(im, path, w=2000):
    im = im.convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(path, quality=86, optimize=True)
    print('wrote', path.relative_to(ROOT), im.size)


def load(p): return Image.open(p).convert('RGB')


# ---------- Tết “Mở” gift set: cards + postcard + sticker sheet ----------
def box_image(width):
    """Closed mailer box seen from slightly above: printed lid + a sliver of the front wall."""
    lid = load(T / 'box-lid.png'); lid = lid.crop((0, 0, lid.width, lid.height - 14))
    lid = lid.resize((width, round(lid.height * width / lid.width)), Image.LANCZOS)
    front = load(T / 'box-front.png').resize((width, round(width * .16)), Image.LANCZOS)
    front = Image.blend(front, Image.new('RGB', front.size, (40, 8, 8)), .42)
    g = Image.linear_gradient('L').resize(front.size)  # darker towards the bottom edge
    front = Image.composite(Image.blend(front, Image.new('RGB', front.size, 'black'), .25), front, g)
    box = Image.new('RGB', (width, lid.height + front.height))
    box.paste(lid, (0, 0)); box.paste(front, (0, lid.height))
    d = ImageDraw.Draw(box)
    d.line((0, lid.height, width, lid.height), fill=(235, 120, 110), width=3)  # lit edge of the lid
    return box


def tet_cover():
    W, H = 2400, 1600
    c = backdrop(W, H, (236, 228, 216), (214, 203, 188))
    place(c, load(T / 'postcard-hn-1.jpg'), (520, 1330), width=760, angle=5)
    place(c, box_image(1120), (720, 640), angle=-4, radius=10, shadow=34, depth=34)
    place(c, load(T / 'sticker.jpg'), (2120, 420), height=700, angle=10)
    fan = ['product-card-2.jpg', 'product-card-4.jpg', 'product-card-6.jpg', 'product-card-8.jpg']
    for i, f in enumerate(fan):
        place(c, load(T / f), (1480 + i * 200, 960 + abs(i - 1.5) * 30), height=780, angle=9 - i * 6)
    place(c, load(T / 'product-card-9.jpg'), (1330, 1090), height=760, angle=-9)
    save(c, T / 'mockup-set.jpg')


# ---------- Tết 2025 lì xì: the five finished envelopes + New Year cards ----------
L = ROOT / 'Packaging & Event Assets'


def envelope_front(path):
    """Cut the front panel (the tall part with the rounded flap) out of a flat dieline."""
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A')
    w, h = im.size
    tops = []
    for x in range(w):
        col = a.crop((x, 0, x + 1, h)).getbbox()
        tops.append(col[1] if col else h)
    back_top = sorted(t for t in tops if t < h)[len([t for t in tops if t < h]) // 2]  # median top = back panel
    cols = [x for x, t in enumerate(tops) if t < back_top - 60]
    x0, x1 = min(cols), max(cols) + 1
    front = im.crop((x0, 0, x1, h))
    return front.crop(front.getchannel('A').getbbox())


def card_halves(path):
    """Split a card spread into its two pages at the emptiest column near the middle."""
    im = Image.open(path).convert('RGBA'); a = im.getchannel('A'); w, h = im.size
    bb = a.getbbox(); mid = (bb[0] + bb[2]) // 2
    cut = min(range(mid - 150, mid + 150), key=lambda x: sum(a.crop((x, 0, x + 1, h)).getdata()))
    halves = [im.crop((0, 0, cut, h)), im.crop((cut + 1, 0, w, h))]
    out = []
    for p in halves:
        q = p.getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()  # ignore faint bleed
        out.append(p.crop(q))
    return out


def place_cut(canvas, art, center, height, angle=0, shadow=22, depth=16):
    """Like place(), but keeps the artwork's own shape (transparent PNG)."""
    art = art.resize((round(art.width * height / art.height), height), Image.LANCZOS).rotate(angle, resample=Image.BICUBIC, expand=True)
    a = art.getchannel('A'); pad = shadow * 3
    sh = Image.new('L', (art.width + pad * 2, art.height + pad * 2), 0); sh.paste(a, (pad, pad))
    sh = sh.filter(ImageFilter.GaussianBlur(shadow)).point(lambda v: int(v * .5))
    x, y = int(center[0] - art.width / 2), int(center[1] - art.height / 2)
    canvas.paste((40, 28, 20), (x - pad + depth // 3, y - pad + depth), sh)
    canvas.paste(art, (x, y), art)


def lixi_cover():
    W, H = 2400, 1600
    c = backdrop(W, H, (240, 233, 222), (219, 209, 195), seed=12)
    files = sorted(L.glob('AWING_lì xì thiệp tết 2025_printed version_v1.0-0*.png'))
    envs = [envelope_front(f) for f in files[:5]]
    cards = card_halves(files[5]) + card_halves(files[6])  # [green cover, inside, red cover, inside]
    for i, e in enumerate(envs):
        place_cut(c, e, (250 + i * 280, 760 + (i % 2) * 60), 980, angle=(-7, -2, 3, -3, 5)[i])
    place_cut(c, cards[1], (2150, 400), 640, angle=10)
    place_cut(c, cards[3], (1780, 1260), 600, angle=-9)
    place_cut(c, cards[2], (1880, 560), 700, angle=3)
    place_cut(c, cards[0], (2130, 1150), 700, angle=-5)
    save(c, ROOT / 'assets/projects/lixi-2025/mockup-set.jpg')


def tet_postcards():
    W, H = 2400, 1600
    c = backdrop(W, H, (240, 233, 222), (220, 210, 196), seed=5)
    place(c, load(T / 'postcard-idn-2.jpg'), (1700, 420), width=980, angle=6)
    place(c, load(T / 'postcard-hcm-1.jpg'), (1640, 1150), width=1000, angle=-4)
    place(c, load(T / 'postcard-hn-2.jpg'), (680, 1160), width=960, angle=3)
    place(c, load(T / 'postcard-idn-1.jpg'), (760, 470), width=1020, angle=-6)
    save(c, T / 'mockup-postcards.jpg')


def tet_calendar():
    W, H = 2400, 1600
    c = backdrop(W, H, (238, 230, 219), (216, 206, 192), seed=9)
    backs = ['product-card-1.jpg', 'product-card-3.jpg', 'product-card-5.jpg', 'product-card-7.jpg']
    for i, f in enumerate(backs):
        place(c, load(T / f), (480 + i * 480, 800 + (i % 2) * 40), height=1180, angle=(-4, 3, -2, 5)[i])
    save(c, T / 'mockup-calendar.jpg')


def mug(wrap_path, out):
    """A white mug with the print wrap mapped around the visible half of the cylinder."""
    W, H = 2400, 1600
    c = backdrop(W, H, (236, 230, 222), (210, 202, 192), seed=11)
    wrap = load(wrap_path)
    bw, bh = 900, 1000  # mug body
    half = wrap.crop((0, 0, wrap.width // 2, wrap.height)).resize((1600, round(1600 * wrap.height / (wrap.width / 2))), Image.LANCZOS)
    # print area: 75% of the body height, centred
    ph = int(bh * .72)
    half = half.resize((half.width, ph))
    body = Image.new('RGB', (bw, bh), (246, 246, 244))
    src = half.load(); dst = body.load()
    top = (bh - ph) // 2
    for x in range(bw):
        u = (x / (bw - 1)) * 2 - 1           # -1..1 across the visible face
        theta = math.asin(max(-1, min(1, u)))  # angle on the cylinder
        sx = int((theta / math.pi + .5) * (half.width - 1))
        for y in range(ph):
            dst[x, top + y] = src[sx, y]
    # cylinder shading
    shade = Image.new('L', (bw, 1))
    for x in range(bw):
        u = (x / (bw - 1)) * 2 - 1
        shade.putpixel((x, 0), int(255 * (.55 + .45 * math.cos(u * math.pi / 2) ** .6)))
    shade = shade.resize((bw, bh))
    body = Image.composite(body, Image.new('RGB', body.size, (60, 60, 60)), shade)
    m = Image.new('L', (bw, bh), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 40, bw - 1, bh - 1), 60, fill=255)
    d.ellipse((0, 0, bw - 1, 80), fill=255)
    mugim = Image.new('RGBA', (bw + 330, bh), (0, 0, 0, 0))
    hd = ImageDraw.Draw(mugim)
    hd.ellipse((bw - 140, 230, bw + 300, 760), outline=(232, 232, 230, 255), width=86)
    mugim.paste(body, (0, 0), m)
    rim = ImageDraw.Draw(mugim)
    rim.ellipse((6, 6, bw - 7, 74), fill=(222, 222, 220, 255), outline=(250, 250, 250, 255), width=8)
    a = mugim.split()[-1]
    sh = Image.new('L', (W, H), 0); sh.paste(a, (760 + 40, 300 + 60))
    sh = sh.filter(ImageFilter.GaussianBlur(40)).point(lambda v: int(v * .5))
    c.paste((40, 30, 22), (0, 0), sh)
    c.paste(mugim, (760, 300), mugim)
    save(c, out)


# ---------- NTT ceremony: real photo + invitation + thank-you card ----------
def ntt_cover():
    W, H = 2400, 1500
    c = backdrop(W, H, (233, 240, 246), (210, 222, 232), seed=4)
    photo = ImageOps.exif_transpose(Image.open(N / 'event-1.jpg')).convert('RGB')
    pw = 1500; ph = round(photo.height * pw / photo.width)
    place(c, photo, (90 + pw // 2, H // 2), width=pw, radius=18, shadow=30, sheen=False)
    inv = load(ROOT / 'Packaging & Event Assets' / 'thư mời awing ver mới-01.png')
    place(c, inv, (1900, 560), height=820, angle=5)
    place(c, load(N / 'thank-you-card-front.jpg'), (1930, 1150), width=720, angle=-6)
    save(c, N / 'mockup-cover.jpg')


def ntt_stationery():
    W, H = 2400, 1500
    c = backdrop(W, H, (236, 242, 247), (212, 224, 234), seed=8)
    place(c, load(ROOT / 'Packaging & Event Assets' / 'thư mời awing ver mới-01.png'), (560, 760), height=1180, angle=-4)
    place(c, load(N / 'thank-you-card-inside.jpg'), (1660, 1020), width=1100, angle=3)
    place(c, load(N / 'thank-you-card-front.jpg'), (1700, 400), width=940, angle=-3)
    save(c, N / 'mockup-stationery.jpg')


if __name__ == '__main__':
    tet_cover(); tet_postcards(); tet_calendar(); lixi_cover()
    ntt_cover(); ntt_stationery()
