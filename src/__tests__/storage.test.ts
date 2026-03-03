import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageManager } from '../storage'
import type { LeaderboardEntry } from '../storage'

function makeEntry(score: number, name = 'Player'): LeaderboardEntry {
  return { name, score, level: 1, lines: 10, time: 60, date: '2026-01-01' }
}

describe('StorageManager', () => {
  let storage: StorageManager
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    }
    vi.stubGlobal('localStorage', mockLocalStorage)
    storage = new StorageManager()
  })

  describe('getLeaderboard', () => {
    it('returns empty array when nothing stored', () => {
      expect(storage.getLeaderboard()).toEqual([])
    })

    it('returns entries sorted by score descending', () => {
      store['stakka_leaderboard'] = JSON.stringify([
        makeEntry(100),
        makeEntry(500),
        makeEntry(200),
      ])
      const entries = storage.getLeaderboard()
      expect(entries.map((e) => e.score)).toEqual([500, 200, 100])
    })

    it('returns at most 10 entries', () => {
      const many = Array.from({ length: 15 }, (_, i) => makeEntry(i * 10))
      store['stakka_leaderboard'] = JSON.stringify(many)
      expect(storage.getLeaderboard()).toHaveLength(10)
    })

    it('returns empty array for invalid JSON', () => {
      store['stakka_leaderboard'] = 'not-json'
      expect(storage.getLeaderboard()).toEqual([])
    })

    it('returns empty array when stored value is not an array', () => {
      store['stakka_leaderboard'] = JSON.stringify({ score: 100 })
      expect(storage.getLeaderboard()).toEqual([])
    })
  })

  describe('addEntry', () => {
    it('adds an entry and returns rank 1 for first entry', () => {
      const rank = storage.addEntry(makeEntry(100))
      expect(rank).toBe(1)
    })

    it('persists entry to localStorage', () => {
      storage.addEntry(makeEntry(100))
      const stored = JSON.parse(store['stakka_leaderboard'])
      expect(stored).toHaveLength(1)
      expect(stored[0].score).toBe(100)
    })

    it('returns correct rank for lower score', () => {
      storage.addEntry(makeEntry(500))
      const rank = storage.addEntry(makeEntry(200))
      expect(rank).toBe(2)
    })

    it('trims to top 10 entries', () => {
      for (let i = 1; i <= 10; i++) storage.addEntry(makeEntry(i * 100))
      storage.addEntry(makeEntry(550))
      const entries = storage.getLeaderboard()
      expect(entries).toHaveLength(10)
    })

    it('returns -1 when score does not make top 10', () => {
      for (let i = 1; i <= 10; i++) storage.addEntry(makeEntry(i * 1000))
      const rank = storage.addEntry(makeEntry(1))
      expect(rank).toBe(-1)
    })

    it('returns -1 when localStorage is unavailable', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('unavailable')
        },
        setItem: () => {
          throw new Error('unavailable')
        },
        removeItem: () => {
          throw new Error('unavailable')
        },
      })
      const s = new StorageManager()
      expect(s.addEntry(makeEntry(100))).toBe(-1)
    })
  })

  describe('isHighScore', () => {
    it('returns true for any positive score when leaderboard is empty', () => {
      expect(storage.isHighScore(1)).toBe(true)
    })

    it('returns false for score of 0', () => {
      expect(storage.isHighScore(0)).toBe(false)
    })

    it('returns true when leaderboard has fewer than 10 entries', () => {
      storage.addEntry(makeEntry(100))
      expect(storage.isHighScore(50)).toBe(true)
    })

    it('returns false when score does not beat 10th place', () => {
      for (let i = 1; i <= 10; i++) storage.addEntry(makeEntry(i * 100))
      expect(storage.isHighScore(50)).toBe(false)
    })

    it('returns true when score beats 10th place', () => {
      for (let i = 1; i <= 10; i++) storage.addEntry(makeEntry(i * 100))
      expect(storage.isHighScore(150)).toBe(true)
    })
  })

  describe('clearLeaderboard', () => {
    it('removes all entries', () => {
      storage.addEntry(makeEntry(100))
      storage.clearLeaderboard()
      expect(storage.getLeaderboard()).toEqual([])
    })

    it('removing from empty leaderboard does not throw', () => {
      expect(() => storage.clearLeaderboard()).not.toThrow()
    })
  })

  describe('getLastName / setLastName', () => {
    it('returns empty string when no name stored', () => {
      expect(storage.getLastName()).toBe('')
    })

    it('stores and retrieves name', () => {
      storage.setLastName('Alice')
      expect(storage.getLastName()).toBe('Alice')
    })

    it('updates name when called again', () => {
      storage.setLastName('Alice')
      storage.setLastName('Bob')
      expect(storage.getLastName()).toBe('Bob')
    })
  })

  describe('graceful fallback when localStorage unavailable', () => {
    let unavailableStorage: StorageManager

    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('unavailable')
        },
        setItem: () => {
          throw new Error('unavailable')
        },
        removeItem: () => {
          throw new Error('unavailable')
        },
      })
      unavailableStorage = new StorageManager()
    })

    it('getLeaderboard returns empty array', () => {
      expect(unavailableStorage.getLeaderboard()).toEqual([])
    })

    it('isHighScore returns false for score of 0', () => {
      expect(unavailableStorage.isHighScore(0)).toBe(false)
    })

    it('clearLeaderboard does not throw', () => {
      expect(() => unavailableStorage.clearLeaderboard()).not.toThrow()
    })

    it('getLastName returns empty string', () => {
      expect(unavailableStorage.getLastName()).toBe('')
    })

    it('setLastName does not throw', () => {
      expect(() => unavailableStorage.setLastName('Alice')).not.toThrow()
    })
  })
})
