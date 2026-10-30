#!/usr/bin/env python3
"""Build data/index.json — the compact single-file catalog the site loads.

Short keys, derived fields dropped (repo URL and avatar are rebuilt in JS from
full_name/owner), descriptions capped at 600 chars. Runtime builds the
normalized search string once after load (measured ~15 ms for 6k records),
so it is not duplicated into the payload.
Keys: fn full_name, n name, o owner, d description, s stars, k forks,
      l language, c category, f field, w work_skills, u updated_at,
      t topics<=4, ft featured 0/1, ov over10k 0/1
"""
import json
from datetime import datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))

def main():
    projects = json.load(open("data/projects.json", encoding="utf-8"))
    items = []
    for p in projects:
        items.append({
            "fn": p["full_name"], "n": p["name"], "o": p["owner"],
            "d": (p.get("description") or "")[:600],
            "s": p.get("stars", 0), "k": p.get("forks", 0),
            "l": p.get("language") or "", "c": p["category"], "f": p.get("field") or "其他专业",
            "w": (p.get("work_skills") or [])[:3], "u": (p.get("updated_at") or "")[:10],
            "t": (p.get("topics") or [])[:4],
            "ft": 1 if p.get("featured") else 0, "ov": 1 if p.get("over10k") else 0,
        })
    out = {
        "generated_at": datetime.now(CST).strftime("%Y-%m-%d %H:%M"),
        "total": len(items),
        "items": items,
    }
    with open("data/index.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    import os
    print("index.json:", len(items), "items,", os.path.getsize("data/index.json"), "bytes")

if __name__ == "__main__":
    main()
