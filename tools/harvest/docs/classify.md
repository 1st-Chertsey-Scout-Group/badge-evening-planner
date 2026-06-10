# classify

Seeds the suitability overlay: classifies each leaf requirement as `evening` /
`over-time` / `unsuitable` for this troop, writing `data/suitability/<badge>.json`
(req id -> category). `build_collections` later merges these onto the generated
requirements (see [build_collections](build_collections.md)).

The classification is troop-specific - it judges every requirement against
`data/facility-profile.md`, not a generic troop. Edit that file to change what the
troop can run, then re-run.

## Run

```sh
python3 tools/harvest/src/cli.py classify              # every badge with blanks
python3 tools/harvest/src/cli.py classify --badge chef # one badge
```

Needs `ANTHROPIC_API_KEY` in the environment. Calls the Claude API directly over
the standard library (no SDK dependency); the model is `claude-haiku-4-5`.

## Fills blanks only

A leaf already present in `data/suitability/<badge>.json` is left untouched. So:

- Hand-edit any category you disagree with; a re-run will not overwrite it.
- A re-harvest that adds a new badge can be seeded with one `classify` run -
  existing categories stay put, only the new blanks are filled.

`data/suitability/` is the durable source of truth. To reclassify a leaf from
scratch, delete its entry (or the whole file) and re-run.
