<p align="center">
  <img src="assets/logo.svg" alt="Atlas Logo — 镂空罗盘星" width="112" height="112">
</p>

<h1 align="center">Atlas — GitHub 上值得收藏的项目</h1>

**集结 GitHub 上真正有用的项目：5,320 个万星级仓库，加上精选的 Agent Skills、MCP 服务器、AI 工具与开发神器。**

🌐 在线访问：https://liveliho.github.io/atlas/

![收录项目](https://img.shields.io/badge/收录项目-6231-0071e3) ![万星项目](https://img.shields.io/badge/万星+项目-5320-0071e3) ![大类](https://img.shields.io/badge/大类-18类-34c759) ![专业领域](https://img.shields.io/badge/专业领域-16类-34c759)

## 这是什么

GitHub 上有几亿个仓库，好东西总是被淹没。Atlas 把其中**真正有用**的部分捞出来，做成一个可搜索、可筛选的图鉴，共 **6,231** 个项目，覆盖 18 个大类：

- **万星+ 仓库（5,320 个）** — 全站 Star 过万的非 Fork、未归档仓库共 5,399 个，这里收录了其中有完整简介的 5,320 个，逐个带「万星+」徽章，可一键只看它们
- **MCP 服务器与插件** — Model Context Protocol 官方实现、各数据库 / 浏览器 / 设计工具的 MCP Server
- **Agent Skills 技能** — Anthropic 官方 Skills、Claude Code / Codex / Cursor 等智能体的技能包与插件
- **AI 智能体与机器学习** — Agent 框架、RAG、LLM 工具链、推理服务与 ML 框架
- **开发 / 前端 / 后端 / 运维** — 高星开发工具、框架、数据库、DevOps 与自托管项目
- **以及** 安全、数据分析、设计 UI、多媒体、金融电商、移动桌面、游戏、学习资源与 Awesome 清单等

每个项目都附带：**作者头像、作者名、项目简介、Star / Fork 数、主要语言、标签与 GitHub 直达链接**，并逐个标注**专业领域**（软件开发、市场营销、网络安全、金融与交易、法律与合规、医疗健康等 16 类）与**具体工作技能**（如 SEO 优化、渗透测试、合同审查）。官方组织（modelcontextprotocol、anthropics、github、microsoft、openai 等）的出品带有「官方」徽章。

## 站内专区

- **AI 导航专区（#ai-nav）** — 32 个国内外主流 AI 产品：ChatGPT、Claude、Gemini、DeepSeek、豆包、Kimi 等对话助手，Midjourney、可灵、即梦等创意生成工具，Cursor、GitHub Copilot 与 Perplexity、NotebookLM 等。品牌图标（Simple Icons 开源 SVG + 官网 favicon 两级兜底）+ 公司 + 一句话介绍，整卡直达官网。
- **AI 论坛社区（#community）** — 18 个社区：Hugging Face 论坛、OpenAI 社区、r/LocalLLaMA、Hacker News、LangChain 论坛、EleutherAI Discord，以及 Linux DO、魔搭社区、WaytoAGI、Datawhale、知乎 AI 话题、机器之心等国内社区。
- **AI 阅读（#reading）** — 热门博客与好文章（OpenAI / Anthropic / DeepMind 官方博客、Lil'Log、The Illustrated Transformer、Karpathy、机器之心、量子位等）、12 篇地标论文（Attention、BERT、GPT-3、RAG、LoRA、LLaMA 等，全部 arXiv 直达）、14 张知识点卡片（Token、RAG、微调、Agent、MCP、幻觉……站内直接读）。

专区数据与渲染在 [`assets/extras.js`](assets/extras.js)，与项目库的搜索筛选互不影响。

## 收录标准

1. **万星专区**：Stars > 10,000、非 Fork、未归档、简介清晰——按 Star 区间切片穷尽抓取，一片不漏。
2. **有用才收录**：其余精选项目综合 Star 原则上 ≥ 600；垂类专业 Skill 受众小、星标天然低，放宽到 20 起，同样要求简介清晰。
3. **去伪存真**：剔除 Fork 镜像与已归档项目。
4. **按实分类**：分类依据项目名称与简介的真实内容，而不是容易被刷的 Topic 标签。
5. **数据可复现**：抓取与合并脚本在 [`scripts/`](scripts/) 目录，数据来自 GitHub Search API。分类带显式纠错表（如 ollama、excalidraw 等知名仓库）与回归测试把关：`python3 scripts/test_classification.py`。

## 本地运行

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

更新数据（需要可用的 GitHub 搜索通道）：

```bash
python3 scripts/collect.py            # 按主题大规模搜索
python3 scripts/collect2.py           # 补官方种子项目并按名称/简介重新分类
python3 scripts/collect3.py           # 按职业领域定向扩收各类 Skill
python3 scripts/classify_fields.py    # 标注专业领域与具体工作技能
python3 scripts/merge_over10k.py      # 并入万星项目（18 大类体系，数据在 ../github-top-projects-10000）
python3 scripts/test_classification.py  # 分类回归测试
python3 scripts/build_index.py        # 生成站点加载的紧凑索引 data/index.json（单请求）
python3 scripts/split_data.py         # （保留）全量数据拆分片，作详情归档
```

## 技术

纯静态站点：原生 HTML / CSS / JS，无构建、无框架。

- **数据加载**：站点只拉一个紧凑索引 `data/index.json`（约 2.3 MB / 1 个请求，含 `generated_at` 时间戳，页脚有「数据更新于」；旧版是 57 个分片、约 4.0 MB)。加载失败自动重试 3 次并给出明确状态。
- **搜索**：一个搜索核心两处共用——探索区搜索与 `⌘K` / `Ctrl+K` 命令面板（项目 + AI 导航 + 社区 + 博客 + 论文分组呈现，↑↓ 选择、Enter 打开、Esc 关闭）。默认容错搜索（子序列 + 单字符拼写容错 + 名称加权），另有「精确模式」。搜索状态同步到 URL，可分享、可刷新还原。
- **发现体验**：精选合集（数据规则生成）、网格 / 列表双视图、项目详情抽屉（全元数据 + 相关项目）、本地收藏（localStorage，顶栏有计数）、筛选条件以可清除 chips 呈现。
- **设计**：多级液态玻璃（卡片轻玻璃、浮层强玻璃）+ 令牌化设计变量；浅色（冰川蓝 / 暖白）与专门调色的深色主题，顶栏可切换（跟随系统 / 浅 / 深，持久化且无闪烁）。
- **移动端**：导航收进菜单面板、筛选进底部弹层、触控目标 ≥ 44px、安全区适配，360–1440 五档验证无横向溢出。
- **渲染**：卡片增量 append（加载更多不重建已有 DOM），滚动到底自动加载。

## 滚动体验

Apple 产品页式的电影级滚动（`assets/motion.js`，GSAP + ScrollTrigger，CDN 加载、纯渐进增强）：

- **首屏多层视差**：三团背景光晕以不同速率随滚动漂移，标题 / 统计 / 搜索框随滚动连续缩小、淡出退场。
- **万星精选钉住舞台**：滚动到「万星精选」区块时画面钉住，中央大卡随滚动进度依次轮换全站 Star 前五的仓库（build-your-own-x、awesome、public-apis、freeCodeCamp、rea），文案与进度条同步推进，滚完释放；圆点可点击定位。
- **章节叙事**：各板块标题与导语整块升起揭示（v3 重构时移除了逐字拆分与章节色相过渡两项纯装饰动效，保留视差与钉住舞台）。
- **分档与降级**：桌面全量编排；手机端减幅视差、无钉住（精选改为静态纵列）；`prefers-reduced-motion` 时不创建任何滚动动画；无 JS / CDN 失败时内容完全可见可用。只动画 transform / opacity；锚点跳转带落点稳定器，自动加载撑高页面时自动校正落点。

## 许可

站点代码以 MIT 许可开放（见 [LICENSE](LICENSE)）；收录项目的版权与许可归各自作者所有，本站仅做索引与链接。

