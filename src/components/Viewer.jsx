import { useEffect, useRef, useState } from 'react';
import { imageURL } from '../catalogue.js';
import { GraphImage, ZoomControl, zoomStyle } from './GraphTools.jsx';

const TOOLBAR_ACTION = 'p-2 text-[11px] desktop:px-[13px] desktop:py-[9px] desktop:text-[13px]';

export default function Viewer({ movie, comparison, previous, next, onClose }) {
  const dialog = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oldOverflow;
      if (document.fullscreenElement === element) document.exitFullscreen().catch(() => {});
      element.close();
      if (focused?.isConnected) focused.focus();
    };
  }, []);

  useEffect(() => {
    setZoom(1);
    setNotice('');
  }, [movie.id]);

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (dialog.current.requestFullscreen) await dialog.current.requestFullscreen();
      else setNotice('Fullscreen is not available in this browser. You can still zoom and scroll.');
    } catch {
      setNotice('Fullscreen could not be opened. You can still zoom and scroll.');
    }
  }

  function handleKeyDown(event) {
    if (['INPUT', 'SELECT', 'BUTTON', 'A'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' && previous) {
      event.preventDefault();
      previous();
    }
    if (event.key === 'ArrowRight' && next) {
      event.preventDefault();
      next();
    }
  }

  return (
    <dialog
      ref={dialog}
      className="m-auto h-dvh max-h-none w-screen max-w-none rounded-none border border-[#52654c] bg-[#131e17] p-0 text-[#e1eae1] backdrop:bg-[#030a07dc] backdrop:backdrop-blur-[4px] desktop:h-[94dvh] desktop:w-[96vw] desktop:rounded-[10px] [&:fullscreen]:h-dvh [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      aria-labelledby="viewer-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === dialog.current) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-5 border-b border-[#3d4c3e] p-[15px] desktop:px-[22px] desktop:py-[19px]">
          <div>
            <span className="text-[10px] font-bold tracking-[2px] text-[#b9da9c]">GRAPH VIEWER</span>
            <h2 id="viewer-title" className="mt-1.5 text-[18px] desktop:text-[22px]">
              {comparison ? 'Compare graphs' : movie.movieName}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close graph viewer">Close ×</button>
        </header>
        <div className="flex flex-wrap items-center gap-[7px] p-3 desktop:gap-2.5 desktop:px-[22px]">
          {!comparison && (
            <>
              <button className={TOOLBAR_ACTION} onClick={previous} disabled={!previous}>← Previous graph</button>
              <button className={TOOLBAR_ACTION} onClick={next} disabled={!next}>Next graph →</button>
            </>
          )}
          {comparison && <span className="text-[12px] text-[#adbc9f]">Zoom applies to both graphs</span>}
          <span className="hidden flex-1 desktop:block" />
          <ZoomControl value={zoom} onChange={setZoom} />
          <button className={TOOLBAR_ACTION} onClick={() => setZoom(1)}>Fit</button>
          <button className={TOOLBAR_ACTION} onClick={fullscreen}>Fullscreen</button>
          {!comparison && (
            <a
              className={`${TOOLBAR_ACTION} rounded-md border border-[#3c5149] bg-[#192720] font-semibold text-[#e1eae4] no-underline hover:border-[#b6de8c] hover:bg-[#2a3f32]`}
              href={imageURL(movie)}
              target="_blank"
              rel="noreferrer"
            >
              Original image ↗
            </a>
          )}
        </div>
        {notice && <p role="status">{notice}</p>}
        <div
          className={`min-h-0 flex-1 overflow-auto bg-black ${comparison ? 'p-0' : 'p-2.5'}`}
          tabIndex={0}
          aria-label={comparison ? 'Stacked comparison graphs; scroll to pan when zoomed' : 'Graph image; scroll to pan when zoomed'}
        >
          <div style={zoomStyle(zoom)} className={comparison ? 'flex flex-col gap-0' : ''}>
            {comparison
              ? comparison.map(graph => <GraphImage key={graph.id} movie={graph} />)
              : <GraphImage movie={movie} />}
          </div>
        </div>
        <p className="m-0 px-[22px] py-2.5 text-[11px] text-[#9bad9b]">
          Zoom to inspect detail, then scroll to pan. Use Escape to close.
        </p>
      </div>
    </dialog>
  );
}
