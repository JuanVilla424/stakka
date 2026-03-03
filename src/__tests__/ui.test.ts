import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UIManager } from '../ui'

interface MockClassList {
  classes: Set<string>
  add(c: string): void
  remove(c: string): void
  contains(c: string): boolean
}

class MockElement {
  tagName: string
  className: string = ''
  id: string = ''
  style: { [key: string]: string } = {}
  children: MockElement[] = []
  classList: MockClassList
  private _text: string = ''

  constructor(tag: string) {
    this.tagName = tag.toLowerCase()
    const classes = new Set<string>()
    this.classList = {
      classes,
      add(c: string) {
        classes.add(c)
      },
      remove(c: string) {
        classes.delete(c)
      },
      contains(c: string) {
        return classes.has(c)
      },
    }
  }

  get textContent(): string {
    return this._text
  }

  set textContent(val: string) {
    if (val === '') this.children = []
    this._text = val
  }

  appendChild(child: MockElement): MockElement {
    this.children.push(child)
    return child
  }
}

function findText(el: MockElement, text: string): boolean {
  if (el.textContent === text) return true
  return el.children.some((c) => findText(c, text))
}

vi.stubGlobal('document', {
  createElement: (tag: string) => new MockElement(tag),
})

describe('UIManager', () => {
  let container: MockElement
  let ui: UIManager

  beforeEach(() => {
    container = new MockElement('div')
    ui = new UIManager(container as unknown as HTMLElement)
  })

  it('creates overlay element appended to container', () => {
    // overlay + touch-controls
    expect(container.children).toHaveLength(2)
    expect(container.children[0].id).toBe('overlay')
    expect(container.children[1].id).toBe('touch-controls')
  })

  it('overlay has class "overlay"', () => {
    expect(container.children[0].className).toBe('overlay')
  })

  it('overlay starts without visible class', () => {
    const overlay = container.children[0]
    expect(overlay.classList.contains('visible')).toBe(false)
  })

  it('showStart() adds visible class to overlay', () => {
    ui.showStart()
    expect(container.children[0].classList.contains('visible')).toBe(true)
  })

  it('showPause() adds visible class to overlay', () => {
    ui.showPause()
    expect(container.children[0].classList.contains('visible')).toBe(true)
  })

  it('showGameOver() adds visible class to overlay', () => {
    ui.showGameOver({ score: 0, level: 1, lines: 0 })
    expect(container.children[0].classList.contains('visible')).toBe(true)
  })

  it('hide() removes visible class from overlay', () => {
    ui.showStart()
    ui.hide()
    expect(container.children[0].classList.contains('visible')).toBe(false)
  })

  it('showStart() shows start screen (display flex) and hides others', () => {
    ui.showStart()
    const overlay = container.children[0]
    expect(overlay.children[0].style['display']).toBe('flex') // start
    expect(overlay.children[1].style['display']).toBe('none') // pause
    expect(overlay.children[2].style['display']).toBe('none') // game over
  })

  it('showPause() shows pause screen and hides others', () => {
    ui.showPause()
    const overlay = container.children[0]
    expect(overlay.children[0].style['display']).toBe('none') // start
    expect(overlay.children[1].style['display']).toBe('flex') // pause
    expect(overlay.children[2].style['display']).toBe('none') // game over
  })

  it('showGameOver() shows game over screen and hides others', () => {
    ui.showGameOver({ score: 0, level: 1, lines: 0 })
    const overlay = container.children[0]
    expect(overlay.children[0].style['display']).toBe('none') // start
    expect(overlay.children[1].style['display']).toBe('none') // pause
    expect(overlay.children[2].style['display']).toBe('flex') // game over
  })

  it('showGameOver() displays GAME OVER title', () => {
    ui.showGameOver({ score: 0, level: 1, lines: 0 })
    const gameOverScreen = container.children[0].children[2]
    expect(findText(gameOverScreen, 'GAME OVER')).toBe(true)
  })

  it('showGameOver() displays level stat', () => {
    ui.showGameOver({ score: 0, level: 7, lines: 0 })
    const gameOverScreen = container.children[0].children[2]
    expect(findText(gameOverScreen, '7')).toBe(true)
  })

  it('showGameOver() displays lines stat', () => {
    ui.showGameOver({ score: 0, level: 1, lines: 42 })
    const gameOverScreen = container.children[0].children[2]
    expect(findText(gameOverScreen, '42')).toBe(true)
  })

  it('showGameOver() displays restart prompt', () => {
    ui.showGameOver({ score: 0, level: 1, lines: 0 })
    const gameOverScreen = container.children[0].children[2]
    expect(findText(gameOverScreen, 'Press R or ENTER to Restart')).toBe(true)
  })

  it('showStart() displays STAKKA title', () => {
    ui.showStart()
    const startScreen = container.children[0].children[0]
    expect(findText(startScreen, 'STAKKA')).toBe(true)
  })

  it('showPause() displays PAUSED title', () => {
    ui.showPause()
    const pauseScreen = container.children[0].children[1]
    expect(findText(pauseScreen, 'PAUSED')).toBe(true)
  })

  it('switching from showStart to showPause hides start screen', () => {
    ui.showStart()
    ui.showPause()
    const overlay = container.children[0]
    expect(overlay.children[0].style['display']).toBe('none') // start hidden
    expect(overlay.children[1].style['display']).toBe('flex') // pause visible
  })

  it('overlay has three child screens', () => {
    const overlay = container.children[0]
    expect(overlay.children).toHaveLength(3)
  })

  it('showTouchControls() adds visible class to touch-controls', () => {
    ui.showTouchControls()
    expect(container.children[1].classList.contains('visible')).toBe(true)
  })

  it('hideTouchControls() removes visible class from touch-controls', () => {
    ui.showTouchControls()
    ui.hideTouchControls()
    expect(container.children[1].classList.contains('visible')).toBe(false)
  })

  it('pollTouchActions() returns empty array initially', () => {
    expect(ui.pollTouchActions()).toEqual([])
  })
})
