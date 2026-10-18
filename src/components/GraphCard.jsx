import { useState } from 'react';
import { curvePeak, imageURL, rankingReading } from '../catalogue.js';
import { GraphImage, ZoomControl, zoomStyle } from './GraphTools.jsx';

function FrequencyReading({ reading, overallPeak, curve, label }) {
  const { level, peak } = reading ?? {};
  return (
    <p className="mt-3.5 mb-1 pl-4 pr-24 text-[12px] text-accent">
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
    <article className="relative min-w-0 overflow-hidden rounded-[9px] border border-[#34453a] bg-[#17221d]">
      <div className="flex min-h-[103px] items-start justify-between gap-3 p-[15px] desktop:p-[19px]">
        <div className="min-w-0 flex-1">
          {reading?.level != null && (
            <span className="mb-[7px] table rounded bg-accent px-[7px] py-[3px] text-[12px] font-bold text-accent-ink tabular-nums">
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
          className="shrink-0 px-2.5 py-[7px] text-[11px] whitespace-nowrap"
          aria-pressed={selected}
          disabled={!hasImage}
          onClick={onCompare}
        >
          {selected ? '✓ Selected' : '+ Compare'}
          <span className="sr-only"> {movie.movieName}</span>
        </button>
      </div>
      {hasImage ? (
        <div className="overflow-auto bg-black">
          <button
            className="block w-full rounded-none border-0 bg-black p-0 hover:bg-black"
            style={zoomStyle(zoom)}
            onClick={onInspect}
            aria-label={`View graph for ${movie.movieName}`}
          >
            <GraphImage movie={movie} loading="lazy" />
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
      {movie.frequencyAnalysis && (
        <details className="mx-4 mt-0 mb-12 text-[12px] leading-relaxed text-[#9bad9f]">
          <summary className="cursor-pointer py-1">About these readings</summary>
          <p className="my-2">Readings are estimated from the graph image because the original numerical data is unavailable. Small differences in readings between movies should not be treated as definitive.
          </p>
          {movie.frequencyAnalysis.imagePath !== movie.imagePath && (
            <p className="my-2">Analysis does not match this image; its readings are not used.</p>
          )}
        </details>
      )}
      {hasImage && (
        <>
          <details className="absolute right-12 bottom-2 z-1">
            <summary
              className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded border border-[#6b835a] bg-[#203127e8] text-accent [&::-webkit-details-marker]:hidden"
              aria-label={`Zoom graph for ${movie.movieName}`}
              title="Zoom graph"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 6 6M7 10h6m-3-3v6" />
              </svg>
            </summary>
            <div className="absolute right-0 bottom-10 w-45 rounded-md border border-[#6b835a] bg-[#203127] p-3 shadow-lg">
              <ZoomControl value={zoom} onChange={setZoom} min={100} max={400} compact />
              <button
                className="mt-2 w-full px-2 py-1 text-[11px]"
                onClick={event => {
                  setZoom(1);
                  event.currentTarget.closest('details').open = false;
                }}
                aria-label={`Reset zoom to 100% for ${movie.movieName}`}
              >
                Reset
              </button>
            </div>
          </details>
        <button
          className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded border border-[#6b835a] bg-[#203127e8] p-0 text-accent"
          onClick={onInspect}
          aria-label={`Inspect graph for ${movie.movieName}`}
          title="Inspect graph"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        </>
      )}
    </article>
  );
}
