/**
 * BASELINE HUD — functional skeleton owned by T11 (full design in docs/DESIGN.md §6–7).
 * Talks to the scene only through the store.
 */
import { PLACES } from '../content/places';
import { useStore } from '../state/store';
import { HOUSES } from '../world/houses';
import { LANDMARKS, landmarkById } from '../world/layout';
import { PerfNotice } from '../perf/PerfNotice';
import { Compass } from './Compass';
import './hud.css';

export function Hud() {
  const showUi = useStore((s) => s.showUi);
  const entered = useStore((s) => s.entered);
  if (!showUi) return null;
  return (
    <div className="hud">
      <header className="hud-title">
        <span className="hud-kicker">World of Red Rising</span>
        <h1>The Institute</h1>
      </header>
      <PlaceIndex />
      <PlacePanel />
      <SeasonToggle />
      <ViewToggle />
      <Compass />
      <PerfNotice />
      {!entered && <EntryGate />}
    </div>
  );
}

function ViewToggle() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  return (
    <div className="hud-view" role="radiogroup" aria-label="Map view">
      {(['3d', '2d'] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={viewMode === m}
          className={viewMode === m ? 'on' : ''}
          onClick={() => setViewMode(m)}
        >
          {m === '3d' ? '3D' : '2D'}
        </button>
      ))}
    </div>
  );
}

function SeasonToggle() {
  const season = useStore((s) => s.season);
  const setSeason = useStore((s) => s.setSeason);
  return (
    <div className="hud-season" role="radiogroup" aria-label="Season">
      {(['summer', 'winter'] as const).map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={season === s}
          className={season === s ? 'on' : ''}
          onClick={() => setSeason(s)}
        >
          {s === 'summer' ? 'Summer' : 'Winter'}
        </button>
      ))}
    </div>
  );
}

function PlaceIndex() {
  const select = useStore((s) => s.select);
  const castles = LANDMARKS.filter((l) => l.kind === 'castle' || l.kind === 'olympus');
  return (
    <nav className="hud-index" aria-label="Places">
      {castles.map((l) => (
        <button key={l.id} onClick={() => select(l.id)}>
          <i style={{ background: l.house ? HOUSES[l.house].color : 'var(--gold)' }} />
          {l.name}
        </button>
      ))}
    </nav>
  );
}

function PlacePanel() {
  const id = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  if (!id) return null;
  const l = landmarkById(id);
  const content = PLACES.find((p) => p.id === id);
  return (
    <aside className="hud-panel" aria-live="polite">
      <button className="hud-close" aria-label="Close" onClick={() => select(null)}>
        ×
      </button>
      <h2>{content?.title ?? l?.name ?? id}</h2>
      {content && <p className="hud-sub">{content.subtitle}</p>}
      <span className={`badge badge-${content?.confidence ?? l?.confidence ?? 'canon'}`}>
        {content?.confidence ?? l?.confidence}
      </span>
      {content ? (
        content.description.map((d, i) => <p key={i}>{d}</p>)
      ) : (
        <p className="hud-sub">Lore coming soon.</p>
      )}
    </aside>
  );
}

function EntryGate() {
  const enter = useStore((s) => s.enter);
  const flyTo = useStore((s) => s.flyTo);
  return (
    <div className="hud-gate">
      <div className="hud-gate-card">
        <p className="hud-kicker">World of Red Rising</p>
        <h1>The Institute</h1>
        <p>
          An explorable map of the valley where Gold children wage war for glory. Lore cards discuss the whole
          of <em>Red Rising</em> (Book 1), so it’s best enjoyed once you’ve finished it.
        </p>
        <button
          className="hud-enter"
          onClick={() => {
            enter();
            flyTo('overview');
          }}
        >
          Enter the valley
        </button>
      </div>
    </div>
  );
}
