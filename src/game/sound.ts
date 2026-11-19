// Lightweight Web Audio API sound synthesizer for tactile card-combat feedback

const VOLUME_STORAGE_KEY = 'spire_ashes_volume_v1';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public volume = 0.85;

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!Number.isNaN(parsed)) {
            this.volume = Math.max(0, Math.min(1, parsed));
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume));
      }
    } catch {
      // ignore storage errors
    }
  }

  private getCtx(): AudioContext | null {
    if (this.muted || this.volume <= 0.005 || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    delay = 0,
    jitter = 0.05
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const pitchFactor = 1 + (Math.random() * 2 - 1) * jitter;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq * pitchFactor), now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq * pitchFactor),
      now + duration
    );

    const scaledGain = Math.max(0.001, gainVal * this.volume);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(scaledGain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  uiClick() {
    this.playTone(640, 480, 0.04, 'sine', 0.03, 0, 0.03);
  }

  errorBuzz() {
    this.playTone(170, 130, 0.1, 'sawtooth', 0.045, 0, 0.02);
  }

  cardHover() {
    this.playTone(520, 620, 0.042, 'sine', 0.022, 0, 0.06);
  }

  cardDraw() {
    this.playTone(290, 460, 0.075, 'triangle', 0.038, 0, 0.05);
  }

  turnStart() {
    this.playTone(440, 523.25, 0.11, 'sine', 0.045, 0, 0.01);
    this.playTone(523.25, 659.25, 0.14, 'triangle', 0.04, 0.07, 0.01);
  }

  attack() {
    this.playTone(250, 72, 0.14, 'sawtooth', 0.09, 0, 0.07);
    this.playTone(140, 55, 0.16, 'triangle', 0.08, 0.025, 0.06);
  }

  heavyHit() {
    this.playTone(165, 40, 0.25, 'sawtooth', 0.125, 0, 0.05);
    this.playTone(95, 34, 0.27, 'square', 0.075, 0.02, 0.04);
  }

  shieldBlock() {
    this.playTone(480, 740, 0.09, 'triangle', 0.065, 0, 0.04);
    this.playTone(860, 920, 0.08, 'sine', 0.04, 0.02, 0.03);
  }

  block() {
    this.playTone(340, 520, 0.12, 'triangle', 0.07, 0, 0.05);
    this.playTone(680, 760, 0.09, 'sine', 0.04, 0.03, 0.04);
  }

  buff() {
    this.playTone(360, 540, 0.14, 'sine', 0.06, 0, 0.03);
    this.playTone(540, 720, 0.18, 'triangle', 0.06, 0.07, 0.03);
  }

  bossAwaken() {
    this.playTone(120, 65, 0.34, 'sawtooth', 0.11, 0, 0.02);
    this.playTone(220, 440, 0.3, 'triangle', 0.07, 0.08, 0.02);
    this.playTone(330, 660, 0.32, 'sine', 0.06, 0.16, 0.02);
  }

  poison() {
    this.playTone(620, 320, 0.16, 'sine', 0.06, 0, 0.06);
    this.playTone(460, 220, 0.18, 'triangle', 0.04, 0.06, 0.06);
  }

  potion() {
    this.playTone(523, 659, 0.11, 'sine', 0.07, 0, 0.03);
    this.playTone(659, 880, 0.16, 'sine', 0.06, 0.08, 0.03);
  }

  gold() {
    this.playTone(980, 1280, 0.09, 'sine', 0.06, 0, 0.03);
    this.playTone(1318, 1568, 0.14, 'sine', 0.06, 0.06, 0.03);
  }

  campfire() {
    this.playTone(261, 329, 0.22, 'sine', 0.06, 0, 0.02);
    this.playTone(329, 392, 0.24, 'triangle', 0.05, 0.1, 0.02);
  }

  victory() {
    this.playTone(392, 392, 0.14, 'triangle', 0.07, 0, 0);
    this.playTone(493.88, 493.88, 0.14, 'triangle', 0.07, 0.11, 0);
    this.playTone(587.33, 587.33, 0.16, 'triangle', 0.08, 0.22, 0);
    this.playTone(783.99, 783.99, 0.35, 'sine', 0.09, 0.34, 0);
  }

  defeat() {
    this.playTone(240, 180, 0.25, 'sawtooth', 0.07, 0, 0);
    this.playTone(180, 110, 0.4, 'triangle', 0.08, 0.22, 0);
  }
}

export const sound = new SoundEngine();
