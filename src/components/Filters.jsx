import { useEffect, useRef, useState } from 'react';
import { OCTAVE_RANGES, parseFrequency } from '../catalogue.js';
import { readState } from '../useViewState.js';

const LABEL = 'gap-[5px] text-[10px]';
const CONTROL = 'min-h-[34px] px-[9px] py-[7px] text-[12px]';
const COMPACT_BUTTON = 'min-h-[34px] px-2.5 py-[7px] text-[12px]';
const LETTERS = ['', '0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

function isEnter(event) {
  return event.key === 'Enter' && !event.nativeEvent.isComposing;
}

export default function Filters({ movies, state, update, selectFilter, scrollToResults }) {
  const [frequencyInput, setFrequencyInput] = useState(() => state.frequency || '');
  const queryEditing = useRef(false);
  const rankingActive = Boolean(state.frequency || state.octave);

  useEffect(() => {
    function restore() {
      queryEditing.current = false;
      setFrequencyInput(readState().frequency || '');
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function resetFilters() {
    setFrequencyInput('');
    queryEditing.current = false;
    update({ q: '', year: '', format: '', letter: '', frequency: '', octave: '' });
  }

  function submitRanking(event) {
    event.preventDefault();
    const frequency = parseFrequency(frequencyInput);
    if (!state.octave && !frequency) return;
    document.activeElement?.blur();
    if (!state.octave) update({ frequency });
    scrollToResults(350);
  }

  function enterFrequency(event) {
    if (!isEnter(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const input = event.currentTarget;
    const frequency = parseFrequency(input.value);
    if (!frequency) {
      input.setCustomValidity('Enter a frequency in Hz');
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    update({ frequency, octave: '' });
    input.blur();
    scrollToResults(400);
  }

  const filters = [
    { key: 'year', label: 'Year', values: [...new Set(movies.map(movie => movie.year))].sort().reverse() },
    { key: 'format', label: 'Soundtrack format', values: [...new Set(movies.map(movie => movie.format))].sort() },
  ];

  return (
    <>
      <section
        className="flex flex-wrap items-end gap-[9px] rounded-[10px] border border-[#324138] bg-[#18231e] p-3 desktop:gap-2.5 desktop:px-4 desktop:py-[14px]"
        aria-label="Browse the archive"
      >
        <label className={`${LABEL} min-w-[210px] flex-1 basis-full desktop:basis-0`}>
          Search titles
          <input
            className={CONTROL}
            type="search"
            placeholder="Try Blade Runner…"
            value={state.q}
            onKeyDown={event => {
              if (!isEnter(event)) return;
              event.preventDefault();
              event.currentTarget.blur();
              scrollToResults(350);
            }}
            onBlur={() => { queryEditing.current = false; }}
            onChange={event => {
              update({ q: event.target.value }, queryEditing.current);
              queryEditing.current = true;
            }}
          />
        </label>
        {filters.map(filter => (
          <label key={filter.key} className={`${LABEL} min-w-[100px] flex-1 desktop:min-w-0 desktop:flex-none`}>
            {filter.label}
            <select
              className={`${CONTROL} w-full max-w-none desktop:w-auto desktop:max-w-[230px]`}
              value={state[filter.key]}
              onChange={event => selectFilter({ [filter.key]: event.target.value })}
            >
              <option value="">All {filter.key === 'year' ? 'years' : 'formats'}</option>
              {state[filter.key] && !filter.values.includes(state[filter.key]) && (
                <option value={state[filter.key]}>{state[filter.key]}</option>
              )}
              {filter.values.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
        ))}
        <button className={`${COMPACT_BUTTON} bg-transparent`} onClick={resetFilters}>Reset filters</button>
      </section>

      <form
        className="mt-2.5 flex flex-wrap items-end gap-2.5 rounded-lg border border-[#324138] bg-[#152019] px-4 py-3"
        onSubmit={submitRanking}
      >
        <label className={LABEL}>
          Rank by
          <select
            className={CONTROL}
            value={state.octave || ''}
            onChange={event => {
              const octave = event.target.value;
              selectFilter({ octave, frequency: octave ? '' : parseFrequency(frequencyInput) });
            }}
          >
            <option value="">Single frequency</option>
            {OCTAVE_RANGES.map(range => (
              <option key={range} value={range}>{range.replace('-', '–')} Hz octave average</option>
            ))}
          </select>
        </label>
        {!state.octave && (
          <label className={LABEL}>
            Frequency (Hz)
            <input
              className={`${CONTROL} w-[115px]`}
              type="text"
              inputMode="decimal"
              required
              placeholder="20"
              enterKeyHint="go"
              value={frequencyInput}
              onKeyDown={enterFrequency}
              onChange={event => {
                event.target.setCustomValidity('');
                const value = event.target.value;
                setFrequencyInput(value);
                update({ frequency: parseFrequency(value), octave: '' }, true);
              }}
            />
          </label>
        )}
        <label className={LABEL}>
          Curve
          <select className={CONTROL} value={state.curve} onChange={event => update({ curve: event.target.value })}>
            <option value="green">Green (peak dB)</option>
            <option value="red">Red (average dB)</option>
          </select>
        </label>
        {rankingActive && (
          <button
            className={COMPACT_BUTTON}
            type="button"
            onClick={() => { setFrequencyInput(''); update({ frequency: '', octave: '' }); }}
          >
            Clear ranking
          </button>
        )}
        <span className="min-w-[210px] flex-1 text-[11px] leading-[1.6] text-[#9eafa6]">
          {state.octave
            ? 'Octave ranking uses the arithmetic mean of dB readings at every 0.5 Hz, including both endpoints. The complete range must be readable.'
            : 'Single-frequency ranking uses the value at that frequency, not an average.'}
          {' '}Values are estimates as there is no numeric data, the graphs are analysed using Python.
        </span>
      </form>

      <nav className="mt-3 flex flex-wrap gap-1 desktop:gap-[5px]" aria-label="Browse by title">
        {LETTERS.map(letter => (
          <button
            className="min-h-[34px] min-w-[30px] flex-none px-2 py-1.5 text-[11px] desktop:min-h-[33px] desktop:min-w-[31px]"
            key={letter || 'all'}
            aria-pressed={!state.q.trim() && state.letter === letter}
            onClick={() => selectFilter({ letter, q: '' })}
          >
            {letter === '' ? 'All' : letter === '0-9' ? '0–9' : letter}
          </button>
        ))}
      </nav>
      <p className="mt-[9px] mb-5 text-[11px] text-[#8e9e94]">
        Years and types are inferred from titles. Soundtrack labels are read automatically from graphs; unclear labels stay Unknown.
      </p>
    </>
  );
}
