import './style.css'
import { Game, GameState } from './game'
import { UIManager } from './ui'
import { isTouchDevice } from './touch'
import { audio, SoundEffect } from './audio'
import { LayoutManager } from './layout'

const app = document.getElementById('app') as HTMLDivElement

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
app.appendChild(canvas)

const ui = new UIManager(app)
const game = new Game(canvas)
const layoutManager = new LayoutManager()

// Wire UI touch buttons into the game loop
game.setActionProvider(() => ui.pollTouchActions())

game.setOnStateChange((state) => {
  if (state === GameState.PAUSED) {
    ui.showPause()
  } else if (state === GameState.GAME_OVER) {
    ui.showGameOver({
      score: game.getScore(),
      level: game.getLevel(),
      lines: game.getLines(),
    })
  }
})

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'm' || e.key === 'M') {
    audio.toggleMute()
    return
  }
  const state = game.getState()
  if (state === GameState.IDLE || state === GameState.GAME_OVER) {
    if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
      audio.play(SoundEffect.MenuSelect)
      ui.hide()
      game.start()
    }
  } else if (state === GameState.PAUSED) {
    if (e.key === 'Escape') {
      audio.play(SoundEffect.MenuSelect)
      ui.hide()
      game.resume()
    }
  }
})

// Tap overlay screens to start/resume on touch devices
app.addEventListener(
  'touchstart',
  (e: TouchEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.overlay-screen')) return
    e.preventDefault()
    const state = game.getState()
    if (state === GameState.IDLE || state === GameState.GAME_OVER) {
      ui.hide()
      game.start()
    } else if (state === GameState.PAUSED) {
      ui.hide()
      game.resume()
    }
  },
  { passive: false }
)

function applyLayout(): void {
  game.resize(layoutManager.cellSize)
  document.body.dataset.breakpoint = layoutManager.breakpoint
  if (isTouchDevice()) {
    if (layoutManager.breakpoint === 'desktop') {
      ui.hideTouchControls()
    } else {
      ui.showTouchControls()
    }
  }
}

layoutManager.calculateLayout(window.innerWidth, window.innerHeight)
layoutManager.attach(() => applyLayout())
applyLayout()

ui.showStart()
