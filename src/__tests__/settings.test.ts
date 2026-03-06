import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SettingsManager, GameSettings } from '../settings'
import { InputManager, GameAction } from '../input'
import { ThemeManager } from '../theme'
import { Renderer } from '../renderer'
import type { Piece } from '../piece'

function makeManager(): SettingsManager {
  return new SettingsManager()
}

describe('SettingsManager', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem(key: string) {
        return store[key] ?? null
      },
      setItem(key: string, val: string) {
        store[key] = val
      },
      removeItem(key: string) {
        delete store[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('defaults', () => {
    it('returns default DAS of 167', () => {
      expect(makeManager().get('das')).toBe(167)
    })

    it('returns default ARR of 33', () => {
      expect(makeManager().get('arr')).toBe(33)
    })

    it('returns default SDF of 20', () => {
      expect(makeManager().get('sdf')).toBe(20)
    })

    it('returns default masterVolume of 80', () => {
      expect(makeManager().get('masterVolume')).toBe(80)
    })

    it('returns default sfxVolume of 100', () => {
      expect(makeManager().get('sfxVolume')).toBe(100)
    })

    it('returns default musicVolume of 50', () => {
      expect(makeManager().get('musicVolume')).toBe(50)
    })

    it('returns default theme of auto', () => {
      expect(makeManager().get('theme')).toBe('auto')
    })

    it('returns default ghostPiece of true', () => {
      expect(makeManager().get('ghostPiece')).toBe(true)
    })

    it('returns default showGrid of true', () => {
      expect(makeManager().get('showGrid')).toBe(true)
    })
  })

  describe('get/set', () => {
    it('set() updates a numeric setting', () => {
      const mgr = makeManager()
      mgr.set('das', 100)
      expect(mgr.get('das')).toBe(100)
    })

    it('set() updates theme', () => {
      const mgr = makeManager()
      mgr.set('theme', 'dark')
      expect(mgr.get('theme')).toBe('dark')
    })

    it('set() updates boolean settings', () => {
      const mgr = makeManager()
      mgr.set('ghostPiece', false)
      expect(mgr.get('ghostPiece')).toBe(false)
    })
  })

  describe('validation', () => {
    it('clamps DAS to min 50', () => {
      const mgr = makeManager()
      mgr.set('das', 10)
      expect(mgr.get('das')).toBe(50)
    })

    it('clamps DAS to max 300', () => {
      const mgr = makeManager()
      mgr.set('das', 999)
      expect(mgr.get('das')).toBe(300)
    })

    it('clamps ARR to min 0', () => {
      const mgr = makeManager()
      mgr.set('arr', -5)
      expect(mgr.get('arr')).toBe(0)
    })

    it('clamps ARR to max 100', () => {
      const mgr = makeManager()
      mgr.set('arr', 200)
      expect(mgr.get('arr')).toBe(100)
    })

    it('clamps volume to 0-100', () => {
      const mgr = makeManager()
      mgr.set('masterVolume', 150)
      expect(mgr.get('masterVolume')).toBe(100)
      mgr.set('masterVolume', -10)
      expect(mgr.get('masterVolume')).toBe(0)
    })

    it('rejects invalid theme and falls back to auto', () => {
      const mgr = makeManager()
      mgr.set('theme', 'invalid' as GameSettings['theme'])
      expect(mgr.get('theme')).toBe('auto')
    })
  })

  describe('save/load', () => {
    it('save() persists settings to localStorage', () => {
      const mgr = makeManager()
      mgr.set('das', 83)
      mgr.save()
      const stored = JSON.parse(localStorage.getItem('stakka_settings') ?? '{}')
      expect(stored.das).toBe(83)
    })

    it('load() restores settings from localStorage', () => {
      localStorage.setItem(
        'stakka_settings',
        JSON.stringify({ das: 100, arr: 0 })
      )
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(100)
      expect(mgr.get('arr')).toBe(0)
    })

    it('load() merges with defaults for missing keys', () => {
      localStorage.setItem('stakka_settings', JSON.stringify({ das: 80 }))
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(80)
      expect(mgr.get('arr')).toBe(33)
    })

    it('load() handles corrupt JSON gracefully', () => {
      localStorage.setItem('stakka_settings', 'not-json')
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(167)
    })

    it('load() handles missing localStorage gracefully', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: vi.fn(),
      })
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(167)
    })

    it('load() keeps defaults when stored value is JSON null', () => {
      localStorage.setItem('stakka_settings', 'null')
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(167)
    })

    it('load() keeps defaults when stored value is a JSON string', () => {
      localStorage.setItem('stakka_settings', '"just-a-string"')
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(167)
    })

    it('load() keeps defaults when stored value is a JSON array', () => {
      localStorage.setItem('stakka_settings', '["das", 100]')
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(167)
    })

    it('load() keeps defaults when stored value is a JSON number', () => {
      localStorage.setItem('stakka_settings', '42')
      const mgr = makeManager()
      expect(mgr.get('das')).toBe(167)
    })
  })

  describe('reset', () => {
    it('reset() restores all defaults', () => {
      const mgr = makeManager()
      mgr.set('das', 80)
      mgr.set('arr', 0)
      mgr.set('theme', 'dark')
      mgr.reset()
      expect(mgr.get('das')).toBe(167)
      expect(mgr.get('arr')).toBe(33)
      expect(mgr.get('theme')).toBe('auto')
    })
  })

  describe('onChange', () => {
    it('onChange fires when set() is called', () => {
      const mgr = makeManager()
      const cb = vi.fn()
      mgr.onChange('das', cb)
      mgr.set('das', 100)
      expect(cb).toHaveBeenCalledWith(100)
    })

    it('onChange fires for all keys on reset()', () => {
      const mgr = makeManager()
      const dasCb = vi.fn()
      const themeCb = vi.fn()
      mgr.onChange('das', dasCb)
      mgr.onChange('theme', themeCb)
      mgr.reset()
      expect(dasCb).toHaveBeenCalledWith(167)
      expect(themeCb).toHaveBeenCalledWith('auto')
    })

    it('multiple listeners can be registered for the same key', () => {
      const mgr = makeManager()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      mgr.onChange('arr', cb1)
      mgr.onChange('arr', cb2)
      mgr.set('arr', 16)
      expect(cb1).toHaveBeenCalledWith(16)
      expect(cb2).toHaveBeenCalledWith(16)
    })
  })
})

describe('SettingsManager — debounced auto-save', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('does not write to localStorage immediately on set()', () => {
    vi.useFakeTimers()
    const mgr = new SettingsManager()
    mgr.set('das', 83)
    expect(localStorage.getItem('stakka_settings')).toBeNull()
  })

  it('writes to localStorage after 500ms debounce', () => {
    vi.useFakeTimers()
    const mgr = new SettingsManager()
    mgr.set('das', 83)
    vi.advanceTimersByTime(500)
    const stored = JSON.parse(localStorage.getItem('stakka_settings') ?? 'null')
    expect(stored?.das).toBe(83)
  })

  it('reset() writes defaults to localStorage immediately', () => {
    const mgr = new SettingsManager()
    mgr.reset()
    const stored = JSON.parse(localStorage.getItem('stakka_settings') ?? 'null')
    expect(stored).not.toBeNull()
    expect(stored.das).toBe(167)
  })
})

describe('InputManager integration', () => {
  type InputInternal = {
    handleKeyDown: (e: { key: string; preventDefault: () => void }) => void
    handleKeyUp: (e: { key: string }) => void
  }

  function pressKey(input: InputManager, key: string): void {
    const e = { key, preventDefault: () => {} }
    ;(input as unknown as InputInternal).handleKeyDown(e)
  }

  it('setDasDelay() changes when DAS charges', () => {
    const input = new InputManager({ dasDelay: 167, arrRate: 0 })
    input.setDasDelay(50)
    pressKey(input, 'ArrowLeft')
    input.update(1) // immediate first move, dasTimer = 1
    input.update(50) // dasTimer = 51 → DAS charged at 50ms
    // DAS charged with arrRate=0: instant shift emits 10 moves
    const actions = input.update(1)
    expect(actions.filter((a) => a === GameAction.MOVE_LEFT).length).toBe(10)
  })

  it('setArrRate() changes repeat rate', () => {
    const input = new InputManager({ dasDelay: 1, arrRate: 50 })
    input.setArrRate(25)
    pressKey(input, 'ArrowLeft')
    input.update(1) // immediate move; dasTimer=1 >= dasDelay=1 → DAS charged
    // arrRate=25: 50ms → floor(50/25) = 2 ARR moves
    const actions = input.update(50)
    expect(actions.filter((a) => a === GameAction.MOVE_LEFT).length).toBe(2)
  })

  it('setDasDelay() resets DAS timers so DAS restarts', () => {
    const input = new InputManager({ dasDelay: 167, arrRate: 33 })
    pressKey(input, 'ArrowLeft')
    input.update(100) // immediate move consumed; dasTimer=100, not yet charged
    input.setDasDelay(50) // timers reset to 0
    input.update(1) // immediate move (dasTimer reset to 0); dasTimer=1
    input.update(50) // dasTimer=51 >= 50 → DAS charges; ARR fires once
    const actions = input.update(33) // ARR fires once more
    expect(
      actions.filter((a) => a === GameAction.MOVE_LEFT).length
    ).toBeGreaterThan(0)
  })
})

describe('ThemeManager integration', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('setTheme("light") makes getThemeName() return "light"', () => {
    const mgr = new ThemeManager()
    mgr.setTheme('light')
    expect(mgr.getThemeName()).toBe('light')
  })

  it('setTheme("dark") makes getThemeName() return "dark"', () => {
    const mgr = new ThemeManager()
    mgr.setTheme('dark')
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('setTheme("auto") makes getMode() return "auto"', () => {
    const mgr = new ThemeManager()
    mgr.setTheme('dark')
    mgr.setTheme('auto')
    expect(mgr.getMode()).toBe('auto')
  })

  it('setTheme("light") sets override so getMode() returns "light"', () => {
    const mgr = new ThemeManager()
    mgr.setTheme('light')
    expect(mgr.getMode()).toBe('light')
  })
})

describe('Renderer integration', () => {
  function makeMockRenderer(): { renderer: Renderer; calls: string[] } {
    const calls: string[] = []
    const makeMethod = (name: string) => () => {
      calls.push(name)
    }

    const canvas = {
      style: { width: '', height: '' },
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement

    const ctx = {
      canvas,
      save: makeMethod('save'),
      restore: makeMethod('restore'),
      beginPath: makeMethod('beginPath'),
      stroke: makeMethod('stroke'),
      roundRect: makeMethod('roundRect'),
      moveTo: makeMethod('moveTo'),
      lineTo: makeMethod('lineTo'),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      setTransform: () => {},
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D

    Object.assign(canvas, { getContext: () => ctx })

    return { renderer: new Renderer(canvas), calls }
  }

  const mockPiece: Piece = {
    type: 0,
    x: 3,
    y: 5,
    getBlocks: () => [{ x: 3, y: 7 }],
  } as unknown as Piece

  it('setGhostEnabled(false) skips ghost drawing', () => {
    const { renderer, calls } = makeMockRenderer()
    renderer.setGhostEnabled(false)
    renderer.drawGhostPiece(mockPiece, 15)
    expect(calls).not.toContain('save')
  })

  it('setGhostEnabled(true) allows ghost drawing', () => {
    const { renderer, calls } = makeMockRenderer()
    renderer.setGhostEnabled(true)
    renderer.drawGhostPiece(mockPiece, 15)
    expect(calls).toContain('save')
  })

  it('setGridEnabled(false) skips grid drawing', () => {
    const { renderer, calls } = makeMockRenderer()
    renderer.setGridEnabled(false)
    renderer.drawGrid()
    expect(calls).not.toContain('save')
  })

  it('setGridEnabled(true) allows grid drawing', () => {
    const { renderer, calls } = makeMockRenderer()
    renderer.setGridEnabled(true)
    renderer.drawGrid()
    expect(calls).toContain('save')
  })
})
