# build_collections

Transforms the raw cache (`tools/harvest/output/badges-raw/`) into the two Astro
content collections at the repo root.

## Run

```sh
python3 tools/harvest/src/cli.py build
python3 tools/harvest/src/cli.py build --no-images
```

From Python: `build_collections.run(no_images=False)`. Stdlib only. Reports counts
and runs a reference-integrity check before returning.

## Output

- `src/content/badges/<slug>/index.json` - 90 badges (metadata + ordered ref
  lists into the requirement tree). Entry id is the bare slug (unique across
  types); the `type` field carries activity/staged/challenge/top.
- `src/content/badges/<slug>/<slug>.<ext>` - the badge image, colocated with its
  entry so the Astro `image()` schema helper resolves `./<slug>.<ext>`
  (downloaded live from cms; cached, skipped if present).
- `src/content/requirements/<sourceId>.json` - ~1,237 requirement nodes, keyed by
  Umbraco source id, linked by `badge` / `parent` / `children` refs (`badge` is
  the slug).

The output is committed to the repo; re-run this command to refresh it after a
re-harvest. The schema it satisfies is `src/content.config.ts`.

## What it does

- HTML prose -> Markdown; chrome and always-null fields dropped (see
  [badge-data-rules](badge-data-rules.md)).
- Staged badges collapse to one badge with `stages[]`; each stage's
  `optionsToQualify` becomes its `threshold` (e.g. 50 nights).
- "Choose N vs all" is carried on the parent: `badge.optionsToQualify` over
  `optional[]`, and `requirement.requiredOfChildren` over `children[]` (`'all'`
  when every child is required).
- Per-section requirement branches in `hikes-away` / `time-on-the-water` are
  filtered to the Scouts-bearing branch only; badge `sections` trimmed to Scouts.
- All text normalised to ASCII (typographic punctuation and accents folded; the
  pound sign kept) via `normalize_text` in [core](core.md).
