import { describe, it, expect, beforeEach } from 'vitest'
import { Board } from '../board'
import { Piece, TetrominoType } from '../piece'
import { tryRotate, detectTSpin } from '../srs'

describe('tryRotate', () => {
  let board: Board

  beforeEach(() => {
    board = new Board()
  })

  it('O-piece: rotation always returns failure without mutating piece', () => {
    const piece = new Piece(TetrominoType.O, 4, 5)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(false)
    expect(result.kickIndex).toBe(-1)
    expect(piece.rotation).toBe(0)
  })

  it.each([
    TetrominoType.I,
    TetrominoType.T,
    TetrominoType.S,
    TetrominoType.Z,
    TetrominoType.J,
    TetrominoType.L,
  ])(
    'type %i: basic CW rotation succeeds on empty board with kickIndex=0',
    (type) => {
      const piece = new Piece(type, 4, 10)
      const result = tryRotate(piece, board, 1)
      expect(result.success).toBe(true)
      expect(result.kickIndex).toBe(0)
      expect(piece.rotation).toBe(1)
    }
  )

  it.each([
    TetrominoType.I,
    TetrominoType.T,
    TetrominoType.S,
    TetrominoType.Z,
    TetrominoType.J,
    TetrominoType.L,
  ])(
    'type %i: basic CCW rotation succeeds on empty board with kickIndex=0',
    (type) => {
      const piece = new Piece(type, 4, 10)
      const result = tryRotate(piece, board, -1)
      expect(result.success).toBe(true)
      expect(result.kickIndex).toBe(0)
      expect(piece.rotation).toBe(3) // (0 - 1 + 4) % 4
    }
  )

  it('T-piece: all 4 CW rotations complete a full cycle', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    for (let i = 1; i <= 4; i++) {
      const result = tryRotate(piece, board, 1)
      expect(result.success).toBe(true)
      expect(piece.rotation).toBe(i % 4)
    }
  })

  it('T-piece: wall kick off left wall on CCW rotation', () => {
    // T at x=-1, rotation=1 occupies cols 0,1 only (valid on board).
    // CCW targets rotation=0; basic position puts col -1 OOB.
    // Kick test 1 (+1,0) shifts to x=0 which fits.
    const piece = new Piece(TetrominoType.T, -1, 5, 1)
    const result = tryRotate(piece, board, -1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(1)
    expect(piece.x).toBe(0)
    expect(piece.rotation).toBe(0)
  })

  it('rotation returns failure when all 5 kick positions collide', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    // Block a wide column strip so every kick candidate for rotation=1 collides.
    for (let y = 0; y < 22; y++) {
      for (let x = 3; x <= 7; x++) {
        board.setCell(x, y, 1)
      }
    }
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(false)
    expect(result.kickIndex).toBe(-1)
    expect(piece.rotation).toBe(0) // unchanged
  })

  it('I-piece: uses separate kick table (CW rotation)', () => {
    // I at x=6, rotation=0 (horizontal cols 6-9).
    // CW targets rotation=1: vertical strip at col x+2=8.
    // Block col 8 → test 0 fails; kick test 1 (-2,0) moves to x=4, col 6 → success.
    for (let y = 0; y < 22; y++) {
      board.setCell(8, y, 1)
    }
    const piece = new Piece(TetrominoType.I, 6, 10, 0)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(1) // I kick (-2,0)
    expect(piece.x).toBe(4) // 6 + (-2)
    expect(piece.rotation).toBe(1)
  })

  it('I-piece: CCW rotation uses separate kick table', () => {
    // I at x=4, rotation=1 → CCW targets rotation=0.
    // Basic position: horizontal row at y+1, cols 4-7 → valid on empty board.
    const piece = new Piece(TetrominoType.I, 4, 10, 1)
    const result = tryRotate(piece, board, -1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(0)
    expect(piece.rotation).toBe(0)
  })

  it('I-piece: floor kick when target column is blocked', () => {
    // I at x=3, rotation=0 (horizontal at row y+1=19).
    // CW to rotation=1: vertical strip at col x+2=5, rows 18-21.
    // Block col 5 → test 0 fails; kick (-2,0) shifts to x=1, col 3 → free.
    for (let y = 18; y <= 21; y++) {
      board.setCell(5, y, 1)
    }
    const piece = new Piece(TetrominoType.I, 3, 18, 0)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(1)
    expect(piece.x).toBe(1) // 3 + (-2)
    expect(piece.rotation).toBe(1)
  })

  it('J-piece: CW rotation through all 4 states on empty board', () => {
    const piece = new Piece(TetrominoType.J, 4, 10, 0)
    for (let i = 1; i <= 4; i++) {
      expect(tryRotate(piece, board, 1).success).toBe(true)
      expect(piece.rotation).toBe(i % 4)
    }
  })

  it('L-piece: CCW rotation through all 4 states on empty board', () => {
    const piece = new Piece(TetrominoType.L, 4, 10, 0)
    for (let i = 1; i <= 4; i++) {
      expect(tryRotate(piece, board, -1).success).toBe(true)
      expect(piece.rotation).toBe((4 - i) % 4)
    }
  })

  it('T-piece: wall kick off right wall on CW rotation', () => {
    // T at x=8, rotation=3 occupies cols 8-9 (right wall).
    // CW targets rotation=0; basic position puts col 10 OOB.
    // Kick test 1 (-1,0) shifts to x=7 which fits.
    const piece = new Piece(TetrominoType.T, 8, 5, 3)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(1)
    expect(piece.x).toBe(7)
    expect(piece.rotation).toBe(0)
  })

  it('J-piece: wall kick off left wall on CW rotation', () => {
    // J at x=-1, rotation=1 occupies cols 0-1 (valid on board).
    // CW targets rotation=2; basic position puts col -1 OOB.
    // Kick test 1 (+1,0) shifts to x=0 which fits.
    const piece = new Piece(TetrominoType.J, -1, 5, 1)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(1)
    expect(piece.x).toBe(0)
    expect(piece.rotation).toBe(2)
  })

  it('S-piece: floor kick at bottom of board', () => {
    // S at x=4, y=20, rotation=0 occupies rows 20-21 (valid).
    // CW targets rotation=1; basic position puts row 22 OOB.
    // Kick test 1 also fails (row 22). Kick test 2 (-1,-1) shifts up one row to fit.
    const piece = new Piece(TetrominoType.S, 4, 20, 0)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(2)
    expect(piece.x).toBe(3)
    expect(piece.y).toBe(19)
    expect(piece.rotation).toBe(1)
  })

  it('I-piece: floor kick when horizontal at bottom row', () => {
    // I at x=4, y=19, rotation=0 occupies row 20 (valid).
    // CW targets rotation=1: vertical at col 6, rows 19-22 — row 22 OOB.
    // Tests 0-3 all fail. Kick test 4 (+1,-2) shifts up 2 rows and right 1 to fit.
    const piece = new Piece(TetrominoType.I, 4, 19, 0)
    const result = tryRotate(piece, board, 1)
    expect(result.success).toBe(true)
    expect(result.kickIndex).toBe(4)
    expect(piece.x).toBe(5)
    expect(piece.y).toBe(17)
    expect(piece.rotation).toBe(1)
  })
})

describe('detectTSpin', () => {
  let board: Board

  beforeEach(() => {
    board = new Board()
  })

  it('returns none for non-T pieces', () => {
    const piece = new Piece(TetrominoType.I, 4, 10, 0)
    expect(detectTSpin(piece, board, true, 1)).toBe('none')
  })

  it('returns none when last move was not a rotation', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    // Fill 3 corners to ensure we would get a T-spin if rotation had been last
    board.setCell(4, 10, 1)
    board.setCell(6, 10, 1)
    board.setCell(4, 12, 1)
    expect(detectTSpin(piece, board, false, 1)).toBe('none')
  })

  it('returns none when fewer than 3 diagonal corners are occupied', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    // Only 2 corners
    board.setCell(4, 10, 1)
    board.setCell(6, 10, 1)
    expect(detectTSpin(piece, board, true, 1)).toBe('none')
  })

  it('returns mini when kickIndex is 0 (no kick used)', () => {
    // T at (4,10), rotation=0 → center (5,11), corners (4,10),(6,10),(4,12),(6,12)
    // rotation=0 front corners: top-left (4,10) and top-right (6,10)
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    board.setCell(4, 10, 1) // top-left (front)
    board.setCell(6, 10, 1) // top-right (front)
    board.setCell(4, 12, 1) // bottom-left (back)
    // 3 corners occupied, both front filled, but kickIndex=0 → mini
    expect(detectTSpin(piece, board, true, 0)).toBe('mini')
  })

  it('returns full T-spin when kick was used and both front corners filled', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    board.setCell(4, 10, 1) // top-left (front)
    board.setCell(6, 10, 1) // top-right (front)
    board.setCell(4, 12, 1) // bottom-left (back)
    // kickIndex=1, both front occupied → full
    expect(detectTSpin(piece, board, true, 1)).toBe('full')
  })

  it('returns mini when kick used but not both front corners filled', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 0)
    // rotation=0 front: top-left (4,10) and top-right (6,10)
    board.setCell(4, 10, 1) // top-left (front) — only one front corner
    board.setCell(4, 12, 1) // bottom-left (back)
    board.setCell(6, 12, 1) // bottom-right (back)
    // 3 corners, kickIndex=1, but only one front corner → mini
    expect(detectTSpin(piece, board, true, 1)).toBe('mini')
  })

  it('counts out-of-bounds cells as occupied corners', () => {
    // T at x=0, rotation=3 (stem left) → center (1, y+1)
    // Corners: (0,y), (2,y), (0,y+2), (2,y+2)
    // rotation=3 front corners: top-left (0,y) and bottom-left (0,y+2)
    const piece = new Piece(TetrominoType.T, 0, 5, 3)
    // Center = (1, 6). Corners: (0,5),(2,5),(0,7),(2,7)
    // (-1, ...) is OOB → isBlocked returns true automatically
    // We need 3 corners occupied. (0,5) = in-bounds but empty.
    board.setCell(2, 5, 1) // top-right (back)
    board.setCell(0, 5, 1) // top-left (front)
    board.setCell(0, 7, 1) // bottom-left (front)
    // 3 corners occupied, both front (top-left, bottom-left) filled, kickIndex=1 → full
    expect(detectTSpin(piece, board, true, 1)).toBe('full')
  })

  it('T-spin rotation=1 (stem right): front corners are top-right and bottom-right', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 1)
    // center (5,11), corners: (4,10),(6,10),(4,12),(6,12)
    // rotation=1 front: top-right (6,10) and bottom-right (6,12)
    board.setCell(6, 10, 1) // top-right (front)
    board.setCell(6, 12, 1) // bottom-right (front)
    board.setCell(4, 10, 1) // top-left (back)
    expect(detectTSpin(piece, board, true, 2)).toBe('full')
  })

  it('T-spin rotation=2 (stem down): front corners are bottom-left and bottom-right', () => {
    const piece = new Piece(TetrominoType.T, 4, 10, 2)
    // center (5,11), corners: (4,10),(6,10),(4,12),(6,12)
    // rotation=2 front: bottom-left (4,12) and bottom-right (6,12)
    board.setCell(4, 12, 1) // bottom-left (front)
    board.setCell(6, 12, 1) // bottom-right (front)
    board.setCell(4, 10, 1) // top-left (back)
    expect(detectTSpin(piece, board, true, 3)).toBe('full')
  })

  it('kick index 4 override: returns full even when front corners not both filled', () => {
    // kickIndex=4 (last-resort kick) + 3 corners → full T-spin regardless of front corners
    const piece = new Piece(TetrominoType.T, 4, 10, 2)
    // center (5,11), rotation=2 front: bottom-left (4,12) and bottom-right (6,12)
    board.setCell(4, 10, 1) // top-left (back)
    board.setCell(6, 10, 1) // top-right (back)
    board.setCell(4, 12, 1) // bottom-left (front) — only one front corner filled
    // Normally this would be mini (not both front), but kickIndex=4 overrides to full
    expect(detectTSpin(piece, board, true, 4)).toBe('full')
  })
})
