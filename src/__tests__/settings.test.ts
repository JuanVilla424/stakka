import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SettingsManager, GameSettings } from '../settings'

function makeManager(): SettingsManager {
  return new SettingsManager()
}

describe('SettingsManager', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      _store: {} as Record<string, string>,
      getItem(key: string) {
        return (this._store as Record<string, string>)[key] ?? null
      },
      setItem(key: string, val: string) {
        ;(this._store as Record<string, string>)[key] = val
      },
      removeItem(key: string) {
        delete (this._store as Record<string, string>)[key]
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
