#!/usr/bin/env python3
"""End-to-end smoke test for the site (Playwright + Chromium).

Serves the repo root locally and checks the features a visitor relies on:
data load, search + URL sync, ⌘K palette, detail drawer, bookmarks, theme,
list view, mobile menu + filter sheet, scroll choreography tiers, reduced
motion, and no horizontal overflow from 360 to 1440 px.

    pip install playwright && python3 -m playwright install chromium
    python3 scripts/smoke_test.py            # exits 1 on any failure
    python3 scripts/smoke_test.py --offline  # block third-party requests (avatars, icons)
"""
import json, os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFLINE = "--offline" in sys.argv


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


PORT = free_port()
BASE = f"http://127.0.0.1:{PORT}/"
checks, errors = [], []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))


def new_page(browser, **kw):
    ctx = browser.new_context(**kw)
    if OFFLINE:
        ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE, wait_until="load")
    pg.wait_for_selector("#grid .card", timeout=30000)
    return pg


srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", ROOT],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # ---------- desktop ----------
        pg = new_page(b, viewport={"width": 1440, "height": 900})
        check("data loaded", pg.text_content("#stat-total").replace(",", "").isdigit())
        check("first page of cards", pg.evaluate("document.querySelectorAll('#grid .card').length") == 48)
        check("collections", pg.evaluate("document.querySelectorAll('.collection-card').length") == 6)
        check("wide tier active", pg.evaluate("document.documentElement.classList.contains('tier-wide')"))
        check("extras rendered", pg.evaluate("document.querySelectorAll('#nav-groups .xcard').length") >= 30)

        pg.keyboard.press("Control+k"); pg.wait_for_selector(".palette", state="visible")
        pg.fill("#palette-input", "playwright"); pg.wait_for_timeout(300)
        check("palette finds playwright", "playwright" in (pg.text_content(".pal-item .p-name") or "").lower())
        pg.keyboard.press("Enter"); pg.wait_for_selector("#drawer.open", timeout=5000)
        check("drawer opens from palette", "playwright" in pg.text_content("#drawer-title").lower())
        check("drawer related list", pg.evaluate("document.querySelectorAll('.related-item').length") > 0)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
        check("drawer closes on Esc", pg.evaluate("document.querySelector('#drawer').hidden"))

        pg.click("#grid .card .fav-btn"); pg.wait_for_timeout(150)
        check("bookmark badge", pg.text_content("#fav-count") == "1")
        pg.reload(); pg.wait_for_selector("#grid .card", timeout=30000)
        check("bookmark persists", pg.evaluate("!document.querySelector('#fav-count').hidden"))

        pg.fill("#search", "ollama"); pg.wait_for_timeout(500)
        check("search syncs URL", "q=ollama" in pg.evaluate("location.search"))
        check("search ranks ollama first", "ollama" in pg.text_content("#grid .card .repo-name").lower())
        pg.reload(); pg.wait_for_selector("#grid .card", timeout=30000)
        check("search restored from URL", pg.input_value("#search") == "ollama")

        for _ in range(3):
            if pg.evaluate("document.documentElement.dataset.theme") == "dark": break
            pg.click("#theme-btn"); pg.wait_for_timeout(100)
        pg.reload(); pg.wait_for_selector("#grid .card", timeout=30000)
        check("theme persists", pg.evaluate("document.documentElement.dataset.theme") == "dark")

        pg.click("#view-list"); pg.wait_for_timeout(200)
        check("list view", pg.evaluate("document.querySelector('#grid').classList.contains('list')"))

        pg.evaluate("document.querySelector('#showcase').scrollIntoView({behavior:'instant'})")
        pg.evaluate("window.scrollBy(0, innerHeight * 1.6)"); pg.wait_for_timeout(1500)
        check("showcase stack advances", pg.evaluate("document.querySelector('.stage-dot.active').dataset.i") != "0")

        # ---------- phone ----------
        m = new_page(b, viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        check("narrow tier", not m.evaluate("document.documentElement.classList.contains('tier-wide')"))
        m.click("#menu-btn"); m.wait_for_timeout(250)
        check("mobile menu opens", m.evaluate("document.querySelector('#topnav').classList.contains('open')"))
        m.click("#menu-btn")
        m.click("#sheet-btn"); m.wait_for_timeout(400)
        check("filter sheet opens", m.evaluate("document.querySelector('#toolbar').classList.contains('sheet-open')"))
        m.click("#sheet-done"); m.wait_for_timeout(400)
        check("filter sheet closes", not m.evaluate("document.querySelector('#toolbar').classList.contains('sheet-open')"))

        # ---------- overflow sweep ----------
        for w in (360, 390, 768, 1024, 1280, 1440):
            p = new_page(b, viewport={"width": w, "height": 820})
            # body clips overflow-x, so look for elements that stick out instead;
            # intentional horizontal scrollers (deck carousel, category pills) and hero tiles are exempt
            out = p.evaluate("""() => [...document.querySelectorAll('body *')].filter(el => {
                if (el.closest('.deck, .pills-scroll, .hero-tiles, .toolbar, .drawer, .palette-backdrop, .topnav, .bg, #to-top')) return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
            }).slice(0, 3).map(el => el.className || el.tagName)""")
            check(f"no horizontal overflow @{w}", not out, ", ".join(map(str, out)))
            p.context.close()

        # ---------- reduced motion ----------
        r = new_page(b, viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
        check("reduced motion: no motion layer", not r.evaluate("document.documentElement.classList.contains('motion-ready')"))
        check("reduced motion: cards visible", r.evaluate("getComputedStyle(document.querySelector('#grid .card')).opacity") == "1")
        b.close()
finally:
    srv.terminate()

failed = [c for c in checks if not c[1]]
for name, ok, detail in checks:
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail else ""))
if errors:
    print("page errors:", json.dumps(errors, ensure_ascii=False, indent=1))
print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
sys.exit(1 if failed or errors else 0)
