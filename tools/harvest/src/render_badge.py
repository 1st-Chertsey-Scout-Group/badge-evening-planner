#!/usr/bin/env python3
"""Render a raw badge JSON into a human-readable brief, applying the rules in
tools/harvest/docs/badge-data-rules.md. Demonstrates that the rules fully explain a badge.

Usage: python3 render_badge.py <type-slug>   e.g. render_badge.py activity-cyclist
"""

from __future__ import annotations

import json
from pathlib import Path

from core import md  # HTML -> markdown/plaintext

RAW = Path(__file__).resolve().parents[1] / "output" / "badges-raw"


def text(s: str) -> str:
    return " ".join(md(s).split())


def render_nodes(nodes: list, indent: str, out: list) -> None:
    for n in nodes or []:
        line = f"{indent}- {text(n['title'])}"
        if (n.get("numberOfTimeToComplete") or 0) > 1:
            line += f"  [do this {n['numberOfTimeToComplete']} times]"
        out.append(line)
        if n.get("notes"):
            out.append(f"{indent}  note: {text(n['notes'])}")
        subs = n.get("subRequirements") or []
        if subs:
            q = n.get("subRequirementsToQualify") or 0
            if q and q < len(subs):
                out.append(f"{indent}  choose {q} of these {len(subs)}:")
            else:
                out.append(f"{indent}  all of these:")
            render_nodes(subs, indent + "    ", out)


def render_block(b: dict, out: list) -> None:
    """A requirement-bearing block (a normal badge or one stage)."""
    if b.get("requirementsIntro"):
        out.append(text(b["requirementsIntro"]))
    req = b.get("requirements") or []
    opt = b.get("optionalRequirements") or []
    if req:
        out.append("Do ALL of these:")
        render_nodes(req, "  ", out)
    if opt:
        n = b.get("optionsToQualify") or 0
        if b.get("badgeType", {}).get("name") == "Staged":
            out.append(f"Then (stage target {n}):")
        elif n:
            out.append(f"Then choose {n} of these {len(opt)}:")
        else:
            out.append("Optionally:")
        render_nodes(opt, "  ", out)


def render(b: dict) -> str:
    out: list[str] = []
    title = b.get("displayTitle") or b.get("title")
    out.append(f"# {title}")
    cat = (b.get("badgeType") or {}).get("name")
    bits = [x for x in [cat] if x]
    secs = [s["name"] for s in (b.get("sections") or [])]
    if secs:
        bits.append("sections: " + ", ".join(secs))
    sets = [s["name"] for s in (b.get("settings") or [])]
    if sets:
        bits.append("setting: " + ", ".join(sets))
    if bits:
        out.append("(" + "; ".join(bits) + ")")
    if b.get("description"):
        out.append("")
        out.append(text(b["description"]))
    if b.get("safetyAlert"):
        out.append("")
        out.append("SAFETY: " + text(b["safetyAlert"]))

    if b.get("type") == "stagedBadge":
        for stage in b.get("badges") or []:
            out.append("")
            out.append(f"## {stage.get('title')}")
            render_block(stage, out)
    else:
        out.append("")
        render_block(b, out)

    if b.get("youthShapedSuggestions"):
        out.append("")
        out.append("Youth-shaped ideas: " + text(b["youthShapedSuggestions"]))
    tips = b.get("tips") or []
    if tips:
        out.append("")
        out.append("Tips:")
        for t in tips:
            out.append(f"  - {text(t.get('title') or t.get('details'))}")
    sb = b.get("supportedBy")
    if sb:
        out.append("")
        out.append(f"Supported by: {sb.get('title')}")
    return "\n".join(out)


def render_slug(slug: str) -> str:
    return render(json.loads((RAW / f"{slug}.json").read_text(encoding="utf-8")))


def available() -> list[str]:
    return sorted(p.stem for p in RAW.glob("*.json"))
