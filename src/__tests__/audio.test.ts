import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioManager, SoundEffect } from '../audio'

const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}

const mockGain = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
}

const mockCtx = {
  state: 'running' as AudioContextState,
  currentTime: 0,
  destination: {} as AudioDestinationNode,
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGain),
  resume: vi.fn().mockResolvedValue(undefined),
}

const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

vi.stubGlobal(
  'AudioContext',
  vi.fn().mockImplementation(() => mockCtx)
)
vi.stubGlobal('localStorage', localStorageMock)

describe('AudioManager construction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockCtx.state = 'running'
  })

  it('initializes with default master volume 0.8', () => {
    const mgr = new AudioManager()
    expect(mgr.getMasterVolume()).toBe(0.8)
  })

  it('initializes with default sfx volume 1.0', () => {
    const mgr = new AudioManager()
    expect(mgr.getSfxVolume()).toBe(1.0)
  })

  it('initializes as not muted', () => {
    const mgr = new AudioManager()
    expect(mgr.isMuted()).toBe(false)
  })

  it('loads saved master volume from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === 'stakka_masterVol' ? '0.5' : null
    )
    const mgr = new AudioManager()
    expect(mgr.getMasterVolume()).toBe(0.5)
  })

  it('loads saved sfx volume from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === 'stakka_sfxVol' ? '0.7' : null
    )
    const mgr = new AudioManager()
    expect(mgr.getSfxVolume()).toBe(0.7)
  })

  it('loads muted=true from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === 'stakka_muted' ? 'true' : null
    )
    const mgr = new AudioManager()
    expect(mgr.isMuted()).toBe(true)
  })

  it('ignores invalid localStorage values and uses defaults', () => {
    localStorageMock.getItem.mockReturnValue('not-a-number')
    const mgr = new AudioManager()
    expect(mgr.getMasterVolume()).toBe(0.8)
    expect(mgr.getSfxVolume()).toBe(1.0)
  })
})

describe('AudioManager play()', () => {
  let mgr: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    mockCtx.state = 'running'
    mgr = new AudioManager()
  })

  it('play(Move) creates oscillator and gain nodes', () => {
    mgr.play(SoundEffect.Move)
    expect(mockCtx.createOscillator).toHaveBeenCalled()
    expect(mockCtx.createGain).toHaveBeenCalled()
  })

  it('play(Rotate) creates oscillator and gain nodes', () => {
    mgr.play(SoundEffect.Rotate)
    expect(mockCtx.createOscillator).toHaveBeenCalled()
    expect(mockCtx.createGain).toHaveBeenCalled()
  })

  it('play(HardDrop) creates 2 oscillators for dual tone', () => {
    mgr.play(SoundEffect.HardDrop)
    // HardDrop calls tone() twice
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
  })

  it('play(Tetris) creates 4 oscillators for fanfare chord', () => {
    mgr.play(SoundEffect.Tetris)
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4)
  })

  it('play(LevelUp) creates 4 oscillators for arpeggio', () => {
    mgr.play(SoundEffect.LevelUp)
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4)
  })

  it('play(LineClear) starts the oscillator', () => {
    mgr.play(SoundEffect.LineClear)
    expect(mockOscillator.start).toHaveBeenCalled()
  })

  it('play() when context suspended calls resume()', () => {
    mockCtx.state = 'suspended'
    mgr.play(SoundEffect.Move)
    expect(mockCtx.resume).toHaveBeenCalled()
  })

  it('all SoundEffect variants play without throwing', () => {
    for (const sfx of Object.values(SoundEffect)) {
      expect(() => mgr.play(sfx)).not.toThrow()
    }
  })
})

describe('AudioManager combo pitch escalation', () => {
  let mgr: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    mockCtx.state = 'running'
    mgr = new AudioManager()
  })

  it('combo 0 uses base frequency 400Hz', () => {
    mgr.play(SoundEffect.Combo, { combo: 0 })
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(400, 0)
  })

  it('combo 3 uses 700Hz (400 + 3×100)', () => {
    mgr.play(SoundEffect.Combo, { combo: 3 })
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(700, 0)
  })

  it('combo 5 uses 900Hz (400 + 5×100)', () => {
    mgr.play(SoundEffect.Combo, { combo: 5 })
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(900, 0)
  })
})

describe('AudioManager volume controls', () => {
  let mgr: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockCtx.state = 'running'
    mgr = new AudioManager()
  })

  it('setMasterVolume updates getMasterVolume()', () => {
    mgr.setMasterVolume(0.5)
    expect(mgr.getMasterVolume()).toBe(0.5)
  })

  it('setMasterVolume clamps to 0', () => {
    mgr.setMasterVolume(-0.5)
    expect(mgr.getMasterVolume()).toBe(0)
  })

  it('setMasterVolume clamps to 1', () => {
    mgr.setMasterVolume(1.5)
    expect(mgr.getMasterVolume()).toBe(1)
  })

  it('setMasterVolume saves to localStorage', () => {
    mgr.setMasterVolume(0.4)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'stakka_masterVol',
      '0.4'
    )
  })

  it('setSfxVolume updates getSfxVolume()', () => {
    mgr.setSfxVolume(0.7)
    expect(mgr.getSfxVolume()).toBe(0.7)
  })

  it('setSfxVolume clamps to 0', () => {
    mgr.setSfxVolume(-1)
    expect(mgr.getSfxVolume()).toBe(0)
  })

  it('setSfxVolume clamps to 1', () => {
    mgr.setSfxVolume(2)
    expect(mgr.getSfxVolume()).toBe(1)
  })

  it('setSfxVolume saves to localStorage', () => {
    mgr.setSfxVolume(0.8)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'stakka_sfxVol',
      '0.8'
    )
  })
})

describe('AudioManager mute controls', () => {
  let mgr: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockCtx.state = 'running'
    mgr = new AudioManager()
  })

  it('toggleMute() sets isMuted() to true', () => {
    mgr.toggleMute()
    expect(mgr.isMuted()).toBe(true)
  })

  it('toggleMute() twice returns to unmuted', () => {
    mgr.toggleMute()
    mgr.toggleMute()
    expect(mgr.isMuted()).toBe(false)
  })

  it('toggleMute() saves muted state to localStorage', () => {
    mgr.toggleMute()
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'stakka_muted',
      'true'
    )
  })

  it('mute() sets isMuted() to true', () => {
    mgr.mute()
    expect(mgr.isMuted()).toBe(true)
  })

  it('mute() is idempotent', () => {
    mgr.mute()
    mgr.mute()
    expect(mgr.isMuted()).toBe(true)
  })

  it('unmute() clears muted state', () => {
    mgr.mute()
    mgr.unmute()
    expect(mgr.isMuted()).toBe(false)
  })

  it('unmute() is idempotent', () => {
    mgr.unmute()
    expect(mgr.isMuted()).toBe(false)
  })
})

describe('AudioManager ensureResumed()', () => {
  let mgr: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    mockCtx.state = 'running'
    mgr = new AudioManager()
  })

  it('calls ctx.resume() when state is suspended', () => {
    mgr.play(SoundEffect.Move) // init ctx
    mockCtx.state = 'suspended'
    mockCtx.resume.mockClear()
    mgr.ensureResumed()
    expect(mockCtx.resume).toHaveBeenCalled()
  })

  it('does not call ctx.resume() when state is running', () => {
    mgr.play(SoundEffect.Move) // init ctx
    mockCtx.state = 'running'
    mockCtx.resume.mockClear()
    mgr.ensureResumed()
    expect(mockCtx.resume).not.toHaveBeenCalled()
  })

  it('does nothing when ctx is not yet initialized', () => {
    // Fresh mgr with no play() call — ctx is null
    expect(() => mgr.ensureResumed()).not.toThrow()
  })
})

describe('AudioManager graceful degradation', () => {
  it('play() does not throw when AudioContext constructor throws', () => {
    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => {
        throw new Error('AudioContext not supported')
      })
    )
    const mgr = new AudioManager()
    expect(() => mgr.play(SoundEffect.Move)).not.toThrow()
    // restore
    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => mockCtx)
    )
  })
})
