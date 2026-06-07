# cli.py - entry point

The single entry point for the tool. Run it with a subcommand for automation, or
with no arguments for an interactive menu.

```sh
python3 tools/harvest/src/cli.py            # interactive menu
python3 tools/harvest/src/cli.py dump --live
python3 tools/harvest/src/cli.py build
python3 tools/harvest/src/cli.py check --first
python3 tools/harvest/src/cli.py render activity-cyclist
python3 tools/harvest/src/cli.py all --live
```

## Subcommands

| command | does | options |
| --- | --- | --- |
| `dump` | fetch raw badge JSON -> `output/badges-raw/` | `--live`, `--delay N` |
| `build` | generate the Astro collections | `--no-images` |
| `check` | validate raw data against the rules | `--first` |
| `render` | print a badge brief | `<slug>` (e.g. `activity-cyclist`) |
| `all` | `dump` -> `build` -> `check` | `--live`, `--no-images` |

## Interactive menu

Running with no subcommand lists the same actions and prompts for the few options
(fetch live? skip images? which slug?). `q` quits.

## Calling from Python

Each command is a thin wrapper over a module `run()`, so the steps are usable
in-process too:

```python
import dump_raw, build_collections, check_rules, render_badge

dump_raw.run(live=True)
build_collections.run(no_images=False)
check_rules.run(first=True)
print(render_badge.render_slug("activity-cyclist"))
```

Per-step detail: [dump_raw](dump_raw.md), [build_collections](build_collections.md),
[check_rules](check_rules.md), [render_badge](render_badge.md), shared
[core](core.md), and the data spec [badge-data-rules](badge-data-rules.md).
