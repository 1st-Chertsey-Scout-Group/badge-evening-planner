# core

Shared library imported by the other modules - no CLI of its own.

## Fetching

- `Fetcher(har, live, delay)` - HTTP client with a read-through HAR cache. With a
  HAR it serves cached responses and only hits the network on a miss; `live=True`
  ignores the cache. `get_json` / `get_text` / `get_bytes` / `post_search`.
- `search_key(fetcher)` - the Azure Search query key, scraped from the live JS
  bundle, falling back to the `SCOUTS_SEARCH_KEY` env var (errors if neither
  yields a key).

## Enumeration

- `enumerate_targets(fetcher)` - discovers every in-scope badge as
  `(url_path, type)` pairs (Azure Search for activity/staged; `/scouts/awards/`
  for challenge awards; the Chief Scout's Gold Award pinned).
- `listing_slugs`, `detail_url`, `slug_of` - URL helpers.

## Text

- `md(value)` - HTML fragment -> Markdown, then ASCII-normalised.
- `normalize_text(s)` - fold typographic punctuation and accents to ASCII;
  the pound sign is kept.

## Notes

`www.scouts.org.uk` is behind Cloudflare and rejects scripted requests; the open
`cms.scouts.org.uk` JSON API is used for all detail. The Azure key scrape needs
the www JS bundle, so on `--live` runs it falls back to the captured key if
Cloudflare blocks it.
