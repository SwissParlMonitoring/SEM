# SwissParlMonitoring

Tracking what matters in the Swiss Federal Parliament — one topic at a time.

SwissParlMonitoring hosts open-source dashboards that monitor specific topics, keywords, and elected representatives in the Swiss Federal Assembly (National Council & Council of States). Each project scrapes data from the [Swiss Parliament API](https://ws-old.parlament.ch/), processes it with R scripts, and publishes a static web dashboard updated automatically via GitHub Actions.

---

## Projects

| Project | Topic | Live site |
|---------|-------|-----------|
| [Jura](https://github.com/SwissParlMonitoring/Jura) | Canton of Jura, Moutier, fiscal equalisation (RPT) | [Dashboard](https://swissparlmonitoring.github.io/Jura/) |

*More projects coming soon.*

---

## How it works

```
Swiss Parliament API  →  R scripts (scraping)  →  JSON data  →  Static web dashboard
                              ↓                                        ↓
                     GitHub Actions (scheduled)              GitHub Pages (hosting)
```

Each project follows the same architecture:

1. **Data collection** — R scripts query the Swiss Parliament's open data API for parliamentary objects (motions, postulates, interpellations, questions) and plenary debate transcripts matching specific keywords or authors.
2. **Incremental updates** — Only recent data is re-fetched (typically the last 6 months for objects, current + previous session for debates), keeping runs fast and API-friendly.
3. **Static frontend** — A pure HTML/CSS/JS dashboard with search, filters, thematic badges, and charts. No backend, no framework — just files served by GitHub Pages.
4. **Automated pipeline** — GitHub Actions workflows run on a schedule (typically twice daily) to refresh data and redeploy.

---

## Want to create a new monitoring project?

A new project can be set up to monitor any combination of:
- **Keywords** in parliamentary object titles and texts
- **Elected representatives** (by name or ID)
- **Cantons, regions, or policy areas**

The Jura project serves as a template. Fork it, adjust the R scripts and keyword lists, and you're set.

---

## Tech stack

- **Data scraping**: R (httr, jsonlite, readxl)
- **Frontend**: Vanilla HTML, CSS, JavaScript, Chart.js
- **Hosting**: GitHub Pages
- **Automation**: GitHub Actions
- **Data format**: JSON

---

## License

MIT
