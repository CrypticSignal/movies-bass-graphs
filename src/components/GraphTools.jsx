import { useEffect, useState } from 'react';
import { imageURL } from '../catalogue.js';

export function GraphImage({ movie, ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [movie.id, movie.imagePath]);
  return imageURL(movie) && !failed ? (
    <img
      className="block h-auto w-full shrink-0"
      src={imageURL(movie)}
      alt={`Bass graph for ${movie.movieName}`}
      onError={() => setFailed(true)}
      {...props}
    />
  ) : (
    <p className="my-[13px] p-8 text-[13px] text-[#9cab9e]">
      Graph unavailable. The original image could not be recovered.
    </p>
  );
}

export function ZoomControl({ value, onChange }) {
  const percentage = Math.round(value * 100);
  return (
    <label className="min-w-[140px] flex-[0_1_200px] gap-[3px]">
      <span className="flex items-center justify-between gap-3">
        Zoom
        <output className="min-w-[42px] text-center text-[12px] text-[#e1eae4] tabular-nums">
          {percentage}%
        </output>
      </span>
      <input
        className="m-0 min-h-8 w-full cursor-pointer border-0 bg-transparent p-0 accent-accent"
        type="range"
        min="50"
        max="200"
        step="1"
        value={percentage}
        aria-valuetext={`${percentage}%`}
        onChange={event => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}

export function zoomStyle(zoom) {
  return { width: `${zoom * 100}%`, marginInline: zoom < 1 ? 'auto' : 0 };
}
