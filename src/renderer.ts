import { TETROMINO_COLORS, TetrominoType, type Piece } from './piece'
import type { Board } from './board'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private cellSize: number
  private cols = 10
  private rows = 20

  constructor(canvas: HTMLCanvasElement, cellSize = 30) {
    this.ctx = canvas.getContext('2d')!
    this.cellSize = cellSize
    canvas.width = this.cols * cellSize
    canvas.height = this.rows * cellSize
  }

  clear(): void {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(
      0,
      0,
      this.cols * this.cellSize,
      this.rows * this.cellSize
    )
  }

  drawBoard(board: Board): void {
    // Iterate visible rows: grid rows 2-21 map to canvas rows 0-19
    for (let gridRow = 2; gridRow < 22; gridRow++) {
      const canvasRow = gridRow - 2
      for (let col = 0; col < this.cols; col++) {
        const colorIndex = board.getCell(col, gridRow)
        if (colorIndex !== 0) {
          this.drawCell(
            col,
            canvasRow,
            TETROMINO_COLORS[(colorIndex - 1) as TetrominoType]
          )
        }
      }
    }
  }

  drawPiece(piece: Piece, lockProgress = 0): void {
    const color =
      lockProgress > 0
        ? this.lighten(TETROMINO_COLORS[piece.type], 0.25 * lockProgress)
        : TETROMINO_COLORS[piece.type]
    for (const block of piece.getBlocks()) {
      if (block.y >= 2) {
        this.drawCell(block.x, block.y - 2, color)
      }
    }
  }

  drawGhostPiece(piece: Piece, dropY: number): void {
    if (dropY === piece.y) return
    const color = TETROMINO_COLORS[piece.type]
    const cs = this.cellSize
    this.ctx.save()
    this.ctx.globalAlpha = 0.3
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2

    const shape = piece
      .getBlocks()
      .map((b) => ({ x: b.x, y: b.y - piece.y + dropY }))

    for (const block of shape) {
      if (block.y >= 2) {
        const cx = block.x * cs
        const cy = (block.y - 2) * cs
        this.ctx.beginPath()
        this.ctx.roundRect(cx + 1, cy + 1, cs - 2, cs - 2, 3)
        this.ctx.stroke()
      }
    }
    this.ctx.restore()
  }

  drawGrid(): void {
    this.ctx.save()
    this.ctx.strokeStyle = '#1a1a1a'
    this.ctx.lineWidth = 0.5
    this.ctx.beginPath()
    for (let col = 0; col <= this.cols; col++) {
      const x = col * this.cellSize
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.rows * this.cellSize)
    }
    for (let row = 0; row <= this.rows; row++) {
      const y = row * this.cellSize
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.cols * this.cellSize, y)
    }
    this.ctx.stroke()
    this.ctx.restore()
  }

  private drawCell(col: number, row: number, color: string): void {
    this.ctx.save()
    const x = col * this.cellSize
    const y = row * this.cellSize
    const size = this.cellSize

    const path = new Path2D()
    path.roundRect(x + 1, y + 1, size - 2, size - 2, 3)

    const gradient = this.ctx.createLinearGradient(x, y, x, y + size)
    gradient.addColorStop(0, this.lighten(color, 0.3))
    gradient.addColorStop(1, color)

    this.ctx.fillStyle = gradient
    this.ctx.fill(path)

    this.ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    this.ctx.lineWidth = 1
    this.ctx.stroke(path)

    this.ctx.restore()
  }

  drawFrame(
    board: Board,
    piece: Piece | null,
    ghostY: number | null = null,
    lockProgress = 0
  ): void {
    this.clear()
    this.drawBoard(board)
    if (piece && ghostY !== null) {
      this.drawGhostPiece(piece, ghostY)
    }
    if (piece) {
      this.drawPiece(piece, lockProgress)
    }
    this.drawGrid()
  }

  private lighten(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16)
    const r = Math.min(255, Math.round(((num >> 16) & 0xff) + 255 * amount))
    const g = Math.min(255, Math.round(((num >> 8) & 0xff) + 255 * amount))
    const b = Math.min(255, Math.round((num & 0xff) + 255 * amount))
    return `rgb(${r},${g},${b})`
  }
}
