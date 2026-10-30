"""Read / write data/projects.json — one project per line, so data refreshes diff cleanly."""
import json, os

PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "projects.json")


def load_projects(path=PATH):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_projects(projects, path=PATH):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("[\n" + ",\n".join(json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in projects) + "\n]\n")
