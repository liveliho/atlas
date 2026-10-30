#!/usr/bin/env python3
"""Merge the 5,320 over-10k-star projects into the Atlas dataset.

- Union by full_name.lower(); overlap takes numeric fields from the NEW data,
  keeps `featured` from the OLD data.
- Old-only projects (old 5-category system) are reclassified into the 18-category
  system by reusing classify_cat from github-top-projects-10000/scripts/build_docs.py.
- field/work_skills: keep old values; fill missing via classify_fields.classify.
- Adds `over10k` boolean (stars > 10000).
Output overwrites data/projects.json (sorted by stars desc).
"""
import json, os, sys, importlib.util
from collections import Counter
from projects_io import save_projects

ROOT = os.path.expanduser("~/workspace/skill-mcp-hub")
NEW_PATH = os.environ.get("ATLAS_OVER10K_JSON") or os.path.expanduser("~/workspace/github-top-projects-10000/data/projects_all.json")
BUILD_DOCS = os.path.expanduser("~/workspace/github-top-projects-10000/scripts/build_docs.py")

def load_mod(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

bd = load_mod("build_docs", BUILD_DOCS)
cf = bd.cf  # classify_fields module loaded by build_docs

old = json.load(open(os.path.join(ROOT, "data/projects.json"), encoding="utf-8"))
new = json.load(open(NEW_PATH, encoding="utf-8"))

old_by = {p["full_name"].lower(): p for p in old}
merged = {}

# 1) new data as base
for p in new:
    key = p["full_name"].lower()
    o = old_by.get(key, {})
    rec = {k: v for k, v in p.items() if k != "rank"}
    rec["featured"] = bool(o.get("featured", False))
    rec["over10k"] = p.get("stars", 0) > 10000
    merged[key] = rec

# 2) old-only projects: reclassify category into 18-cat system
old_only = 0
for key, p in old_by.items():
    if key in merged:
        continue
    old_only += 1
    rec = {k: v for k, v in p.items()}
    rec["category"] = bd.classify_cat(p)
    if not rec.get("field") or not rec.get("work_skills"):
        field, work = cf.classify(rec)
        rec["field"] = rec.get("field") or field
        rec["work_skills"] = rec.get("work_skills") or work
    rec["featured"] = bool(p.get("featured", False))
    rec["over10k"] = p.get("stars", 0) > 10000
    merged[key] = rec

projects = sorted(merged.values(), key=lambda x: -x.get("stars", 0))
# normalize shape
for p in projects:
    p.setdefault("featured", False)
    p.setdefault("topics", [])
    p.setdefault("language", "")
    p.setdefault("field", "其他专业")
    p.setdefault("work_skills", [])

save_projects(projects)
print("old:", len(old), "new:", len(new), "old_only:", old_only)
print("TOTAL merged:", len(projects))
print("over10k true:", sum(1 for p in projects if p["over10k"]))
print("featured true:", sum(1 for p in projects if p["featured"]))
print("categories:", Counter(p["category"] for p in projects))
print("fields:", Counter(p["field"] for p in projects))
print("min stars:", min(p["stars"] for p in projects), "max:", max(p["stars"] for p in projects))
