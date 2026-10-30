#!/usr/bin/env python3
"""Regression tests for scripts/classify_fields.py.

Asserts the field of well-known repositories (incl. the explicit OVERRIDES)
so future rule edits cannot silently regress them. Run: python3 scripts/test_classification.py
Uses minimal synthetic records (name/full_name/description/topics) — classify()
only reads those fields.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from classify_fields import classify

CASES = [
    # (full_name, description, topics, expected_field)
    ("ollama/ollama", "Get up and running with Kimi, GLM, MiniMax, DeepSeek, gpt-oss, Qwen, Gemma and other models.", ["deepseek", "gemma"], "人工智能与机器学习"),
    ("excalidraw/excalidraw", "Virtual whiteboard for sketching hand-drawn like diagrams", ["canvas", "drawing", "diagrams"], "产品与设计"),
    ("krahets/hello-algo", "《Hello 算法》：动画图解、一键运行的数据结构与算法教程。", ["algorithm", "data-structure"], "教育与研究"),
    ("microsoft/generative-ai-for-beginners", "21 Lessons, Get Started Building with Generative AI", ["generative-ai", "ai"], "教育与研究"),
    ("select2/select2", "Select2 is a jQuery based replacement for select boxes. It supports searching, remote data sets.", ["javascript", "jquery"], "软件开发"),
    ("sindresorhus/awesome", "Awesome lists about all kinds of interesting topics", ["awesome", "lists"], "教育与研究"),
    ("trekhleb/javascript-algorithms", "Algorithms and data structures implemented in JavaScript with explanations", ["algorithms"], "教育与研究"),
    ("jackfrued/Python-100-Days", "Python - 100天从新手到大师", ["python"], "教育与研究"),
    ("Snailclimb/JavaGuide", "Java 面试 & 后端通用面试指南，覆盖计算机基础、数据库、分布式", ["java", "interview"], "教育与研究"),
    ("airbnb/javascript", "JavaScript Style Guide", ["style-guide"], "软件开发"),
    ("microsoft/TypeScript", "TypeScript is a superset of JavaScript that compiles to clean JavaScript output.", ["typescript"], "软件开发"),
    ("denoland/deno", "A modern runtime for JavaScript and TypeScript.", ["deno", "runtime"], "软件开发"),
    ("electron/electron", "Build cross-platform desktop apps with JavaScript, HTML, and CSS", ["electron"], "软件开发"),
    ("Genymobile/scrcpy", "Display and control your Android device", ["android"], "软件开发"),
    ("langchain-ai/langchain", "The agent engineering platform.", ["llm", "agents"], "人工智能与机器学习"),
    ("langflow-ai/langflow", "Langflow is a powerful tool for building and deploying AI-powered agents", ["llm"], "人工智能与机器学习"),
    ("anthropics/skills", "Public repository for Agent Skills", ["skills"], "人工智能与机器学习"),
    ("mattpocock/skills", "Skills for Real Engineers. Straight from my .agents directory.", ["skills"], "软件开发"),
    ("openclaw/openclaw", "The AI that really does things. Any OS. Any Platform.", ["ai"], "人工智能与机器学习"),
    ("github/spec-kit", "Toolkit to help you get started with SDD", ["sdd"], "软件开发"),
    ("iptv-org/iptv", "Collection of publicly available IPTV channels from all over the world", ["iptv"], "视频与多媒体"),
    ("fatedier/frp", "A fast reverse proxy to help you expose a local server behind a NAT or firewall", ["proxy"], "运维与DevOps"),
    ("axios/axios", "Promise based HTTP client for the browser and node.js", ["http", "api"], "软件开发"),
    ("521xueweihan/HelloGitHub", "分享 GitHub 上有趣、入门级的开源项目。", ["github"], "教育与研究"),
    # rule-driven (non-override) spot checks against keyword regressions
    ("acme/notesync", "A whiteboard and diagram tool for product teams", ["whiteboard"], "产品与设计"),
    ("acme/llm-gateway", "Run LLMs locally: a model runtime for large language models", ["llm"], "人工智能与机器学习"),
    ("acme/algo-course", "A free algorithms course with lessons and tutorials", ["course"], "教育与研究"),
    ("acme/k8s-watch", "Kubernetes monitoring and deployment dashboards for SRE teams", ["kubernetes"], "运维与DevOps"),
    ("acme/pentest-kit", "Penetration testing toolkit for security audits and vulnerability research", ["security"], "网络安全"),
]

def main():
    fails = []
    for full, desc, topics, expected in CASES:
        p = {"name": full.split("/")[1], "full_name": full, "description": desc, "topics": topics}
        got, _skills = classify(p)
        if got != expected:
            fails.append(f"{full}: expected {expected}, got {got}")
    if fails:
        print(f"FAIL {len(fails)}/{len(CASES)}")
        for f in fails:
            print(" -", f)
        return 1
    print(f"OK {len(CASES)}/{len(CASES)} classification regression cases pass")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
