import { useEffect, useRef, useState } from 'react';
import { filterMovies, imageURL, rankingLevel } from './catalogue.js';
import useCatalogue from './useCatalogue.js';
import useViewState from './useViewState.js';
import Filters from './components/Filters.jsx';
import GraphCard from './components/GraphCard.jsx';
import Comparison from './components/Comparison.jsx';
import Viewer from './components/Viewer.jsx';

function scrollToSection(element) {
  element?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

export default function App() {
  const { state, update } = useViewState();
  const { movies, status, levelsStatus, retry } = useCatalogue();
  const [message, setMessage] = useState('');
  const [comparisonZoom, setComparisonZoom] = useState(1);
  const comparisonRef = useRef(null);
  const resultsRef = useRef(null);
  const scrollPending = useRef(false);
  const scrollTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(scrollTimer.current), []);

  function scrollToResults(delay = 0) {
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => scrollToSection(resultsRef.current), delay);
  }

  function selectFilter(patch) {
    scrollPending.current = true;
    update(patch);
  }

  // Filter changes must render before their new results can be scrolled into view.
  useEffect(() => {
    if (scrollPending.current) {
      scrollPending.current = false;
      scrollToResults();
    }
  });

  const filtered = filterMovies(movies, state);
  const rankingActive = Boolean(state.frequency || state.octave);
  const rankingLabel = state.octave
    ? `average across ${state.octave.replace('-', '–')} Hz`
    : `at ${state.frequency} Hz`;
  const unrankedMovies = rankingActive
    ? filtered.filter(movie => rankingLevel(movie, state) === null)
    : [];
  // Ranked entries come first; keep missing readings in a compact names-only list.
  const rankedCount = filtered.length - unrankedMovies.length;
  const visibleMovies = rankingActive ? filtered.slice(0, rankedCount) : filtered;
  const selected = state.compare
    .map(id => movies.find(movie => movie.id === id))
    .filter(movie => movie && imageURL(movie));
  const viewing = movies.find(movie => movie.id === state.graph && imageURL(movie)
    && (state.scope !== 'comparison' || state.compare.includes(movie.id)));
  const sequence = state.scope === 'comparison'
    ? selected
    : visibleMovies.filter(movie => imageURL(movie));
  const index = viewing ? sequence.findIndex(movie => movie.id === viewing.id) : -1;

  useEffect(() => {
    if (status !== 'ready') return;
    const valid = state.compare.filter(id => movies.some(movie => movie.id === id && imageURL(movie)));
    const patch = {};
    if (state.graph && !viewing) patch.graph = '';
    if (state.view === 'comparison' && !valid.length) patch.view = '';
    if (valid.join(',') !== state.compare.join(',')) patch.compare = valid;
    if (Object.keys(patch).length) update(patch, true);
  }, [status, movies, state.graph, state.view, state.scope, state.compare, update]);

  function toggleCompare(movie) {
    setMessage('');
    if (state.compare.includes(movie.id)) {
      update({ compare: state.compare.filter(id => id !== movie.id) });
    } else if (state.compare.length < 2) {
      update({ compare: [...state.compare, movie.id] });
    } else {
      setMessage('Two graphs are selected. Remove one to compare a different graph.');
    }
  }

  function inspect(movie) {
    update({ graph: movie.id, scope: '', view: '' });
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage('Link copied.');
    } catch {
      setMessage('Copy the URL from your address bar to share this view.');
    }
  }

  return (
    <main className={`mx-auto max-w-[1320px] px-4 pt-[26px] desktop:px-9 desktop:pt-12 ${selected.length ? 'pb-[65px]' : ''}`}>
      <header className="mb-[30px] flex flex-col items-start justify-between gap-5 border-b border-[#314039] pb-8 desktop:flex-row desktop:items-center desktop:gap-6">
        <div>
          <span className="text-[10px] font-bold tracking-[2px] text-[#b9da9c]">THE LOW END / SOUNDTRACK ARCHIVE</span>
          <h1 className="my-[15px] text-[clamp(32px,5vw,54px)] tracking-[-1px] desktop:tracking-[-2px]">
            Movies Bass Graphs<span className="text-accent">.</span>
          </h1>
          <p className="m-0 max-w-[650px] text-[15px] text-[#9eafa6]">
            Explore the low frequencies. Find a soundtrack, inspect its graph, and compare the details.
          </p>
        </div>
        <button className="whitespace-nowrap" onClick={share}>Copy view link ↗</button>
      </header>

      {status === 'loading' && <p role="status">Loading the archive…</p>}
      {status === 'error' && (
        <div role="alert">
          <p>The catalogue could not be loaded.</p>
          <button onClick={retry}>Try again</button>
        </div>
      )}
      {status === 'ready' && (
        <>
          <Filters
            movies={movies}
            state={state}
            update={update}
            selectFilter={selectFilter}
            scrollToResults={scrollToResults}
          />
          <Comparison
            movies={selected}
            zoom={comparisonZoom}
            onZoom={setComparisonZoom}
            sectionRef={comparisonRef}
            onInspect={() => update({ view: 'comparison', graph: '', scope: '' })}
            onClear={() => update({ compare: [] })}
          />

          <div className="mt-5 mb-3 flex flex-col items-start justify-between gap-0 text-[12px] text-[#9bad9f] desktop:my-0 desktop:flex-row desktop:items-center desktop:gap-[14px]">
            <p className="mt-0 mb-2 text-[15px] desktop:my-[15px]">
              <strong className="text-[#e8f0e7]">{filtered.length}</strong>
              {' '}{filtered.length === 1 ? 'entry' : 'entries'}
              <span className="ml-2 text-[12px]"> / {movies.length} in the archive</span>
            </p>
            <span>Select up to two graphs to compare</span>
          </div>
          {rankingActive && (
            <p className="mt-0 mb-[14px] text-[12px] text-[#b9da9c]" role="status">
              {levelsStatus === 'ready'
                ? `${rankedCount} of ${filtered.length} matching graphs ranked by the ${state.curve} curve ${rankingLabel}, highest first. Graphs with uncertain or missing readings are listed under “Show unranked movies”.`
                : levelsStatus === 'outdated'
                  ? 'The frequency data is outdated. Reload this page to retrieve the 0.5 Hz readings; rankings are temporarily unavailable.'
                  : 'Frequency readings are unavailable. Graphs are shown without a ranking.'}
            </p>
          )}
          <p role="status" className="mt-0 mb-3 min-h-0 text-[13px] text-accent empty:hidden">{message}</p>

          <div ref={resultsRef} className="min-h-[calc(100svh_-_16px)] scroll-mt-4">
            <section className="grid grid-cols-1 items-start gap-[22px] desktop:grid-cols-2" aria-label="Movie graphs">
              {visibleMovies.map((movie, movieIndex) => (
                <GraphCard
                  key={movie.id}
                  movie={movie}
                  rank={movieIndex + 1}
                  rankingState={rankingActive ? state : null}
                  curve={state.curve}
                  rankingLabel={rankingLabel}
                  selected={state.compare.includes(movie.id)}
                  onCompare={() => toggleCompare(movie)}
                  onInspect={() => inspect(movie)}
                />
              ))}
            </section>
            {rankingActive && unrankedMovies.length > 0 && (
              <details className="my-5 rounded-lg border border-[#314039] px-4 py-3">
                <summary className="cursor-pointer text-[14px] text-[#b9da9c]">
                  Show unranked movies
                  <span className="ml-2 text-[12px] text-[#9bad9f]">({unrankedMovies.length})</span>
                </summary>
                <ul className="mt-3 mb-0 space-y-2 pl-5 text-[13px] text-[#c4d0c6]">
                  {unrankedMovies.map(movie => <li key={movie.id}>{movie.movieName}</li>)}
                </ul>
              </details>
            )}
            {!filtered.length && (
              <p className="my-[16px] px-[15px] py-[60px] text-center text-[#a9b9ad]">
                No titles match these filters. Try a broader search or reset the filters.
              </p>
            )}
          </div>
          <footer className="border-t border-[#314039] pt-6 pb-[35px] text-[11px] text-[#839689]">
            Movie soundtrack graphs · Original credits and measurement details appear on each image.
          </footer>

          {selected.length > 0 && (
            <aside
              className="fixed right-3 bottom-3 left-3 z-5 flex items-center justify-between gap-[14px] rounded-lg border border-[#b9da9c] bg-[#243623f5] px-3 py-2.5 text-[12px] text-[#d7eacb] shadow-[0_8px_30px_#0008] desktop:right-6 desktop:bottom-5 desktop:left-auto"
              aria-label="Comparison selection"
            >
              <span>{selected.length}/2 graphs selected</span>
              <button onClick={() => scrollToSection(comparisonRef.current)}>View comparison ↑</button>
            </aside>
          )}
          {state.view === 'comparison' && selected.length > 0 && (
            <Viewer movie={selected[0]} comparison={selected} onClose={() => update({ view: '' })} />
          )}
          {state.view !== 'comparison' && viewing && (
            <Viewer
              movie={viewing}
              onClose={() => update({ graph: '', scope: '' })}
              previous={index > 0 ? () => update({ graph: sequence[index - 1].id }, true) : null}
              next={index >= 0 && index < sequence.length - 1
                ? () => update({ graph: sequence[index + 1].id }, true) : null}
            />
          )}
        </>
      )}
    </main>
  );
}
