#!/usr/bin/env python3
"""Single entry point for the Scouts badge harvest tool.

Run with a subcommand for automation, or with no arguments for an interactive
menu. See tools/harvest/docs/README in the repo for the full guide.

    python3 tools/harvest/src/cli.py            # interactive menu
    python3 tools/harvest/src/cli.py dump --live
    python3 tools/harvest/src/cli.py build
    python3 tools/harvest/src/cli.py check --first
    python3 tools/harvest/src/cli.py render activity-cyclist
    python3 tools/harvest/src/cli.py all --live
"""

from __future__ import annotations

import argparse
import sys

import build_collections
import check_rules
import dump_raw
import render_badge


def cmd_dump(args: argparse.Namespace) -> int:
    dump_raw.run(live=args.live, delay=args.delay)
    return 0


def cmd_build(args: argparse.Namespace) -> int:
    return build_collections.run(no_images=args.no_images)


def cmd_check(args: argparse.Namespace) -> int:
    return check_rules.run(first=args.first)


def cmd_render(args: argparse.Namespace) -> int:
    print(render_badge.render_slug(args.slug))
    return 0


def cmd_all(args: argparse.Namespace) -> int:
    print("== dump ==")
    dump_raw.run(live=args.live)
    print("\n== build ==")
    build_collections.run(no_images=args.no_images)
    print("\n== check ==")
    return check_rules.run()


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="harvest", description="Scouts badge harvest tool")
    sub = p.add_subparsers(dest="command")

    d = sub.add_parser("dump", help="fetch raw badge JSON -> output/badges-raw/")
    d.add_argument("--live", action="store_true", help="refetch from the live site (ignore the HAR cache)")
    d.add_argument("--delay", type=float, default=1.0, help="seconds between live requests")
    d.set_defaults(func=cmd_dump)

    b = sub.add_parser("build", help="generate the Astro badges + requirements collections")
    b.add_argument("--no-images", action="store_true", help="skip downloading badge images")
    b.set_defaults(func=cmd_build)

    c = sub.add_parser("check", help="validate the raw data against the rules")
    c.add_argument("--first", action="store_true", help="show only the first failing file")
    c.set_defaults(func=cmd_check)

    r = sub.add_parser("render", help="print a human-readable brief for one badge")
    r.add_argument("slug", help="badge id, e.g. activity-cyclist")
    r.set_defaults(func=cmd_render)

    a = sub.add_parser("all", help="dump -> build -> check")
    a.add_argument("--live", action="store_true", help="refetch from the live site")
    a.add_argument("--no-images", action="store_true", help="skip downloading badge images")
    a.set_defaults(func=cmd_all)

    return p


# --- interactive menu (no subcommand) ---
def _yes(prompt: str) -> bool:
    return input(f"{prompt} [y/N] ").strip().lower().startswith("y")


def interactive() -> int:
    actions = {
        "1": ("dump   - fetch raw badge JSON", lambda: dump_raw.run(live=_yes("Fetch live?"))),
        "2": ("build  - generate Astro collections", lambda: build_collections.run(no_images=_yes("Skip images?"))),
        "3": ("check  - validate raw data against the rules", lambda: check_rules.run()),
        "4": ("render - print a badge brief", _interactive_render),
        "5": ("all    - dump -> build -> check", _interactive_all),
    }
    while True:
        print("\nScouts badge harvest tool")
        for key, (label, _) in actions.items():
            print(f"  {key}) {label}")
        print("  q) quit")
        choice = input("> ").strip().lower()
        if choice in ("q", "quit", ""):
            return 0
        action = actions.get(choice)
        if not action:
            print("unknown choice")
            continue
        try:
            action[1]()
        except Exception as exc:  # noqa: BLE001 - keep the menu alive on errors
            print(f"error: {exc}", file=sys.stderr)


def _interactive_render() -> None:
    slugs = render_badge.available()
    if not slugs:
        print("no badges found - run dump + build first")
        return
    print(f"{len(slugs)} badges, e.g. {', '.join(slugs[:5])} ...")
    slug = input("slug: ").strip()
    if slug in slugs:
        print(render_badge.render_slug(slug))
    else:
        print("unknown slug")


def _interactive_all() -> None:
    live = _yes("Fetch live?")
    dump_raw.run(live=live)
    build_collections.run()
    check_rules.run()


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "command", None):
        return interactive()
    return args.func(args) or 0


if __name__ == "__main__":
    raise SystemExit(main())
