#!/usr/bin/env python3
"""Pass 3: expand Skills collection across professions.
Lower star floor for niche professional skills (>=30), still: no forks, not archived, clear description.
Skill signal required: 'skill' in name or description.
"""
import json, sys, time

from gh_search import search
from projects_io import save_projects

QUERIES = [
    # broad skill pools, multiple pages
    ("topic:claude-skills stars:>30", 30, 3),
    ("topic:agent-skills stars:>30", 30, 3),
    ("topic:claude-code-skills stars:>20", 20, 2),
    ("topic:ai-skills stars:>30", 30, 2),
    ("topic:codex-skills stars:>20", 20, 2),
    ("topic:gemini-skills stars:>20", 20, 1),
    ("topic:cursor-skills stars:>20", 20, 1),
    ("topic:copilot-skills stars:>20", 20, 1),
    # profession-targeted
    ('"marketing skills" in:name,description stars:>20', 20, 1),
    ('"design skills" in:name,description stars:>20', 20, 1),
    ('"finance skills" in:name,description stars:>20', 20, 1),
    ('"financial skills" in:name,description stars:>20', 20, 1),
    ('"legal skills" in:name,description stars:>20', 20, 1),
    ('"security skills" in:name,description stars:>20', 20, 1),
    ('"cybersecurity skills" in:name,description stars:>20', 20, 1),
    ('"data skills" in:name,description stars:>20', 20, 1),
    ('"writing skills" in:name,description stars:>20', 20, 1),
    ('"video skills" in:name,description stars:>20', 20, 1),
    ('"seo skills" in:name,description stars:>20', 20, 1),
    ('"sales skills" in:name,description stars:>20', 20, 1),
    ('"developer skills" in:name,description stars:>20', 20, 1),
    ('"engineering skills" in:name,description stars:>20', 20, 1),
    ('"product skills" in:name,description stars:>20', 20, 1),
    ('"research skills" in:name,description stars:>20', 20, 1),
    ('"medical skills" in:name,description stars:>20', 20, 1),
    ('"education skills" in:name,description stars:>20', 20, 1),
    # generic name-based pools
    ("skills in:name topic:claude stars:>30", 30, 2),
    ("skill in:name stars:>300", 300, 2),
]

def main():
    projects = json.load(open("data/projects.json", encoding="utf-8"))
    by_key = {p["full_name"].lower(): p for p in projects}
    added = 0
    for query, min_stars, pages in QUERIES:
        items = []
        for pg in range(1, pages + 1):
            items += search(query, 50, pg)
            time.sleep(0.35)
        kept = 0
        for it in items:
            if it.get("fork") or it.get("archived"):
                continue
            stars = it.get("stargazers_count", 0)
            if stars < min_stars:
                continue
            desc = (it.get("description") or "").strip()
            if len(desc) < 12:
                continue
            name_l = it["name"].lower(); desc_l = desc.lower()
            if "skill" not in name_l and "skill" not in desc_l:
                continue
            key = it["full_name"].lower()
            if key in by_key:
                continue
            owner = it["full_name"].split("/")[0]
            by_key[key] = {
                "name": it["name"], "full_name": it["full_name"], "owner": owner,
                "avatar_url": f"https://github.com/{owner}.png?size=96",
                "author_url": f"https://github.com/{owner}",
                "url": it["html_url"], "description": desc,
                "stars": stars, "forks": it.get("forks_count", 0),
                "language": it.get("language") or "", "topics": (it.get("topics") or [])[:5],
                "updated_at": (it.get("updated_at") or "")[:10],
                "category": "Skills", "featured": False,
            }
            added += 1; kept += 1
        print(f"{query!r} pages={pages} -> raw {len(items)}, new {kept}")
    projects = sorted(by_key.values(), key=lambda x: x["stars"], reverse=True)
    from collections import Counter
    print("\nadded:", added, "total:", len(projects), Counter(p["category"] for p in projects))
    save_projects(projects)

if __name__ == "__main__":
    main()
