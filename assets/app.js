/* Atlas app v3 — single-file catalog engine.
   Data: one compact index (data/index.json) instead of 57 chunks.
   One search core shared by the explore grid and the ⌘K palette.
   Rendering is incremental: "load more" appends, never rebuilds. */
"use strict";

const CAT_DOTS = {
  "MCP": "#0a84ff", "Skills": "#ff6b4a", "AI智能体与大模型": "#7d7aff",
  "AI工具与机器学习": "#bf5af2", "开发工具": "#64d2ff", "前端与Web开发": "#30d158",
  "后端与数据库": "#ffd60a", "运维云原生与自托管": "#ff9f0a", "网络安全": "#ff453a",
  "数据与分析": "#32ade6", "效率与办公": "#66d4cf", "学习资源与Awesome": "#ac8e68",
  "设计与UI": "#ff6482", "视频多媒体与内容": "#ff375f", "金融商业与电商": "#63e6be",
  "移动与桌面应用": "#70d7ff", "游戏与娱乐": "#da8fff", "其他实用项目": "#aeaeb2",
};
const PAGE = 48;
const AUTO_PAGES = 3; /* auto-load at most this many pages before asking, so the sections below the grid stay reachable */
const $ = (s) => document.querySelector(s);
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeGhUrl = (u) => (typeof u === "string" && u.startsWith("https://github.com/")) ? u : null;
const repoUrl = (p) => "https://github.com/" + p.fn;
const avatarUrl = (p) => "https://github.com/" + p.o + ".png?size=96";

/* ---------------- state (mirrored to the URL query) ---------------- */
const state = { q: "", cat: "all", field: "all", over10k: false, featured: false, fav: false, strict: false, sort: "stars", view: "grid", shown: PAGE, shuffle: false, p: "" };
let autoBudget = AUTO_PAGES;
let projects = [];
let generatedAt = "";
let lastList = null, lastSig = "";
let bookmarks = new Set();
try { bookmarks = new Set(JSON.parse(localStorage.getItem("atlas.bookmarks") || "[]")); } catch (e) {}
try { state.view = localStorage.getItem("atlas.view") || "grid"; } catch (e) {}

function saveBookmarks() { try { localStorage.setItem("atlas.bookmarks", JSON.stringify([...bookmarks])); } catch (e) {} }
function syncUrl() {
  const q = new URLSearchParams();
  if (state.q) q.set("q", state.q);
  if (state.cat !== "all") q.set("cat", state.cat);
  if (state.field !== "all") q.set("field", state.field);
  if (state.over10k) q.set("over10k", "1");
  if (state.featured) q.set("official", "1");
  if (state.fav) q.set("fav", "1");
  if (state.strict) q.set("strict", "1");
  if (state.sort !== "stars") q.set("sort", state.sort);
  if (state.view !== "grid") q.set("view", state.view);
  if (state.p) q.set("p", state.p);
  const s = q.toString();
  /* keep the #section: dropping it broke reload / sharing of AI 导航 & 社区 links */
  history.replaceState(null, "", (s ? "?" + s : location.pathname) + location.hash);
}
function readUrl() {
  const q = new URLSearchParams(location.search);
  state.q = q.get("q") || "";
  state.cat = q.get("cat") || "all";
  state.field = q.get("field") || "all";
  state.over10k = q.get("over10k") === "1";
  state.featured = q.get("official") === "1";
  state.fav = q.get("fav") === "1";
  state.strict = q.get("strict") === "1";
  state.sort = q.get("sort") || "stars";
  state.view = q.get("view") || state.view;
  state.p = q.get("p") || "";
}
window.addEventListener("popstate", () => {
  /* back/forward between #sections must not rebuild (and shrink) the grid */
  const before = stateSig();
  readUrl();
  if (stateSig() !== before) { applyStateToControls(); state.shown = PAGE; autoBudget = AUTO_PAGES; renderPills(); render(true); }
  goToSection(location.hash, false);
});

/* ---------------- search core (shared) ---------------- */
function buildSearchText(p) {
  p._q = (p.fn + " " + p.d + " " + p.l + " " + p.c + " " + p.f + " " + p.w.join(" ") + " " + p.t.join(" ")).toLowerCase();
  p._name = p.fn.toLowerCase();
  p._words = p._q.split(/[^a-z0-9\u4e00-\u9fff]+/).filter(Boolean);
}
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function tokenScore(token, p) {
  const idx = p._q.indexOf(token);
  if (idx >= 0) return 100 - Math.min(idx, 40);
  let ti = 0, first = -1, last = -1;
  const text = p._q;
  for (let i = 0; i < text.length && ti < token.length; i++) {
    if (text[i] === token[ti]) { if (first < 0) first = i; last = i; ti++; }
  }
  if (ti === token.length && token.length >= 3) {
    const span = last - first + 1;
    return Math.max(30, 62 - (span - token.length) * 2);
  }
  if (token.length >= 4) {
    for (const w of p._words) {
      if (Math.abs(w.length - token.length) <= 1 && levenshtein(token, w) <= 1) return 45;
    }
  }
  return 0;
}
function scoreProject(p, tokens, strict) {
  let total = 0;
  for (const t of tokens) {
    if (strict) {
      if (!p._q.includes(t)) return 0;
      total += 50;
    } else {
      const s = tokenScore(t, p);
      if (s <= 0) return 0;
      total += s;
    }
    if (p._name.includes(t)) total += 60;
  }
  return total;
}
function searchProjects(query, limit) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const out = [];
  for (const p of projects) {
    const s = scoreProject(p, tokens, state.strict);
    if (s > 0) out.push([s, p]);
  }
  out.sort((a, b) => b[0] - a[0] || b[1].s - a[1].s);
  return out.slice(0, limit || 8).map((x) => x[1]);
}
function highlight(text, tokens) {
  let out = esc(text);
  if (!tokens || !tokens.length) return out;
  for (const t of tokens) {
    if (t.length < 2) continue;
    const safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { out = out.replace(new RegExp("(" + safe + ")", "gi"), "<mark>$1</mark>"); } catch (e) {}
  }
  return out;
}

/* ---------------- filtering ---------------- */
function filtered() {
  const tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = [];
  for (const p of projects) {
    if (state.cat !== "all" && p.c !== state.cat) continue;
    if (state.field !== "all" && p.f !== state.field) continue;
    if (state.featured && !p.ft) continue;
    if (state.over10k && !p.ov) continue;
    if (state.fav && !bookmarks.has(p.fn)) continue;
    if (tokens.length) {
      const s = scoreProject(p, tokens, state.strict);
      if (s <= 0) continue;
      p._score = s;
    }
    list.push(p);
  }
  if (state.shuffle) return list.sort((a, b) => (a._rand || 0) - (b._rand || 0));
  if (tokens.length) return list.sort((a, b) => (b._score - a._score) || (b.s - a.s));
  const by = {
    stars: (a, b) => b.s - a.s, forks: (a, b) => b.k - a.k,
    updated: (a, b) => (b.u || "").localeCompare(a.u || ""), name: (a, b) => a.n.localeCompare(b.n),
  };
  return list.sort(by[state.sort] || by.stars);
}
function stateSig() {
  return [state.q, state.cat, state.field, state.over10k, state.featured, state.fav, state.strict, state.sort, state.shuffle].join("|");
}

/* ---------------- rendering (incremental) ---------------- */
const grid = () => $("#grid");
function cardHTML(p) {
  const tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const works = p.w.map((w) => `<span class="work-tag">${esc(w)}</span>`).join("");
  const faved = bookmarks.has(p.fn);
  return `<article class="card" tabindex="0" role="button" aria-label="查看 ${esc(p.fn)} 详情" data-fn="${esc(p.fn)}" style="--cat-color:${CAT_DOTS[p.c] || "#aeaeb2"}">
    <button type="button" class="fav-btn ${faved ? "faved" : ""}" data-fav="${esc(p.fn)}" aria-label="${faved ? "取消收藏" : "收藏"} ${esc(p.fn)}" aria-pressed="${faved}">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.7C6 16.6 3 13.4 3 9.9 3 7.2 5 5 7.7 5c1.7 0 3.3.9 4.3 2.4C13 5.9 14.6 5 16.3 5 19 5 21 7.2 21 9.9c0 3.5-3 6.7-9 10.8z"/></svg>
    </button>
    <div class="card-top">
      <img class="avatar" src="${avatarUrl(p)}" alt="${esc(p.o)} 的头像" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">
      <div class="card-id">
        <div class="repo-name"><span class="owner-name">${esc(p.o)} /</span> ${highlight(p.n, tokens)}</div>
        <div class="author-line">${esc(p.c)}</div>
      </div>
      <span class="badges">${p.ov ? '<span class="badge badge-10k">万星+</span>' : ""}${p.ft ? '<span class="badge badge-off">官方</span>' : ""}</span>
    </div>
    <p class="desc">${highlight(p.d, tokens)}</p>
    <div class="pro-line"><span class="field-chip">${esc(p.f)}</span>${works}</div>
    <div class="card-foot">
      <span class="star">★ ${fmt(p.s)}</span>
      <span>⑂ ${fmt(p.k)}</span>
      ${p.l ? `<span><span class="lang-dot"></span>${esc(p.l)}</span>` : ""}
      <a class="card-gh" href="${repoUrl(p)}" target="_blank" rel="noopener" data-gh>GitHub ↗</a>
    </div>
  </article>`;
}
function render(force) {
  const sig = stateSig();
  if (force || sig !== lastSig) { lastList = filtered(); lastSig = sig; state.rendered = 0; autoBudget = AUTO_PAGES; grid().innerHTML = ""; }
  const list = lastList;
  const g = grid();
  g.classList.toggle("list", state.view === "list");
  const next = Math.min(state.shown, list.length);
  if (next > (state.rendered || 0)) {
    const frag = document.createElement("div");
    frag.innerHTML = list.slice(state.rendered || 0, next).map(cardHTML).join("");
    while (frag.firstChild) g.appendChild(frag.firstChild);
    state.rendered = next;
  }
  $("#empty").hidden = list.length > 0;
  const left = list.length - state.shown;
  $("#more-btn").style.display = left > 0 ? "" : "none";
  $("#more-btn").textContent = `加载更多项目（还有 ${left.toLocaleString()} 个）`;
  const mode = state.q ? (state.strict ? " · 精确模式" : " · 容错搜索（按相关度）") : "";
  $("#result-line").textContent = `共找到 ${list.length.toLocaleString()} 个项目 · 已展示 ${(state.rendered || 0).toLocaleString()} 个${mode}`;
  renderActiveFilters();
  syncUrl();
}
function renderActiveFilters() {
  const chips = [];
  if (state.cat !== "all") chips.push(["cat", "大类：" + state.cat]);
  if (state.field !== "all") chips.push(["field", "领域：" + state.field]);
  if (state.over10k) chips.push(["over10k", "万星+"]);
  if (state.featured) chips.push(["featured", "官方"]);
  if (state.fav) chips.push(["fav", "我的收藏"]);
  if (state.strict) chips.push(["strict", "精确模式"]);
  if (state.shuffle) chips.push(["shuffle", "随机顺序"]);
  if (state.q) chips.push(["q", "搜索：" + state.q]);
  $("#active-filters").innerHTML = chips.map(([k, v]) =>
    `<button type="button" class="af-chip" data-clear="${k}" aria-label="清除筛选 ${esc(v)}">${esc(v)} ✕</button>`).join("");
  document.querySelectorAll("[data-clear]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.clear;
    if (k === "cat") state.cat = "all";
    if (k === "field") { state.field = "all"; $("#field-filter").value = "all"; }
    if (k === "over10k") { state.over10k = false; $("#over10k-only").checked = false; }
    if (k === "featured") { state.featured = false; $("#featured-only").checked = false; }
    if (k === "fav") { state.fav = false; $("#fav-only").checked = false; }
    if (k === "strict") { state.strict = false; $("#strict-only").checked = false; }
    if (k === "shuffle") state.shuffle = false;
    if (k === "q") { state.q = ""; $("#search").value = ""; }
    state.shown = PAGE; renderPills(); render(true);
  }));
}
function renderPills() {
  const counts = {};
  projects.forEach((p) => { counts[p.c] = (counts[p.c] || 0) + 1; });
  const cats = ["all", ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])];
  $("#pills").innerHTML = cats.map((c) => {
    const n = c === "all" ? projects.length : counts[c];
    const label = c === "all" ? "全部" : c;
    return `<button type="button" aria-pressed="${state.cat === c}" class="pill ${state.cat === c ? "active" : ""}" data-cat="${esc(c)}">${esc(label)}<small>${n}</small></button>`;
  }).join("");
  document.querySelectorAll(".pill").forEach((b) =>
    b.addEventListener("click", () => { state.cat = b.dataset.cat; state.shown = PAGE; renderPills(); render(true); }));
}
function renderFieldOptions() {
  const counts = {};
  projects.forEach((p) => { counts[p.f] = (counts[p.f] || 0) + 1; });
  const fields = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  $("#field-filter").innerHTML = `<option value="all">全部专业领域</option>` +
    fields.map((f) => `<option value="${esc(f)}" ${state.field === f ? "selected" : ""}>${esc(f)} · ${counts[f]}</option>`).join("");
}
function renderCollections() {
  const defs = [
    { name: "万星精选", desc: "Star 过万的全站头部仓库", color: "#0071e3", apply: () => { state.over10k = true; $("#over10k-only").checked = true; }, count: () => projects.filter((p) => p.ov).length },
    { name: "官方出品", desc: "官方组织维护的权威实现", color: "#1d1d1f", apply: () => { state.featured = true; $("#featured-only").checked = true; }, count: () => projects.filter((p) => p.ft).length },
    { name: "AI 智能体", desc: "Agent 框架与大模型应用", color: "#7d7aff", apply: () => { state.cat = "AI智能体与大模型"; }, count: () => projects.filter((p) => p.c === "AI智能体与大模型").length },
    { name: "Skills 技能库", desc: "给 AI 助手装上的专业技能", color: "#ff6b4a", apply: () => { state.cat = "Skills"; }, count: () => projects.filter((p) => p.c === "Skills").length },
    { name: "学习路线", desc: "教程、路线图与 Awesome 清单", color: "#ac8e68", apply: () => { state.cat = "学习资源与Awesome"; }, count: () => projects.filter((p) => p.c === "学习资源与Awesome").length },
    { name: "安全工具箱", desc: "渗透、审计与防护工具", color: "#ff453a", apply: () => { state.field = "网络安全"; $("#field-filter").value = "网络安全"; }, count: () => projects.filter((p) => p.f === "网络安全").length },
  ];
  $("#collections").innerHTML = defs.map((d, i) =>
    `<button type="button" class="collection-card" data-col="${i}" style="--col-color:${d.color}">
       <span class="collection-name">${esc(d.name)}</span>
       <span class="collection-desc">${esc(d.desc)}</span>
       <span class="collection-count">${d.count().toLocaleString()} 个项目 →</span>
     </button>`).join("");
  document.querySelectorAll("[data-col]").forEach((b) => b.addEventListener("click", () => {
    defs[+b.dataset.col].apply();
    state.shown = PAGE; renderPills(); render(true);
    $("#explore").scrollIntoView({ behavior: "smooth" });
  }));
}
function updateFavUI() {
  const n = bookmarks.size;
  const badge = $("#fav-count");
  badge.hidden = n === 0;
  badge.textContent = n;
}
function toggleBookmark(fn) {
  if (bookmarks.has(fn)) bookmarks.delete(fn); else bookmarks.add(fn);
  saveBookmarks(); updateFavUI();
  document.querySelectorAll(`[data-fav="${CSS.escape(fn)}"]`).forEach((b) => {
    const on = bookmarks.has(fn);
    b.classList.toggle("faved", on); b.setAttribute("aria-pressed", on);
  });
  const df = $("#drawer-fav");
  if (df && df.dataset.fn === fn) { df.classList.toggle("faved", bookmarks.has(fn)); df.setAttribute("aria-pressed", bookmarks.has(fn)); }
  if (state.fav) { state.shown = Math.max(state.shown, PAGE); render(true); }
}

/* ---------------- detail drawer ---------------- */
let lastFocus = null;
function openDrawer(p, keepFocus) {
  if (!keepFocus) lastFocus = document.activeElement;
  const d = $("#drawer"), body = $("#drawer-body");
  $("#drawer-avatar").src = avatarUrl(p);
  $("#drawer-title").textContent = p.n;
  $("#drawer-owner").textContent = p.o + " · " + p.fn;
  const favBtn = $("#drawer-fav");
  favBtn.dataset.fn = p.fn;
  favBtn.classList.toggle("faved", bookmarks.has(p.fn));
  favBtn.setAttribute("aria-pressed", bookmarks.has(p.fn));
  const related = projects.filter((x) => x.fn !== p.fn && (x.c === p.c || x.f === p.f))
    .sort((a, b) => b.s - a.s).slice(0, 5);
  const url = safeGhUrl(repoUrl(p));
  body.innerHTML = `
    <p class="drawer-desc">${esc(p.d)}</p>
    <dl class="meta-grid">
      <div class="meta-item"><dt>Stars</dt><dd>★ ${p.s.toLocaleString()}</dd></div>
      <div class="meta-item"><dt>Forks</dt><dd>⑂ ${p.k.toLocaleString()}</dd></div>
      <div class="meta-item"><dt>主要语言</dt><dd>${esc(p.l || "—")}</dd></div>
      <div class="meta-item"><dt>最近更新</dt><dd>${esc(p.u || "—")}</dd></div>
      <div class="meta-item"><dt>大类</dt><dd>${esc(p.c)}</dd></div>
      <div class="meta-item"><dt>专业领域</dt><dd>${esc(p.f)}</dd></div>
    </dl>
    <div class="drawer-tags">
      <span class="field-chip">${esc(p.f)}</span>
      ${p.w.map((w) => `<span class="work-tag">${esc(w)}</span>`).join("")}
      ${p.t.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
      ${p.ov ? '<span class="badge badge-10k">万星+</span>' : ""}${p.ft ? '<span class="badge badge-off">官方</span>' : ""}
    </div>
    <div class="drawer-cta">
      ${url ? `<a class="primary-btn" href="${url}" target="_blank" rel="noopener">在 GitHub 打开 ↗</a>` : ""}
      <button type="button" class="ghost-btn" id="drawer-share">复制分享链接</button>
    </div>
    ${related.length ? `<h4 class="related-title">相关项目</h4>` + related.map((r) =>
      `<button type="button" class="related-item" data-related="${esc(r.fn)}"><span class="r-name">${esc(r.fn)}</span><span class="r-stars">★ ${fmt(r.s)}</span></button>`).join("") : ""}`;
  body.querySelectorAll("[data-related]").forEach((b) => b.addEventListener("click", () => {
    const rp = projects.find((x) => x.fn === b.dataset.related);
    if (rp) { openDrawer(rp, true); body.scrollTop = 0; }
  }));
  $("#drawer-share").addEventListener("click", () => {
    const link = location.origin + location.pathname + "?p=" + encodeURIComponent(p.fn);
    copyText(link).then((ok) => toast(ok ? "链接已复制，发给朋友直接打开这个项目" : link));
  });
  state.p = p.fn; syncUrl();
  if (keepFocus) return;
  const bd = $("#drawer-backdrop");
  bd.hidden = false; d.hidden = false;
  requestAnimationFrame(() => { bd.classList.add("show"); d.classList.add("open"); });
  document.body.style.overflow = "hidden";
  $("#drawer-close").focus();
}
function closeDrawer() {
  const d = $("#drawer"), bd = $("#drawer-backdrop");
  state.p = ""; syncUrl();
  d.classList.remove("open"); bd.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => { d.hidden = true; bd.hidden = true; }, 300);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
$("#drawer-close").addEventListener("click", closeDrawer);
$("#drawer-backdrop").addEventListener("click", closeDrawer);
$("#drawer-fav").addEventListener("click", (e) => toggleBookmark(e.currentTarget.dataset.fn));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    /* topmost layer first: the drawer can sit above a still-fading palette */
    if (!$("#drawer").hidden) closeDrawer();
    else if (!$("#palette-backdrop").hidden) closePalette();
    else if ($("#toolbar").classList.contains("sheet-open")) closeSheet();
  }
  if (e.key === "Tab" && !$("#drawer").hidden) {
    const f = $("#drawer").querySelectorAll("button, a[href], [tabindex]");
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------------- command palette ---------------- */
let palSel = 0, palItems = [];
function extrasFlat() {
  const ex = window.ATLAS_EXTRAS || {};
  const out = [];
  (ex.nav || []).forEach((g) => g.items.forEach((it) => out.push({ kind: "AI 导航", name: it.name, sub: (it.org || "") + " · " + (it.slogan || ""), url: it.url })));
  (ex.forums || []).forEach((g) => g.items.forEach((it) => out.push({ kind: "社区", name: it.name, sub: it.slogan || it.desc || "", url: it.url })));
  (ex.blogs || []).forEach((it) => out.push({ kind: "博客", name: it.title || it.name, sub: it.src || it.source || "", url: it.url }));
  (ex.papers || []).forEach((it) => out.push({ kind: "论文", name: it.title || it.name, sub: (it.authors || "") + " " + (it.year || ""), url: it.url }));
  return out;
}
function paletteSearch(q) {
  const groups = [];
  const projs = searchProjects(q, 6);
  if (projs.length) groups.push({ title: "项目", items: projs.map((p) => ({ kind: "project", p, name: p.fn, sub: p.d, meta: "★ " + fmt(p.s) })) });
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length) {
    const hits = extrasFlat().filter((it) => {
      const hay = (it.name + " " + it.sub).toLowerCase();
      return tokens.every((t) => hay.includes(t)) || tokens.some((t) => {
        let ti = 0; for (let i = 0; i < hay.length && ti < t.length; i++) if (hay[i] === t[ti]) ti++;
        return ti === t.length && t.length >= 3;
      });
    }).slice(0, 8);
    const byKind = {};
    hits.forEach((h) => { (byKind[h.kind] = byKind[h.kind] || []).push(h); });
    Object.keys(byKind).forEach((k) => groups.push({ title: k, items: byKind[k].map((h) => ({ kind: "link", name: h.name, sub: h.sub, url: h.url, meta: "↗" })) }));
  }
  return groups;
}
function renderPalette(q) {
  const box = $("#palette-results");
  const groups = q.trim() ? paletteSearch(q) : [{ title: "试试搜", items: [
    { kind: "hint", name: "playwright", sub: "浏览器自动化框架", meta: "" },
    { kind: "hint", name: "ollama", sub: "本地跑大模型", meta: "" },
    { kind: "hint", name: "渗透测试", sub: "按工作技能搜索", meta: "" },
    { kind: "hint", name: "skills", sub: "Agent Skills 技能库", meta: "" },
  ] }];
  palItems = [];
  let html = "";
  groups.forEach((g) => {
    html += `<div class="pal-group">${esc(g.title)}</div>`;
    g.items.forEach((it) => {
      const idx = palItems.length; palItems.push(it);
      html += `<button type="button" class="pal-item ${idx === palSel ? "sel" : ""}" role="option" aria-selected="${idx === palSel}" data-pal="${idx}">
        <span class="p-main"><span class="p-name">${esc(it.name)}</span><br><span class="p-sub">${esc(it.sub || "")}</span></span>
        <span class="p-meta">${esc(it.meta || "")}</span></button>`;
    });
  });
  box.innerHTML = html || `<div class="pal-empty">没有找到「${esc(q)}」相关的结果，换个关键词试试。</div>`;
  box.querySelectorAll("[data-pal]").forEach((b) => b.addEventListener("click", () => activatePal(+b.dataset.pal)));
}
function activatePal(i) {
  const it = palItems[i];
  if (!it) return;
  if (it.kind === "project") { closePalette(); openDrawer(it.p); }
  else if (it.kind === "link") { window.open(it.url, "_blank", "noopener"); }
  else if (it.kind === "hint") { $("#palette-input").value = it.name; palSel = 0; renderPalette(it.name); }
}
function openPalette() {
  lastFocus = document.activeElement;
  const bd = $("#palette-backdrop");
  bd.hidden = false;
  requestAnimationFrame(() => bd.classList.add("show"));
  document.body.style.overflow = "hidden";
  palSel = 0;
  renderPalette("");
  $("#palette-input").value = "";
  $("#palette-input").focus();
}
function closePalette() {
  const bd = $("#palette-backdrop");
  bd.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => { bd.hidden = true; }, 180);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
$("#palette-btn").addEventListener("click", openPalette);
$("#kbd-btn").addEventListener("click", openPalette);
$("#palette-backdrop").addEventListener("click", (e) => { if (e.target === e.currentTarget) closePalette(); });
$("#palette-input").addEventListener("input", (e) => { palSel = 0; renderPalette(e.target.value); });
$("#palette-input").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    palSel = Math.max(0, Math.min(palItems.length - 1, palSel + (e.key === "ArrowDown" ? 1 : -1)));
    renderPalette($("#palette-input").value);
    const el = document.querySelector(`[data-pal="${palSel}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") { e.preventDefault(); activatePal(palSel); }
});
document.addEventListener("keydown", (e) => {
  /* "/" jumps to the explore search, like GitHub */
  if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    if (!$("#drawer").hidden || !$("#palette-backdrop").hidden) return;
    e.preventDefault();
    $("#search").focus({ preventScroll: true });
    $("#hero-search").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if ($("#palette-backdrop").hidden) openPalette(); else closePalette();
  }
});

/* ---------------- theme ---------------- */
function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePref = pref;
  try { localStorage.setItem("atlas.theme", pref); } catch (e) {}
  const label = pref === "auto" ? "跟随系统" : pref === "dark" ? "深色" : "浅色";
  $("#theme-btn").setAttribute("aria-label", "切换主题（当前" + label + "）");
  const mc = document.querySelector('meta[name="theme-color"]');
  if (mc) mc.content = dark ? "#0b0e14" : "#f5f5f7";
  if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 60);
}
$("#theme-btn").addEventListener("click", () => {
  const order = ["auto", "light", "dark"];
  const cur = document.documentElement.dataset.themePref || "auto";
  applyTheme(order[(order.indexOf(cur) + 1) % order.length]);
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((document.documentElement.dataset.themePref || "auto") === "auto") applyTheme("auto");
});

/* ---------------- mobile nav + filter sheet ---------------- */
$("#menu-btn").addEventListener("click", () => {
  const nav = $("#topnav"), open = nav.classList.toggle("open");
  $("#menu-btn").setAttribute("aria-expanded", open);
});
document.querySelectorAll("#topnav a").forEach((a) => a.addEventListener("click", () => {
  $("#topnav").classList.remove("open");
  $("#menu-btn").setAttribute("aria-expanded", "false");
}));
function openSheet() {
  $("#toolbar").classList.add("sheet-open");
  const bd = $("#sheet-backdrop");
  bd.hidden = false;
  requestAnimationFrame(() => bd.classList.add("show"));
}
function closeSheet() {
  $("#toolbar").classList.remove("sheet-open");
  const bd = $("#sheet-backdrop");
  bd.classList.remove("show");
  setTimeout(() => { bd.hidden = true; }, 200);
}
$("#sheet-btn").addEventListener("click", openSheet);
$("#sheet-done").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", closeSheet);

/* ---------------- in-page navigation ----------------
   One controller for every #section link (top nav, brand, deep links, back /
   forward). While a jump is in flight auto-load is paused so the grid cannot
   push the target away, and the landing is re-checked once the scroll ends. */
let navUntil = 0, navTimer = null;
const navigating = () => performance.now() < navUntil;
function scrollMargin(el) { return parseFloat(getComputedStyle(el).scrollMarginTop) || 0; }
function stopNav() { navUntil = 0; clearTimeout(navTimer); }
["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, (e) => {
  if (ev === "keydown" && !["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) return;
  if (navigating()) stopNav();
}, { passive: true }));
function goToSection(hash, smooth) {
  let el = null;
  try { el = hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch (e) {}
  if (hash && hash.length > 1 && !el) return false;
  stopNav();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = smooth && !reduce ? "smooth" : "instant";
  const targetY = () => el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - scrollMargin(el)) : 0;
  navUntil = performance.now() + 4000;
  window.scrollTo({ top: targetY(), behavior });
  /* re-land until the target holds still (late images, ScrollTrigger refresh) */
  let tries = 0, stable = 0, lastY = -1;
  const check = () => {
    if (!navigating()) return;
    const off = el ? el.getBoundingClientRect().top - scrollMargin(el) : window.scrollY;
    const settledScroll = Math.abs(window.scrollY - lastY) < 2;
    lastY = window.scrollY;
    if (settledScroll) {
      if (Math.abs(off) > 6 && window.scrollY + innerHeight < document.documentElement.scrollHeight - 2) {
        window.scrollTo({ top: targetY(), behavior: "instant" }); stable = 0;
      } else stable++;
    }
    if (stable >= 3 || ++tries > 40) { navUntil = performance.now() + 400; return; }
    navTimer = setTimeout(check, 150);
  };
  navTimer = setTimeout(check, behavior === "smooth" ? 250 : 60);
  return true;
}
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute("href");
  if (hash !== "#" && !document.getElementById(hash.slice(1))) return;
  e.preventDefault();
  const url = location.pathname + location.search + (hash === "#" ? "" : hash);
  if (url !== location.pathname + location.search + location.hash) history.pushState(null, "", url);
  goToSection(hash === "#" ? "" : hash, true);
});
window.addEventListener("hashchange", () => goToSection(location.hash, true));
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

/* scroll-spy: highlight the section you are in; keep the #hash in sync so a
   reload or a shared link lands in the same 专区 */
const spyIds = ["explore", "ai-nav", "community", "reading", "method"];
const spyLinks = new Map(spyIds.map((id) => [id, document.querySelector(`#topnav a[href="#${id}"]`)]));
const spyOn = new Set();
let spyHash = false; /* off until the initial deep-link landing is done */
function setActive(id) {
  spyLinks.forEach((a, k) => {
    if (!a) return;
    a.classList.toggle("active", k === id);
    if (k === id) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
  });
  if (!spyHash || navigating()) return;
  const want = id ? "#" + id : "";
  if (location.hash !== want) history.replaceState(null, "", location.pathname + location.search + want);
}
if ("IntersectionObserver" in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) spyOn.add(en.target.id); else spyOn.delete(en.target.id); });
    setActive(spyIds.find((id) => spyOn.has(id)) || "");
  }, { rootMargin: "-40% 0px -55% 0px" });
  spyIds.forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
}

/* small helpers: clipboard + toast */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => false);
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove();
    return Promise.resolve(ok);
  } catch (e) { return Promise.resolve(false); }
}
let toastTimer = null;
function toast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------------- controls ---------------- */
function applyStateToControls() {
  $("#search").value = state.q;
  $("#sort").value = state.sort;
  $("#over10k-only").checked = state.over10k;
  $("#featured-only").checked = state.featured;
  $("#fav-only").checked = state.fav;
  $("#strict-only").checked = state.strict;
  $("#field-filter").value = state.field;
  $("#view-grid").setAttribute("aria-pressed", state.view === "grid");
  $("#view-list").setAttribute("aria-pressed", state.view === "list");
}
let debounce = null;
$("#search").addEventListener("input", (e) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; render(true); }, 120);
});
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shuffle = false; state.shown = PAGE; render(true); });
$("#field-filter").addEventListener("change", (e) => { state.field = e.target.value; state.shown = PAGE; render(true); });
$("#featured-only").addEventListener("change", (e) => { state.featured = e.target.checked; state.shown = PAGE; render(true); });
$("#over10k-only").addEventListener("change", (e) => { state.over10k = e.target.checked; state.shown = PAGE; render(true); });
$("#fav-only").addEventListener("change", (e) => { state.fav = e.target.checked; state.shown = PAGE; render(true); });
$("#strict-only").addEventListener("change", (e) => { state.strict = e.target.checked; state.shown = PAGE; render(true); });
$("#fav-btn").addEventListener("click", () => {
  state.fav = !state.fav;
  $("#fav-only").checked = state.fav;
  state.shown = PAGE; render(true);
  $("#explore").scrollIntoView({ behavior: "smooth" });
});
$("#view-grid").addEventListener("click", () => setView("grid"));
$("#view-list").addEventListener("click", () => setView("list"));
function setView(v) {
  state.view = v;
  try { localStorage.setItem("atlas.view", v); } catch (e) {}
  applyStateToControls(); render();
}
$("#more-btn").addEventListener("click", () => { state.shown += PAGE; autoBudget = AUTO_PAGES; render(); });
/* auto-load only when the sentinel approaches from below (never when it sits
   above the viewport, i.e. while you read AI 导航 / 社区), never during an
   in-page jump, and only a few pages at a time — after that the button asks. */
const sentinel = $("#load-sentinel");
if (sentinel && "IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    if (!entries.some((en) => en.isIntersecting)) return;
    if (navigating() || autoBudget <= 0) return;
    if (lastList && lastList.length > state.shown) { autoBudget--; state.shown += PAGE; render(); }
  }, { rootMargin: "0px 0px 600px 0px" }).observe(sentinel);
}
$("#reset-btn").addEventListener("click", () => {
  clearTimeout(debounce);
  Object.assign(state, { q: "", cat: "all", field: "all", over10k: false, featured: false, fav: false, strict: false, sort: "stars", shown: PAGE, shuffle: false });
  applyStateToControls(); renderPills(); render(true);
});
$("#shuffle-btn").addEventListener("click", () => {
  projects.forEach((p) => { p._rand = Math.random(); });
  state.shuffle = true; state.shown = PAGE; render(true);
  $("#explore").scrollIntoView({ behavior: "smooth" });
});
/* grid interactions: card click -> drawer; fav button & GitHub link stop there */
grid().addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { e.stopPropagation(); toggleBookmark(fav.dataset.fav); return; }
  if (e.target.closest("[data-gh]")) return;
  const card = e.target.closest(".card");
  if (card) {
    const p = projects.find((x) => x.fn === card.dataset.fn);
    if (p) openDrawer(p);
  }
});
grid().addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
    e.preventDefault();
    const p = projects.find((x) => x.fn === e.target.dataset.fn);
    if (p) openDrawer(p);
  }
});
const toTop = $("#to-top");
window.addEventListener("scroll", () => { toTop.classList.toggle("show", window.scrollY > 700); }, { passive: true });
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
const mqNarrow = window.matchMedia("(max-width: 767.5px)");
function applyPlaceholder() {
  $("#search").placeholder = mqNarrow.matches
    ? "搜项目、作者、技能…"
    : "搜项目、作者、技能……比如 playwright、营销、渗透测试";
}
if (mqNarrow.addEventListener) mqNarrow.addEventListener("change", applyPlaceholder);
applyPlaceholder();

/* ---------------- data loading (1 request, with retry) ---------------- */
async function fetchIndex(attempt) {
  const r = await fetch("data/index.json", { cache: "default" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
async function init() {
  grid().innerHTML = Array.from({ length: 6 }, () => '<div class="skel" aria-hidden="true"></div>').join("");
  let data = null, lastErr = null;
  for (let i = 0; i < 3 && !data; i++) {
    try { data = await fetchIndex(i); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 600 * (i + 1))); }
  }
  if (!data) {
    grid().innerHTML = "";
    $("#result-line").innerHTML = '目录加载失败（网络问题）。<button type="button" class="ghost-btn" onclick="location.reload()">重试</button>';
    return;
  }
  generatedAt = data.generated_at || "";
  projects = data.items;
  const t0 = performance.now();
  projects.forEach(buildSearchText);
  window.__atlasIndexMs = Math.round(performance.now() - t0);
  readUrl();
  $("#stat-total").textContent = projects.length.toLocaleString();
  $("#stat-over10k").textContent = projects.filter((p) => p.ov).length.toLocaleString();
  $("#stat-authors").textContent = new Set(projects.map((p) => p.o.toLowerCase())).size.toLocaleString();
  $("#stat-cats").textContent = new Set(projects.map((p) => p.f)).size;
  $("#foot-total").textContent = projects.length.toLocaleString();
  $("#data-updated").textContent = generatedAt || "—";
  renderPills();
  renderFieldOptions();
  applyStateToControls();
  renderCollections();
  updateFavUI();
  applyTheme(document.documentElement.dataset.themePref || "auto");
  render(true);
  const deep = state.p && projects.find((x) => x.fn === state.p);
  if (state.p && !deep) { state.p = ""; syncUrl(); }
  /* the browser's own #hash jump happened before the grid existed, so it
     landed short — land again once layout (and the pinned showcase) settle */
  const land = () => {
    if (location.hash) goToSection(location.hash, false);
    if (deep) openDrawer(deep);
    setTimeout(() => { spyHash = true; }, 1200);
  };
  if (window.ScrollTrigger) setTimeout(() => { window.ScrollTrigger.refresh(); land(); }, 300);
  else requestAnimationFrame(land);
}
init();
