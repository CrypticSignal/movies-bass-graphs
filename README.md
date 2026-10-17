# Movies Bass Graphs

Explore bass frequency graphs of movies. Source: https://www.avsforum.com/threads/the-ultimate-list-of-bass-in-movies-w-frequency-charts-bass-charts-are-on-the-first-page.2763785

- Filter by title, year, sound format or title starting number/letter. Opening punctuation is ignored, e.g. `[Rec]` appears under the "R" letter filter.
- Rank movies by estimated bass level at a particular frequency or by the average level across a selected octave (see [Ranking by frequency or octave](#ranking-by-frequency-or-octave)).
- Select up to two graphs to compare, with shared zoom controls.
- Rank movies by their output at a particular frequency, or by their output across one of the following octaves: 10–20 Hz, 20–40 Hz, 30–60 Hz, 40–80 Hz, 50–100 Hz, or 60–120 Hz

## Table of Contents

- [Ranking by frequency or octave](#ranking-by-frequency-or-octave)
  - [How readings are extracted](#how-readings-are-extracted)
- [Catalogue and metadata](#catalogue-and-metadata)
- [Develop and build](#develop-and-build)
- [Making changes](#making-changes)
- [Automatic AVS Forum sync](#automatic-avs-forum-sync)

## Ranking by frequency or octave

Use the **Rank by** control to choose how to compare bass levels:

- **Single frequency:** select **Single frequency**, then enter a frequency in Hz. For example, enter **20** to rank movies by their level at 20 Hz, without averaging across a band. Press Enter to scroll to the results.
- **Octave average:** select an octave from **Rank by**: **10–20, 20–40, 30–60, 40–80, 50–100, or 60–120 Hz**. For example, choose **20–40 Hz octave average** to rank movies by their average level across that range rather than at one frequency.

For either mode, choose **Green (peak dB)** or **Red (average dB)** in **Curve**. Ranking updates automatically, with the highest estimated dB level first. Existing title, year, sound format and title starting letter/number filters still apply. Use **Clear ranking** to return to browsing without changing those filters.

- Single-frequency values are digitized at that frequency's pixel column.
- Octave rankings use the arithmetic mean of the selected curve's dB samples every **0.5 Hz**, including both endpoints; every sample in the range must be readable. This is an average of dB readings, not an energy-weighted average. Each ranked octave card also shows the highest sampled value within that octave and its frequency for the selected curve; ties show the lowest matching frequency. This additional peak reading does not determine the octave ranking.

Values are estimates extracted from graph images using Python, not original numeric soundtrack measurements.

The analysis requires consistent frequency and dB axis labels. Uncertain graphs, missing curves, and frequencies outside a graph's calibrated range remain **unranked** and sort after readable results.

`scripts/analyze-graphs.py` generates `public/graphs/levels.json` using Pillow, NumPy, and Tesseract. The daily AVS sync refreshes analysis for new or changed images and reuses cached analysis for unchanged images. The **Analyze graph levels** workflow can also be started manually. To force a full recalibration after improving the analyzer, increment its `VERSION`.

### How readings are extracted

GitHub Actions runs Python with Pillow and NumPy to find the plot grid and coloured curves, and Tesseract OCR to read axis labels. Consistent labels calibrate pixel coordinates to Hz and dB. The reader then samples the selected pixel column at each 0.5 Hz point, saves estimated curve values, and excludes ambiguous readings. The browser loads these saved readings and sorts or averages them; it does not analyse images on each interaction. ChatGPT reasoning settings do not affect this deterministic workflow.

## Catalogue and metadata

- `public/graphs/catalogue.json`: IDs, titles, source references, and bundled image paths.
- `public/graphs/metadata.json`: soundtrack format labels keyed by entry ID.
- `scripts/extract-metadata.py`: optional metadata extraction with Python, Pillow, and Tesseract. It is not needed to build or run the app.
- The **Extract soundtrack metadata** workflow regenerates metadata when manually dispatched.

To repair a title, edit its catalogue entry. To correct an automatically read format, edit its entry in `metadata.json`. Metadata extraction overwrites that generated file, so retain any corrections when regenerating it.

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

Built with React 19, Vite, and Tailwind CSS v4. Tailwind utilities live in the React components; `src/styles.css` defines theme tokens, fonts, and shared element defaults.

## Making changes

Start with the file that owns the feature:

| Change | File |
| --- | --- |
| Overall page flow, selection, and scrolling | [src/App.jsx](src/App.jsx) |
| Search, alphabet buttons, filters, and frequency input | [src/components/Filters.jsx](src/components/Filters.jsx) |
| Movie cards, rank labels, and output text | [src/components/GraphCard.jsx](src/components/GraphCard.jsx) |
| Comparison section | [src/components/Comparison.jsx](src/components/Comparison.jsx) |
| Inspect dialog, fullscreen, and graph navigation | [src/components/Viewer.jsx](src/components/Viewer.jsx) |
| Shared image display and zoom slider | [src/components/GraphTools.jsx](src/components/GraphTools.jsx) |
| Frequency limits, octave options, filtering, and calculations | [src/catalogue.js](src/catalogue.js) |
| Loading data, caching, and analysis compatibility | [src/useCatalogue.js](src/useCatalogue.js) |
| Shareable URLs and browser Back/Forward | [src/useViewState.js](src/useViewState.js) |
| Fonts, theme colours, breakpoint, and shared element styles | [src/styles.css](src/styles.css) |
| Forum imports and keeping saved cards | [scripts/sync-avs.py](scripts/sync-avs.py) |
| Saved image filenames | [scripts/graph_files.py](scripts/graph_files.py) |
| Reading the forum's film index | [scripts/avs_source.py](scripts/avs_source.py) |
| Extracting curve values and calibrating axes | [scripts/analyze-graphs.py](scripts/analyze-graphs.py), [axis-calibrations.json](scripts/axis-calibrations.json) |

Components receive data and callbacks through props. The two hooks handle data loading and URL state; numerical calculations stay in plain JavaScript. No state-management library or additional dependencies are required.

To add an octave, edit `OCTAVE_RANGES` in `src/catalogue.js`; the controls use that list automatically. Average and peak readings are calculated together in `rankingReading`, so their sampling and missing-value rules stay consistent. Frequency limits and sampling must match the generated analysis data and the constants in `scripts/analyze-graphs.py`.

Catalogue, metadata, and level JSON files under `public/graphs/` are generated by the Python scripts. UI changes do not require downloading or analysing the graphs again.

## Automatic AVS Forum sync

The **Sync AVS film graphs** workflow runs daily at **04:23 UTC** (GitHub may delay scheduled runs) and can be started manually from Actions. Its only source is the numbered **List of Films,** section in the [thread’s first post](https://www.avsforum.com/threads/the-ultimate-list-of-bass-in-movies-w-frequency-charts-bass-charts-are-on-the-first-page.2763785/). Links in the update announcements, nested scene lists, replies, and other posts are excluded.

The sync follows each film’s Imgur hyperlink, downloads new or changed direct images, extracts soundtrack labels, and analyses changed graphs at 0.5 Hz intervals. Existing saved images and IDs are reused where possible.

Chrome reads the public page when AVS Forum requires its JavaScript browser check. The runner uses a temporary profile without a login or saved user cookies. An unreadable source or malformed list fails before the saved catalogue is changed. Failed image downloads retain working copies; unavailable sources remain labelled unavailable.

New downloads come only from the current film index. If a film leaves that index, its saved graph and card remain available; removed entries are not fetched again. Images use title-based filenames with underscores for spaces and preserved title hyphens (for example, `dune_2021.jpg`), with ID suffixes for duplicate names. Earlier saved versions also have readable filenames. `public/graphs/avs-index.json` records the source titles, links, and film count from the last successful sync. The spreadsheet is no longer read.

Only changed catalogue, metadata, analysis, or image files are committed. The sync starts publishing when those files change; unchanged runs do not rebuild or deploy the site. GitHub can disable scheduled workflows after prolonged repository inactivity.


