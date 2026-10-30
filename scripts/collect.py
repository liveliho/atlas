#!/usr/bin/env python3
"""Collect useful Skill / MCP / AI / dev projects via GitHub MCP search_repositories.
Dedupes, filters forks/archived/low quality, assigns category.
Output: data/projects.json
"""
import json, sys, time, re

from gh_search import search
from projects_io import save_projects

QUERIES = [
    # (query, category, min_stars)
    ("topic:mcp-server stars:>600", "MCP", 600),
    ("topic:model-context-protocol stars:>600", "MCP", 600),
    ("mcp in:name stars:>1500", "MCP", 1500),
    ("topic:mcp stars:>2000", "MCP", 2000),
    ("topic:claude-skills stars:>50", "Skills", 50),
    ("topic:agent-skills stars:>50", "Skills", 50),
    ("topic:claude-code stars:>800", "Skills", 800),
    ('"claude skills" in:name,description stars:>200', "Skills", 200),
    ('"agent skills" in:name,description stars:>200', "Skills", 200),
    ("skills in:name topic:ai stars:>1000", "Skills", 1000),
    ("topic:ai-agents stars:>4000", "AI Agents", 4000),
    ("topic:ai-agent stars:>4000", "AI Agents", 4000),
    ("topic:llm stars:>6000", "AI Agents", 6000),
    ("topic:rag stars:>2500", "AI Agents", 2500),
    ("topic:llmops stars:>1000", "AI Agents", 1000),
    ("topic:developer-tools stars:>12000", "Dev Tools", 12000),
    ("topic:automation stars:>12000", "Dev Tools", 12000),
    ("topic:open-source stars:>25000", "Dev Tools", 25000),
    ("topic:awesome stars:>20000", "Learning", 20000),
    ("awesome in:name stars:>30000", "Learning", 30000),
    ("topic:self-hosted stars:>8000", "Dev Tools", 8000),
    ("topic:productivity stars:>8000", "Dev Tools", 8000),
]

# Priority for category when a repo appears in multiple buckets
CAT_PRIORITY = {"MCP": 0, "Skills": 1, "AI Agents": 2, "Learning": 3, "Dev Tools": 4}

def main():
    collected = {}  # full_name lower -> record
    for query, cat, min_stars in QUERIES:
        items = search(query, per_page=50, page=1)
        print(f"{query!r} -> {len(items)} ({cat})")
        time.sleep(0.4)
        # second page for the two biggest MCP buckets
        if query.startswith("topic:mcp-server") or query.startswith("topic:ai-agents"):
            items += search(query, per_page=50, page=2)
            time.sleep(0.4)
        for it in items:
            if it.get("fork") or it.get("archived"):
                continue
            stars = it.get("stargazers_count", 0)
            if stars < min_stars:
                continue
            desc = (it.get("description") or "").strip()
            if len(desc) < 12:
                continue
            full = it["full_name"]
            key = full.lower()
            owner = full.split("/")[0]
            rec = {
                "name": it["name"],
                "full_name": full,
                "owner": owner,
                "avatar_url": f"https://github.com/{owner}.png?size=96",
                "author_url": f"https://github.com/{owner}",
                "url": it["html_url"],
                "description": desc,
                "stars": stars,
                "forks": it.get("forks_count", 0),
                "language": it.get("language") or "",
                "topics": (it.get("topics") or [])[:5],
                "updated_at": (it.get("updated_at") or "")[:10],
                "category": cat,
            }
            if key not in collected:
                collected[key] = rec
            else:
                # keep higher-priority category
                if CAT_PRIORITY[cat] < CAT_PRIORITY[collected[key]["category"]]:
                    collected[key]["category"] = cat

    projects = sorted(collected.values(), key=lambda x: x["stars"], reverse=True)
    print(f"\nTOTAL unique useful projects: {len(projects)}")
    from collections import Counter
    print(Counter(p["category"] for p in projects))
    save_projects(projects)

if __name__ == "__main__":
    main()
