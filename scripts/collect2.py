#!/usr/bin/env python3
"""Pass 2: add official/essential seeds, then reclassify by name+description (not topic spam)."""
import subprocess, json, sys, time, re

GH = "/opt/hatch/bin/github"

SEED_REPOS = [
    "modelcontextprotocol/servers","modelcontextprotocol/inspector","modelcontextprotocol/registry",
    "modelcontextprotocol/python-sdk","modelcontextprotocol/typescript-sdk","modelcontextprotocol/go-sdk",
    "modelcontextprotocol/modelcontextprotocol","modelcontextprotocol/csharp-sdk","modelcontextprotocol/rust-sdk",
    "anthropics/claude-code","anthropics/claude-plugins-official","anthropics/claude-cookbooks",
    "anthropics/claude-agent-sdk-python","anthropics/knowledge-work-plugins","anthropics/courses",
    "anthropics/claude-quickstarts","anthropics/prompt-eng-interactive-tutorial",
    "github/github-mcp-server","microsoft/playwright-mcp","microsoft/mcp",
    "openai/openai-agents-python","openai/codex","google-gemini/gemini-cli",
    "freeCodeCamp/freeCodeCamp","EbookFoundation/free-programming-books",
    "kamranahmedse/developer-roadmap","donnemartin/system-design-primer",
    "jwasham/coding-interview-university","codecrafters-io/build-your-own-x",
    "microsoft/vscode","vercel/next.js","facebook/react","vitejs/vite","tailwindlabs/tailwindcss",
    "docker/awesome-compose","rupa/z","ohmyzsh/ohmyzsh",
]

def fetch_repo(full):
    args = {"query": f"repo:{full}", "perPage": 3}
    cmd = [GH, "call-read-tool", "--name", "search_repositories", "--arguments-json", json.dumps(args)]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        return None
    try:
        d = json.loads(out.stdout)
        inner = json.loads(d["result"]["content"][0]["text"])
        items = inner.get("items", [])
        for it in items:
            if it["full_name"].lower() == full.lower():
                return it
        return items[0] if items else None
    except Exception as e:
        print("parse fail", full, e, file=sys.stderr)
        return None

def classify(p):
    name = p["name"].lower()
    desc = p["description"].lower()
    full = p["full_name"].lower()
    topics = [t.lower() for t in p.get("topics", [])]
    # Awesome collections for MCP/Skills stay in their domain
    if "awesome-mcp" in name or "awesome-mcp" in full:
        return "MCP"
    if "awesome" in name and ("skill" in name or "claude" in name):
        return "Skills"
    if "awesome" in name:
        return "Learning"
    # MCP: strong signals in name/desc, or official org
    if full.startswith("modelcontextprotocol/"):
        return "MCP"
    if "mcp" in name or "model context protocol" in desc or "mcp server" in desc or "mcp-server" in desc or desc.startswith("mcp ") or " modelcontextprotocol" in desc:
        return "MCP"
    # Skills: strong signals
    if "skill" in name or "skills" in desc or "skill" in desc or full.startswith("anthropics/") and ("claude" in name or "plugin" in name):
        return "Skills"
    if "claude-code" in name or "claude_code" in name or name in ("claude-code",):
        return "Skills"
    if full.startswith("anthropics/"):
        return "Skills"
    # Learning signals
    if any(k in name for k in ["awesome","guide","roadmap","tutorial","course","book","interview","handbook","cheatsheet"]) or \
       any(k in desc for k in ["awesome list","curated list","roadmap","tutorial","free programming books","interview preparation"]):
        return "Learning"
    # AI Agents signals
    if any(k in name for k in ["agent","llm","gpt","rag","langchain","ollama","dify","openwebui","open-webui"]) or \
       any(k in desc for k in ["large language model","llm","ai agent","agentic","retrieval-augmented","rag pipeline"]):
        return "AI Agents"
    if any(t in topics for t in ["ai-agents","llm","rag","ai","machine-learning","deep-learning"]) and p["category"] == "AI Agents":
        return "AI Agents"
    # Keep previous AI Agents if topics strongly AI
    if p.get("category") == "AI Agents":
        return "AI Agents"
    return "Dev Tools"

def main():
    projects = json.load(open("data/projects.json", encoding="utf-8"))
    by_key = {p["full_name"].lower(): p for p in projects}
    added = 0
    for full in SEED_REPOS:
        if full.lower() in by_key:
            continue
        it = fetch_repo(full)
        time.sleep(0.3)
        if not it:
            print("MISS seed", full)
            continue
        owner = it["full_name"].split("/")[0]
        rec = {
            "name": it["name"], "full_name": it["full_name"], "owner": owner,
            "avatar_url": f"https://github.com/{owner}.png?size=96",
            "author_url": f"https://github.com/{owner}",
            "url": it["html_url"], "description": (it.get("description") or it["name"]).strip(),
            "stars": it.get("stargazers_count", 0), "forks": it.get("forks_count", 0),
            "language": it.get("language") or "", "topics": (it.get("topics") or [])[:5],
            "updated_at": (it.get("updated_at") or "")[:10], "category": "Dev Tools",
        }
        by_key[full.lower()] = rec
        added += 1
        print("ADD seed", full, rec["stars"])
    projects = list(by_key.values())
    for p in projects:
        p["category"] = classify(p)
    projects.sort(key=lambda x: x["stars"], reverse=True)
    from collections import Counter
    print("added seeds:", added)
    print("total:", len(projects), Counter(p["category"] for p in projects))
    json.dump(projects, open("data/projects.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
