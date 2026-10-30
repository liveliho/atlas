const CAT_DOTS = {
  "MCP": "#0a84ff", "Skills": "#ff6b4a", "AI智能体与大模型": "#7d7aff",
  "AI工具与机器学习": "#bf5af2", "开发工具": "#64d2ff", "前端与Web开发": "#30d158",
  "后端与数据库": "#ffd60a", "运维云原生与自托管": "#ff9f0a", "网络安全": "#ff453a",
  "数据与分析": "#32ade6", "效率与办公": "#66d4cf", "学习资源与Awesome": "#ac8e68",
  "设计与UI": "#ff6482", "视频多媒体与内容": "#ff375f", "金融商业与电商": "#63e6be",
  "移动与桌面应用": "#70d7ff", "游戏与娱乐": "#da8fff", "其他实用项目": "#aeaeb2",
};
const FIELD_COLORS = {
  "软件开发": "#64d2ff", "产品与设计": "#ff6482", "数据与分析": "#32ade6",
  "人工智能与机器学习": "#7d7aff", "运维与DevOps": "#ff9f0a", "网络安全": "#ff453a",
  "市场营销": "#ff6b4a", "内容与写作": "#ffd60a", "视频与多媒体": "#ff375f",
  "金融与交易": "#63e6be", "法律与合规": "#bf5af2", "办公与效率": "#66d4cf",
  "教育与研究": "#0a84ff", "电商与销售": "#ff9f0a", "医疗健康": "#30d158", "其他专业": "#aeaeb2",
};
let CATEGORIES = [{ id: "all", label: "全部" }];
function buildCategories() {
  const counts = {};
  projects.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  CATEGORIES = [{ id: "all", label: "全部" }].concat(cats.map((c) => ({ id: c, label: c })));
}
const PAGE = 48;
let projects = [];
let state = { cat: "all", field: "all", q: "", sort: "stars", featured: false, over10k: false, fuzzy: false, shown: PAGE };

const $ = (s) => document.querySelector(s);
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catColor = (id) => CAT_DOTS[id] || "#aeaeb2";
const catLabel = (id) => id;
const fieldColor = (f) => FIELD_COLORS[f] || "#9aa6b8";

/* ---------------- fuzzy matching ---------------- */
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
// score a single query token against a text: 0 = no match
function tokenScore(token, text, words) {
  if (!token) return 1;
  const idx = text.indexOf(token);
  if (idx >= 0) return 100 - Math.min(idx, 40); // substring, earlier is better
  // subsequence (e.g. "plywrght" -> playwright, "skl" -> skills)
  let ti = 0, first = -1, last = -1;
  for (let i = 0; i < text.length && ti < token.length; i++) {
    if (text[i] === token[ti]) { if (first < 0) first = i; last = i; ti++; }
  }
  if (ti === token.length && token.length >= 3) {
    const span = last - first + 1;
    return Math.max(30, 62 - (span - token.length) * 2);
  }
  // one typo allowed for tokens of length >= 4 (e.g. "playwrigth")
  if (token.length >= 4) {
    for (const w of words) {
      if (Math.abs(w.length - token.length) <= 1 && levenshtein(token, w) <= 1) return 45;
    }
  }
  return 0;
}
function fuzzyMatch(p, tokens) {
  const text = (p.full_name + " " + p.description + " " + p.owner + " " + (p.topics || []).join(" ") +
    " " + (p.language || "") + " " + (p.field || "") + " " + (p.work_skills || []).join(" ")).toLowerCase();
  const words = text.split(/[^a-z0-9\u4e00-\u9fff]+/).filter(Boolean);
  let total = 0;
  for (const t of tokens) {
    const s = tokenScore(t, text, words);
    if (s <= 0) return 0;
    total += s;
  }
  // name hits weigh more
  const nameText = p.full_name.toLowerCase();
  for (const t of tokens) if (nameText.includes(t)) total += 60;
  return total;
}
function highlight(text, tokens) {
  let out = esc(text);
  if (!tokens || !tokens.length) return out;
  for (const t of tokens) {
    if (t.length < 2) continue;
    const safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { out = out.replace(new RegExp("(" + safe + ")", "gi"), "<mark>$1</mark>"); } catch (e) { /* ignore */ }
  }
  return out;
}

/* ---------------- filtering / sorting ---------------- */
function filtered() {
  const tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  let list = projects.filter((p) => {
    if (state.cat !== "all" && p.category !== state.cat) return false;
    if (state.field !== "all" && p.field !== state.field) return false;
    if (state.featured && !p.featured) return false;
    if (state.over10k && !p.over10k) return false;
    if (tokens.length) {
      if (state.fuzzy) {
        p._score = fuzzyMatch(p, tokens);
        if (p._score <= 0) return false;
      } else {
        const hay = (p.full_name + " " + p.description + " " + p.owner + " " + (p.topics || []).join(" ") +
          " " + (p.language || "") + " " + (p.field || "") + " " + (p.work_skills || []).join(" ")).toLowerCase();
        if (!tokens.every((w) => hay.includes(w))) return false;
        p._score = 0;
      }
    }
    return true;
  });
  const by = {
    stars: (a, b) => b.stars - a.stars,
    forks: (a, b) => b.forks - a.forks,
    updated: (a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""),
    name: (a, b) => a.name.localeCompare(b.name),
    relevance: (a, b) => (b._score - a._score) || (b.stars - a.stars),
  };
  if (state.shuffle) return list.sort((a, b) => (a._rand || 0) - (b._rand || 0));
  const sortKey = state.fuzzy && tokens.length ? "relevance" : state.sort;
  return list.sort(by[sortKey] || by.stars);
}

/* ---------------- rendering ---------------- */
function renderPills() {
  $("#pills").innerHTML = CATEGORIES.map((c) => {
    const n = c.id === "all" ? projects.length : projects.filter((p) => p.category === c.id).length;
    return `<button type="button" aria-pressed="${state.cat === c.id}" class="pill ${state.cat === c.id ? "active" : ""}" data-cat="${esc(c.id)}">${esc(c.label)}<small>${n}</small></button>`;
  }).join("");
  document.querySelectorAll(".pill").forEach((b) =>
    b.addEventListener("click", () => { state.cat = b.dataset.cat; state.shown = PAGE; renderPills(); render(); })
  );
}
function renderFieldOptions() {
  const counts = {};
  projects.forEach((p) => { counts[p.field] = (counts[p.field] || 0) + 1; });
  const fields = Object.keys(FIELD_COLORS).filter((f) => counts[f]);
  fields.sort((a, b) => counts[b] - counts[a]);
  $("#field-filter").innerHTML = `<option value="all">全部专业领域</option>` +
    fields.map((f) => `<option value="${esc(f)}" ${state.field === f ? "selected" : ""}>${esc(f)} · ${counts[f]}</option>`).join("");
}
function card(p, i) {
  const tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const tags = (p.topics || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const works = (p.work_skills || []).map((w) => `<span class="work-tag">${esc(w)}</span>`).join("");
  return `<a class="card" style="--cat-color:${catColor(p.category)};--field-color:${fieldColor(p.field)};--d:${(i % 24) * 28}ms" href="${esc(p.url)}" target="_blank" rel="noopener">
    <div class="card-top">
      <img class="avatar" src="${esc(p.avatar_url)}" alt="${esc(p.owner)} 的头像" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">
      <div class="card-id">
        <div class="repo-name"><span class="owner-name">${esc(p.owner)} /</span> ${highlight(p.name, tokens)}</div>
        <div class="author-line">作者 · ${esc(p.owner)}</div>
      </div>
      <span class="badges">${p.over10k ? '<span class="badge badge-10k">万星+</span>' : ""}${p.featured ? '<span class="badge badge-off">官方</span>' : ""}</span>
    </div>
    <p class="desc">${highlight(p.description, tokens)}</p>
    <div class="pro-line">
      <span class="field-chip">${esc(p.field || "其他专业")}</span>${works}
    </div>
    ${tags ? `<div class="tags">${tags}</div>` : ""}
    <div class="card-foot">
      <span class="star">★ ${fmt(p.stars)}</span>
      <span>⑂ ${fmt(p.forks)}</span>
      ${p.language ? `<span><span class="lang-dot"></span>${esc(p.language)}</span>` : ""}
      <span class="cat-chip">${catLabel(p.category)}</span>
    </div>
  </a>`;
}
function render() {
  const list = filtered();
  const slice = list.slice(0, state.shown);
  $("#grid").innerHTML = slice.map(card).join("");
  $("#empty").hidden = list.length > 0;
  $("#more-btn").style.display = list.length > state.shown ? "" : "none";
  const mode = state.q ? (state.fuzzy ? " · 模糊搜索（按相关度排序）" : " · 精确搜索") : "";
  $("#result-line").textContent = `共找到 ${list.length} 个项目 · 已展示 ${slice.length} 个${mode}`;
}

/* ---------------- init / events ---------------- */
let debounce = null;
function onSearch(v) {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.q = v.trim(); state.shown = PAGE; render(); }, 120);
}
async function init() {
  try {
    const man = await (await fetch("data/manifest.json")).json();
    const chunks = await Promise.all(man.files.map((f) => fetch("data/" + f).then((r) => r.json())));
    projects = chunks.flat();
  } catch (e) {
    $("#result-line").textContent = "数据加载失败，请刷新重试。";
    return;
  }
  buildCategories();
  $("#stat-total").textContent = projects.length.toLocaleString();
  const o10 = $("#stat-over10k");
  if (o10) o10.textContent = projects.filter((p) => p.over10k).length.toLocaleString();
  $("#stat-authors").textContent = new Set(projects.map((p) => p.owner.toLowerCase())).size.toLocaleString();
  $("#stat-cats").textContent = new Set(projects.map((p) => p.field)).size;
  renderPills();
  renderFieldOptions();
  render();
}
$("#search").addEventListener("input", (e) => onSearch(e.target.value));
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shuffle = false; state.shown = PAGE; render(); });
$("#field-filter").addEventListener("change", (e) => { state.field = e.target.value; state.shown = PAGE; render(); });
$("#featured-only").addEventListener("change", (e) => { state.featured = e.target.checked; state.shown = PAGE; render(); });
$("#over10k-only").addEventListener("change", (e) => { state.over10k = e.target.checked; state.shown = PAGE; render(); });
$("#fuzzy-only").addEventListener("change", (e) => { state.fuzzy = e.target.checked; state.shown = PAGE; render(); });
$("#more-btn").addEventListener("click", () => { state.shown += PAGE; render(); });
$("#reset-btn").addEventListener("click", () => {
  clearTimeout(debounce);
  state = { cat: "all", field: "all", q: "", sort: "stars", featured: false, over10k: false, fuzzy: false, shown: PAGE };
  $("#search").value = ""; $("#sort").value = "stars"; $("#featured-only").checked = false;
  $("#fuzzy-only").checked = false; $("#over10k-only").checked = false; $("#field-filter").value = "all";
  renderPills(); render();
});
$("#shuffle-btn").addEventListener("click", () => {
  projects.forEach((p) => { p._rand = Math.random(); });
  state.shuffle = true;
  state.shown = PAGE;
  render();
  document.querySelector("#explore").scrollIntoView({ behavior: "smooth" });
});
const toTop = $("#to-top");
window.addEventListener("scroll", () => { toTop.classList.toggle("show", window.scrollY > 700); }, { passive: true });
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#search").focus(); }
});
init();
