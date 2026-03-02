import './style.css'

const app = document.getElementById('app') as HTMLDivElement

const canvas = document.createElement('canvas')
canvas.width = 300
canvas.height = 600
canvas.id = 'game-canvas'
canvas.dataset.testid = 'game-canvas'
app.appendChild(canvas)

const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
ctx.fillStyle = '#000000'
ctx.fillRect(0, 0, canvas.width, canvas.height)
