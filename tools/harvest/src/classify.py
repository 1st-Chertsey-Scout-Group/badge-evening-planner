#!/usr/bin/env python3
"""Seed data/suitability/<badge>.json by classifying each leaf requirement as
evening / over-time / unsuitable against this troop's HQ.

The classification is troop-specific: it reads data/facility-profile.md and judges
every requirement against what we can actually run. It fills blanks only - a leaf
already present in the overlay is left untouched, so hand-edits survive a re-run
and new badges can be seeded without reclassifying the rest.

Calls the Claude API directly over urllib to keep the harvester dependency-free
(stdlib only). Needs ANTHROPIC_API_KEY in the environment.

    python3 tools/harvest/src/cli.py classify              # every badge with blanks
    python3 tools/harvest/src/cli.py classify --badge chef # one badge
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
REQS = REPO_ROOT / "src" / "content" / "requirements"
SUIT_DIR = REPO_ROOT / "data" / "suitability"
PROFILE = REPO_ROOT / "data" / "facility-profile.md"

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-haiku-4-5"
CATEGORIES = ["evening", "over-time", "unsuitable"]

CLASSIFY_TOOL = {
    "name": "classify",
    "description": "Record one suitability category for every requirement given.",
    "input_schema": {
        "type": "object",
        "properties": {
            "classifications": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "category": {"type": "string", "enum": CATEGORIES},
                    },
                    "required": ["id", "category"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["classifications"],
        "additionalProperties": False,
    },
}


def leaves_by_badge() -> dict[str, list[dict]]:
    """Leaf requirements (no children) grouped by badge slug, each as
    {id, title, notes}."""
    out: dict[str, list[dict]] = {}
    for f in sorted(REQS.glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        if d["children"]:
            continue
        out.setdefault(d["badge"], []).append(
            {"id": f.stem, "title": d["title"], "notes": d["notes"]}
        )
    return out


def load_overlay(slug: str) -> dict[str, str]:
    f = SUIT_DIR / f"{slug}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def write_overlay(slug: str, data: dict[str, str]) -> None:
    SUIT_DIR.mkdir(parents=True, exist_ok=True)
    ordered = {k: data[k] for k in sorted(data, key=int)}
    (SUIT_DIR / f"{slug}.json").write_text(
        json.dumps(ordered, indent=2) + "\n", encoding="utf-8"
    )


def system_prompt() -> str:
    profile = PROFILE.read_text(encoding="utf-8")
    return (
        "You classify Scout badge requirements by how achievable each one is for a "
        "specific troop at its own HQ. Judge every requirement against the profile "
        "below and nothing else. Use the classify tool to return exactly one "
        "category per requirement id you are given.\n\n"
        "Categories:\n"
        "- evening: one ~90 minute session covers it.\n"
        "- over-time: we can run it, but it spans several sessions, a multi-week "
        "block, or a camp.\n"
        "- unsuitable: we cannot deliver it at or around our HQ.\n\n"
        f"{profile}"
    )


def call_api(key: str, reqs: list[dict]) -> dict[str, str]:
    body = {
        "model": MODEL,
        "max_tokens": 4096,
        "system": system_prompt(),
        "tools": [CLASSIFY_TOOL],
        "tool_choice": {"type": "tool", "name": "classify"},
        "messages": [
            {
                "role": "user",
                "content": (
                    "Classify these requirements. Return a category for every id.\n\n"
                    + json.dumps(reqs, indent=2)
                ),
            }
        ],
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read())
    for block in resp.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "classify":
            return {
                c["id"]: c["category"]
                for c in block["input"]["classifications"]
                if c.get("category") in CATEGORIES
            }
    raise RuntimeError("no classify tool call in response")


def run(badge: str | None = None) -> int:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 1
    if not PROFILE.exists():
        print(f"missing {PROFILE}", file=sys.stderr)
        return 1

    by_badge = leaves_by_badge()
    slugs = [badge] if badge else sorted(by_badge)
    total = 0
    for slug in slugs:
        leaves = by_badge.get(slug)
        if not leaves:
            print(f"  {slug}: no leaf requirements", file=sys.stderr)
            continue
        overlay = load_overlay(slug)
        blanks = [r for r in leaves if r["id"] not in overlay]
        if not blanks:
            print(f"  {slug}: already complete")
            continue
        result = call_api(key, blanks)
        for r in blanks:
            overlay[r["id"]] = result.get(r["id"], "unknown")
        write_overlay(slug, overlay)
        done = sum(1 for r in blanks if result.get(r["id"]) in CATEGORIES)
        total += done
        print(f"  {slug}: classified {done}/{len(blanks)}")
    print(f"classified {total} leaf requirements")
    return 0


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1] if len(sys.argv) > 1 else None))
