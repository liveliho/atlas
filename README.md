<p align="center">
  <img src="assets/logo.svg" alt="Atlas Logo — 镂空罗盘星" width="104" height="104">
</p>

<h1 align="center">Atlas — GitHub 上值得收藏的项目</h1>

<p align="center">6,231 个精选仓库（其中 5,320 个 Star 过万），外加 AI 导航、AI 社区与 AI 阅读专区。<br>
🌐 <a href="https://liveliho.github.io/atlas/">liveliho.github.io/atlas</a></p>

![收录项目](https://img.shields.io/badge/收录项目-6231-0071e3) ![万星项目](https://img.shields.io/badge/万星+-5320-0071e3) ![大类](https://img.shields.io/badge/大类-18-34c759) ![专业领域](https://img.shields.io/badge/专业领域-16-34c759)

## 专区

| 专区 | 地址 | 内容 |
|---|---|---|
| 首页 | `#home` | 搜索、统计、精选合集、Star 排行前十、专区入口 |
| 探索 | `#explore` | 6,231 个项目：容错搜索、18 大类、16 专业领域、万星 / 官方 / 收藏筛选、排序、网格或列表视图 |
| AI 导航 | `#ai` | 32 款国内外主流 AI 产品（ChatGPT、Claude、Gemini、DeepSeek、豆包、Kimi、可灵……），按对话、创意、编程、搜索分组 |
| 社区 | `#community` | 18 个 AI 社区：Hugging Face 论坛、r/LocalLLaMA、Hacker News、Linux DO、魔搭、WaytoAGI…… |
| 阅读 | `#reading` | 14 篇博客好文、12 篇经典论文（arXiv 直达）、14 个知识点 |
| 关于 | `#about` | 收录标准与数据说明 |

每个项目都有作者、简介、Star / Fork、主要语言、专业领域与工作技能标签；官方组织的出品带「官方」徽章。

## 使用技巧
- **手机**：底部标签栏切换专区，再点一次当前标签回到顶部；筛选和项目详情从底部弹出，下滑或按返回键即可关闭；可以「添加到主屏幕」，像 App 一样使用。
- **电脑**：⌘K / Ctrl+K 打开全站搜索（项目、AI 产品、社区、博客、论文一起搜），`/` 聚焦搜索框，Esc 关闭弹层。
- **搜索**：默认容错，拼错一个字母也能搜到，可切换「精确匹配」。搜索和筛选条件会写进网址，可以直接分享或收藏。
- **收藏**：点 ♥ 收藏的项目保存在本地浏览器，可一键导出为 Markdown 清单。
- **分享项目**：在项目详情点「复制链接」（形如 `?p=owner/repo`），对方打开就是这个项目。

## 收录标准
1. **万星专区**：Stars > 10,000、非 Fork、未归档、有清晰简介，按 Star 区间切片完整抓取。
2. **有用才收录**：其余精选项目的 Star 原则上 ≥ 600；垂类专业 Skill 受众小，放宽到 20 起。
3. **去伪存真**：剔除 Fork 镜像与已归档项目。
4. **按实分类**：按名称与简介的真实内容分类，不看容易被刷的 Topic 标签；有显式纠错表和回归测试把关。

## 本地运行

```bash
python3 -m http.server 8000      # 或 npm start
# 打开 http://localhost:8000
```

纯静态站点，没有构建步骤，GitHub Pages 直接托管 `main` 分支的根目录。

## 更新数据

`data/projects.json` 是唯一的数据源，`data/index.json` 是站点实际加载的紧凑索引，由前者生成。

```bash
export GITHUB_TOKEN=ghp_xxx              # 搜索 API 配额：有 token 每分钟 30 次，没有只有 10 次
python3 scripts/collect.py               # 按主题批量搜索（会覆盖 projects.json）
python3 scripts/collect2.py              # 补充官方种子项目，按名称 / 简介重新分类
python3 scripts/collect3.py              # 按职业领域定向补充各类 Skill
python3 scripts/classify_fields.py       # 标注专业领域与工作技能
ATLAS_OVER10K_JSON=path/to/projects_all.json python3 scripts/merge_over10k.py   # 合并万星项目
python3 scripts/test_classification.py   # 分类回归测试
python3 scripts/build_index.py           # 生成 data/index.json（npm run build）
```

## 测试

```bash
npm install          # 只需一次，安装 Playwright
npm test             # 浏览器冒烟测试（手机 + 电脑）+ 分类回归测试
```

冒烟测试共 35 项检查，包括：
- 每个专区切换后视口内立即有内容（防止白屏回归）；
- 深链接（`#ai-nav` 等旧链接、`?q=`、`?p=`）能正确打开；
- 后退时恢复滚动位置，返回手势能关闭详情；
- 360–1440 宽度 × 6 个视图都没有横向溢出；
- 在 4 倍 CPU 降速下，切换视图和搜索的响应时间达标。

## 技术

- **视图路由**：每个专区是一个独立视图（hash 路由），切换时直接替换内容并恢复该视图自己的滚动位置。浏览器的前进、后退在专区之间切换。v3 把所有内容堆在一个长页面里，6,231 条的无限列表夹在中间，导致跳转落点错乱、白屏；v4 从结构上去掉了这个问题。
- **数据**：一个紧凑索引，采用列式加字典编码，1.2 MB，gzip 后约 520 KB（v3 是 2.3 MB / 650 KB）。它和 HTML 并行预加载，搜索文本在浏览器空闲时分片建立。
- **搜索**：先做精确子串匹配，结果太少时才启用容错（子序列 + 单字母拼写纠错 + 名称加权）。⌘K 面板和探索页共用同一套搜索。
- **流畅度**：
  - 零第三方运行时依赖（去掉了 GSAP），只用系统字体；
  - 毛玻璃只用在顶栏、底栏和弹层，卡片是纯色；
  - 长列表用 `content-visibility`，动画只用 `transform` 和 `opacity`；
  - 空闲时预渲染并预排版其他视图，切换时只需显示出来。
- **图标**：AI 品牌与社区图标都是仓库内的 SVG（`assets/icons/`，来源见该目录的 LICENSE），国内网络也能正常显示。
- **规格文档**：[`docs/SPEC.md`](docs/SPEC.md) 记录了 v4 的设计目标、交互规范与性能预算。

## 目录结构

```
index.html              页面骨架（6 个视图、顶栏、手机标签栏、详情、搜索面板）
assets/app.js           路由、数据、搜索、探索、详情、收藏、主题
assets/content.js       AI 导航 / 社区 / 阅读的内容数据
assets/style.css        样式（浅色 / 深色）
assets/icons/           品牌 SVG 图标
data/projects.json      源数据
data/index.json         站点加载的紧凑索引（由 build_index.py 生成）
scripts/                数据管线、分类器与测试
docs/SPEC.md            产品与工程规格
```

## 许可

站点代码以 MIT 许可开源（见 [LICENSE](LICENSE)）。收录项目的版权与许可归各自作者所有，本站仅做索引与链接；品牌图标的商标归各自所有者。
