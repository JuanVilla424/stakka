export type LeaderboardEntry = {
  name: string
  score: number
  level: number
  lines: number
  time: number
  date: string
}

const LEADERBOARD_KEY = 'stakka_leaderboard'
const NAME_KEY = 'stakka_last_name'
const MAX_ENTRIES = 10

export class StorageManager {
  private _available: boolean | null = null

  private isAvailable(): boolean {
    if (this._available !== null) return this._available
    try {
      const key = '__stakka_test__'
      localStorage.setItem(key, '1')
      localStorage.getItem(key)
      localStorage.removeItem(key)
      this._available = true
    } catch {
      this._available = false
    }
    return this._available
  }

  getLeaderboard(): LeaderboardEntry[] {
    if (!this.isAvailable()) return []
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY)
      if (!raw) return []
      const entries = JSON.parse(raw) as LeaderboardEntry[]
      if (!Array.isArray(entries)) return []
      return entries.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
    } catch {
      return []
    }
  }

  addEntry(entry: LeaderboardEntry): number {
    if (!this.isAvailable()) return -1
    try {
      const entries = this.getLeaderboard()
      entries.push(entry)
      entries.sort((a, b) => b.score - a.score)
      const top = entries.slice(0, MAX_ENTRIES)
      const rank = top.indexOf(entry) + 1
      if (rank > 0) {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top))
      }
      return rank > 0 ? rank : -1
    } catch {
      return -1
    }
  }

  isHighScore(score: number): boolean {
    const entries = this.getLeaderboard()
    if (entries.length < MAX_ENTRIES) return score > 0
    return score > entries[MAX_ENTRIES - 1].score
  }

  clearLeaderboard(): void {
    if (!this.isAvailable()) return
    try {
      localStorage.removeItem(LEADERBOARD_KEY)
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  getLastName(): string {
    if (!this.isAvailable()) return ''
    try {
      return localStorage.getItem(NAME_KEY) || ''
    } catch {
      return ''
    }
  }

  setLastName(name: string): void {
    if (!this.isAvailable()) return
    try {
      localStorage.setItem(NAME_KEY, name)
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  /** @deprecated use setLastName */
  saveName(name: string): void {
    this.setLastName(name)
  }
}

export const storageManager = new StorageManager()
