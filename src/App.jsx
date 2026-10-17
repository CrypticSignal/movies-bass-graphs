import { useEffect, useRef, useState } from 'react';
import { filterMovies, imageURL, rankingLevel, octavePeak, OCTAVE_RANGES, metadata, readState, stateURL } from './catalogue.js';

function FrequencyReading({ movie, state, label }) {
  const level = rankingLevel(movie, state);
  const peak = state.octave && level !== null ? octavePeak(movie, state) : null;
  return <p className="mt-[14px] mb-0 px-4 text-[12px] text-accent">{level === null
    ? `Unranked ${label} — no complete, reliable ${state.curve} curve reading`
    : `${level.toFixed(1)} dB ${label} | ${state.curve} curve`}
    {peak && <span className="mt-1 block">Peak: {peak.level.toFixed(1)} dB at {peak.frequency} Hz</span>}
  </p>;
}

function GraphImage({ movie, ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [movie.id]);
  return imageURL(movie) && !failed
    ? <img className="block h-auto w-full" src={imageURL(movie)} alt={`Bass graph for ${movie.movieName}`} onError={() => setFailed(true)} {...props} />
    : <p className="my-[13px] p-8 text-[13px] text-[#9cab9e]">Graph unavailable. The original image could not be recovered.</p>;
}

function ZoomControl({ value, onChange }) {
  const percentage = Math.round(value * 100);
  return <label className="min-w-[140px] flex-[0_1_200px] gap-[3px] [&>span]:flex [&>span]:items-center [&>span]:justify-between [&>span]:gap-3 [&_output]:text-[#e1eae4] [&_output]:tabular-nums [&_input]:m-0 [&_input]:min-h-8 [&_input]:w-full [&_input]:cursor-pointer [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:accent-accent"><span>Zoom <output>{percentage}%</output></span>
    <input type="range" min="50" max="200" step="1" value={percentage}
      aria-valuetext={`${percentage}%`} onChange={event => onChange(Number(event.target.value) / 100)} />
  </label>;
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
  return <dialog ref={dialog} className="m-auto h-dvh max-h-none w-screen max-w-none rounded-none border border-[#52654c] bg-[#131e17] p-0 text-[#e1eae1] backdrop:bg-[#030a07dc] backdrop:backdrop-blur-[4px] desktop:h-[94dvh] desktop:w-[96vw] desktop:rounded-[10px] [&:fullscreen]:h-dvh [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0" aria-labelledby="viewer-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}
    onKeyDown={event => {
      if (['INPUT', 'SELECT', 'BUTTON', 'A'].includes(event.target.tagName)) return;
      if (event.key === 'ArrowLeft' && previous) { event.preventDefault(); previous(); }
      if (event.key === 'ArrowRight' && next) { event.preventDefault(); next(); }
    }}>
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-[#3d4c3e] p-[15px] desktop:px-[22px] desktop:py-[19px] [&_h2]:mt-1.5 [&_h2]:text-[18px] desktop:[&_h2]:text-[22px]"><div><span className="text-[10px] font-bold tracking-[2px] text-[#b9da9c]">GRAPH VIEWER</span><h2 id="viewer-title">{comparison ? 'Compare graphs' : movie.movieName}</h2></div>
        <button onClick={onClose} aria-label="Close graph viewer">Close ×</button></header>
      <div className="flex flex-wrap items-center gap-[7px] p-3 desktop:gap-2.5 desktop:px-[22px] [&_button]:p-2 [&_button]:text-[11px] desktop:[&_button]:px-[13px] desktop:[&_button]:py-[9px] desktop:[&_button]:text-[13px] [&_a]:p-2 [&_a]:text-[11px] desktop:[&_a]:px-[13px] desktop:[&_a]:py-[9px] desktop:[&_a]:text-[13px] [&_output]:min-w-[42px] [&_output]:text-center [&_output]:text-[12px]">
        {!comparison && <><button onClick={previous} disabled={!previous}>← Previous graph</button>
        <button onClick={next} disabled={!next}>Next graph →</button></>}
        {comparison && <span className="text-[12px] text-[#adbc9f]">Zoom applies to both graphs</span>}
        <span className="hidden flex-1 desktop:block" />
        <ZoomControl value={zoom} onChange={setZoom} />
        <button onClick={() => setZoom(1)}>Fit</button><button onClick={fullscreen}>Fullscreen</button>
        {!comparison && <a className="rounded-md border border-[#3c5149] bg-[#192720] px-[13px] py-[9px] text-[13px] font-semibold text-[#e1eae4] no-underline hover:border-[#b6de8c] hover:bg-[#2a3f32]" href={imageURL(movie)} target="_blank" rel="noreferrer">Original image ↗</a>}
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className={`min-h-0 flex-1 overflow-auto bg-black ${comparison ? 'p-0 [&>div]:flex [&>div]:flex-col [&>div]:gap-0 [&_img]:m-0 [&_img]:shrink-0 [&_img]:border-0 [&_img]:p-0' : 'p-2.5'}`} tabIndex={0} aria-label={comparison ? "Stacked comparison graphs; scroll to pan when zoomed" : "Graph image; scroll to pan when zoomed"}>
        <div style={{ width: `${zoom * 100}%`, marginInline: zoom < 1 ? 'auto' : 0 }}>{comparison ? comparison.map(graph => <GraphImage key={graph.id} movie={graph} />) : <GraphImage movie={movie} />}</div>
      </div>
      <p className="m-0 px-[22px] py-2.5 text-[11px] text-[#9bad9b]">Zoom to inspect detail, then scroll to pan. Use Escape to close.</p>
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
      fetch(import.meta.env.BASE_URL + 'graphs/catalogue.json?files=movie_names_v2', { signal: controller.signal, cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('Catalogue unavailable');
        return response.json();
      }),
      fetch(import.meta.env.BASE_URL + 'graphs/metadata.json?files=movie_names_v2', { signal: controller.signal, cache: 'no-store' })
        .then(response => response.ok ? response.json() : {}).catch(() => ({})),
      fetch(import.meta.env.BASE_URL + 'graphs/levels.json?sampling=0.5&schema=4&files=movie_names_v2', { signal: controller.signal, cache: 'no-store' })
        .then(response => response.ok ? response.json() : null).catch(() => null),
    ]).then(([rows, details, levels]) => {
      if (!Array.isArray(rows) || rows.some(row => typeof row.movieName !== 'string' || !row.id)) throw new Error('Invalid catalogue');
      if (!controller.signal.aborted) { setMovies(rows.map(row => ({ ...metadata(row, details[row.id] || {}), frequencyAnalysis: levels?.stepHz === 0.5 && levels?.version >= 4 && levels?.graphs?.[row.id] ? { ...levels.graphs[row.id], startHz: levels.startHz, stepHz: levels.stepHz } : undefined }))); setLevelsStatus(levels?.graphs ? levels.stepHz === 0.5 && levels.version >= 4 ? 'ready' : 'outdated' : 'unavailable'); setStatus('ready'); }
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
  return <main className={`mx-auto max-w-[1320px] px-4 pt-[26px] desktop:px-9 desktop:pt-12 ${selected.length ? 'pb-[65px]' : ''}`}>
    <header className="mb-[30px] flex flex-col items-start justify-between gap-5 border-b border-[#314039] pb-8 desktop:flex-row desktop:items-center desktop:gap-6 [&_p]:m-0 [&_p]:max-w-[650px] [&_p]:text-[15px] [&_p]:text-[#9eafa6]"><div><span className="text-[10px] font-bold tracking-[2px] text-[#b9da9c]">THE LOW END / SOUNDTRACK ARCHIVE</span>
      <h1 className="my-[15px] text-[clamp(32px,5vw,54px)] tracking-[-1px] desktop:tracking-[-2px]">Movies Bass Graphs<span className="text-accent">.</span></h1>
      <p>Explore the low frequencies. Find a soundtrack, inspect its graph, and compare the details.</p></div>
      <button className="whitespace-nowrap" onClick={share}>Copy view link ↗</button></header>
    {status === 'loading' && <p role="status">Loading the archive…</p>}
    {status === 'error' && <div role="alert"><p>The catalogue could not be loaded.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {status === 'ready' && <>
      <section className="flex flex-wrap items-end gap-[9px] rounded-[10px] border border-[#324138] bg-[#18231e] p-3 desktop:gap-2.5 desktop:px-4 desktop:py-[14px] [&_label]:gap-[5px] [&_label]:text-[10px] [&_input]:min-h-[34px] [&_input]:px-[9px] [&_input]:py-[7px] [&_input]:text-[12px] [&_select]:min-h-[34px] [&_select]:px-[9px] [&_select]:py-[7px] [&_select]:text-[12px] [&_select]:w-full [&_select]:max-w-none desktop:[&_select]:w-auto desktop:[&_select]:max-w-[230px]" aria-label="Browse the archive">
        <label className="min-w-[210px] flex-1 basis-full desktop:basis-0">Search titles<input type="search" placeholder="Try Blade Runner…" value={state.q}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.blur();
              scrollToResults(350);
            }
          }}
          onBlur={() => { queryEditing.current = false; }}
          onChange={event => { update({ q: event.target.value }, queryEditing.current); queryEditing.current = true; }} /></label>
        {filters.map(filter => <label key={filter.key} className="min-w-[100px] flex-1 desktop:min-w-0 desktop:flex-none">{filter.label}<select value={state[filter.key]}
          onChange={event => selectFilter({ [filter.key]: event.target.value })}>
          <option value="">All {filter.key === 'year' ? 'years' : 'formats'}</option>
          {state[filter.key] && !filter.values.includes(state[filter.key]) && <option value={state[filter.key]}>{state[filter.key]}</option>}
          {filter.values.map(value => <option key={value}>{value}</option>)}
        </select></label>)}
        <button className="min-h-[34px] bg-transparent px-2.5 py-[7px] text-[12px]" onClick={() => { setFrequencyInput(''); update({ q: '', year: '', format: '', letter: '', frequency: '', octave: '' }); }}>Reset filters</button>
      </section>
      <form className="mt-2.5 flex flex-wrap items-end gap-2.5 rounded-lg border border-[#324138] bg-[#152019] px-4 py-3 [&_label]:gap-[5px] [&_label]:text-[10px] [&_input]:min-h-[34px] [&_input]:w-[115px] [&_input]:px-[9px] [&_input]:py-[7px] [&_input]:text-[12px] [&_select]:min-h-[34px] [&_select]:px-[9px] [&_select]:py-[7px] [&_select]:text-[12px] [&_button]:min-h-[34px] [&_button]:px-2.5 [&_button]:py-[7px] [&_button]:text-[12px] [&>span]:min-w-[210px] [&>span]:flex-1 [&>span]:text-[11px] [&>span]:leading-[1.6] [&>span]:text-[#9eafa6]" onSubmit={event => {
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
        {!state.octave && <label>Frequency (Hz)<input type="text" inputMode="decimal" required placeholder="20" enterKeyHint="go" value={frequencyInput}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.stopPropagation();
              const input = event.currentTarget;
              const frequency = Number(input.value.replace(',', '.'));
              if (!Number.isInteger(frequency * 2) || frequency < 0.5 || frequency > 200) {
                input.setCustomValidity('Enter a frequency in Hz');
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
          <option value="green">Green (peak dB)</option><option value="red">Red (average dB)</option>
        </select></label>
        {rankingActive && <button type="button" onClick={() => { setFrequencyInput(''); update({ frequency: '', octave: '' }); }}>Clear ranking</button>}
        <span>{state.octave ? 'Octave ranking uses the arithmetic mean of dB readings at every 0.5 Hz, including both endpoints. The complete range must be readable.' : 'Single-frequency ranking uses the value at that frequency, not an average.'} Values are estimates as there is no numeric data, the graphs are analysed using Python.</span>
      </form>
      <nav className="mt-3 flex flex-wrap gap-1 desktop:gap-[5px] [&_button]:min-h-[34px] [&_button]:min-w-[30px] [&_button]:flex-none [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-[11px] desktop:[&_button]:min-h-[33px] desktop:[&_button]:min-w-[31px]" aria-label="Browse by title">
        {['', '0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter => <button key={letter || 'all'} aria-pressed={!state.q.trim() && state.letter === letter}
          onClick={() => selectFilter({ letter, q: '' })}>{letter === '' ? 'All' : letter === '0-9' ? '0–9' : letter}</button>)}
      </nav>
      <p className="mt-[9px] mb-5 text-[11px] text-[#8e9e94]">Years and types are inferred from titles. Soundtrack labels are read automatically from graphs; unclear labels stay Unknown.</p>
      {selected.length > 0 && <section className="mb-[30px] rounded-[10px] border border-[#5a7149] bg-[#1b291f] p-[15px] desktop:p-6" ref={comparisonRef} aria-labelledby="comparison-title">
        <div className="flex flex-col items-start justify-between gap-5 desktop:flex-row desktop:items-center [&_h2]:mt-2 [&_h2]:text-[25px]"><div><span className="text-[10px] font-bold tracking-[2px] text-[#b9da9c]">A / B COMPARISON</span><h2 id="comparison-title">Compare soundtracks</h2></div>
          <div className="flex flex-wrap items-end gap-3 desktop:flex-nowrap"><ZoomControl value={comparisonZoom} onChange={setComparisonZoom} />
            <button disabled={selected.length < 2} onClick={() => update({ view: 'comparison', graph: '', scope: '' })}>Inspect graphs ↗</button>
            <button onClick={() => update({ compare: [] })}>Clear comparison</button></div></div>
        <p className="my-[12px] text-[12px] text-[#a6b59e]">Compare shapes and labelled values; graphs may use different axis ranges and measurement methods.</p>
        <div className="grid grid-cols-1 gap-0 [&_article]:m-0 [&_article]:min-w-0 [&_article]:p-0">{selected.map(movie => <article key={movie.id}>
          <div className="m-0 max-h-none overflow-auto border-0 bg-black [&_img]:block [&_img]:w-full" tabIndex={0} aria-label={`Scrollable comparison graph for ${movie.movieName}`}><div style={{ width: `${comparisonZoom * 100}%`, marginInline: comparisonZoom < 1 ? 'auto' : 0 }}><GraphImage movie={movie} /></div></div>
        </article>)}{selected.length === 1 && <div className="grid min-h-[180px] place-content-center border border-dashed border-[#4e6542] p-5 text-center text-[13px] text-[#adbc9f]">Select a second graph below to compare it here.</div>}</div>
      </section>}
      <div className="mt-5 mb-3 flex flex-col items-start justify-between gap-0 text-[12px] text-[#9bad9f] desktop:my-0 desktop:flex-row desktop:items-center desktop:gap-[14px] [&_p]:mt-0 [&_p]:mb-2 [&_p]:text-[15px] desktop:[&_p]:my-[15px] [&_strong]:text-[#e8f0e7] [&_p_span]:ml-2 [&_p_span]:text-[12px]"><p><strong>{filtered.length}</strong> {filtered.length === 1 ? 'entry' : 'entries'}<span> / {movies.length} in the archive</span></p>
        <span>Select up to two graphs to compare</span></div>
      {rankingActive && <p className="mt-0 mb-[14px] text-[12px] text-[#b9da9c]" role="status">{levelsStatus !== 'ready'
        ? levelsStatus === 'outdated' ? 'The frequency data is outdated. Reload this page to retrieve the 0.5 Hz readings; rankings are temporarily unavailable.' : 'Frequency readings are unavailable. Graphs are shown without a ranking.'
        : `${rankedCount} of ${filtered.length} matching graphs ranked by the ${state.curve} curve ${rankingLabel}, highest first. Graphs with uncertain or missing readings are listed afterward as unranked.`}</p>}
      <p role="status" className="mt-0 mb-3 min-h-0 text-[13px] text-accent empty:hidden">{message}</p>
      <div ref={resultsRef} className="min-h-[calc(100svh_-_16px)] scroll-mt-4">
      <section className="grid grid-cols-1 gap-[22px] desktop:grid-cols-2" aria-label="Movie graphs">{filtered.map((movie, movieIndex) => <article className="min-w-0 overflow-hidden rounded-[9px] border border-[#34453a] bg-[#17221d]" key={movie.id}>
        <div className="flex min-h-[103px] items-start justify-between gap-3 p-[15px] desktop:p-[19px] [&_h2]:mt-[7px] [&_h2]:text-[17px] [&_h2]:leading-[1.35] desktop:[&_h2]:text-[18px] [&_button]:px-2.5 [&_button]:py-[7px] [&_button]:text-[11px] [&_button]:whitespace-nowrap"><div>{rankingActive && rankingLevel(movie, state) !== null && <span className="mb-[7px] table rounded bg-accent px-[7px] py-[3px] text-[12px] font-bold text-[#162016] tabular-nums">Rank #{movieIndex + 1}</span>}<span className="text-[10px] tracking-[.4px] text-[#a7bb9e]">{movie.year} · {movie.type}{movie.format !== 'Unknown' ? ' · ' + movie.format : ''}</span><h2>{movie.movieName}</h2></div>
          <button aria-pressed={state.compare.includes(movie.id)} disabled={!imageURL(movie)} onClick={() => toggleCompare(movie)}>{state.compare.includes(movie.id) ? '✓ Selected' : '+ Compare'}<span className="sr-only"> {movie.movieName}</span></button></div>
        {imageURL(movie) ? <button className="group relative block w-full rounded-none border-0 bg-black p-0 hover:bg-black" onClick={() => update({ graph: movie.id, scope: '', view: '' })} aria-label={`View graph for ${movie.movieName}`}><GraphImage movie={movie} loading="lazy" /><span className="absolute right-3 bottom-3 rounded border border-[#6b835a] bg-[#203127e8] px-[9px] py-1.5 text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">Inspect graph ↗</span></button> : <GraphImage movie={movie} />}
        {rankingActive && <FrequencyReading movie={movie} state={state} label={rankingLabel} />}
        <div className="px-4 py-3"><button disabled={!imageURL(movie)} onClick={() => update({ graph: movie.id, scope: '', view: '' })} aria-label={`Inspect graph for ${movie.movieName}`}>Inspect graph ↗</button></div>
      </article>)}</section>
      {!filtered.length && <p className="my-[16px] px-[15px] py-[60px] text-center text-[#a9b9ad]">No titles match these filters. Try a broader search or reset the filters.</p>}
      </div>
      <footer className="border-t border-[#314039] pt-6 pb-[35px] text-[11px] text-[#839689]">Movie soundtrack graphs · Original credits and measurement details appear on each image.</footer>
      {selected.length > 0 && <aside className="fixed right-3 bottom-3 left-3 z-5 flex items-center justify-between gap-[14px] rounded-lg border border-[#b9da9c] bg-[#243623f5] px-3 py-2.5 text-[12px] text-[#d7eacb] shadow-[0_8px_30px_#0008] desktop:right-6 desktop:bottom-5 desktop:left-auto" aria-label="Comparison selection"><span>{selected.length}/2 graphs selected</span><button onClick={() => comparisonRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>View comparison ↑</button></aside>}
      {state.view === 'comparison' && selected.length > 0 && <Viewer movie={selected[0]} comparison={selected}
        onClose={() => update({ view: '' })} />}
      {state.view !== 'comparison' && viewing && <Viewer movie={viewing} onClose={() => update({ graph: '', scope: '' })}
        previous={index > 0 ? () => update({ graph: sequence[index - 1].id }, true) : null}
        next={index >= 0 && index < sequence.length - 1 ? () => update({ graph: sequence[index + 1].id }, true) : null} />}
    </>}
  </main>;
}
