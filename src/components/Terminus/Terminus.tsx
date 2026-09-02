import { useSystem, useUptime } from '../../system/SystemProvider';
import { DiagnosticText, type Row } from '../Diagnostic/Diagnostic';
import { pad } from '../../system/rng';
import './Terminus.css';

/**
 * The document does not end. It stops reporting.
 */
export function Terminus() {
  const { observers, discoveries } = useSystem();
  const uptime = useUptime();

  const rows: Row[] = [
    ['SYSTEM STATUS', 'UNRESOLVED'],
    ['VERSION', '0.0.0?'],
    ['REFERENCE', 'NONE'],
    ['END', 'NO'],
    ['SESSION', pad(uptime, 6)],
    ['OBSERVERS', pad(observers, 2)],
    ['NOTED', pad(discoveries.size, 2)],
  ];

  return (
    <footer className="vx-end vx-bay" aria-label="Terminus">
      <div className="vx-end__grid">
        <div className="vx-end__rows">
          <DiagnosticText rows={rows} channel="terminus" emphasise={3} />
        </div>

        <div className="vx-end__block">
          <p className="vx-micro" style={{ marginBottom: 12 }}>REDACTED FIELD / 16 CELLS</p>
          <div className="vx-end__redaction" aria-label="Sixteen redacted cells" role="img">
            {Array.from({ length: 16 }, (_, i) => <i key={i} />)}
          </div>
          <p className="vx-micro" style={{ marginTop: 18, maxWidth: '34ch' }}>
            NOTHING BELOW THIS LINE WAS WRITTEN FOR AN AUDIENCE.
          </p>
        </div>
      </div>

      <p className="vx-end__mark" aria-hidden="true">VRAXXIS</p>

      <div className="vx-end__base vx-micro">
        <span>&copy; VRAXXIS</span>
        <span className="vx-end__aside">whatever that means</span>
      </div>
    </footer>
  );
}
