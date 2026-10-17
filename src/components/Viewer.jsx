import { useEffect, useRef, useState } from 'react';
import { imageURL } from '../catalogue.js';
import { GraphImage, ZoomControl } from './GraphTools.jsx';

const TOOLBAR_ACTION = 'p-2 text-[11px] desktop:px-[13px] desktop:py-[9px] desktop:text-[13px]';

export default function Viewer({ movie, comparison, previous, next, onClose }) {
  const dialog = useRef(null);
  const viewport = useRef(null);
  const ownsFullscreen = useRef(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageRatios, setImageRatios] = useState({});
  const graphs = comparison || [movie];
  const totalRatio = graphs.reduce((sum, graph) => sum + (imageRatios[imageURL(graph)] || 0), 0);
  const imagesLoaded = graphs.every(graph => imageRatios[imageURL(graph)]);
  const fittedWidth = imagesLoaded && viewportSize.height
    ? Math.min(viewportSize.width, viewportSize.height / totalRatio)
    : viewportSize.width;
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
      if (ownsFullscreen.current && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      element.close();
      if (focused?.isConnected) focused.focus();
    };
  }, []);

  useEffect(() => {
    setZoom(1);
    setNotice('');
    viewport.current?.scrollTo(0, 0);
  }, [movie.id]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport.current);
    function syncFullscreen() {
      setFullscreenActive(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) ownsFullscreen.current = false;
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, []);

  async function fullscreen() {
    if (expanded) {
      setExpanded(false);
      setNotice('');
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        // Modal dialogs cannot themselves be Fullscreen API targets.
        await document.documentElement.requestFullscreen();
        ownsFullscreen.current = true;
      } else {
        setExpanded(true);
        setNotice('Browser fullscreen is unavailable; the viewer now fills the page.');
      }
    } catch {
      setExpanded(true);
      setNotice('Browser fullscreen is unavailable; the viewer now fills the page.');
    }
  }

  function fit() {
    setZoom(1);
    viewport.current?.scrollTo(0, 0);
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
      className={`m-auto h-dvh max-h-none w-screen max-w-none overflow-hidden rounded-none border border-[#52654c] bg-[#131e17] p-0 text-[#e1eae1] backdrop:bg-[#030a07dc] backdrop:backdrop-blur-[4px] ${fullscreenActive || expanded ? "border-0" : "desktop:h-[94dvh] desktop:w-[96vw] desktop:rounded-[10px]"}`}
      aria-labelledby="viewer-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === dialog.current) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-5 border-b border-[#3d4c3e] p-[15px] desktop:px-5.5 desktop:py-3">
          <div>
            <span className="text-[10px] font-bold tracking-[2px] text-accent-muted">GRAPH VIEWER</span>
            <h2 id="viewer-title" className="mt-1.5 text-[18px] desktop:text-[22px]">
              {comparison ? 'Compare graphs' : movie.movieName}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close graph viewer">Close ×</button>
        </header>
        <div className="flex shrink-0 flex-wrap items-center gap-[7px] p-3 desktop:gap-2.5 desktop:px-5.5">
          {!comparison && (
            <>
              <button className={TOOLBAR_ACTION} onClick={previous} disabled={!previous}>← Previous graph</button>
              <button className={TOOLBAR_ACTION} onClick={next} disabled={!next}>Next graph →</button>
            </>
          )}
          {comparison && <span className="text-[12px] text-[#adbc9f]">Zoom applies to both graphs</span>}
          <span className="hidden flex-1 desktop:block" />
          <ZoomControl value={zoom} onChange={setZoom} />
          <button className={TOOLBAR_ACTION} onClick={fit}>Fit</button>
          <button className={TOOLBAR_ACTION} onClick={fullscreen}>{fullscreenActive || expanded ? 'Exit fullscreen' : 'Fullscreen'}</button>
          {!comparison && (
            <a
              className={`${TOOLBAR_ACTION} rounded-md border border-control-border bg-control font-semibold text-control-ink no-underline hover:border-control-hover-border hover:bg-control-hover`}
              href={imageURL(movie)}
              target="_blank"
              rel="noreferrer"
            >
              Original image ↗
            </a>
          )}
        </div>
        {notice && <p className="m-0 shrink-0 px-3 py-1 text-[11px]" role="status">{notice}</p>}
        <div
          ref={viewport}
          className={`min-h-0 flex-1 overflow-auto bg-black ${comparison ? 'p-0' : 'p-2.5'}`}
          tabIndex={0}
          aria-label={comparison ? 'Stacked comparison graphs; scroll to pan when zoomed' : 'Graph image; scroll to pan when zoomed'}
        >
          <div
            style={{ width: fittedWidth ? fittedWidth * zoom : '100%', marginInline: zoom <= 1 ? 'auto' : 0 }}
            className="flex flex-col gap-0"
          >
            {graphs.map(graph => (
              <GraphImage
                key={graph.id}
                movie={graph}
                onLoad={event => {
                  const image = event.currentTarget;
                  const ratio = image.naturalHeight / image.naturalWidth;
                  setImageRatios(current => ({ ...current, [imageURL(graph)]: ratio }));
                }}
              />
            ))}
          </div>
        </div>
        <p className="m-0 shrink-0 px-5.5 py-2.5 text-[11px] text-[#9bad9b]">
          Zoom to inspect detail, then scroll to pan. Use Escape to close.
        </p>
      </div>
    </dialog>
  );
}
