"""Shared GitHub REST helpers for the collect* scripts.

Set GITHUB_TOKEN (or GH_TOKEN) for the 30 req/min search quota; without a
token GitHub allows 10 search requests per minute.
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")


def _get(path, params=None, retries=3):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "atlas-collector",
        **({"Authorization": "Bearer " + TOKEN} if TOKEN else {}),
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # secondary rate limit / abuse detection: back off and retry
            if e.code in (403, 429) and attempt < retries - 1:
                wait = int(e.headers.get("Retry-After") or 20 * (attempt + 1))
                print(f"rate limited, waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            print(f"FAIL {url}: HTTP {e.code}", file=sys.stderr)
            return None
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"FAIL {url}: {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    return None


def search(query, per_page=50, page=1):
    """Repository search sorted by stars; returns the API's `items` list."""
    d = _get("/search/repositories", {"q": query, "per_page": per_page, "page": page, "sort": "stars", "order": "desc"})
    return (d or {}).get("items", [])


def fetch_repo(full_name):
    """One repository by owner/name, or None."""
    return _get("/repos/" + full_name)
