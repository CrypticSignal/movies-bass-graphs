export const OCTAVE_RANGES = ['10-20', '20-40', '30-60', '40-80', '50-100', '60-120'];
export const imageURL = movie => movie?.imagePath ? import.meta.env.BASE_URL + movie.imagePath : null;

export function metadata(movie, extra = {}) {
  const title = movie.movieName || '';
  const year = title.match(/\(((?:19|20)\d{2})(?:\)|-)/)?.[1] || 'Unknown';
  const type = /\bseason\b|\bseries\b|Cosmos: A Spacetime Odyssey/i.test(title)
    ? 'TV series' : year !== 'Unknown' ? 'Movie' : 'Unknown';
  return { ...movie, year, type, format: 'Unknown', ...extra, id: String(movie.id) };
}

export function readState(search = window.location.search) {
  const p = new URLSearchParams(search);
  const frequency = Number(p.get('hz'));
  const octave = OCTAVE_RANGES.includes(p.get('octave')) ? p.get('octave') : '';
  const letter = (p.get('letter') || '').toUpperCase();
  return {
    octave,
    frequency: !octave && Number.isInteger(frequency * 2) && frequency >= 0.5 && frequency <= 200 ? frequency : '',
    curve: p.get('curve') === 'red' ? 'red' : 'green',
    q: p.get('q') || '', year: p.get('year') || '', format: p.get('format') || '',
    letter: /^(?:[A-Z]|0-9)$/.test(letter) ? letter : '',
    view: p.get('view') === 'comparison' ? 'comparison' : '',
    scope: p.get('scope') === 'comparison' ? 'comparison' : '',
    graph: p.get('graph') || '', compare: [...new Set((p.get('compare') || '').split(',').filter(Boolean))].slice(0, 2),
  };
}

export function stateURL(state) {
  const p = new URLSearchParams();
  for (const key of ['q', 'year', 'format', 'letter', 'graph']) if (state[key]) p.set(key, state[key]);
  if (state.octave) p.set('octave', state.octave);
  else if (state.frequency) p.set('hz', String(state.frequency));
  if ((state.frequency || state.octave) && state.curve === 'red') p.set('curve', 'red');
  if (state.view === 'comparison' && state.compare.length) p.set('view', 'comparison');
  if (state.graph && state.scope === 'comparison') p.set('scope', 'comparison');
  if (state.compare.length) p.set('compare', state.compare.join(','));
  return window.location.pathname + (p.size ? '?' + p.toString() : '') + window.location.hash;
}

function initial(title) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toUpperCase();
}

export function levelAt(movie, frequency, curve = 'green') {
  const analysis = movie.frequencyAnalysis;
  if (!analysis || analysis.imagePath !== movie.imagePath) return null;
  const index = (Number(frequency) - (analysis.startHz ?? 1)) / (analysis.stepHz ?? 1);
  if (!Number.isInteger(index) || index < 0) return null;
  const value = analysis.profiles?.[curve]?.[index];
  return Number.isFinite(value) ? value : null;
}

export function rankingLevel(movie, state) {
  if (!state.octave) return levelAt(movie, state.frequency, state.curve);
  if (!OCTAVE_RANGES.includes(state.octave)) return null;
  const [low, high] = state.octave.split('-').map(Number);
  let sum = 0;
  for (let frequency = low; frequency <= high; frequency += 0.5) {
    const value = levelAt(movie, frequency, state.curve);
    if (value === null) return null;
    sum += value;
  }
  return sum / ((high - low) / 0.5 + 1);
}

export function filterMovies(movies, state) {
  const query = state.q.trim().toLowerCase();
  const result = movies.filter(movie => movie.movieName.toLowerCase().includes(query)
    && (query || !state.letter || (state.letter === '0-9' ? /^[0-9]$/.test(initial(movie.movieName)) : initial(movie.movieName) === state.letter))
    && (!state.year || movie.year === state.year)
    && (!state.format || movie.format === state.format));
  if (state.frequency || state.octave) result.sort((a, b) => {
    const first = rankingLevel(a, state);
    const second = rankingLevel(b, state);
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    return second - first;
  });
  return result;
}
