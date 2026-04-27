"""
Scrape Hillingdon Stags league data from Mitoo Football.

Runs from GitHub Actions on a cron schedule (see
.github/workflows/scrape-mitoo.yml). Writes JSON files into
public/data/, which the website reads.

If parsing fails, the script exits with status 1 (no commit happens
in the workflow) and the existing JSON is left untouched, so the
site never breaks because of a one-off parsing hiccup.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Tag

# ---------- Config -----------------------------------------------------

LEAGUE_TABLE_URL = (
    "https://www.mitoofootball.com/LeagueTab.cfm"
    "?TblName=Matches&DivisionID=220&LeagueCode=MDXS2025"
)

LEAGUE_NAME = "Middlesex County Football League (Sundays)"
DIVISION_NAME = "Division Four North"
SEASON = "2025-2026"

# Identify ourselves politely so the league admins know who we are
HEADERS = {
    "User-Agent": (
        "HillingdonStagsBot/1.0 "
        "(+https://github.com/stanleyt1738-byte/hillingdon-stags-website)"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

# Where the website reads its data from
DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

# Names that count as "us" (case-insensitive substring match).
# If the club ever has a B team, add it here.
OUR_TEAM_TOKENS = ["hillingdon stags"]


# ---------- Helpers ----------------------------------------------------


def fetch(url: str) -> str:
    """GET the URL with a timeout and our identifying headers."""
    print(f"  → GET {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def is_us(team_name: str) -> bool:
    name = team_name.lower()
    return any(tok in name for tok in OUR_TEAM_TOKENS)


def parse_int(text: str) -> int:
    """Parse a number that might use the unicode minus sign (−) instead of -."""
    cleaned = text.strip().replace("−", "-").replace("+", "")
    return int(cleaned)


# ---------- League table parser ---------------------------------------


def find_league_table(soup: BeautifulSoup) -> Tag:
    """Locate the league table among all <table> elements on the page.

    Heuristic: the league table is the one whose text contains both
    "Games Played" (the column header) AND "Points". This is much more
    robust than relying on CSS classes, which Mitoo could change.
    """
    for candidate in soup.find_all("table"):
        text = candidate.get_text(" ", strip=True).lower()
        if "games played" in text and "points" in text:
            return candidate
    raise ValueError("Could not locate league table on the page")


def parse_league_table(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    table = find_league_table(soup)

    teams: list[dict] = []
    position = 0

    for tr in table.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
        if len(cells) < 9:
            continue  # skip layout / header rows

        # First cell is team name, last cell is points.
        # If the last cell isn't an integer, it's a header row.
        try:
            points = parse_int(cells[-1])
        except ValueError:
            continue

        try:
            team = cells[0].strip()
            played = parse_int(cells[1])
            won = parse_int(cells[2])
            drawn = parse_int(cells[3])
            lost = parse_int(cells[4])
            gf = parse_int(cells[5])
            ga = parse_int(cells[6])
            gd = parse_int(cells[7])
        except (ValueError, IndexError) as exc:
            print(f"  ! Skipped malformed row {cells!r}: {exc}")
            continue

        position += 1
        teams.append({
            "position": position,
            "team": team,
            "played": played,
            "won": won,
            "drawn": drawn,
            "lost": lost,
            "goals_for": gf,
            "goals_against": ga,
            "goal_difference": gd,
            "points": points,
            "is_us": is_us(team),
        })

    if not teams:
        raise ValueError("League table found but no team rows parsed")

    return {
        "league": LEAGUE_NAME,
        "division": DIVISION_NAME,
        "season": SEASON,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source_url": LEAGUE_TABLE_URL,
        "teams": teams,
    }


# ---------- I/O --------------------------------------------------------


def write_json(filename: str, data: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / filename
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    print(f"  ✓ Wrote {path.relative_to(DATA_DIR.parent.parent)}")


def write_meta(extra: dict | None = None) -> None:
    meta = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "Mitoo Football",
    }
    if extra:
        meta.update(extra)
    write_json("meta.json", meta)


# ---------- Entry point ------------------------------------------------


def main() -> int:
    try:
        print("→ Fetching league table from Mitoo …")
        html = fetch(LEAGUE_TABLE_URL)
        print(f"  ✓ Got {len(html):,} bytes")

        print("→ Parsing league table …")
        data = parse_league_table(html)
        print(f"  ✓ Parsed {len(data['teams'])} teams")

        # Sanity check: we should be in the table somewhere
        if not any(t["is_us"] for t in data["teams"]):
            print("  ! Warning: 'Hillingdon Stags' not found in parsed teams. "
                  "Continuing anyway, but check the data.", file=sys.stderr)

        write_json("league-table.json", data)
        write_meta()

        print("✓ Done")
        return 0

    except requests.RequestException as exc:
        print(f"✗ Network error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 — catch-all is intentional here
        print(f"✗ Scrape failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
