/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SCROLL LOCK
 *
 * Two things hold the page still: the opening curtain and the index drawer.
 * Each used to save `body.style.overflow` and put back whatever it found,
 * which is fine alone and wrong together: open the drawer while the curtain
 * is still up and it saves "hidden", then faithfully restores "hidden" on
 * close, and the page never scrolls again.
 *
 * One counter, one owner of the property. The page is held while anything
 * holds it and released when the last holder lets go.
 * ═══════════════════════════════════════════════════════════════════════════
 */

let holders = 0;

/** Hold the page still. Returns the release, which is safe to call twice. */
export function holdScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  holders += 1;
  document.body.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.style.overflow = "";
  };
}
