import { useEffect, useState } from 'react';
import { changeTvZoom, getTvZoom } from './tvZoom';

/** Gumbi za veličinu prikaza na televizoru. */
export default function TvZoomButtons() {
  const [z, setZ] = useState(getTvZoom);
  useEffect(() => {
    const h = () => setZ(getTvZoom());
    window.addEventListener('zicer-tv-zoom', h);
    return () => window.removeEventListener('zicer-tv-zoom', h);
  }, []);
  return (
    <span className="tv-zoom" role="group" aria-label="Veličina prikaza">
      <button className="btn btn-ghost" onClick={() => changeTvZoom(-0.1)} aria-label="Smanji prikaz">
        A−
      </button>
      <span className="tv-zoom-val">{Math.round(z * 100)}%</span>
      <button className="btn btn-ghost" onClick={() => changeTvZoom(0.1)} aria-label="Povećaj prikaz">
        A+
      </button>
    </span>
  );
}
