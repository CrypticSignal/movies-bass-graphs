export const PAGE_SIZE = 10;
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
  const n = Number(p.get('page'));
  return {
    q: p.get('q') || '', year: p.get('year') || '', type: p.get('type') || '', format: p.get('format') || '',
    page: Number.isSafeInteger(n) && n > 0 ? n : 1,
    graph: p.get('graph') || '', compare: [...new Set((p.get('compare') || '').split(',').filter(Boolean))].slice(0, 2),
  };
}

export function stateURL(state) {
  const p = new URLSearchParams();
  for (const key of ['q', 'year', 'type', 'format', 'graph']) if (state[key]) p.set(key, state[key]);
  if (state.page > 1) p.set('page', String(state.page));
  if (state.compare.length) p.set('compare', state.compare.join(','));
  return window.location.pathname + (p.size ? '?' + p.toString() : '') + window.location.hash;
}

export function filterMovies(movies, state) {
  const query = state.q.trim().toLowerCase();
  return movies.filter(movie => movie.movieName.toLowerCase().includes(query)
    && (!state.year || movie.year === state.year)
    && (!state.type || movie.type === state.type)
    && (!state.format || movie.format === state.format));
}
