export const OCTAVE_RANGES = ['10-20', '20-40', '30-60', '40-80', '50-100', '60-120'];
export const FREQUENCY_STEP = 0.5;
export const MIN_FREQUENCY = 0.5;
export const MAX_FREQUENCY = 200;

// Empty and invalid inputs use the same empty-string value as the URL state.
export function parseFrequency(value) {
  const frequency = Number(String(value).replace(',', '.'));
  return Number.isInteger(frequency / FREQUENCY_STEP)
    && frequency >= MIN_FREQUENCY && frequency <= MAX_FREQUENCY
    ? frequency : '';
}

export const imageURL = movie => movie?.imagePath ? import.meta.env.BASE_URL + movie.imagePath : null;

export function metadata(movie, extra = {}) {
  const title = movie.movieName || '';
  const year = title.match(/\(((?:19|20)\d{2})(?:\)|-)/)?.[1] || 'Unknown';
  const type = /\bseason\b|\bseries\b|Cosmos: A Spacetime Odyssey/i.test(title)
    ? 'TV series' : year !== 'Unknown' ? 'Movie' : 'Unknown';
  return { ...movie, year, type, format: 'Unknown', ...extra, id: String(movie.id) };
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

// Single-frequency values and octave summaries share one entry point.
export function rankingReading(movie, state) {
  if (!state.octave) {
    return { level: levelAt(movie, state.frequency, state.curve), peak: null };
  }
  if (!OCTAVE_RANGES.includes(state.octave)) return { level: null, peak: null };

  const [low, high] = state.octave.split('-').map(Number);
  let sum = 0;
  let count = 0;
  let peak = null;
  for (let frequency = low; frequency <= high; frequency += FREQUENCY_STEP) {
    const level = levelAt(movie, frequency, state.curve);
    // A partial octave must not be presented as a complete reading.
    if (level === null) return { level: null, peak: null };
    sum += level;
    count += 1;
    if (!peak || level > peak.level) peak = { level, frequency };
  }
  return { level: sum / count, peak };
}

export function rankingLevel(movie, state) {
  return rankingReading(movie, state).level;
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
