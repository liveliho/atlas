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

## 收录标准

1. **万星专区**：Stars > 10,000、非 Fork、未归档、简介清晰——按 Star 区间切片穷尽抓取，一片不漏。
2. **有用才收录**：其余精选项目综合 Star 原则上 ≥ 600；垂类专业 Skill 受众小、星标天然低，放宽到 20 起，同样要求简介清晰。
3. **去伪存真**：剔除 Fork 镜像与已归档项目。
4. **按实分类**：分类依据项目名称与简介的真实内容，而不是容易被刷的 Topic 标签。
5. **数据可复现**：抓取与合并脚本在 [`scripts/`](scripts/) 目录，全量数据拆分存放在 [`data/chunks/`](data/chunks/)（清单见 `data/manifest.json`），来自 GitHub Search API。

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
python3 scripts/split_data.py         # 全量数据拆分片 + 清单，供网站加载
```

## 技术

纯静态站点：原生 HTML / CSS / JS，无构建、无框架。**液态玻璃设计**（半透明玻璃面 + 大圆角 + 柔和光晕，浅色为主、跟随系统深色模式），手机 / 平板 / 桌面三档响应式网格。支持关键词搜索（`⌘K` 聚焦）、**模糊搜索**（子序列匹配 + 拼写容错 + 相关度排序）、大类 / 专业领域筛选、万星+ 与官方筛选、随机发现与多种排序；数据分片加载、卡片分页渲染。

## 许可

站点代码以 MIT 许可开放；收录项目的版权与许可归各自作者所有，本站仅做索引与链接。
