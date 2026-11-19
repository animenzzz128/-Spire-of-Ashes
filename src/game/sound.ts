// Lightweight Web Audio API sound synthesizer for tactile card-combat feedback

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainVal = 0.08,
    delay = 0
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  cardHover() {
    this.playTone(520, 620, 0.045, 'sine', 0.025);
  }

  cardDraw() {
    this.playTone(280, 440, 0.08, 'triangle', 0.04);
  }

  attack() {
    this.playTone(240, 75, 0.14, 'sawtooth', 0.09);
    this.playTone(140, 55, 0.16, 'triangle', 0.08, 0.03);
  }

  heavyHit() {
    this.playTone(160, 42, 0.24, 'sawtooth', 0.12);
    this.playTone(95, 35, 0.26, 'square', 0.07, 0.02);
  }

  block() {
    this.playTone(340, 520, 0.12, 'triangle', 0.07);
    this.playTone(680, 760, 0.09, 'sine', 0.04, 0.03);
  }

  buff() {
    this.playTone(360, 540, 0.14, 'sine', 0.06);
    this.playTone(540, 720, 0.18, 'triangle', 0.06, 0.07);
  }

  poison() {
    this.playTone(620, 320, 0.16, 'sine', 0.06);
    this.playTone(460, 220, 0.18, 'triangle', 0.04, 0.06);
  }

  potion() {
    this.playTone(523, 659, 0.11, 'sine', 0.07);
    this.playTone(659, 880, 0.16, 'sine', 0.06, 0.08);
  }

  gold() {
    this.playTone(980, 1280, 0.09, 'sine', 0.06);
    this.playTone(1318, 1568, 0.14, 'sine', 0.06, 0.06);
  }

  campfire() {
    this.playTone(261, 329, 0.22, 'sine', 0.06);
    this.playTone(329, 392, 0.24, 'triangle', 0.05, 0.1);
  }

  victory() {
    this.playTone(392, 392, 0.14, 'triangle', 0.07, 0);
    this.playTone(493.88, 493.88, 0.14, 'triangle', 0.07, 0.11);
    this.playTone(587.33, 587.33, 0.16, 'triangle', 0.08, 0.22);
    this.playTone(783.99, 783.99, 0.35, 'sine', 0.09, 0.34);
  }

  defeat() {
    this.playTone(240, 180, 0.25, 'sawtooth', 0.07, 0);
    this.playTone(180, 110, 0.4, 'triangle', 0.08, 0.22);
  }
}

export const sound = new SoundEngine();
