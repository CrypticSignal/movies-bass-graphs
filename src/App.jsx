import { useEffect, useRef, useState } from 'react';
import { filterMovies, imageURL, rankingLevel, OCTAVE_RANGES, metadata, readState, stateURL } from './catalogue.js';

function GraphImage({ movie, ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [movie.id]);
  return imageURL(movie) && !failed
    ? <img src={imageURL(movie)} alt={`Bass graph for ${movie.movieName}`} onError={() => setFailed(true)} {...props} />
    : <p className="unavailable">Graph unavailable. The original image could not be recovered.</p>;
}

function Viewer({ movie, comparison, previous, next, onClose }) {
  const dialog = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    element.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oldOverflow;
      if (document.fullscreenElement === element) document.exitFullscreen().catch(() => {});
      element.close();
      if (focused?.isConnected) focused.focus();
    };
  }, []);
  useEffect(() => { setZoom(1); setNotice(''); }, [movie.id]);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (dialog.current.requestFullscreen) await dialog.current.requestFullscreen();
      else setNotice('Fullscreen is not available in this browser. You can still zoom and scroll.');
    } catch { setNotice('Fullscreen could not be opened. You can still zoom and scroll.'); }
  }
  return <dialog ref={dialog} className="viewer" aria-labelledby="viewer-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}
    onKeyDown={event => {
      if (['INPUT', 'SELECT', 'BUTTON', 'A'].includes(event.target.tagName)) return;
      if (event.key === 'ArrowLeft' && previous) { event.preventDefault(); previous(); }
      if (event.key === 'ArrowRight' && next) { event.preventDefault(); next(); }
    }}>
    <div className="viewer-shell">
      <header className="viewer-header"><div><span className="eyebrow">GRAPH VIEWER</span><h2 id="viewer-title">{comparison ? 'Compare graphs' : movie.movieName}</h2></div>
        <button onClick={onClose} aria-label="Close graph viewer">Close ×</button></header>
      <div className="viewer-toolbar">
        {!comparison && <><button onClick={previous} disabled={!previous}>← Previous graph</button>
        <button onClick={next} disabled={!next}>Next graph →</button></>}
        {comparison && <span className="shared-zoom-label">Zoom applies to both graphs</span>}
        <span className="toolbar-spacer" />
        <button disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))} aria-label="Zoom out">−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + 0.5))} aria-label="Zoom in">+</button>
        <button onClick={() => setZoom(1)}>Fit</button><button onClick={fullscreen}>Fullscreen</button>
        {!comparison && <a className="button" href={imageURL(movie)} target="_blank" rel="noreferrer">Original image ↗</a>}
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className={comparison ? "graph-viewport stacked-viewport" : "graph-viewport"} tabIndex={0} aria-label={comparison ? "Stacked comparison graphs; scroll to pan when zoomed" : "Graph image; scroll to pan when zoomed"}>
        <div style={{ width: `${zoom * 100}%` }}>{comparison ? comparison.map(graph => <GraphImage key={graph.id} movie={graph} />) : <GraphImage movie={movie} />}</div>
      </div>
      <p className="viewer-hint">Zoom to inspect detail, then scroll to pan. Use Escape to close.</p>
    </div>
  </dialog>;
}

export default function App() {
  const [state, setState] = useState(readState);
  const stateRef = useRef(state);
  const [frequencyInput, setFrequencyInput] = useState(() => readState().frequency || '');
  const [levelsStatus, setLevelsStatus] = useState('loading');
  const queryEditing = useRef(false);
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const comparisonRef = useRef(null);
  const resultsRef = useRef(null);
  const scrollPending = useRef(false);
  const scrollTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(scrollTimer.current), []);
  function scrollToResults(delay = 0) {
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    }, delay);
  }
  function selectFilter(patch) {
    scrollPending.current = true;
    update(patch);
  }
  useEffect(() => {
    if (scrollPending.current) {
      scrollPending.current = false;
      scrollToResults();
    }
  });
  const [comparisonZoom, setComparisonZoom] = useState(1);
  function update(patch, replace = false) {
    const updated = { ...stateRef.current, ...patch };
    stateRef.current = updated;
    const url = stateURL(updated);
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
    }
    setState(updated);
  }
  useEffect(() => {
    const restore = () => { queryEditing.current = false; const restored = readState(); stateRef.current = restored; setState(restored); setFrequencyInput(restored.frequency || ''); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setLevelsStatus('loading');
    Promise.all([
      fetch(import.meta.env.BASE_URL + 'graphs/catalogue.json', { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error('Catalogue unavailable');
        return response.json();
      }),
      fetch(import.meta.env.BASE_URL + 'graphs/metadata.json', { signal: controller.signal })
        .then(response => response.ok ? response.json() : {}).catch(() => ({})),
      fetch(import.meta.env.BASE_URL + 'graphs/levels.json?sampling=0.5&schema=3', { signal: controller.signal, cache: 'no-cache' })
        .then(response => response.ok ? response.json() : null).catch(() => null),
    ]).then(([rows, details, levels]) => {
      if (!Array.isArray(rows) || rows.some(row => typeof row.movieName !== 'string' || !row.id)) throw new Error('Invalid catalogue');
      if (!controller.signal.aborted) { setMovies(rows.map(row => ({ ...metadata(row, details[row.id] || {}), frequencyAnalysis: levels?.stepHz === 0.5 && levels?.version >= 3 && levels?.graphs?.[row.id] ? { ...levels.graphs[row.id], startHz: levels.startHz, stepHz: levels.stepHz } : undefined }))); setLevelsStatus(levels?.graphs ? levels.stepHz === 0.5 && levels.version >= 3 ? 'ready' : 'outdated' : 'unavailable'); setStatus('ready'); }
    }).catch(error => { if (error.name !== 'AbortError' && !controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);

  const filtered = filterMovies(movies, state);
  const rankingActive = Boolean(state.frequency || state.octave);
  const rankingLabel = state.octave ? `average across ${state.octave.replace('-', '–')} Hz` : `at ${state.frequency} Hz`;
  const rankedCount = rankingActive ? filtered.filter(movie => rankingLevel(movie, state) !== null).length : 0;
  const selected = state.compare.map(id => movies.find(movie => movie.id === id)).filter(movie => movie && imageURL(movie));
  const viewing = movies.find(movie => movie.id === state.graph && imageURL(movie) && (state.scope !== 'comparison' || state.compare.includes(movie.id)));
  const sequence = state.scope === 'comparison' ? selected : filtered.filter(movie => imageURL(movie));
  const index = viewing ? sequence.findIndex(movie => movie.id === viewing.id) : -1;
  useEffect(() => {
    if (status !== 'ready') return;
    const valid = state.compare.filter(id => movies.some(movie => movie.id === id && imageURL(movie)));
    const patch = {};
    if (state.graph && !viewing) patch.graph = '';
    if (state.view === 'comparison' && !valid.length) patch.view = '';
    if (valid.join(',') !== state.compare.join(',')) patch.compare = valid;
    if (Object.keys(patch).length) update(patch, true);
  }, [status, movies, state.graph, state.view, state.compare.join(',')]);

  function toggleCompare(movie) {
    setMessage('');
    if (state.compare.includes(movie.id)) update({ compare: state.compare.filter(id => id !== movie.id) });
    else if (state.compare.length < 2) update({ compare: [...state.compare, movie.id] });
    else setMessage('Two graphs are selected. Remove one to compare a different graph.');
  }
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setMessage('Link copied.'); }
    catch { setMessage('Copy the URL from your address bar to share this view.'); }
  }
  const filters = [
    { key: 'year', label: 'Year', values: [...new Set(movies.map(movie => movie.year))].sort().reverse() },
    { key: 'format', label: 'Soundtrack format', values: [...new Set(movies.map(movie => movie.format))].sort() },
  ];
  return <main className="app">
    <header className="masthead"><div><span className="eyebrow">THE LOW END / SOUNDTRACK ARCHIVE</span>
      <h1>Movies Bass Graphs<span className="title-dot">.</span></h1>
      <p>Explore the low frequencies. Find a soundtrack, inspect its graph, and compare the details.</p></div>
      <button className="share" onClick={share}>Copy view link ↗</button></header>
    {status === 'loading' && <p role="status">Loading the archive…</p>}
    {status === 'error' && <div role="alert"><p>The catalogue could not be loaded.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {status === 'ready' && <>
      <section className="search-panel" aria-label="Browse the archive">
        <label className="search-field">Search titles<input type="search" placeholder="Try Blade Runner…" value={state.q}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.blur();
              scrollToResults(350);
            }
          }}
          onBlur={() => { queryEditing.current = false; }}
          onChange={event => { update({ q: event.target.value }, queryEditing.current); queryEditing.current = true; }} /></label>
        {filters.map(filter => <label key={filter.key}>{filter.label}<select value={state[filter.key]}
          onChange={event => selectFilter({ [filter.key]: event.target.value })}>
          <option value="">All {filter.key === 'year' ? 'years' : 'formats'}</option>
          {state[filter.key] && !filter.values.includes(state[filter.key]) && <option value={state[filter.key]}>{state[filter.key]}</option>}
          {filter.values.map(value => <option key={value}>{value}</option>)}
        </select></label>)}
        <button className="reset" onClick={() => { setFrequencyInput(''); update({ q: '', year: '', format: '', letter: '', frequency: '', octave: '' }); }}>Reset filters</button>
      </section>
      <form className="frequency-panel" onSubmit={event => {
        event.preventDefault();
        const frequency = Number(String(frequencyInput).replace(',', '.'));
        if (!state.octave && (!Number.isInteger(frequency * 2) || frequency < 0.5 || frequency > 200)) return;
        document.activeElement?.blur();
        if (!state.octave) update({ frequency });
        scrollToResults(350);
      }}>
        <label>Rank by<select value={state.octave || ''} onChange={event => {
          const octave = event.target.value;
          const frequency = Number(String(frequencyInput).replace(',', '.'));
          selectFilter({ octave, frequency: !octave && Number.isInteger(frequency * 2) && frequency >= 0.5 && frequency <= 200 ? frequency : '' });
        }}>
          <option value="">Single frequency</option>
          {OCTAVE_RANGES.map(range => <option key={range} value={range}>{range.replace('-', '–')} Hz octave average</option>)}
        </select></label>
        {!state.octave && <label>Frequency (Hz, 0.5–200)<input type="text" inputMode="decimal" required placeholder="20" enterKeyHint="go" value={frequencyInput}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.stopPropagation();
              const input = event.currentTarget;
              const frequency = Number(input.value.replace(',', '.'));
              if (!Number.isInteger(frequency * 2) || frequency < 0.5 || frequency > 200) {
                input.setCustomValidity('Enter a frequency from 0.5 to 200 Hz in 0.5 Hz steps.');
                input.reportValidity();
                return;
              }
              input.setCustomValidity('');
              update({ frequency, octave: '' });
              input.blur();
              scrollToResults(400);
            }
          }}
          onChange={event => {
            event.target.setCustomValidity('');
            const value = event.target.value;
            setFrequencyInput(value);
            const frequency = Number(value.replace(',', '.'));
            update({ frequency: value !== '' && Number.isInteger(frequency * 2) && frequency >= 0.5 && frequency <= 200 ? frequency : '', octave: '' }, true);
          }} /></label>}
        <label>Curve<select value={state.curve} onChange={event => update({ curve: event.target.value })}>
          <option value="green">Green curve</option><option value="red">Red curve</option>
        </select></label>
        {rankingActive && <button type="button" onClick={() => { setFrequencyInput(''); update({ frequency: '', octave: '' }); }}>Clear ranking</button>}
        <span>{state.octave ? 'Octave ranking uses the arithmetic mean of dB readings at every 0.5 Hz, including both endpoints. The complete range must be readable.' : 'Single-frequency ranking uses the value at that frequency, not an average.'} Values are image estimates, not subwoofer SPL.</span>
      </form>
      <nav className="alphabet" aria-label="Browse by title">
        {['', '0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter => <button key={letter || 'all'} aria-pressed={!state.q.trim() && state.letter === letter}
          onClick={() => selectFilter({ letter, q: '' })}>{letter === '' ? 'All' : letter === '0-9' ? '0–9' : letter}</button>)}
      </nav>
      <p className="metadata-note">Years and types are inferred from titles. Soundtrack labels are read automatically from graphs; unclear labels stay Unknown.</p>
      {selected.length > 0 && <section className="comparison" ref={comparisonRef} aria-labelledby="comparison-title">
        <div className="section-heading"><div><span className="eyebrow">A / B COMPARISON</span><h2 id="comparison-title">Compare soundtracks</h2></div>
          <div className="comparison-controls"><label>Detail<select value={comparisonZoom} onChange={event => setComparisonZoom(Number(event.target.value))}><option value={1}>Fit</option><option value={1.5}>150%</option><option value={2}>200%</option><option value={3}>300%</option></select></label>
            <button disabled={selected.length < 2} onClick={() => update({ view: 'comparison', graph: '', scope: '' })}>Inspect graphs ↗</button>
            <button onClick={() => update({ compare: [] })}>Clear comparison</button></div></div>
        <p className="comparison-note">Compare shapes and labelled values; graphs may use different axis ranges and measurement methods.</p>
        <div className="comparison-grid compact-comparison">{selected.map(movie => <article key={movie.id}>
          <div className="comparison-viewport" tabIndex={0} aria-label={`Scrollable comparison graph for ${movie.movieName}`}><div style={{ width: `${comparisonZoom * 100}%` }}><GraphImage movie={movie} /></div></div>
        </article>)}{selected.length === 1 && <div className="comparison-empty">Select a second graph below to compare it here.</div>}</div>
      </section>}
      <div className="results-heading"><p><strong>{filtered.length}</strong> {filtered.length === 1 ? 'entry' : 'entries'}<span> / {movies.length} in the archive</span></p>
        <span>Select up to two graphs to compare</span></div>
      {rankingActive && <p className="frequency-summary" role="status">{levelsStatus !== 'ready'
        ? levelsStatus === 'outdated' ? 'The frequency data is outdated. Reload this page to retrieve the 0.5 Hz readings; rankings are temporarily unavailable.' : 'Frequency readings are unavailable. Graphs are shown without a ranking.'
        : `${rankedCount} of ${filtered.length} matching graphs ranked by the ${state.curve} curve ${rankingLabel}, highest first. Graphs with uncertain or missing readings are listed afterward as unranked.`}</p>}
      <p role="status" className="action-message">{message}</p>
      <div ref={resultsRef} style={{ scrollMarginTop: 16, minHeight: 'calc(100svh - 16px)' }}>
      <section className="gallery" aria-label="Movie graphs">{filtered.map(movie => <article className="graph-card" key={movie.id}>
        <div className="card-heading"><div><span className="card-meta">{movie.year} · {movie.type}{movie.format !== 'Unknown' ? ' · ' + movie.format : ''}</span><h2>{movie.movieName}</h2></div>
          <button aria-pressed={state.compare.includes(movie.id)} disabled={!imageURL(movie)} onClick={() => toggleCompare(movie)}>{state.compare.includes(movie.id) ? '✓ Selected' : '+ Compare'}<span className="sr-only"> {movie.movieName}</span></button></div>
        {imageURL(movie) ? <button className="graph-open" onClick={() => update({ graph: movie.id, scope: '', view: '' })} aria-label={`View graph for ${movie.movieName}`}><GraphImage movie={movie} loading="lazy" /><span className="inspect-tag">Inspect graph ↗</span></button> : <GraphImage movie={movie} />}
        {rankingActive && <p className="frequency-value">{rankingLevel(movie, state) === null
          ? `Unranked ${rankingLabel} — no complete, reliable ${state.curve} curve reading`
          : `≈ ${rankingLevel(movie, state).toFixed(1)} dB ${rankingLabel} · ${state.curve} curve (estimated)`}</p>}
        <div style={{ padding: '12px 16px' }}><button disabled={!imageURL(movie)} onClick={() => update({ graph: movie.id, scope: '', view: '' })} aria-label={`Inspect graph for ${movie.movieName}`}>Inspect graph ↗</button></div>
      </article>)}</section>
      {!filtered.length && <p className="empty">No titles match these filters. Try a broader search or reset the filters.</p>}
      </div>
      <footer>Movie soundtrack graphs · Original credits and measurement details appear on each image.</footer>
      {selected.length > 0 && <aside className="compare-tray" aria-label="Comparison selection"><span>{selected.length}/2 graphs selected</span><button onClick={() => comparisonRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>View comparison ↑</button></aside>}
      {state.view === 'comparison' && selected.length > 0 && <Viewer movie={selected[0]} comparison={selected}
        onClose={() => update({ view: '' })} />}
      {state.view !== 'comparison' && viewing && <Viewer movie={viewing} onClose={() => update({ graph: '', scope: '' })}
        previous={index > 0 ? () => update({ graph: sequence[index - 1].id }, true) : null}
        next={index >= 0 && index < sequence.length - 1 ? () => update({ graph: sequence[index + 1].id }, true) : null} />}
    </>}
  </main>;
}
