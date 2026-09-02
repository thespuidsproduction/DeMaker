/**
 * VRAXXIS makes no sound unless asked twice: once by the toggle, and once
 * by the browser's own gesture requirement. Nothing autoplays, nothing is
 * loud, and no audio file is ever fetched — the presence is synthesised.
 *
 * The intent is physical presence, not music. If it reads as a soundtrack
 * it is wrong.
 */

export class Presence {
  private ctx: AudioContext | null = null;
  private bed: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private noise: AudioBufferSourceNode | null = null;
  private disposed = false;

  get running() { return this.ctx !== null && this.ctx.state === 'running'; }

  async start(): Promise<boolean> {
    if (this.disposed) return false;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    if (!this.ctx) {
      const ctx = new Ctor();
      this.ctx = ctx;

      const bed = ctx.createGain();
      bed.gain.value = 0;
      bed.connect(ctx.destination);
      this.bed = bed;

      // Low bed: two detuned oscillators well below speech, heavily filtered,
      // so it registers as room tone rather than as a note.
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      lp.Q.value = 0.4;
      lp.connect(bed);

      for (const [freq, detune] of [[41.2, -6], [61.7, 9]] as const) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 0.5;
        osc.connect(g).connect(lp);
        osc.start();
        this.nodes.push(osc);
      }

      // A very slow amplitude drift, so the bed breathes without pulsing.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.043;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.22;
      lfo.connect(lfoGain).connect(lp.gain);
      lfo.start();
      this.nodes.push(lfo);

      // Filtered noise floor — the sound of equipment being switched on.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = 0.012;
      src.connect(bp).connect(ng).connect(bed);
      src.start();
      this.noise = src;
    }

    try { await this.ctx.resume(); } catch { return false; }
    const now = this.ctx.currentTime;
    this.bed!.gain.cancelScheduledValues(now);
    this.bed!.gain.setValueAtTime(this.bed!.gain.value, now);
    this.bed!.gain.linearRampToValueAtTime(0.05, now + 2.2);
    return true;
  }

  async stop() {
    if (!this.ctx || !this.bed) return;
    const now = this.ctx.currentTime;
    this.bed.gain.cancelScheduledValues(now);
    this.bed.gain.setValueAtTime(this.bed.gain.value, now);
    this.bed.gain.linearRampToValueAtTime(0.0001, now + 0.9);
    window.setTimeout(() => { void this.ctx?.suspend(); }, 1000);
  }

  /** A mechanical click. Short enough to be felt rather than heard. */
  click(intensity = 1) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400 + Math.random() * 700, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.03);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035 * intensity, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 500;
    osc.connect(hp).connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** A short tone. Reserved for events the system considers notable. */
  tone(freq = 220, dur = 0.16) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  dispose() {
    this.disposed = true;
    this.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    try { this.noise?.stop(); } catch { /* already stopped */ }
    this.nodes = [];
    this.noise = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
