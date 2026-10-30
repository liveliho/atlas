import json, os, subprocess, tempfile, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv = subprocess.Popen(["python3", "-m", "http.server", "8902", "--directory", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
BASE = "http://localhost:8902/"
OUT = os.environ.get("SMOKE_OUT") or tempfile.mkdtemp(prefix="atlas-smoke-")
res, errs = {}, []
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--disable-gpu"], executable_path=os.environ.get("CHROMIUM_PATH"))
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE, wait_until="load"); pg.wait_for_selector("#grid .card", timeout=30000)
        res["stat_total"] = pg.text_content("#stat-total")
        res["cards"] = pg.evaluate("document.querySelectorAll('#grid .card').length")
        res["collections"] = pg.evaluate("document.querySelectorAll('.collection-card').length")
        res["index_ms"] = pg.evaluate("window.__atlasIndexMs")
        pg.keyboard.press("Control+k"); pg.wait_for_selector(".palette", state="visible")
        pg.fill("#palette-input", "playwright"); pg.wait_for_timeout(400)
        res["palette_first"] = pg.text_content(".pal-item .p-name")
        pg.click(".pal-item"); pg.wait_for_selector("#drawer.open", timeout=5000)
        res["drawer_title"] = pg.text_content("#drawer-title")
        res["drawer_related"] = pg.evaluate("document.querySelectorAll('.related-item').length")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
        res["drawer_closed"] = pg.evaluate("document.querySelector('#drawer').hidden")
        pg.click("#grid .card .fav-btn"); pg.wait_for_timeout(200)
        res["fav_badge"] = pg.text_content("#fav-count")
        pg.reload(); pg.wait_for_selector("#grid .card", timeout=30000)
        res["fav_after_reload"] = pg.evaluate("document.querySelector('#fav-count').textContent + '/' + document.querySelector('#fav-count').hidden")
        pg.fill("#search", "ollama"); pg.wait_for_timeout(600)
        res["url_after_search"] = pg.evaluate("location.search")
        res["first_result"] = pg.text_content("#grid .card .repo-name")
        for _ in range(3):
            if pg.evaluate("document.documentElement.dataset.theme") == "dark": break
            pg.click("#theme-btn"); pg.wait_for_timeout(150)
        res["theme_dark"] = pg.evaluate("document.documentElement.dataset.theme + '/' + localStorage.getItem('atlas.theme')")
        pg.reload(); pg.wait_for_selector("#grid .card", timeout=30000)
        res["theme_after_reload"] = pg.evaluate("document.documentElement.dataset.theme")
        # top-nav jumps must land on the section itself, not inside the project grid
        landing = {}
        for sec in ["ai-nav", "community", "explore", "reading", "ai-nav"]:
            pg.click(f'#topnav a[href="#{sec}"]'); pg.wait_for_timeout(2500)
            landing[sec] = pg.evaluate("""(id) => { const el = document.getElementById(id);
              const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
              return (mid && mid.closest('section') || {}).id === id && Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)) < 8 && location.hash === '#' + id; }""", sec)
        res["nav_landing"] = landing
        res["grid_cards_invisible"] = pg.evaluate("[...document.querySelectorAll('#grid .card')].filter(c => +getComputedStyle(c).opacity < 0.1 && c.getBoundingClientRect().bottom < innerHeight).length")
        dl = b.new_page(viewport={"width": 1280, "height": 800})
        dl.goto(BASE + "#community", wait_until="load"); dl.wait_for_timeout(2500)
        res["deeplink_section"] = dl.evaluate("Math.round(document.getElementById('community').getBoundingClientRect().top)")
        dl.goto(BASE + "?p=sindresorhus%2Fawesome", wait_until="load"); dl.wait_for_timeout(1500)
        res["deeplink_project"] = dl.evaluate("document.querySelector('#drawer').hidden ? null : document.querySelector('#drawer-title').textContent")
        dl.close()
        pg.goto(BASE, wait_until="load"); pg.wait_for_selector("#grid .card", timeout=30000)
        pg.click("#view-list"); pg.wait_for_timeout(300)
        res["list_view"] = pg.evaluate("document.querySelector('#grid').classList.contains('list')")
        pg.screenshot(path=f"{OUT}/v3-desktop-list.png")
        m = b.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        m.on("pageerror", lambda e: errs.append("mobile: " + str(e)))
        m.goto(BASE, wait_until="load"); m.wait_for_selector("#grid .card", timeout=30000)
        res["mobile_scrollwidth"] = m.evaluate("document.scrollingElement.scrollWidth")
        m.click("#menu-btn"); m.wait_for_timeout(300)
        res["mobile_nav_open"] = m.evaluate("document.querySelector('#topnav').classList.contains('open')")
        m.screenshot(path=f"{OUT}/v3-mobile-nav.png")
        m.click("#sheet-btn"); m.wait_for_timeout(400)
        res["mobile_sheet_open"] = m.evaluate("document.querySelector('#toolbar').classList.contains('sheet-open')")
        m.screenshot(path=f"{OUT}/v3-mobile-sheet.png")
        r = b.new_page(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
        r.goto(BASE, wait_until="load"); r.wait_for_selector("#grid .card", timeout=30000)
        res["reduced_opacity"] = r.evaluate("getComputedStyle(document.querySelector('#grid .card')).opacity")
        res["reduced_triggers"] = r.evaluate("window.ScrollTrigger ? ScrollTrigger.getAll().length : -1")
        b.close()
finally:
    srv.terminate()
res["page_errors"] = errs
open(os.path.join(OUT, "smoke_result.json"), "w").write(json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps(res, ensure_ascii=False))
