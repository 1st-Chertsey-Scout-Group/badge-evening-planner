# Badge Evening Planner

A static site for planning Scouts (UK) evenings around badges. A base is one
activity you run on an evening (the Scouting sense of the word - a station scouts
rotate around), each tied to the badge requirements it covers. Build an evening
from a set of bases and see which requirements and badges it would complete. The
plan is the only source of completion: a requirement counts as done when a base
in your plan covers it - there is no separate progress tracking. Everything is
saved in your browser - no account, no server.

## Bases and planning

- A base is authored as `src/content/bases/<slug>/index.md` (folder per base,
  like badges, so images and files sit alongside). Frontmatter lists the leaf
  requirements it covers (across any badge), plus duration, equipment and tags;
  the markdown body holds the run instructions.
- `/bases` browses the library; `/bases/new` is a builder that lets you tick
  requirements off a badge and exports the `index.md` to commit.
- `/plan` is the evening planner: add bases to the plan, set a target length, and
  see per-badge coverage and the aggregated kit list. Save the working plan as a
  named evening to reopen later.
- A badge page shows its requirements ticked off by whichever bases are in your
  current plan, naming the base that covers each one.

## Stack

- Astro 5 (static output), strict TypeScript, `@/*` -> `src/*`.
- Tailwind v4, self-hosted Nunito Sans.
- Preact islands for the interactive parts only.
- pnpm.

## Develop

```sh
pnpm install
pnpm dev        # local dev server
pnpm build      # static build to ./dist
pnpm preview    # serve the build
pnpm astro check
pnpm test       # run the unit tests
```

## Badge data

Badge content lives in two committed content collections under `src/content/`
(`badges/<slug>/index.json` + colocated image, and `requirements/<id>.json`).
They are generated from scouts.org.uk by the harvester in `tools/harvest/`;
re-run `python3 tools/harvest/src/cli.py all` to refresh them.
