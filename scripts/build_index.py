#!/usr/bin/env python3
"""Build data/index.json — the compact catalog the site loads — from data/projects.json.

Format v2 (columnar, dictionary-encoded; ~40% smaller than v1 after gzip):
  {
    "v": 2, "generated_at": "YYYY-MM-DD HH:MM", "total": N,
    "dict": {"c": [categories], "f": [fields], "w": [work skills], "l": [languages], "t": [topics]},
    "items": [[owner, name, description, stars, forks, l, c, f, [w...], updated, [t...], flags], ...]
  }
  l / c / f / w / t are indexes into dict; updated is an int YYYYMMDD (0 = unknown);
  flags: 1 = official / featured, 2 = over 10k stars.
Items are sorted by stars, descending. Description is capped at 400 chars,
topics at 4, work skills at 3. Repo URL and avatar are derived in JS.

ATLAS_DATA_DATE overrides generated_at (use it when rebuilding an unchanged snapshot).
"""
import json, os
from datetime import datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))
SRC, OUT = "data/projects.json", "data/index.json"


class Dict:
    def __init__(self):
        self.values, self.index = [], {}

    def __call__(self, v):
        if v not in self.index:
            self.index[v] = len(self.values)
            self.values.append(v)
        return self.index[v]


def main():
    projects = json.load(open(SRC, encoding="utf-8"))
    projects.sort(key=lambda p: -p.get("stars", 0))
    c, f, w, l, t = Dict(), Dict(), Dict(), Dict(), Dict()
    items = []
    for p in projects:
        upd = (p.get("updated_at") or "")[:10].replace("-", "")
        flags = (1 if p.get("featured") else 0) | (2 if p.get("over10k") else 0)
        items.append([
            p["owner"], p["name"], (p.get("description") or "").strip()[:400],
            p.get("stars", 0), p.get("forks", 0),
            l(p.get("language") or ""), c(p["category"]), f(p.get("field") or "其他专业"),
            [w(x) for x in (p.get("work_skills") or [])[:3]],
            int(upd) if upd.isdigit() else 0,
            [t(x) for x in (p.get("topics") or [])[:4]],
            flags,
        ])
    out = {
        "v": 2,
        "generated_at": os.environ.get("ATLAS_DATA_DATE") or datetime.now(CST).strftime("%Y-%m-%d %H:%M"),
        "total": len(items),
        "dict": {"c": c.values, "f": f.values, "w": w.values, "l": l.values, "t": t.values},
        "items": items,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"{OUT}: {len(items)} items, {os.path.getsize(OUT):,} bytes")


if __name__ == "__main__":
    main()
