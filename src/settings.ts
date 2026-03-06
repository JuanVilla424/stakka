export type Theme = 'auto' | 'dark' | 'light'

export interface GameSettings {
  das: number
  arr: number
  sdf: number
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  theme: Theme
  ghostPiece: boolean
  showGrid: boolean
}

const DEFAULTS: GameSettings = {
  das: 167,
  arr: 33,
  sdf: 20,
  masterVolume: 80,
  sfxVolume: 100,
  musicVolume: 50,
  theme: 'auto',
  ghostPiece: true,
  showGrid: true,
}

const STORAGE_KEY = 'stakka_settings'
const SAVE_DEBOUNCE_MS = 500

type ChangeCallback<K extends keyof GameSettings> = (
  value: GameSettings[K]
) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ListenerMap = Partial<Record<keyof GameSettings, ChangeCallback<any>[]>>

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export class SettingsManager {
  private settings: GameSettings
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: ListenerMap = {}

  constructor() {
    this.settings = { ...DEFAULTS }
    this.load()
  }

  get<K extends keyof GameSettings>(key: K): GameSettings[K] {
    return this.settings[key]
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    const validated = this.validate(key, value)
    ;(this.settings as unknown as Record<string, unknown>)[key] = validated
    this.notifyListeners(key, validated as GameSettings[K])
    this.scheduleSave()
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch {
      // localStorage unavailable or quota exceeded — silently ignore
    }
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<GameSettings>
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
      for (const key of Object.keys(DEFAULTS) as (keyof GameSettings)[]) {
        if (key in parsed) {
          const value = parsed[key]
          if (value !== undefined) {
            ;(this.settings as unknown as Record<string, unknown>)[key] =
              this.validate(key, value as GameSettings[typeof key])
          }
        }
      }
    } catch {
      // Missing or corrupt localStorage — keep defaults
    }
  }

  reset(): void {
    this.settings = { ...DEFAULTS }
    for (const key of Object.keys(DEFAULTS) as (keyof GameSettings)[]) {
      this.notifyListeners(key, this.settings[key])
    }
    this.save()
  }

  onChange<K extends keyof GameSettings>(key: K, cb: ChangeCallback<K>): void {
    if (!this.listeners[key]) {
      this.listeners[key] = []
    }
    this.listeners[key]!.push(cb as ChangeCallback<keyof GameSettings>)
  }

  private validate<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ): GameSettings[K] {
    switch (key) {
      case 'das':
        return clampInt(value as number, 50, 300) as GameSettings[K]
      case 'arr':
        return clampInt(value as number, 0, 100) as GameSettings[K]
      case 'sdf':
        return clampInt(value as number, 5, 9999) as GameSettings[K]
      case 'masterVolume':
      case 'sfxVolume':
      case 'musicVolume':
        return clampInt(value as number, 0, 100) as GameSettings[K]
      case 'theme': {
        const t = value as string
        return (
          ['auto', 'dark', 'light'].includes(t) ? t : 'auto'
        ) as GameSettings[K]
      }
      case 'ghostPiece':
      case 'showGrid':
        return Boolean(value) as GameSettings[K]
      default:
        return value
    }
  }

  private notifyListeners<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ): void {
    const cbs = this.listeners[key]
    if (cbs) {
      for (const cb of cbs) {
        cb(value)
      }
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.save()
    }, SAVE_DEBOUNCE_MS)
  }
}

export const settingsManager = new SettingsManager()
