export interface Theme {
  background: string
  backgroundGradientTop: string
  board: string
  grid: string
  text: string
  textMuted: string
  border: string
  overlay: string
  accent: string
  ghostAlpha: number
}

export const DARK_THEME: Theme = {
  background: '#0a0a0a',
  backgroundGradientTop: '#0d0d14',
  board: '#111111',
  grid: '#1a1a1a',
  text: '#ffffff',
  textMuted: '#888888',
  border: '#333333',
  overlay: 'rgba(0,0,0,0.85)',
  accent: '#00f0f0',
  ghostAlpha: 0.3,
}

export const LIGHT_THEME: Theme = {
  background: '#f0f0f0',
  backgroundGradientTop: '#f5f5f5',
  board: '#ffffff',
  grid: '#e0e0e0',
  text: '#1a1a1a',
  textMuted: '#666666',
  border: '#cccccc',
  overlay: 'rgba(255,255,255,0.85)',
  accent: '#0066cc',
  ghostAlpha: 0.4,
}

export class ThemeManager {
  private current: 'dark' | 'light'
  private userOverride = false
  onToggle?: () => void

  constructor() {
    const saved =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('stakka-theme')
        : null
    if (saved === 'dark' || saved === 'light') {
      this.current = saved
      this.userOverride = true
    } else if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      this.current = 'light'
    } else {
      this.current = 'dark'
    }

    this.applyToDOM()

    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      window
        .matchMedia('(prefers-color-scheme: light)')
        .addEventListener('change', (e) => {
          if (!this.userOverride) {
            this.current = e.matches ? 'light' : 'dark'
            this.applyToDOM()
            this.onToggle?.()
          }
        })
    }
  }

  getTheme(): Theme {
    return this.current === 'light' ? LIGHT_THEME : DARK_THEME
  }

  getThemeName(): 'dark' | 'light' {
    return this.current
  }

  getMode(): 'auto' | 'dark' | 'light' {
    return this.userOverride ? this.current : 'auto'
  }

  setTheme(mode: 'auto' | 'dark' | 'light'): void {
    if (mode === 'auto') {
      this.userOverride = false
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('stakka-theme')
      }
      this.current =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
    } else {
      this.userOverride = true
      this.current = mode
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('stakka-theme', mode)
      }
    }
    this.applyToDOM()
    this.onToggle?.()
  }

  toggle(): void {
    this.current = this.current === 'dark' ? 'light' : 'dark'
    this.userOverride = true
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('stakka-theme', this.current)
    }
    this.applyToDOM()
    this.onToggle?.()
  }

  private applyToDOM(): void {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = this.current
    const t = this.getTheme()
    const root = document.documentElement.style
    root.setProperty('--bg', t.background)
    root.setProperty('--bg-top', t.backgroundGradientTop)
    root.setProperty('--board', t.board)
    root.setProperty('--grid', t.grid)
    root.setProperty('--text', t.text)
    root.setProperty('--text-muted', t.textMuted)
    root.setProperty('--border', t.border)
    root.setProperty('--overlay', t.overlay)
    root.setProperty('--accent', t.accent)
  }
}

export const themeManager = new ThemeManager()
