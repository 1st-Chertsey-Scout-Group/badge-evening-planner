# check_rules

Closed-world validator for the raw cache. Encodes the rules in
[badge-data-rules](badge-data-rules.md) as machine-checkable assertions: anything
unaccounted for - an unknown key, an unexpected JSON type, an enum/const
violation, or a broken invariant - is reported.

## Run

```sh
python3 tools/harvest/src/cli.py check
python3 tools/harvest/src/cli.py check --first   # only the first failing file
```

From Python: `check_rules.run(first=False, directory=None)` (returns `0` when all
conform, else `1`).

## Output

A per-file list of violations and a summary line, e.g. `90/90 conform; 0 failing`.

## Why closed-world

It doubles as a drift detector: when Scouts changes its data model on a future
live re-harvest, new or changed fields surface as violations instead of silently
passing through. The validator has been checked to catch injected breakage
(unknown keys, wrong types, bad enums, broken invariants).

The rules themselves (field classes, shapes, invariants R1-R7, the Astro target
shape) are documented in [badge-data-rules](badge-data-rules.md).
