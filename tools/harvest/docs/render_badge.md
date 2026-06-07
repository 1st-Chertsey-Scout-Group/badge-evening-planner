# render_badge

Renders a raw badge into a human-readable brief, applying the rules (do-all vs
choose-N vs sub-choices vs staged stages). Useful for eyeballing that a badge's
requirements parse correctly.

## Run

```sh
python3 tools/harvest/src/cli.py render activity-cyclist
python3 tools/harvest/src/cli.py render staged-emergency-aid
```

The slug is the raw filename without `.json` (`<type>-<slug>`).

From Python:

- `render_badge.render_slug(slug)` - returns the brief as a string.
- `render_badge.render(badge_dict)` - render an already-loaded raw badge.
- `render_badge.available()` - list the slugs present in the raw cache.

## Output

Plain text: title + category/sections/settings, description, safety alert, then
`Do ALL of these:` / `Then choose N of these:` blocks with nested
`choose N of these:` / `all of these:` sub-lists, plus tips and sponsor.

Note: requirement `notes` that contain their own HTML lists are flattened to one
line here; the structured tree is intact - the Astro render keeps notes as
markdown.
