import { useEffect, useState } from 'react';
import './Grid.css';

/**
 * The grid can be revealed with `g`. Most visitors never press it.
 * It is not a debug tool; it is the only honest thing on the page.
 */
export function Grid({ cols = 12 }: { cols?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === 'g' || e.key === 'G') setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className="vx-grid" data-visible={visible ? 1 : 0} aria-hidden="true">
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="vx-grid__col" data-c={i + 1} />
        ))}
      </div>
      <span className="vx-reg vx-reg--tl" aria-hidden="true" />
      <span className="vx-reg vx-reg--tr" aria-hidden="true" />
      <span className="vx-reg vx-reg--bl" aria-hidden="true" />
      <span className="vx-reg vx-reg--br" aria-hidden="true" />
    </>
  );
}
