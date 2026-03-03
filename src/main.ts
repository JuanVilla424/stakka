import './style.css'
import { Game } from './game'

const app = document.getElementById('app') as HTMLDivElement

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
canvas.width = 300
canvas.height = 600
app.appendChild(canvas)

const game = new Game(canvas)
game.start()
