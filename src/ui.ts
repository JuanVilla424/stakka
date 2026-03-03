import { GameAction } from './input'

export interface GameOverStats {
  score: number
  level: number
  lines: number
}

interface TouchBtnDef {
  label: string
  action: GameAction
}

const TOUCH_ROW1: TouchBtnDef[] = [
  { label: '←', action: GameAction.MOVE_LEFT },
  { label: '↺', action: GameAction.ROTATE_CCW },
  { label: '↻', action: GameAction.ROTATE_CW },
  { label: '→', action: GameAction.MOVE_RIGHT },
]

const TOUCH_ROW2: TouchBtnDef[] = [
  { label: '▼', action: GameAction.SOFT_DROP },
  { label: '⏬', action: GameAction.HARD_DROP },
  { label: 'HOLD', action: GameAction.HOLD },
]

// Actions that fire continuously while the button is held
const CONTINUOUS_TOUCH_ACTIONS = new Set<GameAction>([GameAction.SOFT_DROP])

interface TouchBtnEntry {
  el: HTMLElement
  action: GameAction
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

function buildStartScreen(): HTMLElement {
  const screen = el('div', 'overlay-screen')
  const content = el('div', 'overlay-content')

  const title = el('h1', 'game-title')
  title.textContent = 'STAKKA'

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

  content.appendChild(title)
  content.appendChild(prompt)
  content.appendChild(legend)
  screen.appendChild(content)
  return screen
}

function buildPauseScreen(): HTMLElement {
  const screen = el('div', 'overlay-screen')
  const content = el('div', 'overlay-content')

  const title = el('h2', 'pause-title')
  title.textContent = 'PAUSED'

  const prompt = el('p', 'prompt')
  prompt.textContent = 'Press ESC to Resume'

  content.appendChild(title)
  content.appendChild(prompt)
  screen.appendChild(content)
  return screen
}

export class UIManager {
  private overlay: HTMLElement
  private screenStart: HTMLElement
  private screenPause: HTMLElement
  private screenGameOver: HTMLElement
  private touchControls: HTMLElement
  private touchActionQueue: GameAction[] = []
  private heldAction: GameAction | null = null

  constructor(container: HTMLElement) {
    this.overlay = el('div', 'overlay')
    this.overlay.id = 'overlay'
    container.appendChild(this.overlay)

    this.screenStart = buildStartScreen()
    this.overlay.appendChild(this.screenStart)

    this.screenPause = buildPauseScreen()
    this.overlay.appendChild(this.screenPause)

    this.screenGameOver = el('div', 'overlay-screen')
    this.overlay.appendChild(this.screenGameOver)

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

  showGameOver(stats: GameOverStats): void {
    this.hideAllScreens()

    // Rebuild game over content with safe DOM methods
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

    const prompt = el('p', 'prompt')
    prompt.textContent = 'Press R or ENTER to Restart'

    content.appendChild(title)
    content.appendChild(statsDiv)
    content.appendChild(prompt)
    this.screenGameOver.appendChild(content)

    this.screenGameOver.style.display = 'flex'
    this.overlay.classList.add('visible')
  }

  hide(): void {
    this.overlay.classList.remove('visible')
  }
}
