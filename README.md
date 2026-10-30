# ✦ Skill Atlas — 技能星图

**集结 GitHub 上真正有用的项目：Agent Skills、MCP 服务器与插件、AI Agent 框架、开发工具与学习资源。**

🌐 在线访问：https://liveliho.github.io/skill-mcp-hub/

![收录项目](https://img.shields.io/badge/收录项目-741-ff6b4a) ![分类](https://img.shields.io/badge/分类-5大类-2dd4bf) ![数据](https://img.shields.io/badge/数据来源-GitHub_Search_API-f5c451)

## 这是什么

GitHub 上有几亿个仓库，好东西总是被淹没。这个站点把其中**真正有用**的部分捞出来，做成一个可搜索、可筛选的星图：

- **MCP 服务器与插件** — Model Context Protocol 官方实现、各数据库 / 浏览器 / 设计工具的 MCP Server
- **Agent Skills 技能** — Anthropic 官方 Skills、Claude Code / Codex / Cursor 等智能体的技能包与插件
- **AI Agent 与大模型** — Agent 框架、RAG、LLM 工具链与推理服务
- **开发与效率工具** — 高星开发工具、自动化、自托管与效率项目
- **学习与精选清单** — Awesome 清单、路线图、面试与系统设计经典仓库

每个项目都附带：**作者头像、作者名、项目简介、Star / Fork 数、主要语言、标签，以及 GitHub 直达链接**。官方组织（modelcontextprotocol、anthropics、github、microsoft、openai 等）的出品带有「官方」徽章。

## 收录标准

1. **有用才收录**：以 GitHub 实时数据为准入线，原则上 Star ≥ 600（官方 SDK 等重要项目酌情放宽），且必须有清晰的项目简介。
2. **去伪存真**：剔除 Fork 镜像与已归档项目。
3. **按实分类**：分类依据项目名称与简介的真实内容，而不是容易被刷的 Topic 标签——避免「蹭标签」项目混入 MCP / Skills 分区。
4. **数据可复现**：抓取脚本在 [`scripts/`](scripts/) 目录，全量数据拆分存放在 [`data/chunks/`](data/chunks/)（清单见 `data/manifest.json`），来自 GitHub Search API 的实时查询。

> GitHub 浩如烟海，「全部」永远在路上：首版收录 **741** 个项目，后续会持续扩充。发现遗漏的好项目，欢迎提 [Issue](https://github.com/liveliho/skill-mcp-hub/issues) 推荐收录。

## 本地运行

```bash
# 任意静态服务器即可，例如：
python3 -m http.server 8000
# 打开 http://localhost:8000
```

重新抓取数据（需要可用的 GitHub 搜索通道）：

```bash
python3 scripts/collect.py      # 第一轮：按主题大规模搜索
python3 scripts/collect2.py     # 第二轮：补官方种子项目并按名称/简介重新分类
python3 scripts/split_data.py   # 把全量数据拆成分片 + 清单，供网站加载
```

## 技术

纯静态站点：原生 HTML / CSS / JS，无构建、无框架。深色玻璃拟态设计，支持关键词搜索（`⌘K` 聚焦）、分类筛选、官方筛选与多种排序。

## 许可

站点代码以 MIT 许可开放；收录项目的版权与许可归各自作者所有，本站仅做索引与链接。
