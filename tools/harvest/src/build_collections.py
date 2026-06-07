#!/usr/bin/env python3
"""Build the Astro content collections from tools/harvest/output/badges-raw/.

Emits two linked collections, per tools/harvest/docs/badge-data-rules.md:
  - src/content/badges/<slug>/index.json       (badge metadata + ordered entry
    points into the requirement tree, with its image colocated alongside)
  - src/content/requirements/<sourceId>.json   (one addressable node per file,
    keyed by the Umbraco source id; lean, linked by refs)

Badge entry ids are the bare slug (slugs are unique across types); the `type`
field carries activity/staged/challenge/top. Requirement `badge` refs use that
same slug so they resolve against the badges collection.

Requirement nodes carry parent + ordered children refs; "choose N vs all" lives
on the parent (badge.optionsToQualify over optional[]; requiredOfChildren over a
node's children[]). Staged badges keep one badge entry with stages[]; each
stage's optionsToQualify is its threshold (e.g. 50 nights), not a choose-N count.

Images are downloaded live from cms.scouts.org.uk (cached; --no-images skips).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import urllib.request
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from core import CMS, HEADERS, WWW, md, normalize_text

TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
RAW = TOOL_ROOT / "output" / "badges-raw"
BADGES_OUT = REPO_ROOT / "src" / "content" / "badges"
REQS_OUT = REPO_ROOT / "src" / "content" / "requirements"


def normalize_obj(o: object) -> object:
    """Fold typographic punctuation to ASCII across every string in the output,
    including raw fields (names, outcomes, related-badge titles) that skip md()."""
    if isinstance(o, str):
        return normalize_text(o)
    if isinstance(o, list):
        return [normalize_obj(x) for x in o]
    if isinstance(o, dict):
        return {k: normalize_obj(v) for k, v in o.items()}
    return o


def names(lst: object) -> list[str]:
    return [x["name"] for x in (lst or []) if isinstance(x, dict) and x.get("name")]


SECTIONS = {"Squirrels", "Beavers", "Cubs", "Scouts", "Explorers", "Network"}
_dropped_branches = 0


def is_other_section_branch(node: dict) -> bool:
    """A requirement node that is a per-section variant for a section other than
    Scouts. Some staged badges (hikes-away, time-on-the-water) list the same
    requirement once per section, titled e.g. 'Beavers' or 'Scouts and Explorers';
    only the Scouts-bearing branch is relevant to a Scouts-only dataset."""
    words = re.findall(r"[A-Za-z]+", node.get("title") or "")
    if not words or not all(w in SECTIONS or w.lower() in ("and", "or") for w in words):
        return False
    return "Scouts" not in words


def scouts_only(nodes: object) -> list[dict]:
    global _dropped_branches
    kept = []
    for n in nodes or []:
        if is_other_section_branch(n):
            _dropped_branches += 1
        else:
            kept.append(n)
    return kept


def uniq(seq: list) -> list:
    out: list = []
    for x in seq:
        if x not in out:
            out.append(x)
    return out


def abs_url(path: str | None) -> str | None:
    if not path:
        return None
    return WWW + path if path.startswith("/") else path


# --- requirements ---
_WORD_N = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
_CHOOSE_RE = re.compile(r"\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+of\s+(these|the following)\b")


def infer_choose_n(title: str, n_children: int) -> int | None:
    """scouts.org.uk often leaves subRequirementsToQualify at 0 even when the
    requirement text says "complete one of these". Recover N from the wording."""
    m = _CHOOSE_RE.search((title or "").lower())
    if not m:
        return None
    tok = m.group(1)
    n = _WORD_N.get(tok, int(tok) if tok.isdigit() else 0)
    return n if 0 < n < n_children else None


def required_of_children(node: dict) -> object:
    kids = node.get("subRequirements") or []
    if not kids:
        return "all"
    n = len(kids)
    # The title's explicit "<N> of these" wording wins over the source count,
    # which scouts.org.uk frequently leaves at 0 or sets inconsistent with the text.
    inferred = infer_choose_n(node.get("title") or "", n)
    if inferred:
        return inferred
    q = node.get("subRequirementsToQualify") or 0
    return q if 0 < q < n else "all"


def emit_requirement(node: dict, badge_id: str, parent_id: str | None, acc: dict) -> str:
    rid = str(node["id"])
    acc[rid] = {
        "badge": badge_id,
        "parent": parent_id,
        "children": [str(c["id"]) for c in (node.get("subRequirements") or [])],
        "title": md(node.get("title")),
        "notes": md(node.get("notes")),
        "optional": bool(node.get("optional")),
        "repeatTimes": node.get("numberOfTimeToComplete") or 1,
        "requiredOfChildren": required_of_children(node),
    }
    for child in node.get("subRequirements") or []:
        emit_requirement(child, badge_id, rid, acc)
    return rid


def group_ids(nodes: object, badge_id: str, acc: dict) -> list[str]:
    return [emit_requirement(n, badge_id, None, acc) for n in (nodes or [])]


# --- badge facets (content fields shared by normal badges and staged stages) ---
def tips_of(node: dict) -> list[dict]:
    out = []
    for t in node.get("tips") or []:
        out.append({"title": md(t.get("title")), "details": md(t.get("details"))})
    return out


def related_of(node: dict) -> list[dict]:
    out = []
    for rb in node.get("relatedBadges") or []:
        if isinstance(rb, dict) and rb.get("title"):
            out.append({"title": rb["title"], "url": abs_url(rb.get("url"))})
    return out


def outcomes_of(node: dict) -> list[dict]:
    out = []
    for o in node.get("outcomes") or []:
        out.append({"label": o.get("outcomeLabel") or o.get("name"), "description": o.get("outcomeDescription")})
    return out


def sponsor_of(node: dict) -> dict | None:
    sb = node.get("supportedBy")
    if not isinstance(sb, dict):
        return None
    logo = (sb.get("logo") or sb.get("image") or {})
    return {"title": sb.get("title"), "url": abs_url(sb.get("url")), "logoUrl": abs_url(logo.get("url"))}


def download_image(image: object, slug: str, dest_dir: Path, no_images: bool) -> dict | None:
    if not isinstance(image, dict) or not image.get("url"):
        return None
    alt = image.get("altText") or ""
    if no_images:
        return None
    ext = (image.get("type") or "png").lower()
    name = f"{slug}.{ext}"
    dest = dest_dir / name
    if not dest.exists():
        dest_dir.mkdir(parents=True, exist_ok=True)
        try:
            req = urllib.request.Request(abs_cms(uncropped(image["url"])), headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                dest.write_bytes(r.read())
        except Exception as exc:  # noqa: BLE001 - keep building without the image
            print(f"  ! image {slug}: {exc}", file=sys.stderr)
            return None
    # relative to the badge's index.json so the Astro image() schema resolves it
    return {"src": f"./{name}", "alt": alt}


def abs_cms(path: str) -> str:
    return CMS + path if path.startswith("/") else path


def uncropped(url: str) -> str:
    """Badge art is ~square. The CMS crops to the requested width x height, and
    some staged badges request a 16:9 banner (e.g. width=800&height=450). Drop
    `height` so the artwork comes back at its native aspect, uncropped."""
    parts = urlsplit(url)
    if not parts.query:
        return url
    kept = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() != "height"]
    return urlunsplit(parts._replace(query=urlencode(kept)))


def build_badge(raw: dict, btype: str, slug: str, reqs: dict, no_images: bool) -> dict:
    badge_id = slug
    staged = raw.get("type") == "stagedBadge"
    facet_src = (raw.get("badges") or []) if staged else [raw]

    badge: dict = {
        "slug": slug,
        "type": btype,
        "badgeType": "Staged" if staged else (raw.get("badgeType") or {}).get("name"),
        "title": raw.get("title"),
        "description": md(raw.get("description")),
        "versionDate": raw.get("versionDate"),
        "sourceUrl": raw.get("canonicalUrl") or abs_url(raw.get("url")),
        # dataset is Scouts-only; keep only the Scouts section, drop the rest.
        "sections": [n for n in uniq([n for s in facet_src for n in names(s.get("sections"))]) if n == "Scouts"],
        "settings": uniq([n for s in facet_src for n in names(s.get("settings"))]),
        "activityTypes": uniq([n for s in facet_src for n in names(s.get("activityTypes"))]),
        "outcomes": uniq([o for s in facet_src for o in outcomes_of(s)]),
        "tips": uniq([t for s in facet_src for t in tips_of(s)]),
        "relatedBadges": uniq([r for s in facet_src for r in related_of(s)]),
    }
    safety = uniq([md(s["safetyAlert"]) for s in facet_src if s.get("safetyAlert")])
    badge["safetyAlert"] = "\n\n".join(safety) or None
    youth = uniq([md(s["youthShapedSuggestions"]) for s in facet_src if s.get("youthShapedSuggestions")])
    badge["youthShapedSuggestions"] = "\n\n".join(youth) or None
    badge["supportedBy"] = sponsor_of(raw) or next((sponsor_of(s) for s in facet_src if sponsor_of(s)), None)

    image = download_image(raw.get("image"), slug, BADGES_OUT / slug, no_images)
    if image:
        badge["image"] = image

    if staged:
        badge["displayTitle"] = raw.get("displayTitle")
        badge["stages"] = [
            {
                "label": st.get("title"),
                "threshold": st.get("optionsToQualify") or 0,
                "requirementsIntro": md(st.get("requirementsIntro")),
                "optionsIntro": md(st.get("optionsIntro")),
                "mandatory": group_ids(scouts_only(st.get("requirements")), badge_id, reqs),
                "optional": group_ids(scouts_only(st.get("optionalRequirements")), badge_id, reqs),
            }
            for st in raw.get("badges") or []
        ]
    else:
        badge["requirementsIntro"] = md(raw.get("requirementsIntro"))
        badge["optionsIntro"] = md(raw.get("optionsIntro"))
        badge["optionsToQualify"] = raw.get("optionsToQualify") or 0
        badge["mandatory"] = group_ids(scouts_only(raw.get("requirements")), badge_id, reqs)
        badge["optional"] = group_ids(scouts_only(raw.get("optionalRequirements")), badge_id, reqs)
    return badge


def verify(badges: list[dict], reqs: dict) -> list[str]:
    errors = []
    ids = set(reqs)
    refs: set[str] = set()
    for b in badges:
        groups = [b.get("mandatory", []), b.get("optional", [])]
        for st in b.get("stages", []) or []:
            groups += [st["mandatory"], st["optional"]]
        for g in groups:
            refs.update(g)
    for rid, r in reqs.items():
        if r["parent"] and r["parent"] not in ids:
            errors.append(f"{rid}: parent {r['parent']} missing")
        for c in r["children"]:
            if c not in ids:
                errors.append(f"{rid}: child {c} missing")
            refs.add(c)
    for ref in refs:
        if ref not in ids:
            errors.append(f"dangling requirement ref {ref}")
    return errors


def run(no_images: bool = False) -> int:
    global _dropped_branches
    _dropped_branches = 0
    if BADGES_OUT.exists():
        shutil.rmtree(BADGES_OUT)
    BADGES_OUT.mkdir(parents=True, exist_ok=True)
    REQS_OUT.mkdir(parents=True, exist_ok=True)
    for f in REQS_OUT.glob("*.json"):
        f.unlink()

    reqs: dict = {}
    badges: list[dict] = []
    for f in sorted(RAW.glob("*.json")):
        btype, _, slug = f.stem.partition("-")
        badge = build_badge(json.loads(f.read_text(encoding="utf-8")), btype, slug, reqs, no_images)
        badges.append(badge)
        badge_dir = BADGES_OUT / slug
        badge_dir.mkdir(parents=True, exist_ok=True)
        (badge_dir / "index.json").write_text(
            json.dumps(normalize_obj(badge), indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    for rid, r in reqs.items():
        (REQS_OUT / f"{rid}.json").write_text(
            json.dumps(normalize_obj(r), indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    errors = verify(badges, reqs)
    print(f"wrote {len(badges)} badges, {len(reqs)} requirements")
    print(f"dropped {_dropped_branches} non-Scouts section-branch requirements")
    if errors:
        print(f"\n{len(errors)} reference errors:", file=sys.stderr)
        for e in errors[:20]:
            print(f"  ! {e}", file=sys.stderr)
        return 1
    print("reference integrity: ok")
    return 0
