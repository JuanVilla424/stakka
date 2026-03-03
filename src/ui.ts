export interface GameOverStats {
  score: number
  level: number
  lines: number
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
