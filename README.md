# Badge Evening Planner

A static site for tracking progress through Scouts (UK) section badges: browse
badges, read the requirements, tick them off, and see how much of each badge is
left. Progress is saved in your browser - no account, no server.

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
