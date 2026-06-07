# Badge data: RULES & UNDERSTANDINGS

Empirically derived from `tools/harvest/output/badges-raw/` (raw `cms.scouts.org.uk` JSON), one badge
at a time in alphabetical order, and machine-checked by `tools/harvest/src/check_rules.py`
(closed-world: anything unaccounted for is a violation).

These rules are the spec for rebuilding the harvester transform and the Astro
schema. Each field carries an **Astro implication**: keep / drop / reshape.

**Status:** complete (v14) — all 90 raw badges conform to these rules
(`python3 tools/harvest/src/cli.py check` -> `90/90 conform`). The validator is
closed-world and verified to catch injected breakage (unknown keys, wrong types,
bad enums, broken invariants), so it doubles as a drift detector for future live
re-harvests.

## Field classes

- **CONTENT** — meaningful badge data. Keep.
- **IDENTITY** — ids, urls, titles. Keep what's useful for linking/sourcing.
- **ALWAYS-NULL** — `null` in every badge seen so far. Drop (pending final pass).
- **CHROME** — CMS/SEO plumbing. Drop.

## Document shapes

A badge document is dispatched on its `type`:

- **`badge`** — a normal badge (activity / challenge / top award), requirements
  at the top level. Detailed below.
- **`stagedBadge`** — a wrapper whose `badges[]` holds the stages. Each stage is
  itself a `type: "badge"` document (same shape) with `badgeType.name == "Staged"`.
  The wrapper carries only `displayTitle`, `description`, `image`, `supportedBy`
  + chrome; all requirement content lives in the stages. Astro: flatten to one
  badge with a `stages[]` array.

### Root `type: "badge"`

| field | kind(s) | class | rule / Astro implication |
| --- | --- | --- | --- |
| `badgeType` | dict | CONTENT | `{id:int, name}` — `name` enum (`Activity` so far). Keep `name` as badge category. |
| `description` | str | CONTENT | Plain blurb. Keep. |
| `outcome` | str | CONTENT | Often `""`. Keep if non-empty. |
| `requirementsIntro` | str | CONTENT | HTML; often `""`. Keep -> markdown. |
| `optionsIntro` | str | CONTENT | HTML; often `""`. Keep -> markdown. |
| `optionsToQualify` | int | CONTENT | On normal badges: complete N of `optionalRequirements` (R5). On staged stages: the **stage threshold** (e.g. 50 nights). Keep; interpret by type. |
| `sections` | list<section>\|null | CONTENT | Sections the badge applies to (multi-section); may be null on awards. See R7. Keep names. |
| `versionDate` | str | CONTENT | Free text e.g. `January 2015`. Keep as-is. |
| `requirements` | list<requirement> | CONTENT | Mandatory list (do all). Keep -> tree. |
| `optionalRequirements` | list<requirement> | CONTENT | Choose-`optionsToQualify`-of pool; same node shape as `requirements`. Keep -> tree. |
| `tips` | list<tip> | CONTENT | Badge-level leader tips (`tipBlockListItem`). Keep `title`+`details` -> markdown. |
| `image` | dict | CONTENT | `{url, caption, type, size, width, height, altText}`. Keep url+altText. |
| `activityTypes` | list<tag>\|null | CONTENT | `{id,name}` tags, e.g. "Practical skills". Keep names (filterable). |
| `outcomes` | list<outcomeItem>\|null | CONTENT | Learning outcomes (`outcomeLabel`+`outcomeDescription`). Keep. |
| `reasonableAdjustments` | null | ALWAYS-NULL | Drop. |
| `relatedAward` | null | ALWAYS-NULL | Drop. |
| `relatedBadges` | list\|null | CONTENT | See-also cards for other badges (any section). Keep `title`+`url`; validated opaquely. |
| `resources` | null | ALWAYS-NULL | Drop. |
| `safetyAlert` | str\|null | CONTENT | Safety warning when present. Keep -> markdown. |
| `settings` | list<tag>\|null | CONTENT | Where it runs (Indoors/Outdoors/At camp). Keep names (useful for planning). |
| `supportedBy` | dict\|null | CONTENT | `sponsor` object when present. Keep `title` (+ logo url); drop the rest. |
| `youthShapedSuggestions` | str\|null | CONTENT | Youth-led activity ideas when present. Keep -> markdown. |
| `activityTags` | null | ALWAYS-NULL | Drop. |
| `themes` | null | ALWAYS-NULL | Drop. |
| `options` | null | ALWAYS-NULL | Drop (the choose-N mechanism is `optionalRequirements`, not this). |
| `keywords` | null | ALWAYS-NULL | Drop. |
| `assets` | null | ALWAYS-NULL | Drop. |
| `umbracoUrlName` | str | IDENTITY | Often `""`. Drop. |
| `url` | str | IDENTITY | Path e.g. `/scouts/activity-badges/<slug>/`. Keep as source/slug. |
| `stageLabel` | int | IDENTITY | `0` for non-staged. Reshape (meaningful only for stages). |
| `id` | int | IDENTITY | Umbraco node id. Drop. |
| `nodeName` | str | IDENTITY | Equals `title` (R3). Drop. |
| `title` | str | IDENTITY | Badge name. Keep. |
| `type` | str | IDENTITY | const `badge`. Drives shape; drop from output. |
| `headerOptions` | dict | CHROME | Drop. |
| `searchDescription` | str | CHROME | Drop. |
| `subHeader` | str | CHROME | Drop. |
| `browserTitle` | str\|null | CHROME | Drop. |
| `silktide` | str | CHROME | Base64 CMS editor blob. Drop. |
| `canonicalUrl` | str | CHROME | Full public URL; `url` already covers sourcing. Drop. |

### Requirement node `type: "requirementItem"`

Used by `requirements`, `optionalRequirements`, and `subRequirements` (recursive).

| field | kind(s) | class | rule / Astro implication |
| --- | --- | --- | --- |
| `title` | str | CONTENT | The requirement text. Keep. |
| `notes` | str | CONTENT | HTML elaboration; often `""`. Keep -> markdown. |
| `optional` | bool | CONTENT | Keep. |
| `subRequirementsToQualify` | int | CONTENT | "do N of `subRequirements`". See R4. Keep. |
| `numberOfTimeToComplete` | int | CONTENT | Repeat count (note source spelling: no `s`). Keep (rename `numberOfTimesToComplete`). |
| `subRequirements` | list<requirement> | CONTENT | Recursive. Keep -> tree. |
| `tips` | null | ALWAYS-NULL | Drop (so far). |
| `id` | int | IDENTITY | Drop. |
| `nodeName` | str | IDENTITY | Equals `title` (R3). Drop. |
| `type` | str | IDENTITY | `requirementItem`, or `optionalRequirementItem` at the top of `optionalRequirements` (R2). Drop. |
| `image` | null | ALWAYS-NULL | Drop. |
| `assets` | null | ALWAYS-NULL | Drop. |
| `headerOptions` | dict | CHROME | Drop. |
| `searchDescription` | str | CHROME | Drop. |
| `subHeader` | str | CHROME | Drop. |
| `browserTitle` | null | CHROME | Drop. |
| `silktide` | str | CHROME | Drop. |
| `canonicalUrl` | str | CHROME | Drop. |

### Nested shapes

- **badgeType**: `{id:int, name:str}`.
- **image**: `{url, caption, type, size:int, width:int, height:int, altText}`.
- **section**: `{name, id:int, logo, colour:null, ageRange}`. `name` is one of the
  six sections (Squirrels, Beavers, Cubs, Scouts, Explorers, Network).
- **tag** (`activityTypes`, `settings`): `{id, name}` (id int|str; dropped anyway).
- **outcomeItem** (`outcomes`): `{id, name, outcomeLabel, outcomeDescription}`.
- **tip** (`tipBlockListItem`): CONTENT `title`+`details`; rest IDENTITY/CHROME/null.
- **sponsor** (`type: sponsor`): CONTENT `title`, `logo`/`image` (image shape),
  `url`, `externalUrl`; `content` is an opaque CMS layout blob (drop).
- **headerOptions** (CHROME): an SEO/header block. Dropped wholesale, so the
  validator treats it as an opaque dict rather than checking its sub-keys (it is
  mostly null on badges but populated on sponsors).

## Invariants

- **R1** — root `type` is `badge` or `stagedBadge`. A `stagedBadge`'s `badges[]`
  stages are each a `type: badge` document and are validated as such.
- **R2** — node `type` follows position: top-level `optionalRequirements` items
  are `optionalRequirementItem`; mandatory nodes and all `subRequirements` are
  `requirementItem`.
- **R3** — `nodeName == title` on the badge and every requirement node.
- **R4** — `subRequirementsToQualify >= 0`, and when `subRequirements` is
  non-empty it must be `<= len(subRequirements)`. Some badges (e.g.
  `air-researcher`, `environmental-conservation`) set it `> 0` with **no**
  sub-requirements: a stray legacy count. Astro: ignore the count unless there
  are sub-requirements.
- **R5** — on non-staged badges, `0 <= optionsToQualify <= len(optionalRequirements)`.
  On staged stages (`badgeType.name == "Staged"`) `optionsToQualify` is instead
  the stage threshold (nights/hikes/etc.) and is unrelated to the optional count.
- **R6** — `badgeType.name` is one of `Activity`, `Challenge Award` (staged stages add `Staged`).
- **R7** — `sections` is a list (possibly empty) or `null`; when present, every
  section name is one of the six known sections. Badges are multi-section; some
  awards (e.g. `earth-tribe-award`) omit sections entirely. Scope to Scouts is
  guaranteed by the harvester's enumeration, not by this field.

## Confirmed ALWAYS-NULL across all 90

Safe to drop: `reasonableAdjustments`, `relatedAward`, `resources`,
`activityTags`, `themes`, `options`, `keywords`, `assets` (badge level); and
`tips`, `image`, `assets` (requirement level). (`relatedAward` here is null even
though the singular award link is absent; cross-links live in `relatedBadges`.)

## Known exceptions

None outstanding. The only data quirk is the stray `subRequirementsToQualify`
with no sub-requirements, folded into R4.

## Astro target shape

The schema this drives, after transform (HTML -> markdown, chrome/null dropped,
staged flattened):

```
Badge {
  slug            # last segment of url
  type            # our enumeration: activity | staged | challenge | top
  badgeType       # source name: Activity | Challenge Award | Staged
  title
  displayTitle?   # staged wrapper only
  description     # md
  sections        # string[] names (may be empty)
  settings        # string[] names (Indoors/Outdoors/At camp)
  activityTypes   # string[] names
  outcomes        # { label, description }[]
  safetyAlert?    # md
  youthShapedSuggestions?  # md
  supportedBy?    # { title, url, logoUrl }
  tips            # { title, details(md) }[]
  relatedBadges   # { title, url }[]
  image           # { src, alt }
  versionDate     # free text
  sourceUrl       # url
  # non-staged:
  requirementsIntro? optionsIntro?         # md
  optionsToQualify                         # choose N of optionalRequirements
  requirements: Requirement[]              # do all
  optionalRequirements: Requirement[]      # choose optionsToQualify of these
  # staged:
  stages?: Stage[]                         # each a Requirement-bearing block;
                                           # stage.optionsToQualify = threshold
}

Requirement {
  title
  notes           # md
  optional
  numberOfTimesToComplete                  # source key: numberOfTimeToComplete
  subRequirementsToQualify                 # do N of subRequirements (ignore if none)
  subRequirements: Requirement[]
}
```
