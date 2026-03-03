import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeManager, DARK_THEME, LIGHT_THEME } from '../theme'

// ─── Global mock setup ───────────────────────────────────────────────────────

const mockSetProperty = vi.fn()
const mockDataset: Record<string, string> = {}

vi.stubGlobal('document', {
  documentElement: {
    dataset: mockDataset,
    style: { setProperty: mockSetProperty },
  },
})

const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

const mediaQueryResult: {
  matches: boolean
  addEventListener: ReturnType<typeof vi.fn>
} = {
  matches: false,
  addEventListener: vi.fn(),
}
vi.stubGlobal('window', {
  matchMedia: vi.fn().mockReturnValue(mediaQueryResult),
})

// ─── Reset before each test ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
  mediaQueryResult.matches = false
  mediaQueryResult.addEventListener = vi.fn()
  Object.keys(mockDataset).forEach((k) => delete mockDataset[k])
})

// ─── Initial theme selection ─────────────────────────────────────────────────

describe('ThemeManager — initial theme selection', () => {
  it('defaults to dark when no localStorage and no light preference', () => {
    const mgr = new ThemeManager()
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('selects light when prefers-color-scheme is light and no localStorage', () => {
    mediaQueryResult.matches = true
    const mgr = new ThemeManager()
    expect(mgr.getThemeName()).toBe('light')
  })

  it('reads stored dark preference from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    mediaQueryResult.matches = true // OS says light, but stored pref wins
    const mgr = new ThemeManager()
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('reads stored light preference from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('light')
    const mgr = new ThemeManager()
    expect(mgr.getThemeName()).toBe('light')
  })

  it('ignores invalid localStorage value and defaults to dark', () => {
    localStorageMock.getItem.mockReturnValue('invalid-value')
    const mgr = new ThemeManager()
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('constructor reads localStorage with key stakka-theme', () => {
    new ThemeManager()
    expect(localStorageMock.getItem).toHaveBeenCalledWith('stakka-theme')
  })
})

// ─── toggle() ────────────────────────────────────────────────────────────────

describe('ThemeManager — toggle()', () => {
  it('switches from dark to light', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    expect(mgr.getThemeName()).toBe('light')
  })

  it('switches from light back to dark', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    mgr.toggle()
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('saves light preference to localStorage after first toggle', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'stakka-theme',
      'light'
    )
  })

  it('saves dark preference to localStorage after second toggle', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    mgr.toggle()
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      'stakka-theme',
      'dark'
    )
  })

  it('invokes onToggle callback', () => {
    const mgr = new ThemeManager()
    const cb = vi.fn()
    mgr.onToggle = cb
    mgr.toggle()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not invoke onToggle if not set', () => {
    const mgr = new ThemeManager()
    expect(() => mgr.toggle()).not.toThrow()
  })
})

// ─── getTheme() ──────────────────────────────────────────────────────────────

describe('ThemeManager — getTheme()', () => {
  it('returns DARK_THEME when current is dark', () => {
    const mgr = new ThemeManager()
    expect(mgr.getTheme()).toEqual(DARK_THEME)
  })

  it('returns LIGHT_THEME when current is light', () => {
    mediaQueryResult.matches = true
    const mgr = new ThemeManager()
    expect(mgr.getTheme()).toEqual(LIGHT_THEME)
  })

  it('updates after toggle to light', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    expect(mgr.getTheme()).toEqual(LIGHT_THEME)
  })

  it('updates after two toggles back to dark', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    mgr.toggle()
    expect(mgr.getTheme()).toEqual(DARK_THEME)
  })
})

// ─── getThemeName() ──────────────────────────────────────────────────────────

describe('ThemeManager — getThemeName()', () => {
  it('returns "dark" initially', () => {
    const mgr = new ThemeManager()
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('returns "light" after toggle', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    expect(mgr.getThemeName()).toBe('light')
  })

  it('returns "dark" after two toggles', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    mgr.toggle()
    expect(mgr.getThemeName()).toBe('dark')
  })
})

// ─── applyToDOM() ─────────────────────────────────────────────────────────────

describe('ThemeManager — applyToDOM()', () => {
  it('sets data-theme to dark on construction', () => {
    new ThemeManager()
    expect(mockDataset['theme']).toBe('dark')
  })

  it('sets data-theme to light when OS prefers light', () => {
    mediaQueryResult.matches = true
    new ThemeManager()
    expect(mockDataset['theme']).toBe('light')
  })

  it('sets data-theme to light after toggle', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    expect(mockDataset['theme']).toBe('light')
  })

  it('sets data-theme back to dark after two toggles', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    mgr.toggle()
    expect(mockDataset['theme']).toBe('dark')
  })

  it('sets CSS property --bg to dark background on construction', () => {
    new ThemeManager()
    expect(mockSetProperty).toHaveBeenCalledWith('--bg', DARK_THEME.background)
  })

  it('sets CSS property --text on construction', () => {
    new ThemeManager()
    expect(mockSetProperty).toHaveBeenCalledWith('--text', DARK_THEME.text)
  })

  it('sets CSS property --accent on construction', () => {
    new ThemeManager()
    expect(mockSetProperty).toHaveBeenCalledWith('--accent', DARK_THEME.accent)
  })

  it('sets CSS property --bg to light background after toggle', () => {
    const mgr = new ThemeManager()
    mgr.toggle()
    expect(mockSetProperty).toHaveBeenCalledWith('--bg', LIGHT_THEME.background)
  })
})

// ─── DARK_THEME constant values ───────────────────────────────────────────────

describe('DARK_THEME values', () => {
  it('has correct background color', () => {
    expect(DARK_THEME.background).toBe('#0a0a0a')
  })

  it('has correct board color', () => {
    expect(DARK_THEME.board).toBe('#111111')
  })

  it('has correct grid color', () => {
    expect(DARK_THEME.grid).toBe('#1a1a1a')
  })

  it('has correct text color', () => {
    expect(DARK_THEME.text).toBe('#ffffff')
  })

  it('has correct textMuted color', () => {
    expect(DARK_THEME.textMuted).toBe('#888888')
  })

  it('has correct border color', () => {
    expect(DARK_THEME.border).toBe('#333333')
  })

  it('has correct accent color (cyan)', () => {
    expect(DARK_THEME.accent).toBe('#00f0f0')
  })

  it('has all required Theme fields defined', () => {
    const fields = [
      'background',
      'backgroundGradientTop',
      'board',
      'grid',
      'text',
      'textMuted',
      'border',
      'overlay',
      'accent',
      'ghostAlpha',
    ] as const
    for (const field of fields) {
      expect(DARK_THEME[field]).toBeDefined()
    }
  })
})

// ─── LIGHT_THEME constant values ──────────────────────────────────────────────

describe('LIGHT_THEME values', () => {
  it('has correct background color', () => {
    expect(LIGHT_THEME.background).toBe('#f0f0f0')
  })

  it('has correct board color', () => {
    expect(LIGHT_THEME.board).toBe('#ffffff')
  })

  it('has correct grid color', () => {
    expect(LIGHT_THEME.grid).toBe('#e0e0e0')
  })

  it('has correct text color', () => {
    expect(LIGHT_THEME.text).toBe('#1a1a1a')
  })

  it('has correct textMuted color', () => {
    expect(LIGHT_THEME.textMuted).toBe('#666666')
  })

  it('has correct border color', () => {
    expect(LIGHT_THEME.border).toBe('#cccccc')
  })

  it('has correct accent color (blue)', () => {
    expect(LIGHT_THEME.accent).toBe('#0066cc')
  })

  it('has all required Theme fields defined', () => {
    const fields = [
      'background',
      'backgroundGradientTop',
      'board',
      'grid',
      'text',
      'textMuted',
      'border',
      'overlay',
      'accent',
      'ghostAlpha',
    ] as const
    for (const field of fields) {
      expect(LIGHT_THEME[field]).toBeDefined()
    }
  })
})

// ─── OS preference change listener ───────────────────────────────────────────

describe('ThemeManager — OS preference change listener', () => {
  it('registers a change event listener on the media query', () => {
    new ThemeManager()
    expect(mediaQueryResult.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
  })

  it('updates theme to light when OS switches to light (no user override)', () => {
    const mgr = new ThemeManager() // dark, no userOverride
    const handler = (
      mediaQueryResult.addEventListener as ReturnType<typeof vi.fn>
    ).mock.calls[0][1] as (e: { matches: boolean }) => void
    handler({ matches: true })
    expect(mgr.getThemeName()).toBe('light')
  })

  it('updates theme to dark when OS switches to dark (no user override)', () => {
    mediaQueryResult.matches = true
    const mgr = new ThemeManager() // light, no userOverride
    const handler = (
      mediaQueryResult.addEventListener as ReturnType<typeof vi.fn>
    ).mock.calls[0][1] as (e: { matches: boolean }) => void
    handler({ matches: false })
    expect(mgr.getThemeName()).toBe('dark')
  })

  it('ignores OS preference change after user has manually toggled', () => {
    const mgr = new ThemeManager()
    const handler = (
      mediaQueryResult.addEventListener as ReturnType<typeof vi.fn>
    ).mock.calls[0][1] as (e: { matches: boolean }) => void
    mgr.toggle() // user override active, theme is now light
    handler({ matches: false }) // OS says dark — should be ignored
    expect(mgr.getThemeName()).toBe('light')
  })

  it('invokes onToggle callback when OS preference changes', () => {
    const mgr = new ThemeManager()
    const cb = vi.fn()
    mgr.onToggle = cb
    const handler = (
      mediaQueryResult.addEventListener as ReturnType<typeof vi.fn>
    ).mock.calls[0][1] as (e: { matches: boolean }) => void
    handler({ matches: true })
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
