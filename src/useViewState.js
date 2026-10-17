import { useCallback, useEffect, useRef, useState } from 'react';
import { OCTAVE_RANGES, parseFrequency } from './catalogue.js';

export function readState(search = window.location.search) {
  const p = new URLSearchParams(search);
  const frequency = parseFrequency(p.get('hz'));
  const octave = OCTAVE_RANGES.includes(p.get('octave')) ? p.get('octave') : '';
  const letter = (p.get('letter') || '').toUpperCase();
  return {
    octave,
    frequency: !octave ? frequency : '',
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

// Keep browser history and React state in sync in one place.
export default function useViewState() {
  const [state, setState] = useState(readState);
  const current = useRef(state);

  const update = useCallback((patch, replace = false) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    const url = stateURL(next);
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
    }
    setState(next);
  }, []);

  useEffect(() => {
    function restore() {
      current.current = readState();
      setState(current.current);
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  return { state, update };
}
