#!/usr/bin/env python3
"""Assign each project a profession field (专业领域) and concrete work skills (工作技能).
Scoring: keyword hits in name x3, topics x2, description x1. Specific professions
outrank generic ones (软件开发 / 人工智能) on ties via priority order.
"""
import json, re
from collections import Counter
from projects_io import save_projects

# (field, priority, {keyword: work_skill_or_None})
RULES = [
    ("网络安全", 0, {
        "cybersecurity": "安全防护", "security": "安全审计", "pentest": "渗透测试", "penetration": "渗透测试",
        "vulnerab": "漏洞分析", "exploit": "漏洞分析", "malware": "恶意软件分析", "osint": "情报搜集",
        "hacking": "渗透测试", "threat": "威胁情报", "incident response": "应急响应", "soc ": "安全运营",
        "ctf": "安全竞赛", "phishing": "反钓鱼", "forensic": "数字取证",
    }),
    ("金融与交易", 1, {
        "trading": "量化交易", "quant": "量化交易", "stock": "股票分析", "crypto": "加密资产",
        "bitcoin": "加密资产", "finance": "财务分析", "financial": "财务分析", "accounting": "记账核算",
        "banking": "银行业务", "insurance": "保险业务", "tax": "税务处理", "invest": "投资分析",
        "portfolio": "资产配置", "forex": "外汇交易", "billing": "账单管理",
    }),
    ("法律与合规", 2, {
        "legal": "法律检索", "law": "法律咨询", "contract": "合同审查", "compliance": "合规检查",
        "gdpr": "数据合规", "privacy": "隐私合规", "litigation": "诉讼支持", "attorney": "法律咨询",
    }),
    ("医疗健康", 3, {
        "medical": "临床辅助", "clinical": "临床辅助", "health": "健康管理", "patient": "患者管理",
        "diagnos": "辅助诊断", "therapy": "治疗支持", "fitness": "健身管理", "doctor": "临床辅助",
        "healthcare": "健康管理",
    }),
    ("市场营销", 4, {
        "marketing": "营销策划", "seo": "SEO优化", "advertis": "广告投放", "ads": "广告投放",
        "copywriting": "营销文案", "cro": "转化率优化", "growth": "增长运营", "brand": "品牌策划",
        "social media": "社媒运营", "email marketing": "邮件营销", "influencer": "达人营销",
        "content marketing": "内容营销", "campaign": "活动策划",
    }),
    ("电商与销售", 5, {
        "ecommerce": "店铺运营", "e-commerce": "店铺运营", "shopify": "店铺运营", "sales": "销售转化",
        "crm": "客户管理", "retail": "零售运营", "store": "店铺运营", "marketplace": "平台运营",
    }),
    ("产品与设计", 6, {
        "design": "视觉设计", "ux": "UX设计", "ui": "UI设计", "figma": "界面设计",
        "product management": "产品规划", "product manager": "产品规划", "prototyp": "原型设计",
        "graphic": "平面设计", "illustrat": "插画设计", "typograph": "字体排版", "art direction": "美术指导",
        "user research": "用户研究", "wireframe": "原型设计",
        "whiteboard": "原型设计", "drawing": "插画设计", "diagram": "视觉设计", "sketching": "原型设计",
    }),
    ("视频与多媒体", 7, {
        "video": "视频制作", "montage": "视频剪辑", "audio": "音频处理", "music": "音乐制作",
        "photo": "摄影后期", "animation": "动画制作", "podcast": "播客制作", "streaming": "直播运营",
        "3d": "三维制作", "blender": "三维制作", "image generation": "图像生成", "text-to-speech": "语音合成",
        "speech": "语音处理", "subtitle": "字幕制作",
    }),
    ("内容与写作", 8, {
        "writing": "文章写作", "writer": "文章写作", "blog": "博客写作", "novel": "故事创作",
        "storytell": "故事创作", "translation": "翻译润色", "technical writing": "技术文档",
        "documentation": "文档编写", "journalis": "新闻写作", "publishing": "出版编辑",
        "editor": "编辑校对", "humaniz": "文本润色", "proofread": "编辑校对",
    }),
    ("数据与分析", 9, {
        "data analysis": "数据分析", "analytics": "数据分析", "sql": "SQL查询", "spreadsheet": "表格处理",
        "excel": "表格处理", "visualization": "数据可视化", "statistic": "统计分析", "dashboard": "仪表盘制作",
        "scraping": "数据采集", "crawler": "数据采集", "etl": "数据加工", "business intelligence": "商业智能",
        "dataset": "数据处理", "data science": "数据科学",
    }),
    ("运维与DevOps", 10, {
        "devops": "部署运维", "kubernetes": "容器编排", "docker": "容器化", "ci/cd": "持续集成",
        "infrastructure": "基础设施", "monitoring": "监控告警", "sre": "稳定性保障", "deployment": "部署发布",
        "terraform": "基础设施即代码", "linux": "系统运维", "server management": "服务器管理",
    }),
    ("教育与研究", 11, {
        "education": "教学辅导", "course": "课程学习", "tutorial": "教程学习", "academic": "学术研究",
        "research": "研究分析", "paper": "论文写作", "study": "学习辅导", "teaching": "教学辅导",
        "learn": "学习辅导", "textbook": "教材学习", "exam": "考试备考", "interview preparation": "面试备考",
        "lesson": "课程学习", "for beginners": "课程学习", "bootcamp": "课程学习",
        "algorithm": "算法学习", "data structures": "算法学习", "leetcode": "面试备考",
        "curriculum": "课程学习", "roadmap": "学习辅导",
    }),
    ("办公与效率", 12, {
        "productivity": "效率提升", "office": "办公处理", "note-taking": "笔记整理", "notes": "笔记整理",
        "task management": "任务管理", "calendar": "日程管理", "presentation": "演示制作", "slides": "演示制作",
        "pdf": "文档处理", "workflow automation": "流程自动化", "automation": "流程自动化",
        "second brain": "知识管理", "knowledge management": "知识管理",
    }),
    ("人工智能与机器学习", 13, {
        "machine learning": "模型开发", "deep learning": "深度学习", "neural": "模型开发",
        "model training": "模型训练", "inference": "推理部署", "nlp": "自然语言处理",
        "computer vision": "计算机视觉", "transformer": "模型开发", "diffusion": "生成模型",
        "prompt engineering": "提示词工程", "rag": "RAG搭建", "fine-tun": "模型微调",
        "llm": "大模型应用", "ai agent": "智能体开发", "agentic": "智能体开发",
        "local llm": "大模型应用", "run llm": "推理部署", "model runtime": "推理部署",
        "generative ai": "生成模型", "large language": "大模型应用",
    }),
    ("软件开发", 14, {
        "code": "代码编写", "coding": "代码编写", "developer": "软件开发", "programming": "程序开发",
        "software": "软件开发", "frontend": "前端开发", "backend": "后端开发", "full-stack": "全栈开发",
        "fullstack": "全栈开发", "testing": "软件测试", "debug": "调试排错", "git": "版本管理",
        "api": "API开发", "web development": "网站开发", "mobile": "移动开发", "game": "游戏开发",
        "code review": "代码审查", "refactor": "代码重构", "framework": "框架开发", "library": "类库开发",
    }),
]

GENERIC_FACTOR = {"人工智能与机器学习": 0.55, "软件开发": 0.55}
DEFAULT_SKILLS = {
    "网络安全": ["安全审计", "风险评估"], "金融与交易": ["财务分析", "数据处理"],
    "法律与合规": ["法律检索", "文书起草"], "医疗健康": ["健康管理", "资料整理"],
    "市场营销": ["营销策划", "内容运营"], "电商与销售": ["客户管理", "销售转化"],
    "产品与设计": ["产品规划", "视觉设计"], "视频与多媒体": ["内容制作", "后期处理"],
    "内容与写作": ["文章写作", "编辑校对"], "数据与分析": ["数据分析", "报表制作"],
    "运维与DevOps": ["部署运维", "故障排查"], "教育与研究": ["研究分析", "知识整理"],
    "办公与效率": ["流程自动化", "文档处理"], "人工智能与机器学习": ["智能体开发", "大模型应用"],
    "软件开发": ["代码编写", "调试排错"], "其他专业": ["通用技能"],
}

import re as _re

def kw_in(kw, text):
    """Short alphabetic keywords need word boundaries (law != openclaw, ui != guide);
    longer ones need a trailing boundary (paper != paperclip) but may be suffixes (security in cybersecurity)."""
    if " " in kw or "-" in kw or "/" in kw:
        return kw in text
    if len(kw) <= 4:
        return bool(_re.search(r"(?<![a-z])" + _re.escape(kw) + r"s?(?![a-z])", text))
    return bool(_re.search(_re.escape(kw) + r"s?(?![a-z])", text))

# Explicit overrides for well-known repositories whose name/description gives
# the keyword scorer no usable signal (terse or playful descriptions).
# full_name (lowercase) -> (field, [work_skills]) with a one-line reason each.
OVERRIDES = {
    "ollama/ollama": ("人工智能与机器学习", ["大模型应用", "推理部署"]),          # local LLM runtime; desc is a model list
    "excalidraw/excalidraw": ("产品与设计", ["视觉设计", "原型设计"]),              # virtual whiteboard / diagramming
    "krahets/hello-algo": ("教育与研究", ["算法学习", "教程学习"]),                 # animated algorithms textbook
    "microsoft/generative-ai-for-beginners": ("教育与研究", ["课程学习", "大模型应用"]),  # 21-lesson course
    "select2/select2": ("软件开发", ["前端开发", "类库开发"]),                      # jQuery select-box component library
    "sindresorhus/awesome": ("教育与研究", ["知识整理", "研究分析"]),               # curated resource lists index
    "trekhleb/javascript-algorithms": ("教育与研究", ["算法学习", "面试备考"]),     # algorithms study repo
    "jackfrued/python-100-days": ("教育与研究", ["课程学习", "学习辅导"]),          # Python course
    "snailclimb/javaguide": ("教育与研究", ["面试备考", "学习辅导"]),               # Java interview guide
    "airbnb/javascript": ("软件开发", ["代码编写", "代码审查"]),                     # JS style guide
    "microsoft/typescript": ("软件开发", ["程序开发", "框架开发"]),                  # programming language
    "denoland/deno": ("软件开发", ["程序开发", "框架开发"]),                         # JS/TS runtime
    "electron/electron": ("软件开发", ["软件开发", "程序开发"]),                     # desktop app framework
    "genymobile/scrcpy": ("软件开发", ["移动开发", "调试排错"]),                     # Android mirroring tool
    "langchain-ai/langchain": ("人工智能与机器学习", ["智能体开发", "大模型应用"]),  # LLM agent framework
    "langflow-ai/langflow": ("人工智能与机器学习", ["智能体开发", "大模型应用"]),    # visual LLM app builder
    "anthropics/skills": ("人工智能与机器学习", ["智能体开发", "提示词工程"]),       # official Agent Skills
    "mattpocock/skills": ("软件开发", ["代码编写", "智能体开发"]),                   # engineering skills pack
    "openclaw/openclaw": ("人工智能与机器学习", ["智能体开发", "大模型应用"]),       # personal AI agent runtime
    "github/spec-kit": ("软件开发", ["软件开发", "流程自动化"]),                     # spec-driven development toolkit
    "iptv-org/iptv": ("视频与多媒体", ["直播运营", "内容制作"]),                     # IPTV channel collection
    "fatedier/frp": ("运维与DevOps", ["部署运维", "服务器管理"]),                    # reverse proxy / NAT traversal
    "axios/axios": ("软件开发", ["API开发", "类库开发"]),                            # HTTP client library
    "521xueweihan/hellogithub": ("教育与研究", ["知识整理", "学习辅导"]),           # curated OSS discovery magazine
    "twitter/the-algorithm": ("软件开发", ["程序开发", "代码编写"]),                 # production source code, not a course (name trips the education rule)
}

def classify(p):
    ov = OVERRIDES.get((p.get("full_name") or "").lower())
    if ov:
        return ov[0], list(ov[1])
    name = p["name"].lower()
    desc = p["description"].lower()
    topics = " ".join(p.get("topics", [])).lower()
    best = ("其他专业", -1, 99)
    skill_hits = {}  # work_skill -> earliest priority
    scores = {}
    for field, prio, kws in RULES:
        score = 0.0
        for kw, skill in kws.items():
            hit = 0
            if kw_in(kw, name): hit += 3
            if kw_in(kw, topics): hit += 2
            if kw_in(kw, desc): hit += 1
            if hit:
                score += hit
                if skill and (skill not in skill_hits or prio < skill_hits[skill]):
                    skill_hits[skill] = prio
        score *= GENERIC_FACTOR.get(field, 1.0)
        scores[field] = score
        if score > 0 and (score > best[1] or (score == best[1] and prio < best[2])):
            best = (field, score, prio)
    field = best[0]
    # work skills: prefer skills from winning field's keywords, then others by priority
    ordered = sorted(skill_hits.items(), key=lambda kv: kv[1])
    win_skills = []
    win_kws = dict(RULES[[r[0] for r in RULES].index(field)][2]) if field != "其他专业" else {}
    win_set = set(win_kws.values())
    for s, _ in ordered:
        if s in win_set: win_skills.append(s)
    rest = [s for s, _ in ordered if s not in win_set]
    work = (win_skills + rest)[:3]
    if len(work) < 2:
        for d in DEFAULT_SKILLS[field]:
            if d not in work: work.append(d)
        work = work[:3]
    return field, work

def main():
    projects = json.load(open("data/projects.json", encoding="utf-8"))
    for p in projects:
        field, work = classify(p)
        p["field"] = field
        p["work_skills"] = work
    save_projects(projects)
    print("total:", len(projects))
    print(Counter(p["field"] for p in projects))
    # QA samples
    import random; random.seed(7)
    for field in DEFAULT_SKILLS:
        sample = [p for p in projects if p["field"] == field][:3]
        for p in sample:
            print(f"[{field}] {p['full_name']} :: {p['work_skills']} :: {p['description'][:60]}")

if __name__ == "__main__":
    main()
