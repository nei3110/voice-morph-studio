// Web Audio API Polyphonic Synthesizer
// Provides warm electric piano / pad timbre with gentle attack, rich harmonics, and stereo chorus/reverb simulation

import { midiToFreq } from './musicTheory';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private activeNodes: Array<{ stop: () => void }> = [];

  constructor() {
    // Automatically re-initialize / resume audio when mobile browser tab becomes visible again
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.resumeAudio();
        }
      });
      window.addEventListener('focus', () => {
        this.resumeAudio();
      });
      // Also unlock audio context on any user touch/click interaction on mobile
      window.addEventListener('touchstart', () => this.resumeAudio(), { passive: true, once: false });
    }
  }

  public async resumeAudio() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Safari/iOS may throw if not inside user gesture, will retry on next user interaction
      }
    }
  }

  private initContext() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext initialization deferred until user interaction', e);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Play a single note or chord
  public playChord(midiNotes: number[], durationSec: number = 1.6, type: 'epiano' | 'pad' | 'sine' = 'epiano') {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Dampen previous chords gracefully to prevent clipping
    this.stopAll(0.08);

    midiNotes.forEach((midi, index) => {
      if (!this.ctx || !this.masterGain) return;
      const freq = midiToFreq(midi);

      // Multi-oscillator voice for warm, lush tone
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();

      const voiceGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Pan slightly based on pitch
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        const panValue = ((midi - 60) / 24) * 0.4; // subtle spread
        panner.pan.setValueAtTime(Math.max(-0.6, Math.min(0.6, panValue)), now);
      }

      if (type === 'epiano') {
        // Rhodes / FM bell-like tone
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.002, now); // slight chorus detune

        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 2, now); // soft 2nd harmonic sparkle

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(3500, freq * 4), now);
        filter.frequency.exponentialRampToValueAtTime(Math.min(1200, freq * 1.5), now + durationSec);

        // Amplitude envelope (Warm organ/pad/epiano style that genuinely sustains for 2 full seconds)
        // Slight stagger per voice for natural strum feeling
        const strumDelay = index * 0.015;
        const voiceStart = now + strumDelay;
        const sustainEndTime = voiceStart + durationSec;
        const releaseDuration = 0.25;

        voiceGain.gain.setValueAtTime(0.0001, voiceStart);
        // Attack: smooth rise in 40ms
        voiceGain.gain.linearRampToValueAtTime(0.22 / Math.sqrt(midiNotes.length), voiceStart + 0.04);
        // Sustain: hold rich volume through the entire durationSec
        voiceGain.gain.setValueAtTime(0.20 / Math.sqrt(midiNotes.length), sustainEndTime);
        // Release: fade out at the end of durationSec
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, sustainEndTime + releaseDuration);

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(voiceGain);

        if (panner) {
          voiceGain.connect(panner);
          panner.connect(this.masterGain);
        } else {
          voiceGain.connect(this.masterGain);
        }

        osc1.start(voiceStart);
        osc2.start(voiceStart);
        osc3.start(voiceStart);

        const stopTime = sustainEndTime + releaseDuration + 0.05;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        osc3.stop(stopTime);

        this.activeNodes.push({
          stop: () => {
            try {
              voiceGain.gain.cancelScheduledValues(this.ctx?.currentTime || 0);
              voiceGain.gain.linearRampToValueAtTime(0.0001, (this.ctx?.currentTime || 0) + 0.05);
              setTimeout(() => {
                try {
                  osc1.stop();
                  osc2.stop();
                  osc3.stop();
                } catch {
                  // ignore
                }
              }, 60);
            } catch {
              // ignore
            }
          }
        });
      }
    });
  }

  // Play progression sequentially
  public async playProgression(chords: number[][], tempoBpm: number = 72, onStep?: (index: number) => void): Promise<() => void> {
    this.initContext();
    let isCancelled = false;
    const stepDurationSec = (60 / tempoBpm) * 2; // 2 beats per chord

    const run = async () => {
      for (let i = 0; i < chords.length; i++) {
        if (isCancelled) break;
        if (onStep) onStep(i);
        this.playChord(chords[i], stepDurationSec * 0.95);
        await new Promise(res => setTimeout(res, stepDurationSec * 1000));
      }
      if (!isCancelled && onStep) {
        onStep(-1);
      }
    };

    run();

    return () => {
      isCancelled = true;
      this.stopAll(0.1);
      if (onStep) onStep(-1);
    };
  }

  public stopAll(fadeSec: number = 0.05) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + fadeSec);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime + fadeSec + 0.01);
    }
    this.activeNodes.forEach(node => {
      try {
        node.stop();
      } catch {
        // ignore
      }
    });
    this.activeNodes = [];
  }
}

export const audioEngine = new AudioEngine();
