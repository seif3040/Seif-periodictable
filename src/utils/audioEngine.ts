import { ChemicalElement } from '../data/elements';

export interface AudioPulseState {
  isPlaying: boolean;
  isMuted: boolean;
  bpm: number;
  beatPhase: number; // 0..1 within current beat
  beatPulse: number; // 0..1 decaying envelope on beat hit
  beatCount: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  hasCustomAudio: boolean;
  customFileName: string | null;
}

// Lydian-Mixolydian "Acoustic / Scientific Scale" frequencies in Hz
const SCIENTIFIC_SCALE_SEMITONES = [0, 2, 4, 6, 7, 9, 10, 12, 14, 16, 18, 19, 21, 24];

export class ElementalAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private customAudioEl: HTMLAudioElement | null = null;
  private customSourceNode: MediaElementAudioSourceNode | null = null;

  public isPlaying = false;
  public isMuted = false;
  public bpm = 124;
  public beatCount = 0;
  public hasCustomAudio = false;
  public customFileName: string | null = null;

  private lastBeatTime = 0;
  private beatPulse = 0;
  private beatPhase = 0;
  private onTourStep: (() => void) | null = null;

  public setTourStepCallback(cb: (() => void) | null) {
    this.onTourStep = cb;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.75;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.28;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.28, this.ctx.currentTime, 0.03);
    }
    if (this.customAudioEl) {
      this.customAudioEl.muted = muted;
    }
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(60, Math.min(180, bpm));
  }

  public loadCustomAudioFile(file: File) {
    const ctx = this.ensureContext();
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    this.customAudioEl = audio;
    this.hasCustomAudio = true;
    this.customFileName = file.name;

    if (ctx && this.masterGain) {
      try {
        this.customSourceNode = ctx.createMediaElementSource(audio);
        this.customSourceNode.connect(this.masterGain);
      } catch {
        // Fallback if MediaElementSource fails
      }
    }
    if (this.isPlaying) {
      audio.play().catch(() => {});
    }
  }

  public clearCustomAudio() {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
      this.customAudioEl = null;
    }
    this.hasCustomAudio = false;
    this.customFileName = null;
  }

  public start() {
    this.ensureContext();
    this.isPlaying = true;
    this.lastBeatTime = performance.now();
    this.beatCount = 0;
    if (this.customAudioEl) {
      this.customAudioEl.play().catch(() => {});
    }
  }

  public pause() {
    this.isPlaying = false;
    this.beatPulse = 0;
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  }

  /**
   * Plays an elemental resonance chime mapped to the element's atomic properties.
   */
  public playElementSonification(element: ChemicalElement) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const scaleIdx = (element.number - 1) % SCIENTIFIC_SCALE_SEMITONES.length;
    const semitone = SCIENTIFIC_SCALE_SEMITONES[scaleIdx];
    // Higher periods have deeper fundamental bass + sparkling harmonic overtones
    const octaveShift = Math.max(-1, 3 - Math.floor(element.period / 2));
    const baseFreq = 220 * Math.pow(2, (semitone + octaveShift * 12) / 12);

    // Primary crystal bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.004, now + 0.35);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.32, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.46);

    // Spectral overtone derived from primary emission line
    const primaryNm = element.spectralLines[0]?.wavelengthNm ?? 500;
    const harmonicRatio = 1.25 + ((750 - primaryNm) / 370) * 0.75;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * harmonicRatio, now);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.34);
  }

  private triggerMetronomeSynthStep(stepIndex: number) {
    if (this.isMuted || this.hasCustomAudio) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    // Playful, fast-paced scientific arpeggio pattern
    const pattern = [0, 4, 7, 11, 12, 7, 4, 2];
    const semitone = pattern[stepIndex % pattern.length];
    const freq = 196 * Math.pow(2, semitone / 12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = stepIndex % 4 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const peak = stepIndex % 4 === 0 ? 0.24 : 0.12;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Advances the audio/metronome engine every frame and returns current audio-reactive state.
   */
  public update(nowMs: number, deltaSec: number): AudioPulseState {
    const beatIntervalMs = (60 / this.bpm) * 1000;

    if (this.isPlaying) {
      const elapsed = nowMs - this.lastBeatTime;
      this.beatPhase = Math.min(1, Math.max(0, elapsed / beatIntervalMs));
      if (elapsed >= beatIntervalMs) {
        this.lastBeatTime = nowMs - (elapsed % beatIntervalMs);
        this.beatCount += 1;
        this.beatPulse = 1.0;
        this.triggerMetronomeSynthStep(this.beatCount);

        // Advance element tour every 4 beats (~1.9s at 124 BPM)
        if (this.beatCount % 4 === 0 && this.onTourStep) {
          this.onTourStep();
        }
      } else {
        this.beatPulse = Math.max(0, this.beatPulse - deltaSec * 3.8);
      }
    } else {
      this.beatPhase = 0;
      this.beatPulse = Math.max(0, this.beatPulse - deltaSec * 4.5);
    }

    let lowEnergy = this.beatPulse * 0.85;
    let midEnergy = this.beatPulse * 0.65;
    let highEnergy = this.beatPulse * 0.5;

    if (this.analyser && this.freqData && this.isPlaying && !this.isMuted) {
      this.analyser.getByteFrequencyData(this.freqData);
      let lowSum = 0;
      let midSum = 0;
      let highSum = 0;
      const n = this.freqData.length;
      for (let i = 0; i < n; i++) {
        const v = this.freqData[i] / 255;
        if (i < n * 0.25) lowSum += v;
        else if (i < n * 0.65) midSum += v;
        else highSum += v;
      }
      const realLow = lowSum / (n * 0.25);
      const realMid = midSum / (n * 0.4);
      const realHigh = highSum / (n * 0.35);

      lowEnergy = Math.max(lowEnergy, realLow);
      midEnergy = Math.max(midEnergy, realMid);
      highEnergy = Math.max(highEnergy, realHigh);
    }

    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      bpm: this.bpm,
      beatPhase: this.beatPhase,
      beatPulse: this.beatPulse,
      beatCount: this.beatCount,
      lowEnergy,
      midEnergy,
      highEnergy,
      hasCustomAudio: this.hasCustomAudio,
      customFileName: this.customFileName,
    };
  }
}
