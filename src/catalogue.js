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
  const letter = (p.get('letter') || '').toUpperCase();
  return {
    q: p.get('q') || '', year: p.get('year') || '', format: p.get('format') || '',
    letter: /^(?:[A-Z]|0-9)$/.test(letter) ? letter : '',
    scope: p.get('scope') === 'comparison' ? 'comparison' : '',
    graph: p.get('graph') || '', compare: [...new Set((p.get('compare') || '').split(',').filter(Boolean))].slice(0, 2),
  };
}

export function stateURL(state) {
  const p = new URLSearchParams();
  for (const key of ['q', 'year', 'format', 'letter', 'graph']) if (state[key]) p.set(key, state[key]);
  if (state.graph && state.scope === 'comparison') p.set('scope', 'comparison');
  if (state.compare.length) p.set('compare', state.compare.join(','));
  return window.location.pathname + (p.size ? '?' + p.toString() : '') + window.location.hash;
}

function initial(title) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toUpperCase();
}

export function filterMovies(movies, state) {
  const query = state.q.trim().toLowerCase();
  return movies.filter(movie => movie.movieName.toLowerCase().includes(query)
    && (!state.letter || (state.letter === '0-9' ? /^[0-9]$/.test(initial(movie.movieName)) : initial(movie.movieName) === state.letter))
    && (!state.year || movie.year === state.year)
    && (!state.format || movie.format === state.format));
}
