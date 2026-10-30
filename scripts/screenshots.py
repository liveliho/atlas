#!/usr/bin/env python3
"""Regenerate the README screenshots in docs/images/ (Playwright + Chromium + Pillow).

    pip install playwright pillow && python3 -m playwright install chromium
    python3 scripts/screenshots.py            # real avatars/icons (needs internet)
    python3 scripts/screenshots.py --offline  # block third-party images (letter fallbacks)

Outputs: hero.webp, showcase.webp, explore-dark.webp, palette.webp, drawer.webp,
mobile.webp, scroll.webp (animated scroll preview) and og-cover.jpg (social card).
"""
import io, os, socket, subprocess, sys, time
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "images")
OFFLINE = "--offline" in sys.argv
os.makedirs(OUT, exist_ok=True)

s = socket.socket(); s.bind(("127.0.0.1", 0)); PORT = s.getsockname()[1]; s.close()
BASE = f"http://127.0.0.1:{PORT}/"


def page(browser, theme="light", **kw):
    ctx = browser.new_context(color_scheme=theme, **kw)
    if OFFLINE:
        ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    pg = ctx.new_page()
    pg.goto(BASE, wait_until="load")
    pg.wait_for_selector("#grid .card", timeout=30000)
    pg.wait_for_timeout(1800)  # intro animation
    return pg


def img(pg):
    return Image.open(io.BytesIO(pg.screenshot())).convert("RGB")


def save(im, name, width=None, **kw):
    if width and im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = os.path.join(OUT, name)
    if name.endswith(".webp"):
        im.save(path, "WEBP", quality=kw.get("quality", 82), method=6)
    else:
        im.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    print(name, os.path.getsize(path) // 1024, "KB")


def scroll_to(pg, js, wait=1400):
    pg.evaluate(js)
    pg.wait_for_timeout(wait)


srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", ROOT],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        desk = dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1)

        # hero + social card
        pg = page(b, **desk)
        hero = img(pg)
        save(hero, "hero.webp", 1440)
        save(hero.crop((0, 0, 1440, 756)).resize((1200, 630), Image.LANCZOS), "og-cover.jpg")

        # showcase: mid-stack, card 3 landing on card 2
        scroll_to(pg, "(() => { const s = document.querySelector('#showcase'); const r = s.offsetHeight - innerHeight;"
                      " scrollTo(0, s.getBoundingClientRect().top + scrollY + r * 0.47); })()", 1800)
        save(img(pg), "showcase.webp", 1440)

        # animated scroll preview: hero → numbers → manifesto → showcase stack
        frames, total, steps = [], None, 54
        scroll_to(pg, "scrollTo(0, 0)", 1500)
        end = pg.evaluate("(() => { const s = document.querySelector('#showcase'); return s.getBoundingClientRect().top + scrollY + s.offsetHeight - innerHeight * 1.1; })()")
        for i in range(steps + 1):
            t = i / steps
            e = t * t * (3 - 2 * t)
            pg.evaluate(f"scrollTo(0, {end * e})")
            pg.wait_for_timeout(110)
            frames.append(img(pg).resize((720, 450), Image.LANCZOS))
        frames += [frames[-1]] * 8
        path = os.path.join(OUT, "scroll.webp")
        frames[0].save(path, "WEBP", save_all=True, append_images=frames[1:], duration=70, loop=0, quality=62, method=6)
        print("scroll.webp", os.path.getsize(path) // 1024, "KB")
        pg.context.close()

        # explore grid, dark theme
        pg = page(b, theme="dark", **desk)
        scroll_to(pg, "document.querySelector('#explore').scrollIntoView({behavior:'instant'})")
        save(img(pg), "explore-dark.webp", 1440)

        # ⌘K palette
        pg.keyboard.press("Control+k"); pg.wait_for_timeout(300)
        pg.keyboard.type("agent", delay=40); pg.wait_for_timeout(500)
        save(img(pg), "palette.webp", 1440)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        pg.context.close()

        # detail drawer
        pg = page(b, **desk)
        scroll_to(pg, "document.querySelector('#explore').scrollIntoView({behavior:'instant'})")
        pg.click("#grid .card:nth-child(2)"); pg.wait_for_timeout(700)
        save(img(pg), "drawer.webp", 1440)
        pg.context.close()

        # phones: hero / showcase carousel / filter sheet, side by side
        phone = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        shots = []
        pg = page(b, **phone)
        shots.append(img(pg))
        scroll_to(pg, "document.querySelector('#showcase').scrollIntoView({behavior:'instant'})")
        pg.evaluate("document.querySelector('#deck').scrollBy({left: 200, behavior: 'instant'})"); pg.wait_for_timeout(600)
        shots.append(img(pg))
        scroll_to(pg, "document.querySelector('#explore').scrollIntoView({behavior:'instant'})")
        pg.click("#sheet-btn"); pg.wait_for_timeout(600)
        shots.append(img(pg))
        pg.context.close()
        gap, pad = 48, 56
        w, h = shots[0].size
        sheet = Image.new("RGB", (pad * 2 + w * 3 + gap * 2, pad * 2 + h), (232, 232, 237))
        for i, s_ in enumerate(shots):
            mask = Image.new("L", s_.size, 0)
            from PIL import ImageDraw
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=80, fill=255)
            sheet.paste(s_, (pad + i * (w + gap), pad), mask)
        save(sheet, "mobile.webp", 1440)
        b.close()
finally:
    srv.terminate()
