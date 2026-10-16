# Movies Bass Graphs

A searchable gallery of movie bass graphs, built with React. Browse graph images, search by movie title, and open a graph at its source.

## Features

- Browse movie graphs in pages of 10.
- Search movie titles with case-insensitive matching.
- Click a movie card to open its linked image in the same tab.
- Responsive cards for desktop and mobile screens.

This app displays existing graph images; it does not analyse audio or generate graphs.

## Run locally

Install Node.js and npm, then run:

```sh
git clone https://github.com/CrypticSignal/movies-bass-graphs.git
cd movies-bass-graphs
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). The development server reloads when you edit source files.

The repository also includes a `yarn.lock` file if you prefer Yarn. No API key or environment variables are required by the current app.

## Using the gallery

Browse with the page controls, or enter part of a movie title in the search box. Search displays all matching entries rather than limiting results to 10. Clear the search box to return to the first 10 entries.

Click a card to view its linked graph image. Use your browser's Back button to return to the gallery.

## Data source

The catalogue is loaded at runtime from [Sheet1 of this Google spreadsheet](https://docs.google.com/spreadsheets/d/1SdwJ_mfYgghxZG8gy41ke22e2AM9gUPTB1EmZgYcHoY/edit), through the [OpenSheet JSON endpoint](https://opensheet.elk.sh/1SdwJ_mfYgghxZG8gy41ke22e2AM9gUPTB1EmZgYcHoY/Sheet1).

Each row is expected to provide:

| Column | Purpose |
| --- | --- |
| `id` | Unique identifier used as the React list key. |
| `movieName` | Movie title displayed on the card and used for search. |
| `imgurURL` | Graph image URL, also opened when the card is clicked. |

To use another catalogue, change the fetch URL in [`src/App.js`](src/App.js) and provide the same columns. Keep the spreadsheet accessible to OpenSheet.

Internet access is required to retrieve the catalogue and remote images. There is no offline cache or fetch-error screen; if the catalogue request fails, the app may remain on “Loading...”.

## Build and deploy

Create a production build:

```sh
npm run build
```

The generated static files are written to `build/`.

The project is configured for GitHub Pages at `https://crypticsignal.github.io/movies-bass-graphs`. To publish using the configured Git remote:

```sh
npm run deploy
```

This runs the production build and publishes `build/` to the `gh-pages` branch. Configure GitHub Pages to serve that branch. Update `homepage` in [`package.json`](package.json) when deploying under a different URL.

## Project structure

- [`src/App.js`](src/App.js): catalogue fetching, title search, movie cards, and pagination state.
- [`src/PageSelector.js`](src/PageSelector.js): page controls.
- [`src/App.css`](src/App.css): gallery layout and responsive sizing.
- [`public/index.html`](public/index.html): HTML entry point.

Built with React 17, Create React App, React Bootstrap, and Semantic UI React.

## Current limitations

Pagination uses the full catalogue even while search results are displayed, so changing pages during a search can replace the filtered results. Clear the search before using the page controls.

Graph measurement methods, units, and credits are not defined in the application code. Refer to the individual graphs and their original sources when interpreting results.
