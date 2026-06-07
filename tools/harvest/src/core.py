#!/usr/bin/env python3
"""Harvest Scouts (UK) section badges and their requirements into the Astro
content collection at src/content/badges/.

Sources, all public and unauthenticated:
  - Azure Search suggester index -> the list of activity + staged badges.
  - cms.scouts.org.uk JSON API    -> each badge's full detail + requirement tree.
  - /scouts/awards/ and /top-awards/ listing pages -> challenge and top awards.

A captured .har is used as a read-through cache so the first build runs offline
with zero load on scouts.org.uk; any URL missing from it falls through to a live
request. Pass --live to ignore the cache and refetch everything from the site.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

WWW = "https://www.scouts.org.uk"
CMS = "https://cms.scouts.org.uk"
SEARCH_URL = (
    "https://tsa-homesite-umbraco-prod-srch.search.windows.net"
    "/indexes/umb-core-prod-suggester/docs/search?api-version=2021-04-30-Preview"
)
SEARCH_FILTER = (
    "search.in(type, 'Badge', ',') "
    "and search.in(sub_type, 'StagedBadgeParent,Activity', ',') "
    "and group_permissions/any(s: search.in(s, 'PUBLIC', ',')) "
    "and sections/any(t: t eq 'Scouts')"
)
# The Scouts section has a single top award; it shares the "Challenge Award" CMS
# badgeType, so it can't be discovered by filtering the awards listing.
TOP_AWARD_SLUGS = ["chief-scout-s-gold-award"]

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
HEADERS = {"User-Agent": UA, "Accept": "application/json, text/html;q=0.9"}


class Fetcher:
    """Read-through HTTP cache seeded from a HAR file."""

    def __init__(self, har_path: Path | None, live: bool, delay: float):
        self.live = live
        self.delay = delay
        self.get_cache: dict[str, bytes] = {}
        self.post_cache: dict[tuple[str, str], str] = {}
        self.misses = 0
        if har_path and har_path.exists():
            self._load_har(har_path)

    def _load_har(self, path: Path) -> None:
        with path.open(encoding="utf-8") as f:
            har = json.load(f)
        for e in har["log"]["entries"]:
            req, res = e["request"], e["response"]
            content = res.get("content", {})
            text = content.get("text")
            if text is None:
                continue
            if content.get("encoding") == "base64":
                body = base64.b64decode(text)
            else:
                body = text.encode("utf-8")
            url = req["url"]
            if req["method"] == "GET":
                # Key media by path only; the site requests assorted ?width= variants.
                self.get_cache.setdefault(url, body)
                self.get_cache.setdefault(_strip_query(url), body)
            elif req["method"] == "POST":
                pd = (req.get("postData") or {}).get("text", "")
                self.post_cache[(_strip_query(url), _norm_json(pd))] = body.decode(
                    "utf-8", "replace"
                )

    def get_bytes(self, url: str) -> bytes:
        if not self.live:
            hit = self.get_cache.get(url) or self.get_cache.get(_strip_query(url))
            if hit is not None:
                return hit
            self.misses += 1
        return self._live_get(url)

    def get_text(self, url: str) -> str:
        return self.get_bytes(url).decode("utf-8", "replace")

    def get_json(self, url: str) -> dict:
        return json.loads(self.get_text(url))

    def post_search(self, body: dict, key: str) -> dict:
        norm = _norm_json(json.dumps(body))
        if not self.live:
            hit = self.post_cache.get((_strip_query(SEARCH_URL), norm))
            if hit is not None:
                return json.loads(hit)
            self.misses += 1
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            SEARCH_URL,
            data=data,
            headers={**HEADERS, "Content-Type": "application/json", "api-key": key},
        )
        time.sleep(self.delay)
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8", "replace"))

    def _live_get(self, url: str) -> bytes:
        req = urllib.request.Request(url, headers=HEADERS)
        time.sleep(self.delay)
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()


def _strip_query(url: str) -> str:
    return url.split("?", 1)[0]


def _norm_json(text: str) -> str:
    try:
        return json.dumps(json.loads(text), sort_keys=True)
    except (ValueError, TypeError):
        return text.strip()


def search_key(fetcher: Fetcher) -> str:
    """Scrape the Azure query key from the live JS bundle; fall back to env."""
    env = os.environ.get("SCOUTS_SEARCH_KEY")
    if env:
        return env
    try:
        html = fetcher.get_text(f"{WWW}/scouts/activity-badges/")
        m = re.search(r"/js/app\.[a-z0-9]+\.js", html)
        if m:
            js = fetcher.get_text(WWW + m.group())
            anchor = js.find("search.windows.net")
            keys = [(abs(mm.start() - anchor), mm.group(1)) for mm in re.finditer(r'"([A-Za-z0-9]{52})"', js)]
            if keys:
                return min(keys)[1]
    except Exception as exc:  # noqa: BLE001 - scraping is best-effort by design
        print(f"  ! key scrape failed ({exc})", file=sys.stderr)
    raise SystemExit(
        "could not determine the Scouts search key; set SCOUTS_SEARCH_KEY to the "
        "public client-side query key from the activity-badges page JS bundle"
    )


class _MarkdownParser(HTMLParser):
    """Minimal HTML -> Markdown for the prose the CMS emits: paragraphs, lists,
    links and bold/italic. Unknown tags fall through as their text content."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.list_stack: list[dict] = []
        self.href: str | None = None
        self.table: dict | None = None

    def _block(self) -> None:
        if self.out and not self.out[-1].endswith("\n\n"):
            self.out.append("\n\n")

    def _cell_flush(self) -> None:
        buf = self.table["buf"].strip()
        if buf:
            self.table["cell"].append(buf)
        self.table["buf"] = ""

    def _emit_table(self) -> None:
        rows = [r for r in self.table["rows"] if r]
        if rows:
            ncol = max(len(r) for r in rows)
            fmt = lambda r: "| " + " | ".join(r + [""] * (ncol - len(r))) + " |"
            self._block()
            lines = [fmt(rows[0]), "| " + " | ".join(["---"] * ncol) + " |"]
            lines += [fmt(r) for r in rows[1:]]
            self.out.append("\n".join(lines))
            self._block()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "table":
            self.table = {"rows": [], "row": None, "cell": None, "buf": ""}
            return
        if self.table is not None:
            if tag == "tr":
                self.table["row"] = []
            elif tag in ("td", "th"):
                self.table["cell"] = []
                self.table["buf"] = ""
            elif tag in ("p", "br") and self.table["cell"] is not None:
                self._cell_flush()
            return
        if tag in ("p", "div"):
            self._block()
        elif tag == "br":
            self.out.append("\n")
        elif tag in ("ul", "ol"):
            self._block()
            self.list_stack.append({"ordered": tag == "ol", "n": 0})
        elif tag == "li" and self.list_stack:
            lvl = self.list_stack[-1]
            lvl["n"] += 1
            indent = "  " * (len(self.list_stack) - 1)
            marker = f"{lvl['n']}. " if lvl["ordered"] else "- "
            self.out.append(f"\n{indent}{marker}")
        elif tag in ("strong", "b"):
            self.out.append("**")
        elif tag in ("em", "i"):
            self.out.append("*")
        elif tag == "a":
            self.href = a.get("href")
            self.out.append("[")
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._block()
            self.out.append("#" * int(tag[1]) + " ")

    def handle_endtag(self, tag):
        if self.table is not None:
            if tag in ("td", "th"):
                self._cell_flush()
                cell = "<br>".join(self.table["cell"]).replace("|", "\\|")
                if self.table["row"] is not None:
                    self.table["row"].append(cell)
                self.table["cell"] = None
            elif tag == "tr" and self.table["row"] is not None:
                self.table["rows"].append(self.table["row"])
                self.table["row"] = None
            elif tag == "table":
                self._emit_table()
                self.table = None
            return
        if tag in ("p", "div"):
            self._block()
        elif tag in ("ul", "ol"):
            if self.list_stack:
                self.list_stack.pop()
            self._block()
        elif tag in ("strong", "b"):
            self.out.append("**")
        elif tag in ("em", "i"):
            self.out.append("*")
        elif tag == "a":
            self.out.append(f"]({self.href or ''})")
            self.href = None

    def handle_data(self, data):
        # Collapse source-formatting whitespace; block tags carry the line breaks.
        if self.table is not None:
            if self.table["cell"] is not None:
                self.table["buf"] += re.sub(r"\s+", " ", data)
            return
        self.out.append(re.sub(r"\s+", " ", data))


# Typographic characters mapped to ASCII. The pound sign is kept by request; any
# other accented letter is reduced to its base form (e -> e) in normalize_text.
_ASCII_MAP = {
    "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"',
    "\u2013": "-", "\u2014": "-", "\u2012": "-", "\u2015": "-", "\u2212": "-",
    "\u2026": "...", "\u2022": "-",
    "\u00a0": " ", "\u202f": " ", "\u2009": " ", "\u200a": " ", "\u2007": " ",
    "\u200b": "", "\ufeff": "",
    "\u00f7": "/", "\u00d7": "x", "\u00b1": "+/-",
    "\u2122": "(TM)", "\u00ae": "(R)", "\u00a9": "(C)",
}
_KEEP = {"\u00a3"}  # pound sign


def normalize_text(s: str) -> str:
    """Fold typographic punctuation and accents to ASCII (keeping the pound sign)."""
    out = []
    for ch in s:
        if ch in _ASCII_MAP:
            out.append(_ASCII_MAP[ch])
        elif ord(ch) < 128 or ch in _KEEP:
            out.append(ch)
        else:
            stripped = "".join(
                c for c in unicodedata.normalize("NFKD", ch)
                if not unicodedata.combining(c) and ord(c) < 128
            )
            out.append(stripped or ch)
    return "".join(out)


def md(value: object) -> str:
    if not value:
        return ""
    text = str(value).replace("\r", "")
    if "<" not in text:
        return normalize_text(text.strip())
    p = _MarkdownParser()
    p.feed(text)
    p.close()
    out = "".join(p.out)
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"(?<=\S)[ \t]{2,}", " ", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return normalize_text(out.strip())


def detail_url(url_path: str) -> str:
    return CMS + "/" + url_path.strip("/")


def slug_of(url_path: str) -> str:
    return url_path.strip("/").split("/")[-1]


def listing_slugs(fetcher: Fetcher, listing_path: str) -> list[str]:
    """Slugs linked from a CMS contentPage. The CMS JSON (unlike www, which is
    Cloudflare-protected) embeds the child award links in its serialised body."""
    text = fetcher.get_text(detail_url(listing_path))
    pat = re.escape(listing_path.rstrip("/")) + r"/([a-z0-9\-]+)/"
    seen: list[str] = []
    for s in re.findall(pat, text):
        if s not in seen:
            seen.append(s)
    return seen


def enumerate_targets(fetcher: Fetcher) -> list[tuple[str, str]]:
    """Discover every in-scope badge as (url_path, type) pairs."""
    targets: list[tuple[str, str]] = []

    key = search_key(fetcher)
    results = fetcher.post_search(
        {"count": True, "skip": 0, "top": 9999, "filter": SEARCH_FILTER, "orderby": "cmsTitle asc", "search": "*"},
        key,
    )
    for v in results.get("value", []):
        sub = v.get("sub_type")
        btype = "activity" if sub == "Activity" else "staged" if sub == "StagedBadgeParent" else None
        if btype and v.get("url_path"):
            targets.append((v["url_path"], btype))
    print(f"search: {len(targets)} activity/staged badges")

    skipped: list[str] = []
    try:
        for slug in listing_slugs(fetcher, "/scouts/awards/"):
            path = f"/scouts/awards/{slug}/"
            raw = fetcher.get_json(detail_url(path))
            name = (raw.get("badgeType") or {}).get("name") if isinstance(raw.get("badgeType"), dict) else None
            if name == "Challenge Award":
                targets.append((path, "challenge"))
            else:
                skipped.append(f"{slug} ({name})")
    except Exception as exc:  # noqa: BLE001 - keep activity/staged even if awards fail
        print(f"  ! challenge award enumeration failed: {exc}", file=sys.stderr)
    print(f"awards: {sum(1 for _, t in targets if t == 'challenge')} challenge awards")
    if skipped:
        print(f"  skipped non-challenge awards: {', '.join(skipped)}")

    for slug in TOP_AWARD_SLUGS:
        targets.append((f"/top-awards/{slug}/", "top"))
    print(f"top awards: {sum(1 for _, t in targets if t == 'top')}")
    return targets

