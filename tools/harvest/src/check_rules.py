#!/usr/bin/env python3
"""Closed-world validator for the raw badge data in tools/harvest/output/badges-raw/.

Encodes the rules in tools/harvest/docs/badge-data-rules.md as machine-checkable assertions.
Anything the rules don't account for -- an unknown key, an unexpected JSON type,
an enum/const violation, or a broken invariant -- is reported as a violation.

The rules are built up one badge at a time (alphabetical), so early versions
intentionally fail most badges; each failure is the next change-point. Run with
no args for a full pass, or --first to see only the first failing file.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parents[1] / "output" / "badges-raw"

# kind() collapses a JSON value to one of these tags.
def kind(v: object) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, str):
        return "str"
    if isinstance(v, list):
        return "list"
    if isinstance(v, dict):
        return "dict"
    return "other"


# A field spec is a dict: {"kinds": {...}}, optionally with "const", "enum",
# "shape" (for dicts) or "item" (a nested field spec for list elements). A list
# field with no "item" must be empty -- non-empty means an undocumented shape.
N = {"kinds": {"null"}}
STR = {"kinds": {"str"}}
INT = {"kinds": {"int"}}
BOOL = {"kinds": {"bool"}}
CHROME_DICT = {"kinds": {"dict"}, "opaque": True}  # headerOptions etc.: dropped wholesale


def listof(item: dict | None) -> dict:
    return {"kinds": {"list"}, **({"item": item} if item else {})}


def dictof(shape: str) -> dict:
    return {"kinds": {"dict"}, "shape": shape}


REQUIREMENT = "requirement"

SHAPES: dict[str, dict[str, dict]] = {
    "badgeType": {"id": INT, "name": {"kinds": {"str"}, "enum": ["Activity", "Challenge Award", "Staged"]}},
    "image": {
        "url": STR,
        "caption": STR,
        "type": STR,
        "size": INT,
        "width": INT,
        "height": INT,
        "altText": STR,
    },
    "section": {
        "name": STR,
        "id": INT,
        "logo": STR,
        "colour": N,
        "ageRange": STR,
    },
    # Tag ids are dropped (only names are kept), so id kind is left lenient.
    "tag": {"id": {"kinds": {"int", "str"}}, "name": STR},
    "outcomeItem": {
        "id": {"kinds": {"int", "str"}},
        "name": STR,
        "outcomeLabel": STR,
        "outcomeDescription": STR,
    },
    "sponsor": {
        "title": STR,
        "logo": dictof("image"),
        "image": dictof("image"),
        "content": {"kinds": {"dict", "null"}, "opaque": True},
        "url": STR,
        "externalUrl": {"kinds": {"str", "null"}},
        "id": INT,
        "nodeName": STR,
        "type": {"kinds": {"str"}, "const": "sponsor"},
        "assets": N,
        "headerOptions": CHROME_DICT,
        "searchDescription": STR,
        "subHeader": STR,
        "browserTitle": {"kinds": {"str", "null"}},
        "silktide": STR,
        "canonicalUrl": STR,
    },
    "tip": {
        "title": STR,
        "details": STR,
        "id": INT,
        "nodeName": STR,
        "type": {"kinds": {"str"}, "const": "tipBlockListItem"},
        "image": N,
        "assets": N,
        "headerOptions": CHROME_DICT,
        "searchDescription": STR,
        "subHeader": N,
        "browserTitle": N,
        "silktide": N,
        "canonicalUrl": N,
    },
    REQUIREMENT: {
        # CONTENT
        "title": STR,
        "notes": STR,
        "optional": BOOL,
        "subRequirementsToQualify": INT,
        "numberOfTimeToComplete": INT,
        "subRequirements": listof(dictof(REQUIREMENT)),
        "tips": N,
        # IDENTITY / fixed
        "id": INT,
        "nodeName": STR,
        "type": {"kinds": {"str"}, "enum": ["requirementItem", "optionalRequirementItem"]},
        # ALWAYS-NULL
        "image": N,
        "assets": N,
        # CHROME
        "headerOptions": CHROME_DICT,
        "searchDescription": STR,
        "subHeader": STR,
        "browserTitle": N,
        "silktide": STR,
        "canonicalUrl": STR,
    },
    "root:badge": {
        # CONTENT
        "badgeType": dictof("badgeType"),
        "description": STR,
        "outcome": STR,
        "requirementsIntro": STR,
        "optionsIntro": STR,
        "optionsToQualify": INT,
        "sections": {"kinds": {"list", "null"}, "item": dictof("section")},
        "versionDate": STR,
        "requirements": listof(dictof(REQUIREMENT)),
        "optionalRequirements": listof(dictof(REQUIREMENT)),
        "tips": listof(dictof("tip")),
        "image": dictof("image"),
        # CONTENT (optional tag lists)
        "activityTypes": {"kinds": {"list", "null"}, "item": dictof("tag")},
        "outcomes": {"kinds": {"list", "null"}, "item": dictof("outcomeItem")},
        "settings": {"kinds": {"list", "null"}, "item": dictof("tag")},
        "safetyAlert": {"kinds": {"str", "null"}},
        "youthShapedSuggestions": {"kinds": {"str", "null"}},
        # CONTENT (see-also cross-links; only title+url kept, so items are opaque)
        "relatedBadges": {"kinds": {"list", "null"}, "item": {"kinds": {"dict"}, "opaque": True}},
        # ALWAYS-NULL (so far)
        "reasonableAdjustments": N,
        "relatedAward": N,
        "resources": N,
        "supportedBy": {"kinds": {"dict", "null"}, "shape": "sponsor"},
        "activityTags": N,
        "themes": N,
        "options": N,
        "keywords": N,
        "assets": N,
        # IDENTITY
        "umbracoUrlName": STR,
        "url": STR,
        "stageLabel": INT,
        "id": INT,
        "nodeName": STR,
        "title": STR,
        "type": {"kinds": {"str"}, "const": "badge"},
        # CHROME
        "headerOptions": CHROME_DICT,
        "searchDescription": STR,
        "subHeader": STR,
        "browserTitle": {"kinds": {"str", "null"}},
        "silktide": STR,
        "canonicalUrl": STR,
    },
    "root:stagedBadge": {
        # CONTENT
        "displayTitle": STR,
        "description": STR,
        "versionDate": STR,
        "supportedBy": {"kinds": {"dict", "null"}, "shape": "sponsor"},
        "image": dictof("image"),
        "badges": {"kinds": {"list"}, "item": dictof("root:badge")},  # the stages
        # IDENTITY
        "id": INT,
        "nodeName": STR,
        "title": STR,
        "type": {"kinds": {"str"}, "const": "stagedBadge"},
        "assets": N,
        # CHROME
        "headerOptions": CHROME_DICT,
        "searchDescription": STR,
        "subHeader": STR,
        "browserTitle": {"kinds": {"str", "null"}},
        "silktide": STR,
        "canonicalUrl": STR,
    },
}

ROOT_BY_TYPE = {"badge": "root:badge", "stagedBadge": "root:stagedBadge"}


class Report:
    def __init__(self) -> None:
        self.items: list[tuple[str, str, str]] = []

    def add(self, path: str, rule: str, msg: str) -> None:
        self.items.append((path, rule, msg))


def check_field(v: object, spec: dict, path: str, r: Report) -> None:
    k = kind(v)
    if k not in spec["kinds"]:
        r.add(path, "TYPE", f"{k} not in {sorted(spec['kinds'])}")
        return
    if "const" in spec and v != spec["const"]:
        r.add(path, "CONST", f"{v!r} != {spec['const']!r}")
    if "enum" in spec and v not in spec["enum"]:
        r.add(path, "ENUM", f"{v!r} not in {spec['enum']}")
    if k == "dict":
        if spec.get("opaque"):
            return
        check_shape(v, spec["shape"], path, r)
    elif k == "list":
        item = spec.get("item")
        if v and item is None:
            r.add(path, "LIST", "non-empty list with no documented item shape")
        elif item is not None:
            for i, el in enumerate(v):
                check_field(el, item, f"{path}[{i}]", r)


def check_shape(d: dict, shape_name: str, path: str, r: Report) -> None:
    shape = SHAPES[shape_name]
    for key in d:
        if key not in shape:
            r.add(f"{path}.{key}", "UNKNOWN_KEY", f"absent from shape {shape_name}")
    for key, spec in shape.items():
        if key not in d:
            r.add(f"{path}.{key}", "MISSING_KEY", f"required by shape {shape_name}")
        else:
            check_field(d[key], spec, f"{path}.{key}", r)


def walk_requirements(badge: dict):
    """Yield (path, node) for every requirement node, recursively."""
    stack = []
    for grp in ("requirements", "optionalRequirements"):
        for i, node in enumerate(badge.get(grp) or []):
            stack.append((f"${grp}[{i}]", node))
    while stack:
        path, node = stack.pop()
        yield path, node
        if isinstance(node, dict):
            for i, sub in enumerate(node.get("subRequirements") or []):
                stack.append((f"{path}.sub[{i}]", sub))


# --- Invariants (relationships the shape alone can't express) ---
def inv_nodename_title(b: dict, r: Report) -> None:
    if b.get("nodeName") != b.get("title"):
        r.add("$", "R3", f"nodeName {b.get('nodeName')!r} != title {b.get('title')!r}")
    for path, node in walk_requirements(b):
        if isinstance(node, dict) and node.get("nodeName") != node.get("title"):
            r.add(path, "R3", "nodeName != title")


def inv_node_type(b: dict, r: Report) -> None:
    """Top-level optional nodes are optionalRequirementItem; everything else
    (mandatory nodes and all sub-requirements) is requirementItem."""

    def walk(nodes, expected, path):
        for i, n in enumerate(nodes or []):
            if isinstance(n, dict) and n.get("type") != expected:
                r.add(f"{path}[{i}]", "R2", f"type {n.get('type')!r} != {expected!r}")
            if isinstance(n, dict):
                walk(n.get("subRequirements"), "requirementItem", f"{path}[{i}].sub")

    walk(b.get("requirements"), "requirementItem", "$requirements")
    walk(b.get("optionalRequirements"), "optionalRequirementItem", "$optionalRequirements")


def inv_subreq_qualify(b: dict, r: Report) -> None:
    for path, node in walk_requirements(b):
        if not isinstance(node, dict):
            continue
        q = node.get("subRequirementsToQualify") or 0
        n = len(node.get("subRequirements") or [])
        if q < 0:
            r.add(path, "R4", f"subRequirementsToQualify {q} < 0")
        elif n and q > n:
            r.add(path, "R4", f"subRequirementsToQualify {q} > {n} sub-requirements")
        # n == 0 with q > 0 is a known stray count; see R4 in the rules doc.


def inv_options_qualify(b: dict, r: Report) -> None:
    # On staged stages optionsToQualify is the stage threshold (e.g. 50 nights),
    # not a choose-N-of-optional count, so R5 does not apply there.
    if (b.get("badgeType") or {}).get("name") == "Staged":
        return
    q = b.get("optionsToQualify") or 0
    n = len(b.get("optionalRequirements") or [])
    if not (0 <= q <= n):
        r.add("$", "R5", f"optionsToQualify {q} not in 0..{n}")


SECTION_NAMES = {"Squirrels", "Beavers", "Cubs", "Scouts", "Explorers", "Network"}


def inv_sections(b: dict, r: Report) -> None:
    # sections may be null/empty (some awards omit it); when present every name
    # must be a known section. Scope to Scouts comes from enumeration, not here.
    secs = b.get("sections") or []
    for i, s in enumerate(secs):
        name = s.get("name") if isinstance(s, dict) else None
        if name not in SECTION_NAMES:
            r.add(f"$.sections[{i}]", "R7", f"unknown section {name!r}")


INVARIANTS = [inv_nodename_title, inv_node_type, inv_subreq_qualify, inv_options_qualify, inv_sections]


def check_badge(b: dict, r: Report) -> None:
    t = b.get("type")
    root = ROOT_BY_TYPE.get(t)
    if not root:
        r.add("$.type", "R1", f"unknown root type {t!r}")
        return
    check_shape(b, root, "$", r)
    # Invariants run on the badge and, for staged badges, on every stage (each
    # stage is itself a root:badge-shaped document).
    nodes = [b]
    if t == "stagedBadge":
        nodes += [s for s in (b.get("badges") or []) if isinstance(s, dict)]
    for node in nodes:
        for inv in INVARIANTS:
            inv(node, r)


def run(first: bool = False, directory: Path | None = None) -> int:
    directory = directory or RAW_DIR
    files = sorted(directory.glob("*.json"))
    clean = 0
    failing: list[tuple[str, Report]] = []
    for f in files:
        b = json.loads(f.read_text(encoding="utf-8"))
        r = Report()
        check_badge(b, r)
        if r.items:
            failing.append((f.name, r))
        else:
            clean += 1

    if first and failing:
        name, r = failing[0]
        print(f"first failing: {name}  ({len(r.items)} violations)")
        for path, rule, msg in r.items:
            print(f"  [{rule}] {path}: {msg}")
    elif not first:
        for name, r in failing:
            print(f"FAIL {name}  ({len(r.items)})")
            for path, rule, msg in r.items[:12]:
                print(f"  [{rule}] {path}: {msg}")
            if len(r.items) > 12:
                print(f"  ... +{len(r.items) - 12} more")

    print(f"\n{clean}/{len(files)} conform; {len(failing)} failing")
    return 1 if failing else 0
