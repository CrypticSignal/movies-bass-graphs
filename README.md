# Movies Bass Graphs

Explore bass frequency graphs of movies. Source: https://www.avsforum.com/threads/the-ultimate-list-of-bass-in-movies-w-frequency-charts-bass-charts-are-on-the-first-page.2763785

- Filter by title, year, sound format or title starting number/letter. Opening punctuation is ignored, e.g. `[Rec]` appears under the "R" letter filter.
- Rank movies by their output at a particular frequency, or by their output across one of the following octaves: 10–20 Hz, 20–40 Hz, 30–60 Hz, 40–80 Hz, 50–100 Hz, or 60–120 Hz. See [Ranking by frequency or octave](#ranking-by-frequency-or-octave)
- Select up to two graphs to compare, with shared zoom controls.

## Table of Contents

- [Ranking by frequency or octave](#ranking-by-frequency-or-octave)
  - [How rankings work](#how-rankings-work)
  - [How readings are extracted](#how-readings-are-extracted)
- [Catalogue and metadata](#catalogue-and-metadata)
  - [When metadata extraction runs](#when-metadata-extraction-runs)
  - [How format labels are extracted](#how-format-labels-are-extracted)
- [Develop and build](#develop-and-build)
- [Making changes](#making-changes)
- [Automatic AVS Forum post sync](#automatic-avs-forum-post-sync)

## Ranking by frequency or octave

Use the **Rank movies by output** toggle to rank movies based on one of the following criteria:

- **Single frequency:** select **Single frequency**, then enter a frequency in Hz. For example, enter **20** to rank movies by their level at 20 Hz, without averaging across a band. Click **Rank movies** or press Enter in the frequency field to apply the ranking and scroll to the results.
- **Octave average:** select an octave from **Rank by**: **10–20, 20–40, 30–60, 40–80, 50–100, or 60–120 Hz**. For example, choose **20–40 Hz octave average** to rank movies by their average level across that range rather than at one frequency. Selecting an octave applies the ranking immediately; no submission button is needed.

For either mode, choose **Green (peak dB)** or **Red (average dB)** in **Curve**. Curve changes take effect immediately, updating displayed readings and any active ranking. Single-frequency edits remain drafts until you click **Rank movies** or press Enter in the frequency field. Octave selections apply immediately. Rankings show the highest estimated dB level first. Existing title, year, sound format and title starting letter/number filters still apply. Use **Clear ranking** to return to browsing without changing those filters.

- Single-frequency rankings use the saved reading at the entered frequency. Frequencies must be between **0.5 and 160 Hz** in **0.5 Hz increments** (for example, 20 or 20.5 Hz); other values are not accepted or rounded to a nearby sample. Readings are not interpolated between samples.
- Octave rankings use the arithmetic mean of the selected curve's dB samples every **0.5 Hz**, including both endpoints; every sample in the range must be readable. This is an average of dB readings, not an energy-weighted average. Each ranked octave card also shows **Octave Peak**, the highest sampled value within that octave, and **Peak**, an additional reading showing the highest available sampled value across the selected curve's entire analysed frequency range. Both show the corresponding frequency; ties show the lowest matching frequency. Neither peak value determines the movie's ranking. The rank is based on the average dB reading across the selected octave.

Values are estimated from graph image analysis. Small differences in readings between movies should not be treated as definitive.

The analysis requires consistent frequency and dB axis labels. Uncertain graphs, missing curves, and frequencies outside a graph's calibrated range remain **unranked** and sort after readable results.

`scripts/analyze_graphs.py` generates `public/graphs/levels.json` using Pillow, NumPy, and Tesseract. The daily AVS sync refreshes analysis for new or changed images and reuses cached analysis for unchanged images. The **Analyze graph levels** workflow can also be started manually. To force a full recalibration after improving the analyzer, increment its `VERSION`.

### How rankings work

The app's **How rankings work** disclosure explains:

- **Single frequency:** uses the selected curve’s reading at exactly that frequency, not an average across nearby frequencies.
- **Octave average:** the arithmetic mean of dB readings sampled every 0.5 Hz across the selected range, including both endpoints. Every sample must be readable. This is an average of dB readings, not a measure of perceived loudness.
- **Estimates, not original measurements:** values are extracted from graph images using Pillow for image processing and Tesseract OCR for axis labels. NumPy handles calculations on the graph’s pixel values. A Python script uses those calculations to identify coloured curves and estimate dB readings at each sampled frequency. The original numerical data is unavailable. Image resolution, overlapping curves, and axis calibration can affect accuracy. Small differences should not be treated as definitive.
- **Unranked graphs:** missing, incompatible, or unreliable readings are excluded from the rankings. You can still view and compare those graphs in “Show unranked movies”.
- **Compare with care:** a higher ranked value does not by itself mean a movie sounds louder or better.

### How readings are extracted

The analysis runs ahead of time in GitHub Actions, not in the browser. It reads the saved graph images rather than the original movie audio or numerical soundtrack data.

1. **Locate the plot:** Pillow and NumPy process the image to identify its grid and plot boundaries.
2. **Calibrate the axes:** Tesseract OCR reads frequency and dB labels. Multiple consistent labels are used to map pixel coordinates to Hz and dB; unreliable calibrations are rejected. Saved manual axis calibrations are used for specified images where available.
3. **Identify the curves:** colour thresholds detect the green and red traces, while artwork masking reduces interference from embedded images.
4. **Extract readings:** at 0.5 Hz intervals, within the calibrated range and up to 160 Hz, the analyzer selects the corresponding pixel column. For each curve, it converts the median vertical position of the remaining coloured pixels into a dB value, rounded to one decimal place. Missing curve pixels or frequencies outside the calibrated range produce no reading.
5. **Save and rank:** the estimated readings are saved for the browser to load. The browser uses these values for single-frequency rankings and calculates arithmetic means for octave rankings.

These are estimates of the values displayed on the graph, not independent measurements of playback SPL. Image resolution, compression, artwork, and OCR errors can affect the results; rounding to one decimal place does not imply 0.1 dB accuracy.

**What NumPy does:** NumPy handles calculations on the graph’s pixel values. A Python script uses those calculations to identify coloured curves and estimate dB readings at each sampled frequency. It does not analyse movie audio or read text labels; Tesseract reads the labels. This work happens before the website loads, and the browser uses the saved results.

## Catalogue and metadata

- `public/graphs/catalogue.json` - IDs, titles, source references, and bundled image paths.
- `public/graphs/metadata.json` - soundtrack format labels keyed by entry ID.
- `scripts/extract_metadata.py` - reads soundtrack format labels from graph headers using Python, Pillow, and Tesseract. These labels power the sound-format filter; uncertain labels remain **Unknown**. Titles and years do not require OCR.
- The daily AVS sync extracts format labels for new or changed graphs automatically. The **Extract soundtrack metadata** workflow can be manually dispatched to regenerate labels for the entire catalogue.

Metadata extraction supplies the "Soundtrack format" filter, but it is not required to build or run the app, or to rank bass levels. The browser loads the saved metadata without running OCR.

To repair a title, edit its catalogue entry. To correct an automatically read format, edit its entry in `metadata.json`. Metadata extraction overwrites that generated file, so retain any corrections when regenerating it.

### When metadata extraction runs

- **Automatic, incremental extraction:** the [AVS Forum post sync](.github/workflows/sync.yml) runs daily at **04:23 UTC**, when manually started, and when specified sync-related files are pushed to the main branch. After downloading graphs, it extracts format labels only for newly downloaded or replaced images. Labels for unchanged images are retained. If extraction fails for a downloaded image, its format is saved as **Unknown**.
- **Manual, full-catalogue extraction:** in GitHub Actions, select **Extract soundtrack metadata → Run workflow**. The [metadata workflow](.github/workflows/metadata.yml) processes every catalogue entry and commits the regenerated metadata to the selected branch if it changed. This replaces the entire saved metadata file, including any manual format corrections.

Extraction does not run during the frontend build or when someone opens the site. Python, Pillow, and Tesseract run in GitHub Actions; the browser only loads the saved results.

### How format labels are extracted

The [extraction script](scripts/extract_metadata.py) reads text printed on graph images, not audio from the movie:

1. **Open the saved graph** with Pillow and crop its header: the top 24% of the image, capped at 230 pixels high, where the title and format label are expected.
2. **Prepare the header for OCR** by converting it to grayscale and inverting its colours.
3. **Read the text** with Tesseract OCR in sparse-text mode, then normalise it to uppercase text for matching.
4. **Match known format labels**, including Dolby Atmos, DTS:X, DTS-HD Master Audio, Dolby TrueHD, Dolby Digital Plus, Dolby Digital, PCM, and DTS. More specific labels are checked before broader ones where needed; a partially read DTS-HD label is not classified as plain DTS.
5. **Save the result** in [metadata.json](public/graphs/metadata.json), keyed by catalogue entry ID. Recognised labels also record that they came from graph-header OCR. Missing images or unrecognised labels produce **Unknown** rather than a format guessed from the movie title.

OCR can misread small or unclear labels, and the format describes the version shown in that graph, not every release of the movie. Titles come from the catalogue and years are derived from those titles; neither requires this extraction. Bass-level analysis separately reads graph axes and curves for ranking.

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
| Forum imports and keeping saved cards | [scripts/sync_avs.py](scripts/sync_avs.py) |
| Saved image filenames | [scripts/graph_files.py](scripts/graph_files.py) |
| Reading the forum's film index | [scripts/avs_source.py](scripts/avs_source.py) |
| Extracting curve values and calibrating axes | [scripts/analyze_graphs.py](scripts/analyze_graphs.py), [axis-calibrations.json](scripts/axis-calibrations.json) |

Components receive data and callbacks through props. The two hooks handle data loading and URL state; numerical calculations stay in plain JavaScript. No state-management library or additional dependencies are required.

To add an octave, edit `OCTAVE_RANGES` in `src/catalogue.js`; the controls use that list automatically. Average and peak readings are calculated together in `rankingReading`, so their sampling and missing-value rules stay consistent. Frequency limits and sampling must match the generated analysis data and the constants in `scripts/analyze_graphs.py`.

Catalogue, metadata, and level JSON files under `public/graphs/` are generated by the Python scripts. UI changes do not require downloading or analysing the graphs again.

## Automatic AVS Forum post sync

The **AVS Forum post sync** workflow runs daily at **04:23 UTC** (GitHub may delay scheduled runs) and can be started manually from Actions. Its only source is the numbered **List of Films,** section in the [thread’s first post](https://www.avsforum.com/threads/the-ultimate-list-of-bass-in-movies-w-frequency-charts-bass-charts-are-on-the-first-page.2763785/). Links in the update announcements, nested scene lists, replies, and other posts are excluded.

The sync follows each film’s Imgur hyperlink, downloads new or changed direct images, extracts soundtrack labels, and analyses changed graphs at 0.5 Hz intervals. Existing saved images and IDs are reused where possible.

Chrome reads the public page when AVS Forum requires its JavaScript browser check. The runner uses a temporary profile without a login or saved user cookies. An unreadable source or malformed list fails before the saved catalogue is changed. Failed image downloads retain working copies; unavailable sources remain labelled unavailable.

New downloads come only from the current film index. If a film leaves that index, its saved graph and card remain available; removed entries are not fetched again. Images use title-based filenames with underscores for spaces and preserved title hyphens (for example, `dune_2021.jpg`), with ID suffixes for duplicate names. Earlier saved versions also have readable filenames. `public/graphs/avs-index.json` records the source titles, links, and film count from the last successful sync. The spreadsheet is no longer read.

Only changed catalogue, metadata, analysis, or image files are committed. The sync starts publishing when those files change; unchanged runs do not rebuild or deploy the site. GitHub can disable scheduled workflows after prolonged repository inactivity.


