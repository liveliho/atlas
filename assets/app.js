const CATEGORIES = [
  { id: "all", label: "全部", color: "#eef1f6" },
  { id: "MCP", label: "MCP 服务器与插件", color: "#2dd4bf" },
  { id: "Skills", label: "Agent Skills 技能", color: "#ff6b4a" },
  { id: "AI Agents", label: "AI Agent 与大模型", color: "#a78bfa" },
  { id: "Dev Tools", label: "开发与效率工具", color: "#f5c451" },
  { id: "Learning", label: "学习与精选清单", color: "#7dd3fc" },
];
const PAGE = 60;
let projects = [];
let state = { cat: "all", q: "", sort: "stars", featured: false, shown: PAGE };

const $ = (s) => document.querySelector(s);
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catColor = (id) => (CATEGORIES.find((c) => c.id === id) || {}).color || "#eef1f6";
const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || {}).label || id;

function renderPills() {
  $("#pills").innerHTML = CATEGORIES.map((c) => {
    const n = c.id === "all" ? projects.length : projects.filter((p) => p.category === c.id).length;
    return `<button type="button" role="tab" class="pill ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}">${c.label}<small>${n}</small></button>`;
  }).join("");
  document.querySelectorAll(".pill").forEach((b) =>
    b.addEventListener("click", () => { state.cat = b.dataset.cat; state.shown = PAGE; renderPills(); render(); })
  );
}

function filtered() {
  let list = projects.filter((p) => {
    if (state.cat !== "all" && p.category !== state.cat) return false;
    if (state.featured && !p.featured) return false;
    if (state.q) {
      const hay = (p.full_name + " " + p.description + " " + p.owner + " " + (p.topics || []).join(" ") + " " + (p.language || "")).toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const by = {
    stars: (a, b) => b.stars - a.stars,
    forks: (a, b) => b.forks - a.forks,
    updated: (a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return list.sort(by[state.sort] || by.stars);
}

function card(p) {
  const tags = (p.topics || []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  return `<a class="card" style="--cat-color:${catColor(p.category)}" href="${esc(p.url)}" target="_blank" rel="noopener">
    <div class="card-top">
      <img class="avatar" src="${esc(p.avatar_url)}" alt="${esc(p.owner)} 的头像" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="card-id">
        <div class="repo-name"><span class="owner-name">${esc(p.owner)} /</span> ${esc(p.name)}</div>
        <div class="author-line">作者 · ${esc(p.owner)}</div>
      </div>
      ${p.featured ? '<span class="badge">官方</span>' : ""}
    </div>
    <p class="desc">${esc(p.description)}</p>
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
  $("#result-line").textContent = `共找到 ${list.length} 个项目 · 已展示 ${slice.length} 个`;
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
  $("#stat-total").textContent = projects.length.toLocaleString();
  const totalStars = projects.reduce((s, p) => s + p.stars, 0);
  $("#stat-stars").textContent = totalStars >= 1e6 ? (totalStars / 1e6).toFixed(1) + "M" : fmt(totalStars);
  $("#stat-authors").textContent = new Set(projects.map((p) => p.owner.toLowerCase())).size.toLocaleString();
  $("#stat-cats").textContent = CATEGORIES.length - 1;
  renderPills();
  render();
}

$("#search").addEventListener("input", (e) => { state.q = e.target.value.trim(); state.shown = PAGE; render(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shown = PAGE; render(); });
$("#featured-only").addEventListener("change", (e) => { state.featured = e.target.checked; state.shown = PAGE; render(); });
$("#more-btn").addEventListener("click", () => { state.shown += PAGE; render(); });
$("#reset-btn").addEventListener("click", () => {
  state = { cat: "all", q: "", sort: "stars", featured: false, shown: PAGE };
  $("#search").value = ""; $("#sort").value = "stars"; $("#featured-only").checked = false;
  renderPills(); render();
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#search").focus(); }
});
init();
