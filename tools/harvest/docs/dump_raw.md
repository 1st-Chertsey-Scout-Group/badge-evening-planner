# dump_raw

Fetches every in-scope Scouts badge's unmodified `cms.scouts.org.uk` JSON and
writes it to `tools/harvest/output/badges-raw/<type>-<slug>.json`. This raw cache
is the substrate everything else is derived from and checked against.

## Run

```sh
python3 tools/harvest/src/cli.py dump          # from the captured HAR (offline)
python3 tools/harvest/src/cli.py dump --live   # refetch from the live site
```

From Python: `dump_raw.run(live=False, delay=1.0, har=None, out=None)`.

- `--live` / `live=True` - ignore the HAR cache and fetch from the live site.
- `--delay` / `delay` - seconds between live requests (default 1.0).

## Output

90 files: 64 activity, 15 staged, 10 challenge, 1 top - each the API response
verbatim, no transformation. (Gitignored; under `output/`.)

## How badges are discovered

- Activity + staged: the Azure Search index, filtered to `type=Badge`,
  `sub_type in (Activity, StagedBadgeParent)`, `sections=Scouts`.
- Challenge awards: the `/scouts/awards/` listing, kept where `badgeType` is
  `Challenge Award`.
- Top award: the Chief Scout's Gold Award (pinned; shares the Challenge Award
  type so cannot be auto-discovered).

Enumeration and the read-through fetcher live in [core](core.md).
