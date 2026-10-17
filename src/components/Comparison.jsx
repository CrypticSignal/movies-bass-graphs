import { GraphImage } from './GraphTools.jsx';

export default function Comparison({ movies, onInspect, onClear, sectionRef }) {
  if (!movies.length) return null;

  return (
    <section
      className="mb-[30px] rounded-[10px] border border-[#5a7149] bg-[#1b291f] p-[15px] desktop:p-6"
      ref={sectionRef}
      aria-labelledby="comparison-title"
    >
      <div className="flex flex-col items-start justify-between gap-5 desktop:flex-row desktop:items-center">
        <div>
          <span className="text-[10px] font-bold tracking-[2px] text-[#b9da9c]">A / B COMPARISON</span>
          <h2 id="comparison-title" className="mt-2 text-[25px]">Compare soundtracks</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3 desktop:flex-nowrap">
          <button disabled={movies.length < 2} onClick={onInspect}>Inspect graphs ↗</button>
          <button onClick={onClear}>Clear comparison</button>
        </div>
      </div>
      <p className="my-[12px] text-[12px] text-[#a6b59e]">
        Compare shapes and labelled values; graphs may use different axis ranges and measurement methods.
      </p>
      <div className="grid grid-cols-1 gap-0">
        {movies.map(movie => (
          <article key={movie.id} className="m-0 min-w-0 p-0">
            <div
              className="m-0 max-h-none overflow-auto border-0 bg-black"
              tabIndex={0}
              aria-label={`Scrollable comparison graph for ${movie.movieName}`}
            >
              <GraphImage movie={movie} />
            </div>
          </article>
        ))}
        {movies.length === 1 && (
          <div className="grid min-h-[180px] place-content-center border border-dashed border-[#4e6542] p-5 text-center text-[13px] text-[#adbc9f]">
            Select a second graph below to compare it here.
          </div>
        )}
      </div>
    </section>
  );
}
