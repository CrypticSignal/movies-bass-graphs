import { useEffect, useState } from 'react';
import { metadata } from './catalogue.js';

const DATA_VERSION = 'movie_names_v2';

async function fetchJSON(path, signal) {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(
    import.meta.env.BASE_URL + path + separator + 'files=' + DATA_VERSION,
    { signal, cache: 'no-store' },
  );
  if (!response.ok) throw new Error('Could not load ' + path);
  return response.json();
}

function combineCatalogue(rows, details, levels) {
  if (!Array.isArray(rows) || rows.some(row => typeof row.movieName !== 'string' || !row.id)) {
    throw new Error('Invalid catalogue');
  }
  const compatible = levels?.stepHz === 0.5 && levels?.version >= 4;
  const levelsStatus = !levels?.graphs ? 'unavailable' : compatible ? 'ready' : 'outdated';

  const movies = rows.map(row => {
    const analysis = compatible ? levels?.graphs?.[row.id] : null;
    return {
      ...metadata(row, details[row.id] || {}),
      frequencyAnalysis: analysis ? {
        ...analysis,
        startHz: levels.startHz,
        stepHz: levels.stepHz,
      } : undefined,
    };
  });
  return { movies, levelsStatus, status: 'ready' };
}

export default function useCatalogue() {
  const [attempt, setAttempt] = useState(0);
  const [catalogue, setCatalogue] = useState({
    movies: [], status: 'loading', levelsStatus: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setCatalogue(previous => ({ ...previous, status: 'loading', levelsStatus: 'loading' }));

    Promise.all([
      fetchJSON('graphs/catalogue.json', signal),
      fetchJSON('graphs/metadata.json', signal).catch(() => ({})),
      fetchJSON('graphs/levels.json?sampling=0.5&schema=4', signal).catch(() => null),
    ]).then(([rows, details, levels]) => {
      if (!signal.aborted) setCatalogue(combineCatalogue(rows, details, levels));
    }).catch(() => {
      if (!signal.aborted) setCatalogue(previous => ({ ...previous, status: 'error' }));
    });
    return () => controller.abort();
  }, [attempt]);

  return { ...catalogue, retry: () => setAttempt(value => value + 1) };
}
