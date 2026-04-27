# Hillingdon Stags FC — Website

The official website for Hillingdon Stags, playing in the
**Middlesex County Football League (Sundays), Division Four North**.

The league table updates itself automatically every couple of hours
by scraping [Mitoo Football](https://www.mitoofootball.com).
Stanley doesn't have to lift a finger.

---

## How it's organised

```
hillingdon-stags-website/
├── .github/
│   └── workflows/
│       └── scrape-mitoo.yml      ← Tells GitHub when to run the scraper
├── scraper/
│   ├── scrape_mitoo.py            ← Python script that pulls league data
│   └── requirements.txt           ← Python libraries the scraper needs
├── public/                        ← Everything in here is the live website
│   ├── index.html                 ← The homepage
│   ├── css/styles.css             ← Visual styling
│   ├── js/site.js                 ← Loads the data into the page
│   ├── data/                      ← Auto-updated by the scraper
│   │   ├── league-table.json
│   │   ├── fixtures.json
│   │   ├── results.json
│   │   ├── squad.json             ← (manual — edit when squad changes)
│   │   └── meta.json
│   └── images/                    ← Drop the team badge etc here
├── netlify.toml                   ← Netlify hosting config
└── README.md                      ← This file
```

## How updates happen

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│   GitHub Actions cron  ──▶  Python scraper  ──▶  Mitoo Football   │
│   (every 2 hours)              │                                  │
│                                ▼                                  │
│                        public/data/*.json                         │
│                                │                                  │
│                                ▼                                  │
│                    git commit + push to repo                      │
│                                │                                  │
│                                ▼                                  │
│                Netlify rebuilds & deploys site                    │
│                                │                                  │
│                                ▼                                  │
│                        Fans see fresh data                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Editing the squad

Open `public/data/squad.json` in any text editor.
Each player is one entry like:

```json
{
  "number": 9,
  "name": "T. Okafor",
  "position": "Striker",
  "bio": "Joined in 2024. Top scorer last season.",
  "photo": "/images/squad/okafor.jpg"
}
```

Save the file, commit + push via GitHub Desktop. The site rebuilds in seconds.

## Running the scraper manually

From the GitHub web UI:
1. Go to the **Actions** tab in the repo.
2. Click **"Scrape Mitoo league data"** in the sidebar.
3. Click **"Run workflow"** → **"Run workflow"**.

A green tick = success. A red cross = something went wrong (open the run to see).

## Built with

- HTML / CSS / vanilla JavaScript — no frameworks, no build step
- Python 3 (scraper) — `requests` + `beautifulsoup4`
- GitHub Actions (scheduling)
- Netlify (hosting + auto-deploy)

🦌 Antlers Up.
