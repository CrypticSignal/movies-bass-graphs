import { imageURL, rankingReading } from '../catalogue.js';
import { GraphImage } from './GraphTools.jsx';

function FrequencyReading({ reading, curve, label }) {
  const { level, peak } = reading;
  return (
    <p className="mt-[14px] mb-0 px-4 text-[12px] text-accent">
      {level === null
        ? `Unranked ${label} — no complete, reliable ${curve} curve reading`
        : `${level.toFixed(1)} dB ${label} | ${curve} curve`}
      {peak && (
        <span className="mt-1 block">
          Peak: {peak.level.toFixed(1)} dB at {peak.frequency} Hz
        </span>
      )}
    </p>
  );
}

export default function GraphCard({
  movie, rank, rankingState, rankingLabel, selected, onCompare, onInspect,
}) {
  const reading = rankingState ? rankingReading(movie, rankingState) : null;
  const hasImage = Boolean(imageURL(movie));

  return (
    <article className="min-w-0 overflow-hidden rounded-[9px] border border-[#34453a] bg-[#17221d]">
      <div className="flex min-h-[103px] items-start justify-between gap-3 p-[15px] desktop:p-[19px]">
        <div>
          {reading?.level != null && (
            <span className="mb-[7px] table rounded bg-accent px-[7px] py-[3px] text-[12px] font-bold text-[#162016] tabular-nums">
              Rank #{rank}
            </span>
          )}
          <span className="text-[10px] tracking-[.4px] text-[#a7bb9e]">
            {movie.year} · {movie.type}
            {movie.format !== 'Unknown' ? ' · ' + movie.format : ''}
          </span>
          <h2 className="mt-[7px] text-[17px] leading-[1.35] desktop:text-[18px]">
            {movie.movieName}
          </h2>
        </div>
        <button
          className="px-2.5 py-[7px] text-[11px] whitespace-nowrap"
          aria-pressed={selected}
          disabled={!hasImage}
          onClick={onCompare}
        >
          {selected ? '✓ Selected' : '+ Compare'}
          <span className="sr-only"> {movie.movieName}</span>
        </button>
      </div>
      {hasImage ? (
        <button
          className="group relative block w-full rounded-none border-0 bg-black p-0 hover:bg-black"
          onClick={onInspect}
          aria-label={`View graph for ${movie.movieName}`}
        >
          <GraphImage movie={movie} loading="lazy" />
          <span className="absolute right-3 bottom-3 rounded border border-[#6b835a] bg-[#203127e8] px-[9px] py-1.5 text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
            Inspect graph ↗
          </span>
        </button>
      ) : <GraphImage movie={movie} />}
      {reading && (
        <FrequencyReading reading={reading} curve={rankingState.curve} label={rankingLabel} />
      )}
      <div className="px-4 py-3">
        <button
          disabled={!hasImage}
          onClick={onInspect}
          aria-label={`Inspect graph for ${movie.movieName}`}
        >
          Inspect graph ↗
        </button>
      </div>
    </article>
  );
}
