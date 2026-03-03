import { TETROMINO_SHAPES, type Piece } from './piece'

const COLS = 10
const ROWS = 22 // 20 visible + 2 hidden rows above

export class Board {
  private grid: number[][]

  constructor() {
    this.grid = this.createEmptyGrid()
  }

  private createEmptyGrid(): number[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  }

  getCell(x: number, y: number): number {
    return this.grid[y][x]
  }

  setCell(x: number, y: number, value: number): void {
    this.grid[y][x] = value
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS
  }

  isOccupied(x: number, y: number): boolean {
    return this.grid[y][x] !== 0
  }

  checkCollision(
    piece: Piece,
    offsetX: number,
    offsetY: number,
    rotation: number
  ): boolean {
    const shape = TETROMINO_SHAPES[piece.type][rotation]
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue
        const nx = piece.x + offsetX + col
        const ny = piece.y + offsetY + row
        if (!this.isInBounds(nx, ny)) return true
        if (this.isOccupied(nx, ny)) return true
      }
    }
    return false
  }

  lockPiece(piece: Piece): void {
    // color index = type + 1 (1-7)
    const colorValue = (piece.type as number) + 1
    for (const block of piece.getBlocks()) {
      if (this.isInBounds(block.x, block.y)) {
        this.grid[block.y][block.x] = colorValue
      }
    }
  }

  captureFullRows(): { rows: number[]; colorData: number[][] } {
    const rows: number[] = []
    const colorData: number[][] = []
    for (let row = 0; row < ROWS; row++) {
      if (this.grid[row].every((cell) => cell !== 0)) {
        rows.push(row)
        colorData.push([...this.grid[row]])
      }
    }
    return { rows, colorData }
  }

  clearLines(): number[] {
    const clearedRows: number[] = []
    for (let row = 0; row < ROWS; row++) {
      if (this.grid[row].every((cell) => cell !== 0)) {
        clearedRows.push(row)
      }
    }
    for (const row of clearedRows) {
      this.grid.splice(row, 1)
      this.grid.unshift(Array(COLS).fill(0))
    }
    return clearedRows
  }

  reset(): void {
    this.grid = this.createEmptyGrid()
  }
}
