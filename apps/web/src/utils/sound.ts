class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicInterval: NodeJS.Timeout | null = null;
  private isPlayingMusic: boolean = false;
  private musicStep: number = 0;

  private roundBgmInterval: NodeJS.Timeout | null = null;
  private isPlayingRoundBgm: boolean = false;
  private roundBgmStep: number = 0;

  constructor() {
    // Read mute preference from localStorage if available
    try {
      const saved = localStorage.getItem('wordchain_sound_muted');
      if (saved !== null) {
        this.isMuted = JSON.parse(saved);
      }
    } catch {
      this.isMuted = false;
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopIntenseMusic();
      this.stopRoundBgm();
    }
    try {
      localStorage.setItem('wordchain_sound_muted', JSON.stringify(this.isMuted));
    } catch {
      // ignore
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Procedural Intense Synth Tension Soundtrack for Round 20+
   * Kicks in with pulsing 808 sub-bass, hi-hat clock tension and dark arpeggiated bassline
   */
  public startIntenseMusic(): void {
    if (this.isPlayingMusic || this.isMuted) return;
    this.isPlayingMusic = true;
    this.musicStep = 0;

    // 140 BPM -> beat interval is ~214ms (8th note)
    const stepDurationMs = 214;

    this.musicInterval = setInterval(() => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) {
        this.stopIntenseMusic();
        return;
      }

      const now = ctx.currentTime;
      const step = this.musicStep % 16;
      this.musicStep++;

      // 1. Kick/Sub-bass pulse on downbeats (0, 4, 8, 12)
      if (step % 4 === 0) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(120, now);
        kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

        kickGain.gain.setValueAtTime(0.22, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        kickOsc.connect(kickGain);
        kickGain.connect(ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.2);
      }

      // 2. Ticking Hi-hat clock tension on offbeats (2, 6, 10, 14)
      if (step % 2 === 0) {
        const tickOsc = ctx.createOscillator();
        const tickGain = ctx.createGain();
        tickOsc.type = 'square';
        tickOsc.frequency.setValueAtTime(1800, now);

        tickGain.gain.setValueAtTime(0.03, now);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        tickOsc.connect(tickGain);
        tickGain.connect(ctx.destination);
        tickOsc.start(now);
        tickOsc.stop(now + 0.04);
      }

      // 3. Synth tension note progression (D minor / F / G tension)
      const bassNotes = [146.83, 146.83, 174.61, 146.83, 196.0, 174.61, 164.81, 130.81];
      const noteFreq = bassNotes[(step >> 1) % bassNotes.length];

      const synthOsc = ctx.createOscillator();
      const synthGain = ctx.createGain();
      synthOsc.type = 'sawtooth';
      synthOsc.frequency.setValueAtTime(noteFreq, now);

      synthGain.gain.setValueAtTime(0.06, now);
      synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      synthOsc.connect(synthGain);
      synthGain.connect(ctx.destination);
      synthOsc.start(now);
      synthOsc.stop(now + 0.16);
    }, stepDurationMs);
  }

  public stopIntenseMusic(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isPlayingMusic = false;
  }

  /**
   * Smooth, rhythmic lo-fi procedural soundtrack for early match rounds (Rounds 1-19).
   * Features warm electric piano chords, soft low-frequency bass and gentle shaker cadence.
   */
  public startRoundBgm(): void {
    if (this.isPlayingRoundBgm || this.isMuted) return;
    this.isPlayingRoundBgm = true;
    this.roundBgmStep = 0;

    // ~105 BPM (16th note step = ~142ms)
    const stepDurationMs = 142;

    this.roundBgmInterval = setInterval(() => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) {
        this.stopRoundBgm();
        return;
      }

      const now = ctx.currentTime;
      const step = this.roundBgmStep % 32;
      this.roundBgmStep++;

      // 1. Mellow lo-fi sub-kick on beat 0 and 16
      if (step === 0 || step === 16) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(80, now);
        kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.15);

        kickGain.gain.setValueAtTime(0.09, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        kickOsc.connect(kickGain);
        kickGain.connect(ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.18);
      }

      // 2. Soft acoustic shaker on 8th notes (0, 2, 4, 6...)
      if (step % 2 === 0) {
        const shakerOsc = ctx.createOscillator();
        const shakerGain = ctx.createGain();
        shakerOsc.type = 'triangle';
        shakerOsc.frequency.setValueAtTime(1400 + (step % 4) * 80, now);

        shakerGain.gain.setValueAtTime(0.015, now);
        shakerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        shakerOsc.connect(shakerGain);
        shakerGain.connect(ctx.destination);
        shakerOsc.start(now);
        shakerOsc.stop(now + 0.035);
      }

      // 3. Warm Rhodes/electric piano chords on steps 0, 8, 16, 24
      if (step % 8 === 0) {
        const chordIndex = Math.floor(step / 8);
        const chords = [
          [261.63, 329.63, 392.0, 493.88], // Cmaj7
          [220.0, 261.63, 329.63, 392.0], // Am7
          [174.61, 220.0, 261.63, 329.63], // Fmaj7
          [196.0, 246.94, 293.66, 349.23], // G7
        ];
        const chordNotes = chords[chordIndex] || chords[0];

        chordNotes.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.025, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.8);
        });
      }

      // 4. Subtle smooth bassline on steps 0, 6, 12, 16, 22, 28
      if (step === 0 || step === 6 || step === 12 || step === 16 || step === 22 || step === 28) {
        const bassFreqs = [130.81, 164.81, 196.0, 110.0, 146.83, 174.61];
        const bassFreq = bassFreqs[Math.floor(step / 5) % bassFreqs.length];

        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq / 2, now);

        bassGain.gain.setValueAtTime(0.05, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.28);
      }
    }, stepDurationMs);
  }

  public stopRoundBgm(): void {
    if (this.roundBgmInterval) {
      clearInterval(this.roundBgmInterval);
      this.roundBgmInterval = null;
    }
    this.isPlayingRoundBgm = false;
  }

  /**
   * Sound effect played when a 7+ letter word is accepted, delivering a -2s time attack to opponent!
   */
  public playTimeAttack(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const chime = ctx.createOscillator();
    const gain = ctx.createGain();
    const chimeGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    chime.type = 'sine';
    chime.frequency.setValueAtTime(1318.5, now); // E6
    chime.frequency.exponentialRampToValueAtTime(1760, now + 0.2); // A6

    chimeGain.gain.setValueAtTime(0.14, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
    chime.start(now);
    chime.stop(now + 0.3);
  }

  public playWordAccepted(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Ascending arpeggio (C5 -> E5 -> G5)
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);

    osc2.frequency.setValueAtTime(523.25 / 2, now);
    osc2.frequency.exponentialRampToValueAtTime(783.99 / 2, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  public playWordRejected(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Downward error buzz
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playTimerTick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playTimerUrgent(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1046.5, now); // High C6 alert

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playTurnStart(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playEliminated(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playYourTurn(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // High-visibility energetic two-tone chime (D5 -> A5 -> D6)
    const tones = [587.33, 880.0, 1174.66];
    tones.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  public playSkillReroll(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // Rising celestial dice roll arpeggio
    const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    arpeggio.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  public playSkillSilence(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sub-bass EMP shockwave pulse
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(220, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.4);

    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.45);

    // Electric fizz crackle discharge
    const noiseOsc = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noiseOsc.type = 'sawtooth';
    noiseOsc.frequency.setValueAtTime(1400, now + 0.05);
    noiseOsc.frequency.linearRampToValueAtTime(300, now + 0.35);

    noiseGain.gain.setValueAtTime(0.08, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noiseOsc.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseOsc.start(now + 0.05);
    noiseOsc.stop(now + 0.35);
  }

  public playSkillCurse(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dark descending tritone curse chord (Eb -> A tritone dissonant tension)
    const freqs = [311.13, 220.0, 155.56];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.6);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + 0.65);
    });
  }

  public playSkillPass(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Swift passing whoosh: sine with quick pitch upward swoop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    // Resonant harmonic chime for baton pass
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'triangle';
    chimeOsc.frequency.setValueAtTime(880, now + 0.08);
    chimeOsc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28);

    chimeGain.gain.setValueAtTime(0.15, now + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);

    chimeOsc.start(now + 0.08);
    chimeOsc.stop(now + 0.32);
  }

  public playVictory(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  public playPickConfirm(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playMathCorrect(): void {
    this.playWordAccepted();
  }

  public playMathWrong(): void {
    this.playWordRejected();
  }
}

export const soundManager = new SoundSynthesizer();
