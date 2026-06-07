#!/usr/bin/env python3
"""Dump every in-scope Scouts badge's unmodified cms.scouts.org.uk JSON to
output/badges-raw/ -- the raw cache everything else is derived from and checked
against. See tools/harvest/docs/dump_raw.md.
"""

from __future__ import annotations

import json
from pathlib import Path

from core import Fetcher, detail_url, enumerate_targets, slug_of

TOOL_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HAR = TOOL_ROOT / "scout org uk - all badges.har"
DEFAULT_OUT = TOOL_ROOT / "output" / "badges-raw"


def run(live: bool = False, delay: float = 1.0, har: Path | None = None, out: Path | None = None) -> int:
    out = out or DEFAULT_OUT
    har = DEFAULT_HAR if har is None else har
    fetcher = Fetcher(har if not live else None, live, delay)
    out.mkdir(parents=True, exist_ok=True)

    written = 0
    for url_path, btype in enumerate_targets(fetcher):
        raw = fetcher.get_json(detail_url(url_path))
        (out / f"{btype}-{slug_of(url_path)}.json").write_text(
            json.dumps(raw, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        written += 1

    print(f"wrote {written} raw badges to {out}")
    if fetcher.misses:
        print(f"({fetcher.misses} cache misses fetched live)")
    return written
