import {
  TETROMINO_COLORS,
  TETROMINO_SHAPES,
  TetrominoType,
  type Piece,
} from './piece'
import type { Board } from './board'
import type { PopupManager } from './effects'
import type { AnimationManager } from './animations'
import { themeManager } from './theme'

function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private cellSize: number
  private cols = 10
  private rows = 20
  private boardOffsetX: number
  private dpr = 1
  private ghostEnabled = true
  private gridEnabled = true

  constructor(canvas: HTMLCanvasElement, cellSize = 30) {
    this.ctx = canvas.getContext('2d')!
    this.cellSize = cellSize
    this.boardOffsetX = 5 * cellSize
    this.applyCanvasDimensions()
  }

  private applyCanvasDimensions(): void {
    const canvas = this.ctx.canvas
    if (!canvas) return
    const logicalW = 2 * this.boardOffsetX + this.cols * this.cellSize
    const logicalH = this.rows * this.cellSize
    this.dpr =
      typeof window !== 'undefined'
        ? Math.max(1, window.devicePixelRatio || 1)
        : 1
    canvas.width = logicalW * this.dpr
    canvas.height = logicalH * this.dpr
    if (canvas.style) {
      canvas.style.width = logicalW + 'px'
      canvas.style.height = logicalH + 'px'
    }
  }

  resize(cellSize?: number): void {
    if (cellSize !== undefined) {
      this.cellSize = cellSize
    } else {
      const vw = window?.innerWidth || 0
      const vh = window?.innerHeight || 0
      if (!vw || !vh) return
      const raw = Math.floor(Math.min((vw * 0.8) / 20, (vh * 0.85) / this.rows))
      this.cellSize = Math.max(16, Math.min(36, raw))
    }
    this.boardOffsetX = 5 * this.cellSize
    this.applyCanvasDimensions()
  }

  getNextPeekCount(): number {
    const vw = window?.innerWidth || Infinity
    if (vw < 768) return 3
    if (vw < 1024) return 4
    return 5
  }

  getBoardCenterX(): number {
    return this.boardOffsetX + (this.cols * this.cellSize) / 2
  }

  getCellSize(): number {
    return this.cellSize
  }

  getBoardOffsetX(): number {
    return this.boardOffsetX
  }

  getCanvasWidth(): number {
    return 2 * this.boardOffsetX + this.cols * this.cellSize
  }

  getCanvasHeight(): number {
    return this.rows * this.cellSize
  }

  clear(): void {
    const w = 2 * this.boardOffsetX + this.cols * this.cellSize
    const h = this.rows * this.cellSize
    if (this.dpr !== 1) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    }
    const theme = themeManager.getTheme()
    const gradient = this.ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, theme.backgroundGradientTop)
    gradient.addColorStop(1, theme.background)
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, w, h)
  }

  drawBoard(board: Board): void {
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

  setGhostEnabled(v: boolean): void {
    this.ghostEnabled = v
  }

  setGridEnabled(v: boolean): void {
    this.gridEnabled = v
  }

  drawGhostPiece(piece: Piece, dropY: number): void {
    if (!this.ghostEnabled) return
    if (dropY === piece.y) return
    const color = TETROMINO_COLORS[piece.type]
    const cs = this.cellSize
    const theme = themeManager.getTheme()
    this.ctx.save()
    this.ctx.globalAlpha = theme.ghostAlpha
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2

    const shape = piece
      .getBlocks()
      .map((b) => ({ x: b.x, y: b.y - piece.y + dropY }))

    for (const block of shape) {
      if (block.y >= 2) {
        const cx = this.boardOffsetX + block.x * cs
        const cy = (block.y - 2) * cs
        this.ctx.beginPath()
        this.ctx.roundRect(cx + 1, cy + 1, cs - 2, cs - 2, 3)
        this.ctx.stroke()
      }
    }
    this.ctx.restore()
  }

  drawGrid(): void {
    if (!this.gridEnabled) return
    const theme = themeManager.getTheme()
    this.ctx.save()
    this.ctx.strokeStyle = theme.grid
    this.ctx.lineWidth = 0.5
    this.ctx.beginPath()
    for (let col = 0; col <= this.cols; col++) {
      const x = this.boardOffsetX + col * this.cellSize
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.rows * this.cellSize)
    }
    for (let row = 0; row <= this.rows; row++) {
      const y = row * this.cellSize
      this.ctx.moveTo(this.boardOffsetX, y)
      this.ctx.lineTo(this.boardOffsetX + this.cols * this.cellSize, y)
    }
    this.ctx.stroke()
    this.ctx.restore()
  }

  drawPanelSeparators(): void {
    const theme = themeManager.getTheme()
    this.ctx.save()
    this.ctx.strokeStyle = theme.grid
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(this.boardOffsetX, 0)
    this.ctx.lineTo(this.boardOffsetX, this.rows * this.cellSize)
    this.ctx.moveTo(this.boardOffsetX + this.cols * this.cellSize, 0)
    this.ctx.lineTo(
      this.boardOffsetX + this.cols * this.cellSize,
      this.rows * this.cellSize
    )
    this.ctx.stroke()
    this.ctx.restore()
  }

  drawBoardBorder(): void {
    const theme = themeManager.getTheme()
    this.ctx.save()
    this.ctx.strokeStyle = theme.border
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(
      this.boardOffsetX,
      0,
      this.cols * this.cellSize,
      this.rows * this.cellSize
    )
    this.ctx.restore()
  }

  drawHoldPanel(holdPiece: TetrominoType | null, canHold: boolean): void {
    const panelCenterX = this.boardOffsetX / 2
    const cs = this.cellSize
    const theme = themeManager.getTheme()

    this.ctx.save()
    this.ctx.fillStyle = theme.textMuted
    this.ctx.font = `bold ${Math.floor(cs * 0.43)}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.fillText('HOLD', panelCenterX, Math.floor(cs * 0.93))
    this.ctx.restore()

    if (holdPiece !== null) {
      this.drawPiecePreview(
        holdPiece,
        panelCenterX,
        Math.floor(cs * 3),
        canHold ? 1 : 0.4
      )
    }
  }

  drawNextQueue(nextPieces: TetrominoType[]): void {
    const boardRight = this.boardOffsetX + this.cols * this.cellSize
    const panelCenterX = boardRight + this.boardOffsetX / 2
    const cs = this.cellSize
    const theme = themeManager.getTheme()

    this.ctx.save()
    this.ctx.fillStyle = theme.textMuted
    this.ctx.font = `bold ${Math.floor(cs * 0.43)}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.fillText('NEXT', panelCenterX, Math.floor(cs * 0.93))
    this.ctx.restore()

    const startY = Math.floor(cs * 2.4)
    const spacing = Math.floor(cs * 3.3)
    for (let i = 0; i < nextPieces.length; i++) {
      this.drawPiecePreview(nextPieces[i], panelCenterX, startY + i * spacing)
    }
  }

  private drawPiecePreview(
    type: TetrominoType,
    centerX: number,
    centerY: number,
    alpha = 1
  ): void {
    const shape = TETROMINO_SHAPES[type][0]
    const ps = Math.max(12, Math.floor(this.cellSize * 0.73))

    let minR = shape.length,
      maxR = -1,
      minC = shape[0].length,
      maxC = -1
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (r < minR) minR = r
          if (r > maxR) maxR = r
          if (c < minC) minC = c
          if (c > maxC) maxC = c
        }
      }
    }

    const pieceW = (maxC - minC + 1) * ps
    const pieceH = (maxR - minR + 1) * ps
    const startX = centerX - pieceW / 2
    const startY = centerY - pieceH / 2

    this.ctx.save()
    this.ctx.globalAlpha = alpha
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          this.drawCellAt(
            startX + (c - minC) * ps,
            startY + (r - minR) * ps,
            ps,
            TETROMINO_COLORS[type]
          )
        }
      }
    }
    this.ctx.restore()
  }

  private drawCellAt(x: number, y: number, size: number, color: string): void {
    const path = new Path2D()
    path.roundRect(x + 1, y + 1, size - 2, size - 2, 2)

    const gradient = this.ctx.createLinearGradient(x, y, x, y + size)
    gradient.addColorStop(0, this.lighten(color, 0.3))
    gradient.addColorStop(1, color)

    this.ctx.fillStyle = gradient
    this.ctx.fill(path)

    this.ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    this.ctx.lineWidth = 1
    this.ctx.stroke(path)
  }

  private drawCell(col: number, row: number, color: string): void {
    this.drawCellAt(
      this.boardOffsetX + col * this.cellSize,
      row * this.cellSize,
      this.cellSize,
      color
    )
  }

  drawFrame(
    board: Board,
    piece: Piece | null,
    ghostY: number | null = null,
    lockProgress = 0,
    holdPiece: TetrominoType | null = null,
    canHold = true,
    nextPieces: TetrominoType[] = [],
    score = 0,
    level = 1,
    lines = 0,
    elapsedTime = 0,
    popupManager: PopupManager | null = null,
    animationManager: AnimationManager | null = null
  ): void {
    this.clear()

    const shake = animationManager?.getShakeOffset() ?? { x: 0, y: 0 }
    this.ctx.save()
    this.ctx.translate(shake.x, shake.y)

    this.drawHoldPanel(holdPiece, canHold)
    this.drawNextQueue(nextPieces)
    this.drawScorePanel(score, level, lines, elapsedTime)
    this.drawPanelSeparators()
    this.drawBoard(board)
    if (piece && ghostY !== null) {
      this.drawGhostPiece(piece, ghostY)
    }
    if (piece) {
      this.drawPiece(piece, lockProgress)
    }
    this.drawGrid()
    this.drawBoardBorder()
    if (animationManager) {
      animationManager.draw(this.ctx)
    }

    this.ctx.restore()

    if (popupManager) {
      popupManager.draw(this.ctx)
    }
    if (animationManager) {
      animationManager.drawParticles(this.ctx)
    }
  }

  private drawScorePanel(
    score: number,
    level: number,
    lines: number,
    elapsedTime: number
  ): void {
    const panelCenterX = this.boardOffsetX / 2
    const cs = this.cellSize
    const ctx = this.ctx

    ctx.save()
    ctx.textAlign = 'center'

    const theme = themeManager.getTheme()
    const lblSize = Math.max(9, Math.floor(cs * 0.37))
    const valSize = Math.max(12, Math.floor(cs * 0.53))

    const lbl = (text: string, y: number): void => {
      ctx.fillStyle = theme.textMuted
      ctx.font = `bold ${lblSize}px monospace`
      ctx.fillText(text, panelCenterX, Math.floor(cs * y))
    }

    const val = (text: string, y: number): void => {
      ctx.fillStyle = theme.text
      ctx.font = `bold ${valSize}px monospace`
      ctx.fillText(text, panelCenterX, Math.floor(cs * y))
    }

    lbl('SCORE', 5.67)
    val(formatNumber(score), 6.27)

    lbl('LEVEL', 7.33)
    val(String(level), 7.93)

    lbl('LINES', 9.0)
    val(String(lines), 9.6)

    lbl('TIME', 10.67)
    val(formatTime(elapsedTime), 11.27)

    ctx.restore()
  }

  private lighten(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16)
    const r = Math.min(255, Math.round(((num >> 16) & 0xff) + 255 * amount))
    const g = Math.min(255, Math.round(((num >> 8) & 0xff) + 255 * amount))
    const b = Math.min(255, Math.round((num & 0xff) + 255 * amount))
    return `rgb(${r},${g},${b})`
  }
}
