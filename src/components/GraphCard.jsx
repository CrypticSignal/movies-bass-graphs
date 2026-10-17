import { useState } from 'react';
import { curvePeak, imageURL, rankingReading } from '../catalogue.js';
import { GraphImage, ZoomControl, zoomStyle } from './GraphTools.jsx';

function FrequencyReading({ reading, overallPeak, curve, label }) {
  const { level, peak } = reading ?? {};
  return (
    <p className="mt-[14px] mb-4 px-4 text-[12px] text-accent">
      {reading && (level === null
        ? `Unranked ${label} — no complete, reliable ${curve} curve reading`
        : `${level.toFixed(1)} dB ${label} | ${curve} curve`)}
      {peak && (
        <span className="mt-1 block">
          Octave Peak: {peak.level.toFixed(1)} dB at {peak.frequency} Hz
        </span>
      )}
      {overallPeak && (
        <span className="mt-1 block" title="Highest available analysed sample across the selected curve">
          Peak: {overallPeak.level.toFixed(1)} dB at {overallPeak.frequency} Hz
        </span>
      )}
    </p>
  );
}

export default function GraphCard({
  movie, rank, rankingState, rankingLabel, curve = 'green', selected, onCompare, onInspect,
}) {
  const [zoom, setZoom] = useState(1);
  const reading = rankingState ? rankingReading(movie, rankingState) : null;
  const overallPeak = curvePeak(movie, curve);
  const hasImage = Boolean(imageURL(movie));

  return (
    <article className="min-w-0 overflow-hidden rounded-[9px] border border-[#34453a] bg-[#17221d]">
      <div className="flex min-h-[103px] flex-wrap items-start justify-between gap-3 p-[15px] desktop:p-[19px]">
        <div className="min-w-0 flex-1 basis-[180px]">
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
        <div className="flex w-full flex-wrap items-center gap-2 text-[11px]">
          {hasImage && <ZoomControl value={zoom} onChange={setZoom} min={100} max={300} compact />}
          <div className="grid flex-1 grid-cols-2 gap-2">
          <button
            className="px-2.5 py-[7px] text-[11px] whitespace-nowrap"
            disabled={!hasImage}
            onClick={onInspect}
            aria-label={`Inspect graph for ${movie.movieName}`}
          >
            Inspect graph ↗
          </button>
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
        </div>
      </div>
      {hasImage ? (
        <div className="overflow-auto bg-black">
        <button
          className="group relative block w-full rounded-none border-0 bg-black p-0 hover:bg-black"
          style={zoomStyle(zoom)}
          onClick={onInspect}
          aria-label={`View graph for ${movie.movieName}`}
        >
          <GraphImage movie={movie} loading="lazy" />
          <span className="absolute right-3 bottom-3 rounded border border-[#6b835a] bg-[#203127e8] px-[9px] py-1.5 text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
            Inspect graph ↗
          </span>
        </button>
        </div>
      ) : <GraphImage movie={movie} />}
      {(reading || overallPeak) && (
        <FrequencyReading
          reading={reading}
          overallPeak={overallPeak}
          curve={curve}
          label={rankingLabel}
        />
      )}

    </article>
  );
}
