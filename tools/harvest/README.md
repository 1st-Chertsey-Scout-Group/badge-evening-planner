# Scouts badge harvest tool

A standalone tool that harvests Scouts (UK) section badges and their requirements
from scout.org.uk and generates the Astro content collections this handbook uses.

## What it produces

- `src/content/badges/` - 90 badges (activity, staged, the nine challenge awards,
  and the Chief Scout's Gold Award), each with metadata and ordered links into
  the requirement tree.
- `src/content/requirements/` - ~1,237 individually addressable requirement
  nodes, so a programme/meeting can later reference exactly what it covers.

Scoped to Scouts only. Out of scope: programme activities, other sections'
variants, and the participation/core awards (Joining In, Membership, Moving On).

## Layout

```
tools/harvest/
  src/           Python (run via cli.py)
    cli.py            single entry point (subcommands + interactive menu)
    core.py           shared library: fetch, enumerate, text -> ASCII/markdown
    dump_raw.py       live/HAR -> output/badges-raw/
    build_collections.py  badges-raw -> src/content/{badges,requirements}
    check_rules.py    closed-world validator of the raw data
    render_badge.py   human-readable badge brief
  docs/          one doc per tool + the data spec
  output/        generated raw cache (gitignored)
  requirements.txt    none - Python 3 standard library only
```

## Quick start

```sh
# one-shot pipeline: fetch -> generate -> validate
python3 tools/harvest/src/cli.py all

# or step by step
python3 tools/harvest/src/cli.py dump --live    # refetch from the live site
python3 tools/harvest/src/cli.py build
python3 tools/harvest/src/cli.py check

# interactive menu (no subcommand)
python3 tools/harvest/src/cli.py
```

## Pipeline

1. **dump** - discover badges and cache the raw API JSON to `output/badges-raw/`.
2. **build** - transform that into the two Astro collections (+ images).
3. **check** - validate the raw cache against the rules (also a drift detector).
4. **render** - spot-check a single badge as readable text.

## Docs

- [cli](docs/cli.md) - the entry point: subcommands, interactive menu, Python API
- [dump_raw](docs/dump_raw.md) - fetch + cache the raw API JSON
- [build_collections](docs/build_collections.md) - generate the Astro collections
- [check_rules](docs/check_rules.md) - validate the raw data
- [render_badge](docs/render_badge.md) - human-readable badge brief
- [core](docs/core.md) - shared fetch/enumerate/text library
- [badge-data-rules](docs/badge-data-rules.md) - the data spec (field classes,
  shapes, invariants, and the Astro target shape)
