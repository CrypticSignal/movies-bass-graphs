# Movies Bass Graphs

Explore bass frequency graphs for 618 movie and television entries.

[Open the archive](https://crypticsignal.github.io/movies-bass-graphs/)

## Browse, inspect, and compare

- Browse with **All · 0–9 · A–Z**, or search titles and filter by year and soundtrack format. Each selection shows all matching entries with lazy-loaded images. Opening punctuation is ignored: `[Rec]` appears under R; titles starting with “The” remain under T.
- Open a graph in the viewer, zoom up to 400%, scroll to pan, or enter fullscreen.
- Move between graphs in the filtered results without leaving the viewer.
- Select up to two graphs for side-by-side comparison, with shared zoom controls. On narrow screens they stack vertically.
- Use **Copy view link** to share your search, filters, selected letter, selected graphs, and open viewer. Refresh and browser Back/Forward restore the view.

Comparison preserves each image's original axes. Check labelled scales and measurement methods before comparing values; the graphs are not normalized.

## Catalogue and metadata

The catalogue and 611 recovered graph images are bundled with the site. Seven unavailable entries remain visible with an explanation. No Imgur or Google Sheets access is required at runtime.

Years and types are inferred from titles. Soundtrack formats are read automatically from graph headers and can contain recognition errors; the label on the graph remains authoritative. Unrecognized formats stay **Unknown**.

- `public/graphs/catalogue.json`: IDs, titles, source references, and bundled image paths.
- `public/graphs/metadata.json`: soundtrack format labels keyed by entry ID.
- `scripts/extract-metadata.py`: optional metadata extraction with Python, Pillow, and Tesseract. It is not needed to build or run the app.
- The **Extract soundtrack metadata** workflow regenerates metadata when manually dispatched.

To repair a title, edit its catalogue entry. To correct an automatically read format, edit its entry in `metadata.json`. Metadata extraction overwrites that generated file, so retain any corrections when regenerating it.

The [original spreadsheet](https://docs.google.com/spreadsheets/d/1SdwJ_mfYgghxZG8gy41ke22e2AM9gUPTB1EmZgYcHoY/edit) linked to Imgur graphs. Copies were recovered in October 2026. Preserve the credits shown on each graph.

## Develop and build

Use Node.js 22.12+ and npm.

```sh
git clone https://github.com/CrypticSignal/movies-bass-graphs.git
cd movies-bass-graphs
npm ci
npm run dev
```

Open the URL printed by Vite, including the `/movies-bass-graphs/` path.

```sh
npm run build
npm run preview
```

Vite writes the production site to `dist/`. Update `base` in `vite.config.js` if hosting under another path. No API keys are required.

The build workflow publishes `dist/` to the existing `gh-pages` branch. Publishing runs from that branch to respect the repository's deployment restriction. Only successful builds are published.

Built with React 19, Vite, and plain CSS.

## Automatic spreadsheet sync

The **Sync spreadsheet graphs** workflow runs daily at **04:23 UTC** (GitHub may delay scheduled runs) and can be started manually from Actions. It reads the spreadsheet directly, downloads new or changed direct Imgur image URLs, and extracts soundtrack labels for newly cached graphs. Already cached URLs are skipped.

Failed downloads retain the last saved image and are retried on subsequent runs. Removed spreadsheet entries remain archived so saved graphs and shared links are preserved. Album links and inaccessible sources may remain unavailable. Replacing a graph requires changing its image URL in the spreadsheet; cached images are not repeatedly downloaded at the same URL.

Only changed catalogue, metadata, or image files are committed. The sync then explicitly starts publishing; unchanged runs do not rebuild or deploy the site. GitHub can disable scheduled workflows after prolonged repository inactivity; a manual run remains available.

## Ranking by frequency

Enter a whole-number frequency from **1–200 Hz**, choose the **green** or **red** curve, and select **Rank highest first**. Existing title, alphabet, year, and soundtrack filters still apply.

Each value is digitized at that frequency's pixel column, with no averaging across a frequency band. Values are estimates in the graph's labelled dB scale, not subwoofer SPL. Curve colours are used because peak/average labels are not consistently available. Different soundtrack versions and measurement methods may not be directly comparable.

The analysis requires consistent frequency and dB axis labels. Uncertain graphs, missing curves, and frequencies outside a graph's calibrated range remain **unranked** and sort after readable results. The original graphs are the reference for interpreting a reading.

`scripts/analyze-graphs.py` generates `public/graphs/levels.json` using Pillow, NumPy, and Tesseract. The daily spreadsheet sync refreshes analysis for new or changed images and reuses cached analysis for unchanged images. The **Analyze graph levels** workflow can also be started manually. To force a full recalibration after improving the analyzer, increment its `VERSION`.
