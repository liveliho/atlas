#!/usr/bin/env node
/* Atlas smoke test — real browser, phone + desktop.
   Usage: npm test            (installs nothing; needs `npm i` once for playwright)
          CHROMIUM_PATH=/path/to/chrome node scripts/smoke.js
   Starts its own static server on a free port, prints a PASS/FAIL line per
   check and exits non-zero if any check fails. */
"use strict";
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

function serve() {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(ROOT, u === "/" ? "index.html" : u);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => srv.listen(0, () => r(srv)));
}

(async () => {
  const srv = await serve();
  const BASE = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const errors = [];
  async function open(vp, mobile, url = BASE) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${vp.width}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`${vp.width}: ${m.text()}`); });
    await page.route(/avatars\.githubusercontent\.com/, (r) => r.abort()); // offline-safe; letter tiles show instead
    await page.goto(url, { waitUntil: "load" });
    return page;
  }
  const visibleView = (page) => page.evaluate(() => [...document.querySelectorAll(".view")].filter((v) => !v.hidden).map((v) => v.dataset.view).join(","));
  /* "white screen" guard: real content (cards / headings) must be painted inside the viewport */
  const contentInView = (page) => page.evaluate(() => {
    const v = document.querySelector(".view:not([hidden])");
    const els = [...v.querySelectorAll(".card, .xcard, .collection, .panel, .paper a, h1, h2")];
    return els.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 60 && r.height > 0 && getComputedStyle(e).opacity !== "0"; }).length;
  });

  /* ---------- desktop ---------- */
  const d = await open({ width: 1440, height: 900 }, false);
  await d.waitForFunction(() => document.querySelector('[data-stat="total"]').textContent === "6,231" && document.querySelectorAll("#top-rail .rank-card").length === 10);
  check("desktop: data loads, stats + Star 排行 render", true);
  check("desktop: collections show counts", await d.evaluate(() => [...document.querySelectorAll("[data-col-count]")].every((e) => /\d/.test(e.textContent))));
  for (const v of ["explore", "ai", "community", "reading", "about", "home"]) {
    await d.click(`.topnav a[data-nav="${v}"]`);
    await d.waitForTimeout(250);
    const ok = (await visibleView(d)) === v && (await d.evaluate((v) => document.querySelector(`.topnav a[data-nav="${v}"]`).getAttribute("aria-current") === "page", v));
    check(`desktop: nav → ${v}`, ok && (await contentInView(d)) > 0, `hash=${await d.evaluate(() => location.hash)}`);
  }
  await d.click('.topnav a[data-nav="explore"]');
  await d.fill("#search", "ollama");
  await d.waitForFunction(() => location.search.includes("q=ollama"));
  check("desktop: search ollama → ollama/ollama first", (await d.textContent("#grid .card .card-name")).trim() === "ollama", await d.evaluate(() => location.href));
  await d.fill("#search", "");
  await d.waitForFunction(() => !location.search.includes("q="));
  await d.mouse.wheel(0, 6000); await d.waitForTimeout(600);
  const before = await d.evaluate(() => ({ y: Math.round(scrollY), n: document.querySelectorAll("#grid .card").length }));
  check("desktop: infinite scroll appends cards", before.n > 48, `${before.n} cards`);
  await d.click('.topnav a[data-nav="ai"]'); await d.waitForTimeout(200);
  check("desktop: other view starts at top", (await d.evaluate(() => scrollY)) === 0);
  await d.goBack(); await d.waitForTimeout(300);
  const after = await d.evaluate(() => ({ y: Math.round(scrollY), n: document.querySelectorAll("#grid .card").length, v: location.hash }));
  check("desktop: back restores explore scroll + cards", after.v === "#explore" && Math.abs(after.y - before.y) < 4 && after.n === before.n, JSON.stringify({ before, after }));
  await d.keyboard.press("Control+k");
  await d.fill("#palette-input", "claude"); await d.waitForTimeout(250);
  check("desktop: ⌘K finds AI 导航 entries with local icons", await d.evaluate(() =>
    [...document.querySelectorAll(".pal-group")].some((g) => g.textContent === "AI 导航") && !!document.querySelector('.pal-item img[src="assets/icons/claude.svg"]')));
  await d.fill("#palette-input", "playwright"); await d.waitForTimeout(250);
  await d.keyboard.press("Enter");
  await d.waitForSelector("#drawer.open");
  check("desktop: ⌘K → project drawer + ?p= link", (await d.textContent("#drawer-title")) === "playwright" && (await d.evaluate(() => location.search.includes("p="))));
  await d.click("#drawer-fav");
  check("desktop: favourite badge", (await d.textContent("#fav-count")) === "1");
  await d.keyboard.press("Escape"); await d.waitForTimeout(350);
  check("desktop: Esc closes drawer, ?p= removed", await d.evaluate(() => document.querySelector("#drawer").hidden && !location.search.includes("p=")));
  await d.click("#theme-btn"); await d.click("#theme-btn");
  await d.reload({ waitUntil: "load" });
  check("desktop: theme + favourites persist", (await d.evaluate(() => document.documentElement.dataset.theme)) === "dark" && (await d.textContent("#fav-count")) === "1");

  /* ---------- deep links ---------- */
  for (const [url, view, extra] of [["#ai-nav", "ai"], ["#method", "about"], ["#community", "community"], ["?q=ollama", "explore"], ["?p=sindresorhus%2Fawesome", "home", "drawer"]]) {
    const p = await open({ width: 1280, height: 800 }, false, BASE + url);
    await p.waitForTimeout(900);
    let ok = (await visibleView(p)) === view;
    if (extra === "drawer") ok = ok && (await p.evaluate(() => !document.querySelector("#drawer").hidden && document.querySelector("#drawer-title").textContent === "awesome"));
    if (view === "explore") ok = ok && (await p.evaluate(() => document.querySelectorAll("#grid .card").length > 0));
    check(`deep link ${url} → ${view}${extra ? " + " + extra : ""}`, ok, await p.evaluate(() => location.hash));
    await p.context().close();
  }

  /* ---------- phone ---------- */
  const m = await open({ width: 390, height: 844 }, true);
  await m.waitForFunction(() => document.querySelectorAll("#top-rail .rank-card").length === 10);
  check("phone: tab bar visible, top nav hidden", await m.evaluate(() => getComputedStyle(document.querySelector(".tabbar")).display !== "none" && getComputedStyle(document.querySelector(".topnav")).display === "none"));
  await m.evaluate(() => window.scrollTo(0, 900));
  for (const v of ["explore", "ai", "community", "reading", "home"]) {
    await m.tap(`.tabbar a[data-nav="${v}"]`);
    await m.waitForTimeout(300);
    const n = await contentInView(m);
    check(`phone: tab → ${v} shows content immediately (no blank)`, (await visibleView(m)) === v && n > 0, `${n} items in view, scrollY=${await m.evaluate(() => scrollY)}`);
  }
  await m.tap('.tabbar a[data-nav="explore"]'); await m.waitForTimeout(200);
  await m.tap("#filter-btn"); await m.waitForTimeout(350);
  check("phone: filter sheet opens", await m.evaluate(() => document.querySelector("#filters").classList.contains("open")));
  await m.tap("#over10k-only + .track"); await m.tap("#sheet-done"); await m.waitForTimeout(350);
  check("phone: filter applies + sheet closes", await m.evaluate(() => !document.querySelector("#filters").classList.contains("open") && location.search.includes("over10k=1") && document.querySelector("#filter-count").textContent === "1"));
  await m.tap("#grid .card"); await m.waitForSelector("#drawer.open");
  await m.goBack(); await m.waitForTimeout(400);
  check("phone: back gesture closes drawer, stays in explore", await m.evaluate(() => document.querySelector("#drawer").hidden && location.hash === "#explore"));

  /* ---------- no horizontal overflow ---------- */
  const over = [];
  for (const w of [360, 390, 768, 1024, 1440]) {
    const p = await open({ width: w, height: 800 }, w < 900);
    await p.waitForFunction(() => document.querySelectorAll("#top-rail .rank-card").length === 10);
    for (const v of ["home", "explore", "ai", "community", "reading", "about"]) {
      await p.evaluate((v) => { location.hash = v; }, v); await p.waitForTimeout(150);
      const sw = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
      if (sw > 0) over.push(`${w}/${v}:+${sw}px`);
    }
    await p.context().close();
  }
  check("no horizontal overflow 360–1440 × 6 views", over.length === 0, over.join(" "));

  /* ---------- responsiveness under 4× CPU throttle (phone) ---------- */
  const t = await open({ width: 390, height: 844 }, true);
  await t.waitForFunction(() => document.documentElement.dataset.warm === "1"); // idle warm-up done, as for a real visitor after a second or two
  const cdp = await t.context().newCDPSession(t);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await t.evaluate(() => { window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: false }); });
  const switches = [];
  for (const v of ["explore", "ai", "community", "reading", "home", "explore"]) {
    switches.push(await t.evaluate((v) => new Promise((res) => { const t0 = performance.now(); location.hash = v; requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0)))); }), v));
    await t.waitForTimeout(150);
  }
  const searchMs = await t.evaluate(() => new Promise((res) => {
    const input = document.querySelector("#search"); const t0 = performance.now();
    input.value = "agent"; input.dispatchEvent(new Event("input"));
    const iv = setInterval(() => { if (location.search.includes("q=agent")) { clearInterval(iv); res(Math.round(performance.now() - t0 - 160)); } }, 5);
  }));
  const longest = Math.max(0, ...(await t.evaluate(() => window.__long)));
  check("perf: view switch < 150ms (4× throttle)", Math.max(...switches) < 150, `switches ${switches.join("/")}ms, longest task ${longest}ms`);
  check("perf: search result < 150ms after debounce (4× throttle)", searchMs < 150, `${searchMs}ms`);

  check("no page / console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close(); srv.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
