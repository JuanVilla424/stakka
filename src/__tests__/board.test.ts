import { describe, it, expect, beforeEach } from 'vitest'
import { Board } from '../board'
import { Piece, TetrominoType } from '../piece'

describe('Board', () => {
  let board: Board

  beforeEach(() => {
    board = new Board()
  })

  it('initializes with all cells empty', () => {
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 10; x++) {
        expect(board.getCell(x, y)).toBe(0)
      }
    }
  })

  it('setCell and getCell round-trip', () => {
    board.setCell(3, 5, 2)
    expect(board.getCell(3, 5)).toBe(2)
  })

  it('isInBounds returns true for corners', () => {
    expect(board.isInBounds(0, 0)).toBe(true)
    expect(board.isInBounds(9, 21)).toBe(true)
    expect(board.isInBounds(9, 0)).toBe(true)
    expect(board.isInBounds(0, 21)).toBe(true)
  })

  it('isInBounds returns false outside grid', () => {
    expect(board.isInBounds(-1, 0)).toBe(false)
    expect(board.isInBounds(10, 0)).toBe(false)
    expect(board.isInBounds(0, -1)).toBe(false)
    expect(board.isInBounds(0, 22)).toBe(false)
  })

  it('isOccupied returns false for empty cells', () => {
    expect(board.isOccupied(0, 0)).toBe(false)
  })

  it('isOccupied returns true after setCell', () => {
    board.setCell(1, 1, 3)
    expect(board.isOccupied(1, 1)).toBe(true)
  })

  describe('checkCollision', () => {
    it('detects collision with left wall', () => {
      const p = new Piece(TetrominoType.T, -1, 5, 0)
      expect(board.checkCollision(p, 0, 0, 0)).toBe(true)
    })

    it('detects collision with right wall', () => {
      const p = new Piece(TetrominoType.T, 9, 5, 0)
      expect(board.checkCollision(p, 0, 0, 0)).toBe(true)
    })

    it('detects collision with floor', () => {
      // O-piece occupies rows 0 and 1 of its matrix; at y=21 the second row hits y=22 (out of bounds)
      const p = new Piece(TetrominoType.O, 3, 21, 0)
      expect(board.checkCollision(p, 0, 0, 0)).toBe(true)
    })

    it('detects collision with locked pieces', () => {
      board.setCell(4, 10, 1)
      const p = new Piece(TetrominoType.T, 3, 9, 0)
      // T rotation 0: blocks at (4,9), (3,10), (4,10), (5,10) — offset 0,0
      expect(board.checkCollision(p, 0, 0, 0)).toBe(true)
    })

    it('no collision in free space', () => {
      const p = new Piece(TetrominoType.T, 3, 5, 0)
      expect(board.checkCollision(p, 0, 0, 0)).toBe(false)
    })
  })

  describe('lockPiece', () => {
    it('writes piece blocks to grid with correct color index', () => {
      const p = new Piece(TetrominoType.T, 3, 5, 0)
      board.lockPiece(p)
      const blocks = p.getBlocks()
      for (const b of blocks) {
        expect(board.getCell(b.x, b.y)).toBe(TetrominoType.T + 1)
      }
    })

    it('does not write to other cells', () => {
      const p = new Piece(TetrominoType.I, 0, 0, 0)
      board.lockPiece(p)
      let occupiedCount = 0
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 10; x++) {
          if (board.getCell(x, y) !== 0) occupiedCount++
        }
      }
      expect(occupiedCount).toBe(4)
    })
  })

  describe('clearLines', () => {
    it('returns empty array when no lines are full', () => {
      expect(board.clearLines()).toEqual([])
    })

    it('clears a single full row and returns its index', () => {
      const ROW = 21
      for (let x = 0; x < 10; x++) board.setCell(x, ROW, 1)
      const cleared = board.clearLines()
      expect(cleared).toContain(ROW)
      expect(board.getCell(0, ROW)).toBe(0)
    })

    it('shifts rows above down after clearing', () => {
      const ROW = 20
      // fill row 20 completely
      for (let x = 0; x < 10; x++) board.setCell(x, ROW, 1)
      // place a marker one row above
      board.setCell(0, ROW - 1, 7)
      board.clearLines()
      // the marker row should have shifted down by 1
      expect(board.getCell(0, ROW)).toBe(7)
    })

    it('clears multiple full rows', () => {
      for (let x = 0; x < 10; x++) {
        board.setCell(x, 20, 1)
        board.setCell(x, 21, 2)
      }
      const cleared = board.clearLines()
      expect(cleared).toHaveLength(2)
    })
  })

  describe('reset', () => {
    it('clears the entire grid', () => {
      for (let x = 0; x < 10; x++) board.setCell(x, 21, 1)
      board.reset()
      for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 10; x++) {
          expect(board.getCell(x, y)).toBe(0)
        }
      }
    })
  })

  describe('getRowColors', () => {
    it('returns all zeros for an empty row', () => {
      const colors = board.getRowColors(10)
      expect(colors).toHaveLength(10)
      expect(colors.every((c) => c === 0)).toBe(true)
    })

    it('returns correct color values after setCell', () => {
      board.setCell(0, 5, 3)
      board.setCell(9, 5, 7)
      const colors = board.getRowColors(5)
      expect(colors[0]).toBe(3)
      expect(colors[9]).toBe(7)
      expect(colors[1]).toBe(0)
    })

    it('returns a copy, not a reference', () => {
      board.setCell(0, 5, 1)
      const colors = board.getRowColors(5)
      colors[0] = 99
      expect(board.getCell(0, 5)).toBe(1)
    })
  })

  describe('getFullRows', () => {
    it('returns empty array when board is empty', () => {
      expect(board.getFullRows()).toEqual([])
    })

    it('returns row index when a row is fully filled', () => {
      for (let x = 0; x < 10; x++) board.setCell(x, 21, 1)
      expect(board.getFullRows()).toContain(21)
    })

    it('does not return partially filled row', () => {
      for (let x = 0; x < 9; x++) board.setCell(x, 20, 1)
      expect(board.getFullRows()).not.toContain(20)
    })

    it('returns multiple full rows', () => {
      for (let x = 0; x < 10; x++) {
        board.setCell(x, 20, 2)
        board.setCell(x, 21, 3)
      }
      const full = board.getFullRows()
      expect(full).toContain(20)
      expect(full).toContain(21)
      expect(full).toHaveLength(2)
    })
  })

  describe('captureFullRows', () => {
    it('returns empty rows and colorData when board is empty', () => {
      const result = board.captureFullRows()
      expect(result.rows).toEqual([])
      expect(result.colorData).toEqual([])
    })

    it('captures row indices and color data for full rows', () => {
      for (let x = 0; x < 10; x++) board.setCell(x, 21, x + 1 > 7 ? 1 : x + 1)
      const result = board.captureFullRows()
      expect(result.rows).toContain(21)
      expect(result.colorData).toHaveLength(1)
      expect(result.colorData[0]).toHaveLength(10)
    })

    it('does not modify the board', () => {
      for (let x = 0; x < 10; x++) board.setCell(x, 21, 1)
      board.captureFullRows()
      expect(board.getCell(0, 21)).toBe(1)
    })

    it('captures multiple rows with correct color data', () => {
      for (let x = 0; x < 10; x++) {
        board.setCell(x, 19, 2)
        board.setCell(x, 20, 3)
        board.setCell(x, 21, 4)
      }
      const result = board.captureFullRows()
      expect(result.rows).toHaveLength(3)
      expect(result.colorData[0][0]).toBe(2)
      expect(result.colorData[1][0]).toBe(3)
      expect(result.colorData[2][0]).toBe(4)
    })
  })
})
