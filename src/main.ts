import './style.css'
import { Game, GameState } from './game'
import { UIManager } from './ui'

const app = document.getElementById('app') as HTMLDivElement

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
app.appendChild(canvas)

const ui = new UIManager(app)
const game = new Game(canvas)

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
  const state = game.getState()
  if (state === GameState.IDLE || state === GameState.GAME_OVER) {
    if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
      ui.hide()
      game.start()
    }
  } else if (state === GameState.PAUSED) {
    if (e.key === 'Escape') {
      ui.hide()
      game.resume()
    }
  }
})

ui.showStart()
