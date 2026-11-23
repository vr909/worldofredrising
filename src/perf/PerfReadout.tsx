/**
 * ?stats=1 companion to drei <Stats/>: draw calls, triangles and the active perf flags, read from
 * window.__perf (PerfManager). Added by the lead at integration (T14 requirement 6).
 */
import { useEffect, useState } from 'react';

export function PerfReadout() {
  const [text, setText] = useState('');
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = window.__perf?.snapshot();
      if (!s) return;
      const f = s.flags;
      setText(
        `${s.calls} calls · ${(s.triangles / 1000).toFixed(0)}k tris · dpr ${f.dpr} · detail ${f.detail}` +
          `${f.software ? ' · software GL' : ''}${f.shadows ? '' : ' · no shadows'}${f.mist ? '' : ' · no mist'}`,
      );
    }, 500);
    return () => window.clearInterval(id);
  }, []);
  return text ? <div className="perf-readout">{text}</div> : null;
}
