#!/usr/bin/env python3
"""Split data/projects.json into small minified chunks + manifest for static hosting / git push limits."""
import json, os

CHUNK = 110

def main():
    projects = json.load(open("data/projects.json", encoding="utf-8"))
    os.makedirs("data/chunks", exist_ok=True)
    files = []
    for i in range(0, len(projects), CHUNK):
        name = f"chunks/projects-{len(files)+1}.json"
        with open(f"data/{name}", "w", encoding="utf-8") as f:
            json.dump(projects[i:i+CHUNK], f, ensure_ascii=False, separators=(",", ":"))
        files.append(name)
    with open("data/manifest.json", "w", encoding="utf-8") as f:
        json.dump({"total": len(projects), "files": files}, f, ensure_ascii=False, indent=2)
    print(files)

if __name__ == "__main__":
    main()
