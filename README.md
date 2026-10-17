# Movies Bass Graphs

A searchable gallery of bass frequency graphs for 618 movies and TV entries.

[Open the gallery](https://crypticsignal.github.io/movies-bass-graphs/)

## Using the gallery

Search by title and browse results in pages of 10. Click a graph to open its full-size image in the same tab.

The catalogue and 611 recovered graph images are bundled with the site, so visitors do not need access to Imgur or Google Sheets. Seven entries could not be recovered and display an unavailable message. Images load as you scroll.

This app displays existing graphs; it does not analyse audio or generate measurements. Refer to each graph for its title, soundtrack format, axes, and units.

## Run locally

Install Node.js 22 and npm:

```sh
git clone https://github.com/CrypticSignal/movies-bass-graphs.git
cd movies-bass-graphs
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). No API keys or environment variables are required.

## Checks and production build

```sh
npm test -- --watchAll=false
npm run build
```

The build is written to `build/`. The app uses the `homepage` setting in [package.json](package.json) for its asset base path. Change it when hosting under a different URL.

The [deployment workflow](.github/workflows/deploy.yml) tests and builds the app, then deploys pushes to `main` using GitHub Pages. Builds are copied to the existing `gh-pages` branch, and publishing runs from that branch to respect the repository's deployment restrictions.

## Catalogue and images

The original catalogue came from [this Google spreadsheet](https://docs.google.com/spreadsheets/d/1SdwJ_mfYgghxZG8gy41ke22e2AM9gUPTB1EmZgYcHoY/edit), which linked to images on Imgur. Copies were recovered in October 2026 to remove the runtime dependency on Imgur and its regional availability.

[`public/graphs/catalogue.json`](public/graphs/catalogue.json) contains:

| Field | Meaning |
| --- | --- |
| `id` | Entry identifier. |
| `movieName` | Display title and search text. |
| `imgurURL` | Original source reference, retained for provenance. |
| `imagePath` | Bundled image path relative to `public/`, or `null` when unavailable. |

To add or repair a graph, place its image in `public/graphs/` and update the matching catalogue entry. Preserve any credits shown on the original graph. Catalogue changes are included on the next deployment; the spreadsheet is no longer fetched at runtime.

## Project structure

- [`src/App.js`](src/App.js): catalogue loading, search, pagination, graph rendering, and error handling.
- [`src/App.test.js`](src/App.test.js): local image loading, search/pagination, unavailable images, and retry tests.
- [`src/App.css`](src/App.css): responsive gallery layout.
- [`public/graphs/`](public/graphs/): recovered images and catalogue.

Built with React 17, Create React App, and React Bootstrap.
