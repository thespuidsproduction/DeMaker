import { useEffect, useMemo, useState } from 'react';
import { SystemProvider, useSystem } from './system/SystemProvider';
import type { SectionId } from './system/lexicon';
import { Boot } from './components/Boot/Boot';
import { Grid } from './components/Grid/Grid';
import { Cursor } from './components/Cursor/Cursor';
import { TraceLayer } from './components/Trace/TraceLayer';
import { TraceBay } from './components/Trace/TraceBay';
import { CoordinateSystem, Statement } from './components/Diagnostic/Diagnostic';
import { AnomalyLayer } from './components/Anomaly/AnomalyLayer';
import { VraxxisNavigation } from './components/Navigation/Navigation';
import { Bay } from './components/Shell/Bay';
import { Residue } from './components/Shell/Residue';
import { spick } from './system/session';
import { Hero } from './components/Hero/Hero';
import { IndexSystem } from './components/IndexSystem/IndexSystem';
import { ObjectVX } from './components/ObjectVX/ObjectVX';
import { MemoryArchive } from './components/Memory/MemoryArchive';
import { NullSpace } from './components/NullSpace/NullSpace';
import { Terminal } from './components/Terminal/Terminal';
import { Terminus } from './components/Terminus/Terminus';
import './components/Shell/Shell.css';

const ORDER: SectionId[] = ['entry', 'trace', 'index', 'object', 'memory', 'null', 'terminal'];

function useActiveRegion(ready: boolean): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (!ready) return;
    const els = ORDER
      .map((id) => document.getElementById(`vx-${id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));
        let best: string | null = null;
        let ratio = 0;
        seen.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
        setActive(ratio > 0 ? ((best as string | null)?.replace('vx-', '') as SectionId) : null);
      },
      { threshold: [0, 0.15, 0.35, 0.6, 0.9] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);

  return active;
}

/**
 * THE DESCENT.
 *
 * The order is not a table of contents. It is a gradient: dense, then
 * empty, then dense, then empty for longer, and each bay is ranked by how
 * far down it sits. A bay presents itself at the lesser of its own rank
 * and how far the observer has actually gone, so the surface stays
 * comprehensible and the floor does not.
 *
 * The fields between the bays are not spacing. Some of them contain things.
 */
function Surface() {
  const { visits } = useSystem();
  const [ready, setReady] = useState(false);
  const active = useActiveRegion(ready);

  useEffect(() => {
    document.documentElement.style.overflow = ready ? '' : 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, [ready]);

  const v = useMemo(() => (id: SectionId) => visits[id] ?? 0, [visits]);

  return (
    <>
      {!ready && <Boot onComplete={() => setReady(true)} />}

      <a className="vx-skip vx-mono" href="#vx-entry">SKIP TO ENTRY</a>

      <Grid />
      <Cursor />
      <TraceLayer />
      <CoordinateSystem />
      <AnomalyLayer />
      <VraxxisNavigation active={active} />

      <main className="vx-shell" id="vx-main">
        <Bay id="entry" rank={0} ord="01" title="ENTRY" aux="FACE A">
          <Hero />
        </Bay>

        <Residue id="f1" scale="short" ord={0} />

        <Bay id="trace" rank={1} ord="02" title="TRACE" aux="RETAINED 2600 MS">
          <TraceBay />
        </Bay>

        <Bay id="index" rank={2} ord="02.7" title="INDEX" aux="13 ENTRIES">
          <IndexSystem visits={v('index')} />
        </Bay>

        <Residue id="f2" scale="tall" ord={1} />

        <Bay id="object" rank={3} ord="04" title="OBJECT" aux="VX-000">
          <ObjectVX visits={v('object')} />
        </Bay>

        <Bay id="memory" rank={3} ord="03" title="MEMORY" aux="RECOVERED 0">
          <MemoryArchive visits={v('memory')} />
        </Bay>

        <Residue id="f3" scale="void" ord={2} />

        <Bay id="null" rank={4} ord="06" title="NULL" aux="—">
          <NullSpace />
        </Bay>

        <div className="vx-bay" style={{ padding: 'clamp(60px, 12vh, 150px) var(--grid-margin)' }}>
          <Statement tone="ox">{spick('descent/say', [
            'THE SYSTEM IS NOT BROKEN',
            'PLEASE IGNORE OBJECT 07',
            'REFERENCE LOST',
            'VX / VX / VX',
          ] as const)}</Statement>
        </div>

        <Bay id="terminal" rank={4} ord={'/\\/\\'} title="REMNANT" aux="NO PRIVILEGES">
          <Terminal />
        </Bay>

        <Residue id="f4" scale="tall" ord={3} />
      </main>

      <Terminus />
    </>
  );
}

export default function App() {
  return (
    <SystemProvider>
      <Surface />
    </SystemProvider>
  );
}
