import { GameAction } from './input'
import { themeManager } from './theme'
import { LeaderboardEntry } from './storage'
import { settingsManager, GameSettings } from './settings'

export interface GameOverStats {
  score: number
  level: number
  lines: number
}

export interface GameOverOptions {
  onNameSubmit?: (name: string) => void
  defaultName?: string
  onViewLeaderboard?: () => void
}

interface TouchBtnDef {
  label: string
  ariaLabel: string
  action: GameAction
}

const TOUCH_ROW1: TouchBtnDef[] = [
  { label: '←', ariaLabel: 'Move Left', action: GameAction.MOVE_LEFT },
  {
    label: '↺',
    ariaLabel: 'Rotate Counter-Clockwise',
    action: GameAction.ROTATE_CCW,
  },
  {
    label: '↻',
    ariaLabel: 'Rotate Clockwise',
    action: GameAction.ROTATE_CW,
  },
  { label: '→', ariaLabel: 'Move Right', action: GameAction.MOVE_RIGHT },
]

const TOUCH_ROW2: TouchBtnDef[] = [
  { label: '▼', ariaLabel: 'Soft Drop', action: GameAction.SOFT_DROP },
  { label: '⏬', ariaLabel: 'Hard Drop', action: GameAction.HARD_DROP },
  { label: 'HOLD', ariaLabel: 'Hold Piece', action: GameAction.HOLD },
]

// Actions that fire continuously while the button is held
const CONTINUOUS_TOUCH_ACTIONS = new Set<GameAction>([GameAction.SOFT_DROP])

interface TouchBtnEntry {
  el: HTMLElement
  action: GameAction
}

interface StartScreenRefs {
  screen: HTMLElement
  highScoreEl: HTMLElement
  leaderboardBtnEl: HTMLElement
  settingsBtnEl: HTMLElement
}

function buildTouchControls(): {
  container: HTMLElement
  buttons: TouchBtnEntry[]
} {
  const container = el('div', 'touch-controls')
  container.id = 'touch-controls'
  const buttons: TouchBtnEntry[] = []

  for (const row of [TOUCH_ROW1, TOUCH_ROW2]) {
    const rowEl = el('div', 'touch-row')
    for (const def of row) {
      const btn = el('button', 'touch-btn')
      btn.textContent = def.label
      btn.setAttribute('aria-label', def.ariaLabel)
      buttons.push({ el: btn, action: def.action })
      rowEl.appendChild(btn)
    }
    container.appendChild(rowEl)
  }

  return { container, buttons }
}

function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag)
  if (className) e.className = className
  return e
}

function buildStartScreen(): StartScreenRefs {
  const screen = el('div', 'overlay-screen')
  const content = el('div', 'overlay-content')

  const title = el('h1', 'game-title')
  title.textContent = 'STAKKA'

  const highScoreEl = el('p', 'high-score-display')
  highScoreEl.textContent = 'High Score: —'

  const leaderboardBtnEl = el('button', 'leaderboard-open-btn')
  leaderboardBtnEl.textContent = 'LEADERBOARD'

  const settingsBtnEl = el('button', 'settings-open-btn')
  settingsBtnEl.textContent = 'SETTINGS'

  const prompt = el('p', 'prompt')
  prompt.textContent = 'Press ENTER to Start'

  const legend = el('div', 'controls-legend')
  const controls: [string, string][] = [
    ['← →', 'Move'],
    ['↑ W', 'Rotate CW'],
    ['Z', 'Rotate CCW'],
    ['↓ S', 'Soft Drop'],
    ['Space', 'Hard Drop'],
    ['C / Shift', 'Hold'],
    ['Esc', 'Pause'],
    ['M', 'Mute'],
  ]
  for (const [key, action] of controls) {
    const row = el('div')
    const keySpan = el('span')
    keySpan.textContent = key
    const actionSpan = el('span')
    actionSpan.textContent = action
    row.appendChild(keySpan)
    row.appendChild(actionSpan)
    legend.appendChild(row)
  }

  const btnRow = el('div', 'start-btn-row')
  btnRow.appendChild(leaderboardBtnEl)
  btnRow.appendChild(settingsBtnEl)

  content.appendChild(title)
  content.appendChild(highScoreEl)
  content.appendChild(btnRow)
  content.appendChild(prompt)
  content.appendChild(legend)
  screen.appendChild(content)
  return { screen, highScoreEl, leaderboardBtnEl, settingsBtnEl }
}

function buildPauseScreen(): {
  screen: HTMLElement
  settingsBtnEl: HTMLElement
} {
  const screen = el('div', 'overlay-screen')
  const content = el('div', 'overlay-content')

  const title = el('h2', 'pause-title')
  title.textContent = 'PAUSED'

  const prompt = el('p', 'prompt')
  prompt.textContent = 'Press ESC to Resume'

  const settingsBtnEl = el('button', 'settings-open-btn')
  settingsBtnEl.textContent = 'SETTINGS'

  content.appendChild(title)
  content.appendChild(prompt)
  content.appendChild(settingsBtnEl)
  screen.appendChild(content)
  return { screen, settingsBtnEl }
}

export class UIManager {
  private overlay: HTMLElement
  private screenStart: HTMLElement
  private screenPause: HTMLElement
  private screenGameOver: HTMLElement
  private screenLeaderboard: HTMLElement
  private screenSettings: HTMLElement
  private touchControls: HTMLElement
  private touchActionQueue: GameAction[] = []
  private heldAction: GameAction | null = null
  private themeBtn: HTMLElement
  private highScoreEl: HTMLElement
  private nameInputEl: HTMLElement | null = null
  private onLeaderboardOpen?: () => void
  private onSettingsOpen?: () => void

  constructor(container: HTMLElement) {
    this.overlay = el('div', 'overlay')
    this.overlay.id = 'overlay'
    container.appendChild(this.overlay)

    this.themeBtn = el('button', 'theme-toggle')
    const isDark = themeManager.getThemeName() === 'dark'
    this.themeBtn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'
    this.themeBtn.setAttribute(
      'aria-label',
      isDark ? 'Switch to light theme' : 'Switch to dark theme'
    )
    if (typeof this.themeBtn.addEventListener === 'function') {
      this.themeBtn.addEventListener('click', () => {
        themeManager.toggle()
        const nowDark = themeManager.getThemeName() === 'dark'
        this.themeBtn.textContent = nowDark ? '\u2600\uFE0F' : '\uD83C\uDF19'
        this.themeBtn.setAttribute(
          'aria-label',
          nowDark ? 'Switch to light theme' : 'Switch to dark theme'
        )
      })
    }
    if (document.body) {
      document.body.appendChild(this.themeBtn)
    }

    const canvasEl =
      typeof container.querySelector === 'function'
        ? (container.querySelector('canvas') as HTMLCanvasElement | null)
        : null
    themeManager.onToggle = () => {
      if (!canvasEl) return
      canvasEl.style.transition = 'opacity 100ms ease'
      canvasEl.style.opacity = '0.7'
      setTimeout(() => {
        canvasEl.style.opacity = '1'
        setTimeout(() => {
          canvasEl.style.transition = ''
        }, 100)
      }, 100)
    }

    const {
      screen: startScreen,
      highScoreEl,
      leaderboardBtnEl,
      settingsBtnEl: startSettingsBtn,
    } = buildStartScreen()
    this.screenStart = startScreen
    this.highScoreEl = highScoreEl
    this.overlay.appendChild(this.screenStart)

    if (typeof leaderboardBtnEl.addEventListener === 'function') {
      leaderboardBtnEl.addEventListener('click', () => {
        this.onLeaderboardOpen?.()
      })
    }

    if (typeof startSettingsBtn.addEventListener === 'function') {
      startSettingsBtn.addEventListener('click', () => {
        this.onSettingsOpen?.()
      })
    }

    const { screen: pauseScreen, settingsBtnEl: pauseSettingsBtn } =
      buildPauseScreen()
    this.screenPause = pauseScreen
    if (typeof pauseSettingsBtn.addEventListener === 'function') {
      pauseSettingsBtn.addEventListener('click', () => {
        this.onSettingsOpen?.()
      })
    }
    this.overlay.appendChild(this.screenPause)

    this.screenGameOver = el('div', 'overlay-screen')
    this.overlay.appendChild(this.screenGameOver)

    this.screenLeaderboard = el('div', 'overlay-screen')
    this.overlay.appendChild(this.screenLeaderboard)

    this.screenSettings = el('div', 'overlay-screen')
    this.overlay.appendChild(this.screenSettings)

    this.hideAllScreens()

    const { container: tc, buttons } = buildTouchControls()
    this.touchControls = tc
    container.appendChild(this.touchControls)
    this.setupTouchButtons(buttons)
  }

  private setupTouchButtons(buttons: TouchBtnEntry[]): void {
    for (const { el: btn, action } of buttons) {
      if (typeof btn.addEventListener !== 'function') continue

      btn.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault()
          this.touchActionQueue.push(action)
          if (CONTINUOUS_TOUCH_ACTIONS.has(action)) {
            this.heldAction = action
          }
        },
        { passive: false }
      )

      const stopHold = (e: Event) => {
        e.preventDefault()
        if (this.heldAction === action) {
          this.heldAction = null
        }
      }

      btn.addEventListener('touchend', stopHold, { passive: false })
      btn.addEventListener('touchcancel', stopHold, { passive: false })
    }
  }

  showTouchControls(): void {
    this.touchControls.classList.add('visible')
  }

  hideTouchControls(): void {
    this.touchControls.classList.remove('visible')
  }

  pollTouchActions(): GameAction[] {
    const actions = this.touchActionQueue.slice()
    this.touchActionQueue = []
    if (this.heldAction !== null) {
      actions.push(this.heldAction)
    }
    return actions
  }

  private hideAllScreens(): void {
    this.screenStart.style.display = 'none'
    this.screenPause.style.display = 'none'
    this.screenGameOver.style.display = 'none'
    this.screenLeaderboard.style.display = 'none'
    this.screenSettings.style.display = 'none'
    if (this.nameInputEl) {
      if (typeof (this.nameInputEl as HTMLInputElement).blur === 'function') {
        ;(this.nameInputEl as HTMLInputElement).blur()
      }
      this.nameInputEl = null
    }
  }

  showStart(): void {
    this.hideAllScreens()
    this.screenStart.style.display = 'flex'
    this.overlay.classList.add('visible')
  }

  showPause(): void {
    this.hideAllScreens()
    this.screenPause.style.display = 'flex'
    this.overlay.classList.add('visible')
  }

  showGameOver(stats: GameOverStats, opts?: GameOverOptions): void {
    this.hideAllScreens()

    this.screenGameOver.textContent = ''
    const content = el('div', 'overlay-content')

    const title = el('h2', 'gameover-title')
    title.textContent = 'GAME OVER'

    const statsDiv = el('div', 'stats')
    const rows: [string, string][] = [
      ['SCORE', stats.score.toLocaleString()],
      ['LEVEL', String(stats.level)],
      ['LINES', String(stats.lines)],
    ]
    for (const [label, value] of rows) {
      const row = el('div', 'stat-row')
      const labelSpan = el('span', 'stat-label')
      labelSpan.textContent = label
      const valueSpan = el('span', 'stat-value')
      valueSpan.textContent = value
      row.appendChild(labelSpan)
      row.appendChild(valueSpan)
      statsDiv.appendChild(row)
    }

    content.appendChild(title)
    content.appendChild(statsDiv)

    if (opts?.onNameSubmit) {
      const nameSection = el('div', 'name-input-section')

      const label = el('p', 'name-input-label')
      label.textContent = 'NEW HIGH SCORE!'
      nameSection.appendChild(label)

      const inputEl = el('input', 'name-input') as HTMLInputElement
      inputEl.type = 'text'
      inputEl.placeholder = 'Enter your name'
      inputEl.maxLength = 12
      if (opts.defaultName) inputEl.value = opts.defaultName
      this.nameInputEl = inputEl

      if (typeof inputEl.addEventListener === 'function') {
        const submitHandler = opts.onNameSubmit
        inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.stopPropagation()
            const val = (inputEl.value || '').trim()
            submitHandler(val || 'Anonymous')
          }
        })
      }
      nameSection.appendChild(inputEl)

      const hint = el('p', 'name-input-hint')
      hint.textContent = 'Press ENTER to submit'
      nameSection.appendChild(hint)

      content.appendChild(nameSection)

      setTimeout(() => {
        if (typeof inputEl.focus === 'function') inputEl.focus()
      }, 50)
    } else {
      const prompt = el('p', 'prompt')
      prompt.textContent = 'Press R or ENTER to Restart'
      content.appendChild(prompt)

      if (opts?.onViewLeaderboard) {
        const lbLink = el('button', 'view-leaderboard-btn')
        lbLink.textContent = 'View Leaderboard'
        if (typeof lbLink.addEventListener === 'function') {
          const cb = opts.onViewLeaderboard
          lbLink.addEventListener('click', () => cb())
        }
        content.appendChild(lbLink)
      }
    }

    this.screenGameOver.appendChild(content)
    this.screenGameOver.style.display = 'flex'
    this.overlay.classList.add('visible')
  }

  showLeaderboard(
    entries: LeaderboardEntry[],
    highlightIndex?: number,
    onBack?: () => void,
    onClear?: () => void
  ): void {
    this.hideAllScreens()
    this.screenLeaderboard.textContent = ''

    const content = el('div', 'overlay-content leaderboard-content')

    const title = el('h2', 'leaderboard-title')
    title.textContent = 'LEADERBOARD'
    content.appendChild(title)

    if (entries.length === 0) {
      const empty = el('p', 'leaderboard-empty')
      empty.textContent = 'No scores yet. Play a game!'
      content.appendChild(empty)
    } else {
      const table = el('table', 'leaderboard-table')

      const thead = el('thead')
      const headerRow = el('tr')
      for (const col of ['#', 'NAME', 'SCORE', 'LVL', 'LINES', 'DATE']) {
        const th = el('th')
        th.textContent = col
        headerRow.appendChild(th)
      }
      thead.appendChild(headerRow)
      table.appendChild(thead)

      const tbody = el('tbody')
      entries.forEach((entry, i) => {
        const row = el('tr')
        const classes: string[] = []
        if (i === 0) classes.push('rank-gold')
        else if (i === 1) classes.push('rank-silver')
        else if (i === 2) classes.push('rank-bronze')
        if (i === highlightIndex) classes.push('lb-highlight')
        if (classes.length) row.className = classes.join(' ')

        const cells = [
          String(i + 1),
          entry.name,
          entry.score.toLocaleString(),
          String(entry.level),
          String(entry.lines),
          entry.date,
        ]
        for (const cellText of cells) {
          const td = el('td')
          td.textContent = cellText
          row.appendChild(td)
        }
        tbody.appendChild(row)
      })
      table.appendChild(tbody)
      content.appendChild(table)
    }

    const btnRow = el('div', 'leaderboard-btn-row')

    const clearBtn = el('button', 'lb-btn lb-btn-clear')
    clearBtn.textContent = 'Clear'
    if (onClear && typeof clearBtn.addEventListener === 'function') {
      clearBtn.addEventListener('click', () => {
        if (
          typeof window.confirm === 'function' &&
          !window.confirm('Clear all leaderboard entries?')
        )
          return
        onClear()
      })
    }

    const backBtn = el('button', 'lb-btn')
    backBtn.textContent = 'Back'
    if (onBack && typeof backBtn.addEventListener === 'function') {
      backBtn.addEventListener('click', () => onBack())
    }

    btnRow.appendChild(clearBtn)
    btnRow.appendChild(backBtn)
    content.appendChild(btnRow)

    this.screenLeaderboard.appendChild(content)
    this.screenLeaderboard.style.display = 'flex'
    this.overlay.classList.add('visible')
  }

  updateHighScore(score: number): void {
    this.highScoreEl.textContent =
      score > 0 ? `High Score: ${score.toLocaleString()}` : 'High Score: —'
  }

  setOnLeaderboardOpen(cb: () => void): void {
    this.onLeaderboardOpen = cb
  }

  setOnSettingsOpen(cb: () => void): void {
    this.onSettingsOpen = cb
  }

  showSettings(onBack?: () => void): void {
    this.hideAllScreens()
    this.screenSettings.textContent = ''

    const content = el('div', 'overlay-content settings-content')

    const title = el('h2', 'settings-title')
    title.textContent = 'SETTINGS'
    content.appendChild(title)

    // ── Handling ──
    const handlingSection = buildSettingsSection('HANDLING')
    handlingSection.appendChild(
      buildSlider('DAS', 'das', settingsManager.get('das'), 50, 300, 1, 'ms')
    )
    handlingSection.appendChild(
      buildSlider('ARR', 'arr', settingsManager.get('arr'), 0, 100, 1, 'ms')
    )
    handlingSection.appendChild(
      buildSlider('SDF', 'sdf', settingsManager.get('sdf'), 5, 40, 1, '×')
    )
    content.appendChild(handlingSection)

    // ── Audio ──
    const audioSection = buildSettingsSection('AUDIO')
    audioSection.appendChild(
      buildSlider(
        'Master Vol',
        'masterVolume',
        settingsManager.get('masterVolume'),
        0,
        100,
        1,
        '%'
      )
    )
    audioSection.appendChild(
      buildSlider(
        'SFX Vol',
        'sfxVolume',
        settingsManager.get('sfxVolume'),
        0,
        100,
        1,
        '%'
      )
    )
    audioSection.appendChild(
      buildSlider(
        'Music Vol',
        'musicVolume',
        settingsManager.get('musicVolume'),
        0,
        100,
        1,
        '%'
      )
    )
    content.appendChild(audioSection)

    // ── Display ──
    const displaySection = buildSettingsSection('DISPLAY')
    displaySection.appendChild(buildThemeSelector(settingsManager.get('theme')))
    displaySection.appendChild(
      buildToggle(
        'Ghost Piece',
        'ghostPiece',
        settingsManager.get('ghostPiece')
      )
    )
    displaySection.appendChild(
      buildToggle('Grid Lines', 'showGrid', settingsManager.get('showGrid'))
    )
    content.appendChild(displaySection)

    // ── Actions ──
    const actions = el('div', 'settings-actions')

    const resetBtn = el('button', 'settings-btn settings-btn-reset')
    resetBtn.textContent = 'Reset to Defaults'
    if (typeof resetBtn.addEventListener === 'function') {
      resetBtn.addEventListener('click', () => {
        settingsManager.reset()
        // Rebuild the settings screen with new defaults
        this.showSettings(onBack)
      })
    }

    const backBtn = el('button', 'settings-btn')
    backBtn.textContent = 'Back'
    if (typeof backBtn.addEventListener === 'function') {
      backBtn.addEventListener('click', () => {
        settingsManager.save()
        onBack?.()
      })
    }

    actions.appendChild(resetBtn)
    actions.appendChild(backBtn)
    content.appendChild(actions)

    // Wire up all input elements
    wireSettingsInputs(content)

    this.screenSettings.appendChild(content)
    this.screenSettings.style.display = 'flex'
    this.overlay.classList.add('visible')
  }

  hide(): void {
    this.overlay.classList.remove('visible')
  }
}

// ── Settings UI helpers ──

function buildSettingsSection(label: string): HTMLElement {
  const section = el('div', 'settings-section')
  const heading = el('p', 'settings-section-label')
  heading.textContent = label
  section.appendChild(heading)
  return section
}

function buildSlider(
  label: string,
  key: keyof GameSettings,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string
): HTMLElement {
  const row = el('div', 'settings-row')
  const lbl = el('label', 'settings-label')
  lbl.textContent = label

  const sliderWrap = el('div', 'slider-wrap')
  const input = el('input', 'settings-slider') as HTMLInputElement
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)
  input.dataset.settingsKey = key
  input.dataset.settingsType = 'slider'

  const valueEl = el('span', 'slider-value')
  valueEl.textContent = String(value) + unit
  input.dataset.unit = unit
  input.dataset.valueEl = ''

  if (typeof input.addEventListener === 'function') {
    input.addEventListener('input', () => {
      valueEl.textContent = input.value + unit
    })
  }

  sliderWrap.appendChild(input)
  sliderWrap.appendChild(valueEl)
  row.appendChild(lbl)
  row.appendChild(sliderWrap)
  return row
}

function buildThemeSelector(current: string): HTMLElement {
  const row = el('div', 'settings-row')
  const lbl = el('label', 'settings-label')
  lbl.textContent = 'Theme'

  const btnGroup = el('div', 'theme-btn-group')
  for (const mode of ['auto', 'dark', 'light'] as const) {
    const btn = el(
      'button',
      'theme-choice-btn' + (current === mode ? ' active' : '')
    )
    btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1)
    btn.dataset.settingsKey = 'theme'
    btn.dataset.settingsType = 'theme'
    btn.dataset.themeValue = mode
    if (typeof btn.addEventListener === 'function') {
      btn.addEventListener('click', () => {
        btnGroup.querySelectorAll('.theme-choice-btn').forEach((b) => {
          ;(b as HTMLElement).classList.remove('active')
        })
        btn.classList.add('active')
      })
    }
    btnGroup.appendChild(btn)
  }

  row.appendChild(lbl)
  row.appendChild(btnGroup)
  return row
}

function buildToggle(
  label: string,
  key: keyof GameSettings,
  value: boolean
): HTMLElement {
  const row = el('div', 'settings-row')
  const lbl = el('label', 'settings-label')
  lbl.textContent = label

  const toggleBtn = el('button', 'toggle-btn' + (value ? ' active' : ''))
  toggleBtn.textContent = value ? 'ON' : 'OFF'
  toggleBtn.dataset.settingsKey = key
  toggleBtn.dataset.settingsType = 'toggle'
  if (typeof toggleBtn.addEventListener === 'function') {
    toggleBtn.addEventListener('click', () => {
      const isActive = toggleBtn.classList.toggle('active')
      toggleBtn.textContent = isActive ? 'ON' : 'OFF'
    })
  }

  row.appendChild(lbl)
  row.appendChild(toggleBtn)
  return row
}

function wireSettingsInputs(root: HTMLElement): void {
  if (typeof root.querySelectorAll !== 'function') return

  root
    .querySelectorAll<HTMLInputElement>('[data-settings-key]')
    .forEach((el) => {
      const key = el.dataset.settingsKey as keyof GameSettings
      const type = el.dataset.settingsType

      if (type === 'slider') {
        el.addEventListener('input', () => {
          const val = parseInt(el.value, 10)
          settingsManager.set(key, val as GameSettings[typeof key])
        })
      } else if (type === 'theme') {
        el.addEventListener('click', () => {
          const val = (el as HTMLElement).dataset.themeValue as
            | 'auto'
            | 'dark'
            | 'light'
          settingsManager.set('theme', val)
        })
      } else if (type === 'toggle') {
        el.addEventListener('click', () => {
          const isActive = (el as HTMLElement).classList.contains('active')
          settingsManager.set(key, isActive as GameSettings[typeof key])
        })
      }
    })
}
