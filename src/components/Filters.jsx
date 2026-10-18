import { useEffect, useRef, useState } from 'react';
import { OCTAVE_RANGES, parseFrequency } from '../catalogue.js';
import { readState } from '../useViewState.js';

const LABEL = 'gap-[5px] text-[10px]';
const CONTROL = 'min-h-8.5 px-[9px] py-[7px] text-[12px]';
const COMPACT_BUTTON = 'min-h-8.5 px-2.5 py-[7px] text-[12px]';
const LETTERS = ['', '0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

function isEnter(event) {
  return event.key === 'Enter' && !event.nativeEvent.isComposing;
}

export default function Filters({ movies, state, update, selectFilter, scrollToResults }) {
  const [frequencyInput, setFrequencyInput] = useState(() => state.frequency || '');
  const [octaveInput, setOctaveInput] = useState(() => state.octave || '');
  const [frequencyError, setFrequencyError] = useState('');
  const frequencyRef = useRef(null);
  const [rankingEnabled, setRankingEnabled] = useState(() => Boolean(state.frequency || state.octave));
  const queryEditing = useRef(false);
  const rankingActive = Boolean(state.frequency || state.octave);

  useEffect(() => {
    function restore() {
      queryEditing.current = false;
      const restoredState = readState();
      setFrequencyInput(restoredState.frequency || '');
      setOctaveInput(restoredState.octave || '');
      setFrequencyError('');
      setRankingEnabled(Boolean(restoredState.frequency || restoredState.octave));
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function resetFilters() {
    setFrequencyInput('');
    setOctaveInput('');
    setFrequencyError('');
    setRankingEnabled(false);
    queryEditing.current = false;
    update({ q: '', year: '', format: '', letter: '', frequency: '', octave: '' });
  }

  function submitRanking(event) {
    event.preventDefault();
    const frequency = parseFrequency(frequencyInput);
    if (!octaveInput && !frequency) {
      setFrequencyError('Enter a frequency from 0.5 to 160 Hz in 0.5 Hz steps.');
      frequencyRef.current?.focus();
      return;
    }
    setFrequencyError('');
    document.activeElement?.blur();
    update({ frequency: octaveInput ? '' : frequency, octave: octaveInput });
    scrollToResults(350);
  }

  const filters = [
    { key: 'year', label: 'Year', values: [...new Set(movies.map(movie => movie.year))].sort().reverse() },
    { key: 'format', label: 'Soundtrack format', values: [...new Set(movies.map(movie => movie.format))].sort() },
  ];

  return (
    <>
      <section
        className="flex flex-wrap items-end gap-[9px] rounded-[10px] border border-[#324138] bg-[#18231e] p-3 desktop:gap-2.5 desktop:px-4 desktop:py-3.5"
        aria-label="Browse the archive"
      >
        <label className={`${LABEL} min-w-52.5 flex-1 basis-full desktop:basis-0`}>
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
          <label key={filter.key} className={`${LABEL} min-w-25 flex-1 desktop:min-w-0 desktop:flex-none`}>
            {filter.label}
            <select
              className={`${CONTROL} w-full max-w-none desktop:w-auto desktop:max-w-57.5`}
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

      <nav className="mt-3 flex flex-wrap gap-1 desktop:gap-[5px]" aria-label="Browse by title">
        {LETTERS.map(letter => (
          <button
            className="min-h-8.5 min-w-7.5 flex-none px-2 py-1.5 text-[11px] desktop:min-h-[33px] desktop:min-w-[31px]"
            key={letter || 'all'}
            aria-pressed={!state.q.trim() && state.letter === letter}
            onClick={() => selectFilter({ letter, q: '' })}
          >
            {letter === '' ? 'All' : letter === '0-9' ? '0–9' : letter}
          </button>
        ))}
      </nav>

      <label className="mx-auto mt-2.5 flex min-h-8.5 w-fit cursor-pointer flex-row items-center gap-2 text-[12px]">
        <input
          className="peer sr-only"
          type="checkbox"
          role="switch"
          checked={rankingEnabled}
          onChange={event => {
            const enabled = event.target.checked;
            setRankingEnabled(enabled);
            if (!enabled) {
              setFrequencyInput('');
              setOctaveInput('');
              setFrequencyError('');
              update({ frequency: '', octave: '' });
            }
          }}
        />
        <span
          aria-hidden="true"
          className="relative h-5 w-9 shrink-0 rounded-full border border-[#52655a] bg-[#324138] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-white after:transition-transform peer-checked:border-[#78b88e] peer-checked:bg-[#39734c] peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#78b88e]"
        />
        Rank movies by output
      </label>

      {rankingEnabled && <form
        className="mt-2.5 flex flex-wrap items-end gap-2.5 rounded-lg border border-[#324138] bg-[#152019] px-4 py-3"
        onSubmit={submitRanking}
        noValidate
      >
        <label className={LABEL}>
          Rank by
          <select
            className={CONTROL}
            value={octaveInput}
            onChange={event => {
              const octave = event.target.value;
              setOctaveInput(octave);
              setFrequencyError('');
              selectFilter({ octave, frequency: octave ? '' : parseFrequency(frequencyInput) });
            }}
          >
            <option value="">Single frequency</option>
            {OCTAVE_RANGES.map(range => (
              <option key={range} value={range}>{range.replace('-', '–')} Hz octave average</option>
            ))}
          </select>
        </label>
        {!octaveInput && (
          <label className={LABEL}>
            Frequency (Hz)
            <input
              className={`${CONTROL} w-[115px]`}
              type="text"
              inputMode="decimal"
              ref={frequencyRef}
              required
              aria-invalid={Boolean(frequencyError)}
              aria-describedby={frequencyError ? 'frequency-error' : undefined}
              placeholder="20"
              enterKeyHint="go"
              value={frequencyInput}
              onChange={event => {
                setFrequencyError('');
                setFrequencyInput(event.target.value);
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
        {!octaveInput && <button className={COMPACT_BUTTON} type="submit">Rank movies</button>}
        {rankingActive && (
          <button
            className={COMPACT_BUTTON}
            type="button"
            onClick={() => {
              setFrequencyInput('');
              setOctaveInput('');
              setFrequencyError('');
              update({ frequency: '', octave: '' });
            }}
          >
            Clear ranking
          </button>
        )}
        {frequencyError && (
          <p id="frequency-error" role="alert" className="m-0 basis-full text-[12px] text-accent">
            {frequencyError}
          </p>
        )}
        <details className="basis-full text-[12px] leading-relaxed text-[#9eafa6]">
          <summary className="cursor-pointer py-2 text-accent">How rankings work</summary>
          <ul className="my-2 space-y-2 pl-5">
            <li><strong>Single frequency:</strong> uses the selected curve’s reading at exactly that frequency, not an average across nearby frequencies.</li>
            <li><strong>Octave average:</strong> the arithmetic mean of dB readings sampled every 0.5 Hz across the selected range, including both endpoints. Every sample must be readable. This is an average of the dB readings, not a measure of perceived loudness.</li>
            <li><strong>Estimates, not original measurements:</strong> values are extracted from graph images using Pillow for image processing and Tesseract OCR for axis labels. NumPy handles calculations on the graph’s pixel values. A Python script uses those calculations to identify coloured curves and estimate dB readings at each sampled frequency. The original numerical data is unavailable. Image resolution, overlapping curves, and axis calibration can affect accuracy. Small differences should not be treated as definitive.</li>
            <li><strong>Unranked graphs:</strong> missing, incompatible, or unreliable readings are excluded from the rankings. You can still view and compare those graphs in “Show unranked movies”.</li>
            <li><strong>Compare with care:</strong> a higher ranked value does not by itself mean a movie sounds louder or better.</li>
          </ul>
        </details>
      </form>}

    </>
  );
}
