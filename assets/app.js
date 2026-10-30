/* Atlas v4 — view router + catalog engine. No dependencies.
   Each 专区 is its own view behind a hash route (#home #explore #ai #community
   #reading #about). Switching swaps the content and restores that view's own
   scroll position, so nothing ever scrolls across an ever-growing list. */
"use strict";

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kfmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n));
const nfmt = (n) => Number(n).toLocaleString("en-US");
const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 16));
const store = {
  get(k, d) { try { const v = localStorage.getItem("atlas." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("atlas." + k, JSON.stringify(v)); } catch (e) {} },
};
const mqDesk = matchMedia("(min-width: 900px)");
const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.7C6 16.6 3 13.4 3 9.9 3 7.2 5 5 7.7 5c1.7 0 3.3.9 4.3 2.4C13 5.9 14.6 5 16.3 5 19 5 21 7.2 21 9.9c0 3.5-3 6.7-9 10.8z"/></svg>';
const FORK = '<svg class="mini" viewBox="0 0 24 24" aria-hidden="true" style="width:14px;height:14px;vertical-align:-2px"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 11v6"/></svg>';
const repoUrl = (p) => "https://github.com/" + p.fn;

/* ---------------- data ---------------- */
let P = [];                 // projects, sorted by stars
let byFn = new Map();
let dataReady = false, dataPromise = null, generatedAt = "";

function decode(raw) {
  if (raw.v === 2) {
    const D = raw.dict;
    return raw.items.map((r, i) => {
      const [o, n, d, s, k, l, c, f, w, u, t, fl] = r;
      const us = u ? String(u) : "";
      return {
        i, o, n, fn: o + "/" + n, d, s, k, l: D.l[l], c: D.c[c], f: D.f[f], w: w.map((x) => D.w[x]),
        u: us ? us.slice(0, 4) + "-" + us.slice(4, 6) + "-" + us.slice(6) : "", t: t.map((x) => D.t[x]),
        ft: !!(fl & 1), ov: !!(fl & 2),
      };
    });
  }
  return raw.items.map((p, i) => ({ ...p, i, ft: !!p.ft, ov: !!p.ov })); // v1 index
}
async function loadData() {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("data/index.json");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const raw = await r.json();
      P = decode(raw);
      generatedAt = raw.generated_at || "";
      byFn = new Map(P.map((p) => [p.fn, p]));
      dataReady = true;
      idle(buildSome);
      return P;
    } catch (e) { lastErr = e; await new Promise((res) => setTimeout(res, 700 * (attempt + 1))); }
  }
  throw lastErr;
}
const ensureData = () => (dataPromise = dataPromise || loadData());

/* search text is built in idle slices after load, finished on demand */
let built = 0;
function indexOne(p) {
  p._q = (p.fn + " " + p.d + " " + p.l + " " + p.c + " " + p.f + " " + p.w.join(" ") + " " + p.t.join(" ")).toLowerCase();
  p._name = p.fn.toLowerCase();
}
function buildSome(deadline) {
  while (built < P.length && deadline.timeRemaining() > 2) indexOne(P[built++]);
  if (built < P.length) idle(buildSome);
}
function ensureIndex() { while (built < P.length) indexOne(P[built++]); }

/* ---------------- search core (explore + palette) ---------------- */
function levenshtein1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
function tokenScore(tok, p) {
  const at = p._q.indexOf(tok);
  if (at >= 0) return 100 - Math.min(at, 40);
  if (tok.length >= 3) { /* subsequence: "plwrt" → playwright */
    let ti = 0, first = -1, last = -1;
    for (let i = 0; i < p._q.length && ti < tok.length; i++) if (p._q[i] === tok[ti]) { if (first < 0) first = i; last = i; ti++; }
    if (ti === tok.length && last - first < tok.length * 3) return Math.max(30, 62 - (last - first + 1 - tok.length) * 2);
  }
  if (tok.length >= 4) { /* one typo */
    p._words = p._words || p._q.split(/[^a-z0-9一-鿿]+/).filter(Boolean);
    for (const w of p._words) if (levenshtein1(tok, w)) return 45;
  }
  return 0;
}
function score(p, tokens, strict) {
  let total = 0;
  for (const t of tokens) {
    if (strict) { if (!p._q.includes(t)) return 0; total += 50; }
    else { const s = tokenScore(t, p); if (!s) return 0; total += s; }
    total += nameBonus(p, t);
  }
  return total;
}
const tokenize = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
/* Two passes: exact substring matching (native indexOf, fast) first; the
   typo-tolerant pass only runs when that finds fewer than 30 projects. */
function searchAll(items, tokens, strict) {
  ensureIndex();
  const hits = [], seen = new Set();
  for (const p of items) {
    let total = 0;
    for (const t of tokens) {
      const at = p._q.indexOf(t);
      if (at < 0) { total = 0; break; }
      total += (strict ? 50 : 100 - Math.min(at, 40)) + nameBonus(p, t);
    }
    if (total) { p._score = total; hits.push(p); seen.add(p); }
  }
  if (!strict && hits.length < 30) {
    for (const p of items) {
      if (seen.has(p)) continue;
      const sc = score(p, tokens, false);
      if (sc) { p._score = sc; hits.push(p); }
    }
  }
  return hits;
}
function nameBonus(p, t) {
  const n = p.n.toLowerCase();
  return (p._name.includes(t) ? 60 : 0) + (n === t ? 120 : n.startsWith(t) ? 40 : 0);
}
function hl(text, tokens) {
  let out = esc(text);
  for (const t of tokens) {
    if (t.length < 2) continue;
    out = out.replace(new RegExp("(" + esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>");
  }
  return out;
}

/* ---------------- state (explore filters live in the query string) ---------------- */
const DEF = { q: "", cat: "all", field: "all", over10k: false, featured: false, fav: false, strict: false, sort: "stars", shuffle: false };
const S = { ...DEF, layout: store.get("layout", "grid") };
let openFn = "";
let bookmarks = new Set(store.get("bookmarks", []));

function readUrl() {
  const q = new URLSearchParams(location.search);
  Object.assign(S, DEF, {
    q: q.get("q") || "", cat: q.get("cat") || "all", field: q.get("field") || "all",
    over10k: q.get("over10k") === "1", featured: q.get("official") === "1", fav: q.get("fav") === "1",
    strict: q.get("strict") === "1", sort: q.get("sort") || "stars",
  });
  if (q.get("view") === "list" || q.get("view") === "grid") S.layout = q.get("view");
  openFn = q.get("p") || "";
  return q;
}
function urlFor() {
  const q = new URLSearchParams();
  if (current === "explore") {
    if (S.q) q.set("q", S.q);
    if (S.cat !== "all") q.set("cat", S.cat);
    if (S.field !== "all") q.set("field", S.field);
    if (S.over10k) q.set("over10k", "1");
    if (S.featured) q.set("official", "1");
    if (S.fav) q.set("fav", "1");
    if (S.strict) q.set("strict", "1");
    if (S.sort !== "stars") q.set("sort", S.sort);
  }
  if (openFn) q.set("p", openFn);
  const qs = q.toString();
  return location.pathname + (qs ? "?" + qs : "") + (current && current !== "home" ? "#" + current : location.hash === "#home" ? "#home" : "");
}
function syncUrl() {
  const url = urlFor();
  if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, "", url);
}

/* ---------------- router ---------------- */
const VIEWS = ["home", "explore", "ai", "community", "reading", "about"];
const ALIAS = { "": "home", "ai-nav": "ai", nav: "ai", method: "about", forum: "community", forums: "community" };
const TITLES = {
  home: "Atlas — GitHub 上值得收藏的项目", explore: "探索项目 · Atlas", ai: "AI 导航 · Atlas",
  community: "AI 社区 · Atlas", reading: "AI 阅读 · Atlas", about: "收录标准 · Atlas",
};
let current = null;
const scrollMem = {};
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function viewFromHash() {
  let h = "";
  try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
  const v = h in ALIAS ? ALIAS[h] : h;
  if (VIEWS.includes(v)) return v;
  return "home";
}
function route() {
  let v = viewFromHash();
  /* old search links (?q=…) without a hash still open the explore view */
  if (!location.hash && /[?&](q|cat|field|over10k|official|fav)=/.test(location.search)) v = "explore";
  show(v);
}
function show(v) {
  if (v === current) { syncUrl(); return; }
  if (current) scrollMem[current] = window.scrollY;
  closeSheet();
  if (!$("#palette").hidden) closePalette(true);
  if (!$("#drawer").hidden) hideDrawer();
  const prev = current;
  current = v;
  for (const s of $$(".view")) s.hidden = s.dataset.view !== v;
  for (const a of $$("[data-nav]")) { if (a.dataset.nav === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }
  document.title = TITLES[v];
  renderView(v);
  window.scrollTo(0, scrollMem[v] || 0);
  if (prev) { /* move focus for screen readers without scrolling */
    const h = $(`.view[data-view="${v}"] h1, .view[data-view="${v}"] h2`);
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  syncUrl();
}
window.addEventListener("hashchange", route);
/* tapping the tab you are already on scrolls that view back to the top */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-nav], a.brand");
  if (!a) return;
  const v = a.dataset.nav || "home";
  if (v === current && !e.metaKey && !e.ctrlKey) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

/* Lay each hidden view out once, invisibly, during idle time. The first real
   layout of a text-heavy view (CJK glyph shaping, SVG decode) is the slow
   part of a first switch; afterwards those caches are warm. One view per
   idle slot so no single task gets long. */
function warmViews() {
  const queue = VIEWS.filter((v) => v !== current);
  const step = () => {
    const v = queue.shift();
    if (!v) { document.documentElement.dataset.warm = "1"; return; }
    const el = $(`.view[data-view="${v}"]`);
    if (el && el.hidden && v !== current) {
      el.style.cssText = "position:absolute;left:0;right:0;top:0;visibility:hidden;pointer-events:none;animation:none";
      el.hidden = false;
      void el.offsetHeight;
      el.hidden = true;
      el.style.cssText = "";
    }
    idle(step);
  };
  idle(step);
}
function renderView(v) {
  if (v === "home") renderHome();
  else if (v === "explore") renderExplore();
  else if (v === "ai") renderAI();
  else if (v === "community") renderCommunity();
  else if (v === "reading") renderReading();
}

/* ---------------- shared bits ---------------- */
function avatarHTML(p, cls = "avatar") {
  return `<span class="${cls}" style="--h:${hue(p.o)}">${esc(p.o[0].toUpperCase())}<img src="https://avatars.githubusercontent.com/${encodeURIComponent(p.o)}?s=96" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()"></span>`;
}
function iconHTML(it, cls = "icon") {
  if (it.icon) return `<span class="${cls}"><img src="assets/icons/${it.icon}.svg" alt="" width="28" height="28" loading="lazy" decoding="async"></span>`;
  return `<span class="${cls} letter" style="background:${esc(it.color || "#5b6270")}">${esc(it.letter || (it.name || it.title || "?")[0])}</span>`;
}
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => false);
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove();
    return Promise.resolve(ok);
  } catch (e) { return Promise.resolve(false); }
}
let toastTimer = 0;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
function lockScroll(on) { document.documentElement.classList.toggle("lock", on); }

/* ---------------- home ---------------- */
let homeStatic = false, homeData = false;
const COLLECTIONS = [
  { name: "万星精选", desc: "Star 过万的全站头部仓库", color: "#0071e3", set: { over10k: true }, count: (p) => p.ov },
  { name: "官方出品", desc: "官方组织维护的权威实现", color: "#16171b", set: { featured: true }, count: (p) => p.ft },
  { name: "AI 智能体", desc: "Agent 框架与大模型应用", color: "#7d7aff", set: { cat: "AI智能体与大模型" }, count: (p) => p.c === "AI智能体与大模型" },
  { name: "Skills 技能库", desc: "给 AI 助手装上的专业技能", color: "#ff6b4a", set: { cat: "Skills" }, count: (p) => p.c === "Skills" },
  { name: "MCP 服务器", desc: "让 AI 接上数据库、浏览器与工具", color: "#0a84ff", set: { cat: "MCP" }, count: (p) => p.c === "MCP" },
  { name: "安全工具箱", desc: "渗透、审计与防护工具", color: "#ff453a", set: { field: "网络安全" }, count: (p) => p.f === "网络安全" },
];
const TRY = ["playwright", "ollama", "渗透测试", "MCP", "营销", "rag"];
function renderHome() {
  if (!homeStatic) {
    homeStatic = true;
    $("#try-chips").innerHTML = TRY.map((t) => `<button type="button" class="chip" data-try="${esc(t)}">${esc(t)}</button>`).join("");
    $("#collections").innerHTML = COLLECTIONS.map((c, i) =>
      `<button type="button" class="collection" data-col="${i}" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${esc(c.desc)}</span><em data-col-count="${i}">… 个项目 →</em></button>`).join("");
    $("#top-rail").innerHTML = Array.from({ length: 4 }, () => '<div class="skel" style="height:172px"></div>').join("");
    const C = window.ATLAS_CONTENT;
    if (C) {
      const pick = (items, n) => items.filter((x) => x.icon).slice(0, n).map((x) => iconHTML(x)).join("");
      $("#zone-ai-icons").innerHTML = pick(C.nav.flatMap((g) => g.items), 5);
      $("#zone-community-icons").innerHTML = pick(C.forums.flatMap((g) => g.items), 5);
      $("#zone-reading-icons").innerHTML = pick(C.blogs, 5);
    }
  }
  if (dataReady && !homeData) {
    homeData = true;
    COLLECTIONS.forEach((c, i) => { $(`[data-col-count="${i}"]`).textContent = nfmt(P.filter(c.count).length) + " 个项目 →"; });
    $("#top-rail").innerHTML = P.slice(0, 10).map((p, i) =>
      `<button type="button" class="rank-card" data-open="${esc(p.fn)}">
        <span class="rank">#${i + 1}</span>
        <span class="card-top" style="padding:0">${avatarHTML(p)}<span class="card-id"><span class="card-owner">${esc(p.o)}</span><span class="card-name">${esc(p.n)}</span></span></span>
        <span class="card-desc">${esc(p.d)}</span>
        <span class="card-foot"><span class="star">★ ${kfmt(p.s)}</span><span>${FORK} ${kfmt(p.k)}</span>${p.l ? `<span>${esc(p.l)}</span>` : ""}</span>
      </button>`).join("");
  }
}
function fillStats() {
  const set = (k, v) => $$(`[data-stat="${k}"]`).forEach((el) => { el.textContent = v; });
  set("total", nfmt(P.length));
  set("over10k", nfmt(P.filter((p) => p.ov).length));
  set("authors", nfmt(new Set(P.map((p) => p.o.toLowerCase())).size));
  set("fields", new Set(P.map((p) => p.f)).size);
  $("#data-updated").textContent = generatedAt || "—";
}
$("#hero-search").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#hero-q").value.trim();
  goExplore({ q });
  $("#hero-q").blur();
});
$("#try-chips").addEventListener("click", (e) => { const b = e.target.closest("[data-try]"); if (b) goExplore({ q: b.dataset.try }); });
$("#collections").addEventListener("click", (e) => {
  const b = e.target.closest("[data-col]");
  if (b) goExplore(COLLECTIONS[+b.dataset.col].set);
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (!b) return;
  const p = byFn.get(b.dataset.open);
  if (p) openDrawer(p);
});
/* enter the explore view with a fresh filter set */
function goExplore(patch) {
  Object.assign(S, DEF, patch);
  applyControls();
  scrollMem.explore = 0;
  if (current === "explore") { renderExplore(true); window.scrollTo(0, 0); }
  else location.hash = "explore";
}

/* ---------------- explore ---------------- */
const PAGE = () => (mqDesk.matches ? 48 : 30);
let list = [], listSig = "", shown = 0, renderedCount = 0, filtersBuilt = false;
const grid = $("#grid");
const sig = () => [S.q, S.cat, S.field, S.over10k, S.featured, S.fav, S.strict, S.sort, S.shuffle].join("|");

function compute() {
  const tokens = tokenize(S.q);
  let out = [];
  for (const p of P) {
    if (S.cat !== "all" && p.c !== S.cat) continue;
    if (S.field !== "all" && p.f !== S.field) continue;
    if (S.featured && !p.ft) continue;
    if (S.over10k && !p.ov) continue;
    if (S.fav && !bookmarks.has(p.fn)) continue;
    out.push(p);
  }
  if (tokens.length) out = searchAll(out, tokens, S.strict);
  if (S.shuffle) return out.sort((a, b) => a._rand - b._rand);
  if (tokens.length) return out.sort((a, b) => b._score - a._score || b.s - a.s);
  const by = {
    stars: (a, b) => b.s - a.s, forks: (a, b) => b.k - a.k,
    updated: (a, b) => (b.u || "").localeCompare(a.u || "") || b.s - a.s, name: (a, b) => a.n.localeCompare(b.n),
  };
  return out.sort(by[S.sort] || by.stars);
}
function cardHTML(p, tokens) {
  const fav = bookmarks.has(p.fn);
  return `<article class="card" data-fn="${esc(p.fn)}" tabindex="0" role="link" aria-label="${esc(p.fn)} 详情">
    <div class="card-top">${avatarHTML(p)}<div class="card-id"><div class="card-owner">${esc(p.o)}</div><div class="card-name">${hl(p.n, tokens)}</div></div></div>
    <button type="button" class="icon-btn fav" data-fav="${esc(p.fn)}" aria-pressed="${fav}" aria-label="${fav ? "取消收藏" : "收藏"} ${esc(p.n)}">${HEART}</button>
    <p class="card-desc">${p.d ? hl(p.d, tokens) : "（暂无简介）"}</p>
    <div class="card-tags"><span class="tag tag-field">${esc(p.f)}</span>${p.w.map((w) => `<span class="tag">${esc(w)}</span>`).join("")}</div>
    <div class="card-foot"><span class="star">★ ${kfmt(p.s)}</span><span>${FORK} ${kfmt(p.k)}</span>${p.l ? `<span>${esc(p.l)}</span>` : ""}${p.ov ? '<span class="badge badge-10k">万星+</span>' : ""}${p.ft ? '<span class="badge badge-off">官方</span>' : ""}</div>
  </article>`;
}
function buildFilters() {
  if (filtersBuilt || !dataReady) return;
  filtersBuilt = true;
  const fc = {};
  P.forEach((p) => { fc[p.f] = (fc[p.f] || 0) + 1; });
  $("#field-filter").innerHTML = '<option value="all">全部专业领域</option>' +
    Object.keys(fc).sort((a, b) => fc[b] - fc[a]).map((f) => `<option value="${esc(f)}">${esc(f)} · ${fc[f]}</option>`).join("");
  applyControls();
}
function renderPills() {
  if (!dataReady) return;
  const cc = {};
  P.forEach((p) => { cc[p.c] = (cc[p.c] || 0) + 1; });
  const cats = ["all", ...Object.keys(cc).sort((a, b) => cc[b] - cc[a])];
  $("#pills").innerHTML = cats.map((c) =>
    `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${S.cat === c}">${c === "all" ? "全部" : esc(c)}<small>${c === "all" ? P.length : cc[c]}</small></button>`).join("");
}
function renderExplore(reset) {
  if (!dataReady) {
    if (!grid.firstChild) grid.innerHTML = Array.from({ length: 6 }, () => '<div class="skel"></div>').join("");
    return;
  }
  buildFilters();
  const s = sig();
  if (reset || s !== listSig || !$("#pills").firstChild) {
    list = compute(); listSig = s; shown = PAGE(); renderedCount = 0; grid.innerHTML = "";
    renderPills(); renderChips();
  }
  grid.classList.toggle("list", S.layout === "list");
  const end = Math.min(shown, list.length);
  if (end > renderedCount) {
    const tokens = tokenize(S.q);
    grid.insertAdjacentHTML("beforeend", list.slice(renderedCount, end).map((p) => cardHTML(p, tokens)).join(""));
    renderedCount = end;
  }
  $("#empty").hidden = list.length > 0;
  const left = list.length - renderedCount;
  const more = $("#more-btn");
  more.hidden = left <= 0;
  more.textContent = `加载更多（还有 ${nfmt(left)} 个）`;
  const mode = S.q ? (S.strict ? " · 精确匹配" : " · 按相关度排序") : "";
  $("#result-line").textContent = `共 ${nfmt(list.length)} 个项目${mode}`;
  $("#fav-tools").hidden = !(S.fav && bookmarks.size);
  syncUrl();
  if (current === "explore") requestAnimationFrame(fillViewport);
}
/* keep loading while the end of the list is still within reach (tall screens) */
let filling = 0;
function fillViewport() {
  if (current !== "explore" || renderedCount >= list.length) { filling = 0; return; }
  const r = $("#sentinel").getBoundingClientRect();
  if (r.top < innerHeight + 900 && filling < 4) { filling++; shown += PAGE(); renderExplore(); }
  else filling = 0;
}
new IntersectionObserver((entries) => {
  if (!entries.some((e) => e.isIntersecting) || current !== "explore" || !dataReady) return;
  if (renderedCount < list.length) { shown += PAGE(); renderExplore(); }
}, { rootMargin: "0px 0px 900px 0px" }).observe($("#sentinel"));

function activeFilterCount() {
  return [S.field !== "all", S.over10k, S.featured, S.fav, S.strict, S.sort !== "stars", S.shuffle].filter(Boolean).length;
}
function renderChips() {
  const chips = [];
  if (S.q) chips.push(["q", "搜索：" + S.q]);
  if (S.cat !== "all") chips.push(["cat", S.cat]);
  if (S.field !== "all") chips.push(["field", "领域：" + S.field]);
  if (S.over10k) chips.push(["over10k", "万星+"]);
  if (S.featured) chips.push(["featured", "官方"]);
  if (S.fav) chips.push(["fav", "我的收藏"]);
  if (S.strict) chips.push(["strict", "精确匹配"]);
  if (S.shuffle) chips.push(["shuffle", "随机顺序"]);
  $("#active-filters").innerHTML = chips.map(([k, v]) => `<button type="button" class="chip chip-x" data-clear="${k}" aria-label="清除 ${esc(v)}">${esc(v)} ✕</button>`).join("");
  const n = activeFilterCount();
  const badge = $("#filter-count");
  badge.hidden = !n; badge.textContent = n;
}
function applyControls() {
  $("#search").value = S.q;
  $("#hero-q").value = "";
  $("#sort").value = S.sort;
  $("#field-filter").value = S.field;
  $("#over10k-only").checked = S.over10k;
  $("#featured-only").checked = S.featured;
  $("#fav-only").checked = S.fav;
  $("#strict-only").checked = S.strict;
  for (const b of $$("[data-layout]")) b.setAttribute("aria-pressed", String(b.dataset.layout === S.layout));
}
function setFilter(patch) {
  Object.assign(S, patch);
  if (!("shuffle" in patch) && ("sort" in patch)) S.shuffle = false;
  applyControls();
  renderExplore(true);
  /* new result set: bring its first row into view, but never scroll down */
  const top = $('.view[data-view="explore"]').getBoundingClientRect().top + window.scrollY;
  if (window.scrollY > top) window.scrollTo(0, top);
}
let debounce = 0;
$("#search").addEventListener("input", (e) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => setFilter({ q: e.target.value.trim() }), 160);
});
$("#search").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
$("#pills").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) setFilter({ cat: b.dataset.cat }); });
$("#active-filters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-clear]");
  if (!b) return;
  const k = b.dataset.clear;
  setFilter(k === "q" ? { q: "" } : k === "cat" ? { cat: "all" } : k === "field" ? { field: "all" } : { [k]: false });
});
$("#field-filter").addEventListener("change", (e) => setFilter({ field: e.target.value }));
$("#sort").addEventListener("change", (e) => setFilter({ sort: e.target.value }));
$("#over10k-only").addEventListener("change", (e) => setFilter({ over10k: e.target.checked }));
$("#featured-only").addEventListener("change", (e) => setFilter({ featured: e.target.checked }));
$("#fav-only").addEventListener("change", (e) => setFilter({ fav: e.target.checked }));
$("#strict-only").addEventListener("change", (e) => setFilter({ strict: e.target.checked }));
$("#shuffle-btn").addEventListener("click", () => { P.forEach((p) => { p._rand = Math.random(); }); setFilter({ shuffle: true }); closeSheet(); });
$("#reset-btn").addEventListener("click", () => { Object.assign(S, DEF); applyControls(); renderExplore(true); });
$("#more-btn").addEventListener("click", () => { shown += PAGE(); renderExplore(); });
for (const b of $$("[data-layout]")) b.addEventListener("click", () => { S.layout = b.dataset.layout; store.set("layout", S.layout); applyControls(); renderExplore(); });
grid.addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { toggleBookmark(fav.dataset.fav); return; }
  const card = e.target.closest(".card");
  if (card) { const p = byFn.get(card.dataset.fn); if (p) openDrawer(p); }
});
grid.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
    e.preventDefault();
    const p = byFn.get(e.target.dataset.fn); if (p) openDrawer(p);
  }
});

/* filter sheet (phones) */
function openSheet() {
  $("#filters").classList.add("open");
  const bd = $("#sheet-backdrop"); bd.hidden = false; requestAnimationFrame(() => bd.classList.add("show"));
  $("#filter-btn").setAttribute("aria-expanded", "true");
  lockScroll(true);
}
function closeSheet() {
  const f = $("#filters");
  if (!f.classList.contains("open")) return;
  f.classList.remove("open"); f.style.transform = "";
  const bd = $("#sheet-backdrop"); bd.classList.remove("show"); setTimeout(() => { bd.hidden = true; }, 200);
  $("#filter-btn").setAttribute("aria-expanded", "false");
  if ($("#drawer").hidden) lockScroll(false);
}
$("#filter-btn").addEventListener("click", openSheet);
$("#sheet-done").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", closeSheet);
mqDesk.addEventListener("change", () => { closeSheet(); });

/* swipe a bottom sheet down to dismiss (phones) */
function swipeToClose(sheet, handleSel, onClose) {
  let y0 = null, dy = 0;
  sheet.addEventListener("touchstart", (e) => {
    if (mqDesk.matches || !e.target.closest(handleSel)) return;
    y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = "none";
  }, { passive: true });
  sheet.addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener("touchend", () => {
    if (y0 === null) return;
    y0 = null; sheet.style.transition = "";
    if (dy > 90) onClose(); else sheet.style.transform = "";
  });
}
swipeToClose($("#filters"), ".sheet-grip, .filters-in > .field:first-child", closeSheet);

/* ---------------- favourites ---------------- */
function updateFavUI() {
  const b = $("#fav-count");
  b.hidden = bookmarks.size === 0; b.textContent = bookmarks.size;
}
function toggleBookmark(fn) {
  if (bookmarks.has(fn)) bookmarks.delete(fn); else bookmarks.add(fn);
  store.set("bookmarks", [...bookmarks]);
  updateFavUI();
  const on = bookmarks.has(fn);
  for (const b of $$(`[data-fav="${CSS.escape(fn)}"]`)) { b.setAttribute("aria-pressed", String(on)); }
  const df = $("#drawer-fav");
  if (df.dataset.fn === fn) df.setAttribute("aria-pressed", String(on));
  toast(on ? "已加入收藏" : "已取消收藏");
  if (S.fav && current === "explore") renderExplore(true);
}
$("#fav-btn").addEventListener("click", () => goExplore({ fav: true }));
$("#fav-export").addEventListener("click", () => {
  const lines = [...bookmarks].map((fn) => byFn.get(fn)).filter(Boolean)
    .map((p) => `- [${p.fn}](${repoUrl(p)}) ★ ${kfmt(p.s)} — ${p.d.replace(/\s+/g, " ").slice(0, 120)}`);
  copyText("# 我的 Atlas 收藏\n\n" + lines.join("\n") + "\n").then((ok) => toast(ok ? `已复制 ${lines.length} 个收藏（Markdown）` : "复制失败，请重试"));
});

/* ---------------- detail drawer ---------------- */
let lastFocus = null;
function openDrawer(p, keep) {
  if (!keep) lastFocus = document.activeElement;
  const d = $("#drawer"), body = $("#drawer-body");
  $("#drawer-avatar").outerHTML = avatarHTML(p, "avatar avatar-lg").replace('class="avatar avatar-lg"', 'class="avatar avatar-lg" id="drawer-avatar"');
  $("#drawer-title").textContent = p.n;
  $("#drawer-owner").textContent = p.fn;
  const fb = $("#drawer-fav");
  fb.dataset.fn = p.fn; fb.setAttribute("aria-pressed", String(bookmarks.has(p.fn)));
  const related = P.filter((x) => x.fn !== p.fn && x.c === p.c && x.f === p.f).slice(0, 5);
  if (related.length < 5) related.push(...P.filter((x) => x.fn !== p.fn && x.c === p.c && !related.includes(x)).slice(0, 5 - related.length));
  body.innerHTML = `
    <p class="drawer-desc">${esc(p.d || "（暂无简介）")}</p>
    <dl class="meta">
      <div><dt>Stars</dt><dd>★ ${nfmt(p.s)}</dd></div>
      <div><dt>Forks</dt><dd>${nfmt(p.k)}</dd></div>
      <div><dt>主要语言</dt><dd>${esc(p.l || "—")}</dd></div>
      <div><dt>最近更新</dt><dd>${esc(p.u || "—")}</dd></div>
      <div><dt>大类</dt><dd>${esc(p.c)}</dd></div>
      <div><dt>专业领域</dt><dd>${esc(p.f)}</dd></div>
    </dl>
    <div class="drawer-tags">
      ${p.ov ? '<span class="badge badge-10k">万星+</span>' : ""}${p.ft ? '<span class="badge badge-off">官方</span>' : ""}
      ${p.w.map((w) => `<span class="tag tag-field">${esc(w)}</span>`).join("")}
      ${p.t.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}
    </div>
    <div class="drawer-cta">
      <a class="btn btn-primary" href="${repoUrl(p)}" target="_blank" rel="noopener">在 GitHub 打开 ↗</a>
      <button type="button" class="btn btn-ghost" id="drawer-share">复制链接</button>
    </div>
    ${related.length ? `<div class="related"><h4>相关项目</h4>${related.map((r) =>
      `<button type="button" data-related="${esc(r.fn)}"><b>${esc(r.fn)}</b><span>★ ${kfmt(r.s)}</span></button>`).join("")}</div>` : ""}`;
  body.scrollTop = 0;
  openFn = p.fn;
  if (keep) { syncUrl(); return; }
  history.pushState({ drawer: true }, "", urlFor());
  const bd = $("#drawer-backdrop");
  bd.hidden = false; d.hidden = false; d.style.transform = "";
  requestAnimationFrame(() => { bd.classList.add("show"); d.classList.add("open"); });
  lockScroll(true);
  $("#drawer-close").focus({ preventScroll: true });
}
/* UI close goes through history so the entry pushed on open is consumed */
function closeDrawer() {
  if ($("#drawer").hidden) return;
  if (history.state && history.state.drawer) history.back();
  else hideDrawer();
}
window.addEventListener("popstate", () => {
  if (!$("#drawer").hidden && !(history.state && history.state.drawer)) hideDrawer();
});
function hideDrawer() {
  const d = $("#drawer"), bd = $("#drawer-backdrop");
  if (d.hidden) return;
  d.classList.remove("open"); d.style.transform = ""; bd.classList.remove("show");
  setTimeout(() => { if (!d.classList.contains("open")) { d.hidden = true; bd.hidden = true; } }, 300);
  lockScroll(false);
  openFn = ""; syncUrl();
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
$("#drawer-close").addEventListener("click", closeDrawer);
$("#drawer-backdrop").addEventListener("click", closeDrawer);
$("#drawer-fav").addEventListener("click", (e) => toggleBookmark(e.currentTarget.dataset.fn));
$("#drawer-body").addEventListener("click", (e) => {
  const r = e.target.closest("[data-related]");
  if (r) { const p = byFn.get(r.dataset.related); if (p) openDrawer(p, true); return; }
  if (e.target.closest("#drawer-share")) {
    const link = location.origin + location.pathname + "?p=" + encodeURIComponent(openFn);
    copyText(link).then((ok) => toast(ok ? "链接已复制，打开就是这个项目" : link));
  }
});
swipeToClose($("#drawer"), ".sheet-grip, .drawer-head", closeDrawer);

/* ---------------- AI 导航 / 社区 / 阅读 ---------------- */
const C = window.ATLAS_CONTENT || { nav: [], forums: [], blogs: [], papers: [], know: [] };
const done = {};
function linkCard(it, sub, text, extra = "") {
  return `<a class="xcard" href="${esc(it.url)}" target="_blank" rel="noopener">${iconHTML(it)}
    <span class="xcard-main"><span class="xcard-name">${esc(it.name || it.title)}${extra}</span>${sub ? `<span class="xcard-org">${esc(sub)}</span>` : ""}<p class="xcard-text">${esc(text)}</p></span></a>`;
}
function renderAI() {
  if (done.ai) return; done.ai = true;
  $("#ai-tabs").innerHTML = [`<button type="button" class="chip" data-ai="all" aria-pressed="true">全部<small>${C.nav.reduce((n, g) => n + g.items.length, 0)}</small></button>`]
    .concat(C.nav.map((g, i) => `<button type="button" class="chip" data-ai="${i}" aria-pressed="false">${esc(g.title)}<small>${g.items.length}</small></button>`)).join("");
  $("#ai-groups").innerHTML = C.nav.map((g, i) =>
    `<div data-ai-group="${i}"><h3 class="group-title">${esc(g.title)} <small>${esc(g.note)}</small></h3>
     <div class="xgrid">${g.items.map((it) => linkCard(it, it.org, it.slogan, it.official ? '<span class="tag-official">官方标语</span>' : "")).join("")}</div></div>`).join("");
  $("#ai-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ai]");
    if (!b) return;
    for (const x of $$("#ai-tabs [data-ai]")) x.setAttribute("aria-pressed", String(x === b));
    for (const g of $$("[data-ai-group]")) g.hidden = b.dataset.ai !== "all" && g.dataset.aiGroup !== b.dataset.ai;
  });
}
function renderCommunity() {
  if (done.community) return; done.community = true;
  $("#forum-groups").innerHTML = C.forums.map((g) =>
    `<h3 class="group-title">${esc(g.title)} <small>${esc(g.note)}</small></h3>
     <div class="xgrid">${g.items.map((it) => linkCard(it, "", it.desc, `<span class="tag-type">${esc(it.type)}</span>`)).join("")}</div>`).join("");
}
function renderReading() {
  if (done.reading) return; done.reading = true;
  $("#blog-grid").innerHTML = C.blogs.map((b) => linkCard(b, b.source, b.desc, `<span class="tag-type">${esc(b.kind)}</span>`)).join("");
  $("#paper-list").innerHTML = C.papers.map((p) =>
    `<li class="paper"><a href="https://arxiv.org/abs/${esc(p.arxiv)}" target="_blank" rel="noopener"><span class="year">${p.year}</span><b>${esc(p.title)}</b><span>${esc(p.authors)} · arXiv:${esc(p.arxiv)}</span><p>${esc(p.why)}</p></a></li>`).join("");
  $("#know-list").innerHTML = C.know.map((k, i) => `<details${i < 2 ? " open" : ""}><summary>${esc(k.title)}</summary><p>${esc(k.text)}</p></details>`).join("");
  $("#reading-tabs").addEventListener("click", (e) => {
    const a = e.target.closest("[data-jump]");
    if (!a) return;
    e.preventDefault();
    $("#" + a.dataset.jump).scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* ---------------- command palette ---------------- */
let palSel = 0, palItems = [];
const extrasFlat = (() => {
  let cache = null;
  return () => cache || (cache = [
    ...C.nav.flatMap((g) => g.items.map((it) => ({ kind: "AI 导航", it, name: it.name, sub: it.org + " · " + it.slogan, url: it.url }))),
    ...C.forums.flatMap((g) => g.items.map((it) => ({ kind: "社区", it, name: it.name, sub: it.desc, url: it.url }))),
    ...C.blogs.map((it) => ({ kind: "博客", it, name: it.title, sub: it.source, url: it.url })),
    ...C.papers.map((it) => ({ kind: "论文", it: { letter: "论", color: "#7d7aff" }, name: it.title, sub: it.authors + " · " + it.year, url: "https://arxiv.org/abs/" + it.arxiv })),
  ].map((x) => ({ ...x, hay: (x.name + " " + x.sub).toLowerCase() })));
})();
function paletteGroups(q) {
  const tokens = tokenize(q);
  if (!tokens.length) {
    return [{ title: "试试搜", items: TRY.slice(0, 4).map((t) => ({ kind: "hint", name: t, sub: "搜索项目库" })) },
      { title: "专区", items: [["AI 导航", "ai"], ["AI 社区", "community"], ["AI 阅读", "reading"], ["收录标准", "about"]].map(([n, v]) => ({ kind: "view", name: n, view: v, sub: "打开专区" })) }];
  }
  const groups = [];
  if (dataReady) {
    const hits = searchAll(P, tokens, false).sort((a, b) => b._score - a._score || b.s - a.s);
    if (hits.length) groups.push({ title: `项目 · ${nfmt(hits.length)}`, items: hits.slice(0, 6).map((p) => ({ kind: "project", p, name: p.fn, sub: p.d, meta: "★ " + kfmt(p.s) })) });
    if (hits.length > 6) groups[0].items.push({ kind: "all", name: `在项目库查看全部 ${nfmt(hits.length)} 个结果`, sub: "按相关度排序", q });
  }
  const ex = extrasFlat().filter((x) => tokens.every((t) => x.hay.includes(t))).slice(0, 8);
  const byKind = {};
  ex.forEach((x) => { (byKind[x.kind] = byKind[x.kind] || []).push({ ...x, kind: "link", meta: "↗" }); });
  Object.keys(byKind).forEach((k) => groups.push({ title: k, items: byKind[k] }));
  return groups;
}
function renderPalette() {
  const q = $("#palette-input").value;
  const groups = paletteGroups(q);
  palItems = [];
  let html = "";
  for (const g of groups) {
    html += `<div class="pal-group">${esc(g.title)}</div>`;
    for (const it of g.items) {
      const i = palItems.length; palItems.push(it);
      const lead = it.kind === "project" ? avatarHTML(it.p) : it.kind === "link" ? iconHTML(it.it) : "";
      html += `<button type="button" class="pal-item" role="option" id="pal-${i}" data-pal="${i}" aria-selected="${i === palSel}">${lead}
        <span class="p-main"><b>${esc(it.name)}</b><small>${esc(it.sub || "")}</small></span><span class="p-meta">${esc(it.meta || "")}</span></button>`;
    }
  }
  $("#palette-results").innerHTML = html || `<div class="pal-empty">没有找到「${esc(q)}」相关的结果</div>`;
  $("#palette-input").setAttribute("aria-activedescendant", palItems.length ? "pal-" + palSel : "");
}
function activatePal(i) {
  const it = palItems[i];
  if (!it) return;
  if (it.kind === "project") { closePalette(true); openDrawer(it.p); }
  else if (it.kind === "link") window.open(it.url, "_blank", "noopener");
  else if (it.kind === "view") { closePalette(true); location.hash = it.view; }
  else if (it.kind === "all") { closePalette(true); goExplore({ q: it.q }); }
  else if (it.kind === "hint") { $("#palette-input").value = it.name; palSel = 0; renderPalette(); }
}
function openPalette() {
  lastFocus = document.activeElement;
  const o = $("#palette");
  o.hidden = false; requestAnimationFrame(() => o.classList.add("show"));
  lockScroll(true);
  $("#palette-input").value = ""; palSel = 0; renderPalette();
  $("#palette-input").focus();
  ensureData().then(() => { if (!o.hidden && $("#palette-input").value) renderPalette(); }, () => {});
}
function closePalette(silent) {
  const o = $("#palette");
  if (o.hidden) return;
  o.classList.remove("show");
  setTimeout(() => { o.hidden = true; }, 160);
  if ($("#drawer").hidden) lockScroll(false);
  if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
$("#palette-btn").addEventListener("click", openPalette);
$("#palette-close").addEventListener("click", () => closePalette());
$("#palette").addEventListener("click", (e) => { if (e.target === e.currentTarget) closePalette(); });
$("#palette-results").addEventListener("click", (e) => { const b = e.target.closest("[data-pal]"); if (b) activatePal(+b.dataset.pal); });
let palDebounce = 0;
$("#palette-input").addEventListener("input", () => { palSel = 0; clearTimeout(palDebounce); palDebounce = setTimeout(renderPalette, 90); });
$("#palette-input").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    palSel = Math.max(0, Math.min(palItems.length - 1, palSel + (e.key === "ArrowDown" ? 1 : -1)));
    for (const b of $$("#palette-results [data-pal]")) b.setAttribute("aria-selected", String(+b.dataset.pal === palSel));
    $("#palette-input").setAttribute("aria-activedescendant", "pal-" + palSel);
    const el = $("#pal-" + palSel); if (el) el.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") { e.preventDefault(); activatePal(palSel); }
});

/* ---------------- keyboard ---------------- */
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if ($("#palette").hidden) openPalette(); else closePalette();
    return;
  }
  if (e.key === "Escape") {
    if (!$("#palette").hidden) closePalette();
    else if (!$("#drawer").hidden) closeDrawer();
    else closeSheet();
    return;
  }
  if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    if (!$("#palette").hidden || !$("#drawer").hidden) return;
    e.preventDefault();
    if (current !== "explore") location.hash = "explore";
    requestAnimationFrame(() => $("#search").focus());
  }
});

/* ---------------- theme ---------------- */
function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePref = pref;
  try { localStorage.setItem("atlas.theme", pref); } catch (e) {}
  $("#theme-btn").setAttribute("aria-label", "切换主题（当前：" + (pref === "auto" ? "跟随系统" : pref === "dark" ? "深色" : "浅色") + "）");
}
$("#theme-btn").addEventListener("click", () => {
  const order = ["auto", "light", "dark"];
  const next = order[(order.indexOf(document.documentElement.dataset.themePref || "auto") + 1) % 3];
  applyTheme(next);
  toast(next === "auto" ? "主题：跟随系统" : next === "dark" ? "主题：深色" : "主题：浅色");
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((document.documentElement.dataset.themePref || "auto") === "auto") applyTheme("auto");
});

/* ---------------- boot ---------------- */
if (matchMedia("(hover: hover) and (pointer: fine)").matches) $("#search").placeholder = "搜项目、作者、技能…（按 / 聚焦）";
readUrl();
applyControls();
applyTheme(document.documentElement.dataset.themePref || "auto");
updateFavUI();
route();
ensureData().then(() => {
  fillStats();
  if (current === "home") renderHome();
  if (current === "explore") renderExplore(true);
  /* warm the other views while the browser is idle, so switching is just un-hiding */
  idle(() => { renderAI(); renderCommunity(); renderReading(); if (current !== "explore") renderExplore(); renderHome(); warmViews(); });
  if (openFn) { const p = byFn.get(openFn); if (p) openDrawer(p); else { openFn = ""; syncUrl(); } }
}, () => {
  const msg = '<div class="empty"><p class="empty-big">目录加载失败</p><p>可能是网络不稳定。</p><button type="button" class="btn btn-primary" onclick="location.reload()">重新加载</button></div>';
  grid.innerHTML = msg;
  $("#result-line").textContent = "加载失败";
  $("#top-rail").innerHTML = "";
});
