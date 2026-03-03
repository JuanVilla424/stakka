export enum SoundEffect {
  Move = 'move',
  Rotate = 'rotate',
  SoftDrop = 'softDrop',
  HardDrop = 'hardDrop',
  Lock = 'lock',
  LineClear = 'lineClear',
  Tetris = 'tetris',
  TSpin = 'tSpin',
  Combo = 'combo',
  LevelUp = 'levelUp',
  GameOver = 'gameOver',
  Hold = 'hold',
  MenuSelect = 'menuSelect',
}

const LS_MASTER = 'stakka_masterVol'
const LS_SFX = 'stakka_sfxVol'
const LS_MUTED = 'stakka_muted'

interface ToneConfig {
  freq: number
  type: OscillatorType
  duration: number
  volume?: number
  endFreq?: number
}

export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private _masterVolume: number
  private _sfxVolume: number
  private _muted: boolean

  constructor() {
    const store = typeof localStorage !== 'undefined' ? localStorage : null
    const savedMaster = parseFloat(store?.getItem(LS_MASTER) ?? '')
    const savedSfx = parseFloat(store?.getItem(LS_SFX) ?? '')
    this._masterVolume =
      isFinite(savedMaster) && savedMaster >= 0 && savedMaster <= 1
        ? savedMaster
        : 0.8
    this._sfxVolume =
      isFinite(savedSfx) && savedSfx >= 0 && savedSfx <= 1 ? savedSfx : 1.0
    this._muted = store?.getItem(LS_MUTED) === 'true'
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.connect(this.masterGain)
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume
      this.sfxGain.gain.value = this._sfxVolume
    }
    return this.ctx
  }

  /** Call on first user interaction to unblock the AudioContext. */
  ensureResumed(): void {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume()
    }
  }

  play(sound: SoundEffect, options?: { combo?: number }): void {
    try {
      const ctx = this.getContext()
      const doPlay = (): void => this.dispatch(ctx, sound, options?.combo ?? 0)
      if (ctx.state === 'suspended') {
        void ctx.resume().then(doPlay)
      } else {
        doPlay()
      }
    } catch {
      // Audio unavailable (e.g., test environment without Web Audio API)
    }
  }

  private dispatch(ctx: AudioContext, sound: SoundEffect, combo: number): void {
    const out = this.sfxGain
    if (!out) return

    switch (sound) {
      case SoundEffect.Move:
        this.playMove(ctx, out)
        break
      case SoundEffect.Rotate:
        this.playRotate(ctx, out)
        break
      case SoundEffect.SoftDrop:
        this.playSoftDrop(ctx, out)
        break
      case SoundEffect.HardDrop:
        this.playHardDrop(ctx, out)
        break
      case SoundEffect.Lock:
        this.playLock(ctx, out)
        break
      case SoundEffect.LineClear:
        this.playLineClear(ctx, out)
        break
      case SoundEffect.Tetris:
        this.playTetris(ctx, out)
        break
      case SoundEffect.TSpin:
        this.playTSpin(ctx, out)
        break
      case SoundEffect.Combo:
        this.playCombo(ctx, out, combo)
        break
      case SoundEffect.LevelUp:
        this.playLevelUp(ctx, out)
        break
      case SoundEffect.GameOver:
        this.playGameOver(ctx, out)
        break
      case SoundEffect.Hold:
        this.playHold(ctx, out)
        break
      case SoundEffect.MenuSelect:
        this.playMenuSelect(ctx, out)
        break
    }
  }

  private tone(ctx: AudioContext, dest: AudioNode, cfg: ToneConfig): void {
    const { freq, type, duration, volume = 0.3, endFreq } = cfg
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)
    }

    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  private playMove(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 800,
      type: 'sine',
      duration: 0.05,
      volume: 0.15,
    })
  }

  private playRotate(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 1200,
      type: 'sine',
      duration: 0.05,
      volume: 0.15,
    })
  }

  private playSoftDrop(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 400,
      type: 'sine',
      duration: 0.1,
      volume: 0.1,
      endFreq: 200,
    })
  }

  private playHardDrop(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 100,
      type: 'sine',
      duration: 0.15,
      volume: 0.4,
    })
    this.tone(ctx, dest, {
      freq: 50,
      type: 'square',
      duration: 0.12,
      volume: 0.2,
    })
  }

  private playLock(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 600,
      type: 'triangle',
      duration: 0.1,
      volume: 0.25,
    })
  }

  private playLineClear(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 500,
      type: 'sine',
      duration: 0.3,
      volume: 0.3,
      endFreq: 1000,
    })
  }

  private playTetris(ctx: AudioContext, dest: AudioNode): void {
    // C-E-G-C chord (261, 329, 392, 523 Hz) staggered for fanfare effect
    const freqs = [261, 329, 392, 523]
    const now = ctx.currentTime
    for (const [i, freq] of freqs.entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.04
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(t)
      osc.stop(t + 0.51)
    }
  }

  private playTSpin(ctx: AudioContext, dest: AudioNode): void {
    // Dramatic 300 → 900 → 300 Hz sweep
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.2)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.4)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.41)
  }

  private playCombo(ctx: AudioContext, dest: AudioNode, combo: number): void {
    const freq = 400 + combo * 100
    this.tone(ctx, dest, { freq, type: 'sine', duration: 0.2, volume: 0.3 })
  }

  private playLevelUp(ctx: AudioContext, dest: AudioNode): void {
    // Ascending arpeggio: A4-C#5-E5-A5
    const notes = [440, 554, 659, 880]
    const now = ctx.currentTime
    for (const [i, freq] of notes.entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.12
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(t)
      osc.stop(t + 0.11)
    }
  }

  private playGameOver(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 800,
      type: 'sine',
      duration: 1.0,
      volume: 0.4,
      endFreq: 100,
    })
  }

  private playHold(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 1000,
      type: 'triangle',
      duration: 0.1,
      volume: 0.2,
    })
  }

  private playMenuSelect(ctx: AudioContext, dest: AudioNode): void {
    this.tone(ctx, dest, {
      freq: 900,
      type: 'sine',
      duration: 0.05,
      volume: 0.2,
    })
  }

  // --- Volume and mute controls ---

  setMasterVolume(v: number): void {
    this._masterVolume = Math.max(0, Math.min(1, v))
    localStorage.setItem(LS_MASTER, String(this._masterVolume))
    if (this.masterGain && !this._muted) {
      this.masterGain.gain.value = this._masterVolume
    }
  }

  getMasterVolume(): number {
    return this._masterVolume
  }

  setSfxVolume(v: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, v))
    localStorage.setItem(LS_SFX, String(this._sfxVolume))
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._sfxVolume
    }
  }

  getSfxVolume(): number {
    return this._sfxVolume
  }

  toggleMute(): void {
    this._muted = !this._muted
    localStorage.setItem(LS_MUTED, String(this._muted))
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._masterVolume
    }
  }

  mute(): void {
    if (this._muted) return
    this._muted = true
    localStorage.setItem(LS_MUTED, 'true')
    if (this.masterGain) {
      this.masterGain.gain.value = 0
    }
  }

  unmute(): void {
    if (!this._muted) return
    this._muted = false
    localStorage.setItem(LS_MUTED, 'false')
    if (this.masterGain) {
      this.masterGain.gain.value = this._masterVolume
    }
  }

  isMuted(): boolean {
    return this._muted
  }
}

export const audio = new AudioManager()
