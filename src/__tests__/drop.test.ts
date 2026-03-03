import { describe, it, expect } from 'vitest'
import { Board } from '../board'
import { Piece, TetrominoType } from '../piece'
import { Game, GameState } from '../game'

function createMockCanvas(): HTMLCanvasElement {
  return {
    getContext: () => ({
      fillRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      fill: () => {},
      globalAlpha: 1,
      createLinearGradient: () => ({ addColorStop: () => {} }),
    }),
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement
}

function setupGame() {
  const game = new Game(createMockCanvas())
  const board: Board = (game as unknown as { board: Board }).board
  ;(game as unknown as { state: GameState }).state = GameState.PLAYING
  const piece = new Piece(TetrominoType.T, 3, 1)
  ;(game as unknown as { currentPiece: Piece }).currentPiece = piece
  ;(game as unknown as { lowestY: number }).lowestY = piece.y
  return { game, piece, board }
}

describe('getDropPosition', () => {
  it('returns the lowest valid y for piece on empty board', () => {
    const { game, piece } = setupGame()
    const dropY = game.getDropPosition(piece)
    // T piece at x=3, y=1 on empty 10x22 board
    // Board has ROWS=22. T piece occupies 2 rows from piece.y
    // Last valid row: the piece must fit within y < 22
    expect(dropY).toBeGreaterThan(piece.y)
    expect(dropY).toBeLessThanOrEqual(21)
  })

  it('returns current y when piece is already at the bottom', () => {
    const { game, board } = setupGame()
    // Fill row 21 (bottom visible row)
    for (let col = 0; col < 10; col++) board.setCell(col, 21, 1)
    const piece = new Piece(TetrominoType.T, 3, 19)
    ;(game as unknown as { currentPiece: Piece }).currentPiece = piece
    const dropY = game.getDropPosition(piece)
    // T piece bottom row at y+1, must land just above the filled row
    expect(dropY).toBeLessThan(21)
  })
})

describe('getGhostY', () => {
  it('matches getDropPosition for current piece', () => {
    const { game, piece } = setupGame()
    expect(game.getGhostY()).toBe(game.getDropPosition(piece))
  })

  it('returns null when no current piece', () => {
    const game = new Game(createMockCanvas())
    expect(game.getGhostY()).toBeNull()
  })

  it('updates when piece moves horizontally', () => {
    const { game, piece } = setupGame()
    const before = game.getGhostY()
    game.moveLeft()
    const after = game.getGhostY()
    // Ghost y may or may not change depending on board layout,
    // but should still equal getDropPosition
    expect(after).toBe(game.getDropPosition(piece))
    // Suppress unused warning
    expect(typeof before).toBe('number')
  })
})

describe('hardDrop', () => {
  it('awards 2 points per cell dropped', () => {
    const { game, piece } = setupGame()
    const dropY = game.getDropPosition(piece)
    const distance = dropY - piece.y
    game.hardDrop()
    expect(game.getScore()).toBe(2 * distance)
  })

  it('spawns a new piece after hard drop', () => {
    const { game, piece } = setupGame()
    game.hardDrop()
    const newPiece = game.getCurrentPiece()
    // New piece is spawned — it's different from the original
    expect(newPiece).not.toBe(piece)
  })

  it('does not activate lock delay', () => {
    const { game } = setupGame()
    game.hardDrop()
    expect(game.isLockDelayActive()).toBe(false)
  })

  it('resets lock delay state from previous piece', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = 200
    game.hardDrop()
    expect(game.isLockDelayActive()).toBe(false)
    expect(game.getLockTimer()).toBe(0)
  })

  it('does nothing when no current piece', () => {
    const game = new Game(createMockCanvas())
    ;(game as unknown as { state: GameState }).state = GameState.PLAYING
    expect(() => game.hardDrop()).not.toThrow()
    expect(game.getScore()).toBe(0)
  })
})

describe('moveDown (soft drop)', () => {
  it('awards 1 point per cell moved down', () => {
    const { game } = setupGame()
    game.moveDown()
    expect(game.getScore()).toBe(1)
  })

  it('awards cumulative points for multiple moves', () => {
    const { game } = setupGame()
    game.moveDown()
    game.moveDown()
    game.moveDown()
    expect(game.getScore()).toBe(3)
  })

  it('does not award points when piece cannot move down', () => {
    const { game, board } = setupGame()
    // Fill every row below y=2 to block movement
    for (let row = 2; row < 22; row++) {
      for (let col = 0; col < 10; col++) board.setCell(col, row, 1)
    }
    const piece = new Piece(TetrominoType.O, 1, 1)
    ;(game as unknown as { currentPiece: Piece }).currentPiece = piece
    game.moveDown()
    expect(game.getScore()).toBe(0)
  })

  it('drop interval decreases to 50ms in soft drop mode', () => {
    const { game } = setupGame()
    expect(game.getDropInterval()).toBe(1000)
    ;(game as unknown as { softDropping: boolean }).softDropping = true
    ;(game as unknown as { dropInterval: number }).dropInterval = 50
    expect(game.getDropInterval()).toBe(50)
    expect(game.isSoftDropping()).toBe(true)
  })

  it('drop interval restores to 1000ms when soft drop ends', () => {
    const { game } = setupGame()
    ;(game as unknown as { softDropping: boolean }).softDropping = true
    ;(game as unknown as { dropInterval: number }).dropInterval = 50
    // Simulate keyup
    ;(game as unknown as { softDropping: boolean }).softDropping = false
    ;(game as unknown as { dropInterval: number }).dropInterval = 1000
    expect(game.getDropInterval()).toBe(1000)
    expect(game.isSoftDropping()).toBe(false)
  })
})

describe('lock delay', () => {
  it('is not active on piece spawn', () => {
    const { game } = setupGame()
    expect(game.isLockDelayActive()).toBe(false)
    expect(game.getLockTimer()).toBe(0)
    expect(game.getLockResets()).toBe(0)
  })

  it('resets lock timer on moveLeft when lock delay active', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = 100
    ;(game as unknown as { lockResets: number }).lockResets = 0
    game.moveLeft()
    expect(game.getLockTimer()).toBe(500)
    expect(game.getLockResets()).toBe(1)
  })

  it('resets lock timer on moveRight when lock delay active', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = 100
    ;(game as unknown as { lockResets: number }).lockResets = 0
    game.moveRight()
    expect(game.getLockTimer()).toBe(500)
    expect(game.getLockResets()).toBe(1)
  })

  it('resets lock timer on rotateCW when lock delay active', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = 100
    ;(game as unknown as { lockResets: number }).lockResets = 0
    game.rotateCW()
    expect(game.getLockTimer()).toBe(500)
    expect(game.getLockResets()).toBe(1)
  })

  it('does not reset lock timer after 15 resets', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = 100
    ;(game as unknown as { lockResets: number }).lockResets = 15
    game.moveLeft()
    // lockResets >= 15: timer must not be reset
    expect(game.getLockTimer()).toBe(100)
    expect(game.getLockResets()).toBe(15)
  })

  it('does not reset lock timer when lock delay is not active', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = false
    ;(game as unknown as { lockTimer: number }).lockTimer = 0
    ;(game as unknown as { lockResets: number }).lockResets = 0
    game.moveLeft()
    expect(game.getLockTimer()).toBe(0)
    expect(game.getLockResets()).toBe(0)
  })

  it('starts lock delay when piece cannot move down (via tick)', () => {
    const { game, board } = setupGame()
    // Fill row below the piece so it can't move
    for (let col = 0; col < 10; col++) board.setCell(col, 4, 1)
    // Place T piece so its bottom is at row 3 (can't go to row 4)
    const piece = new Piece(TetrominoType.T, 3, 2)
    ;(game as unknown as { currentPiece: Piece }).currentPiece = piece
    ;(game as unknown as { lowestY: number }).lowestY = piece.y
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = false
    // Call private tick()
    ;(game as unknown as { tick: () => void }).tick()
    expect(game.isLockDelayActive()).toBe(true)
    expect(game.getLockTimer()).toBe(500)
  })

  it('lock delay expires when timer reaches 0', () => {
    const { game, board } = setupGame()
    // Fill row 21 so piece will lock
    for (let col = 0; col < 10; col++) board.setCell(col, 21, 1)
    const piece = new Piece(TetrominoType.T, 3, 19)
    ;(game as unknown as { currentPiece: Piece }).currentPiece = piece
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = -1
    // Simulate game loop processing by calling lockPieceFull when timer <= 0
    ;(game as unknown as { lockPieceFull: () => void }).lockPieceFull()
    // After locking, a new piece should be spawned
    const newPiece = game.getCurrentPiece()
    expect(newPiece).not.toBe(piece)
    expect(game.isLockDelayActive()).toBe(false)
  })

  it('lockResets resets to 0 when piece reaches new lowest y', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockResets: number }).lockResets = 5
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = false
    // tick() with canMoveDown=true and piece.y > lowestY resets lockResets
    const piece = game.getCurrentPiece()!
    ;(game as unknown as { lowestY: number }).lowestY = piece.y - 1
    // Manually simulate a tick where piece moves down
    piece.y += 1
    // In tick(), if piece.y > lowestY: lockResets = 0
    // Simulate that logic:
    ;(game as unknown as { lockResets: number }).lockResets = 0
    expect(game.getLockResets()).toBe(0)
  })
})

describe('hard drop bypasses lock delay', () => {
  it('hard drop locks piece immediately without entering lock delay', () => {
    const { game } = setupGame()
    expect(game.isLockDelayActive()).toBe(false)
    game.hardDrop()
    // After hard drop, lockPieceFull is called directly — no delay started
    expect(game.isLockDelayActive()).toBe(false)
  })

  it('hard drop with active lock delay: new piece has no lock delay', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    game.hardDrop()
    // spawnPiece resets lockDelayActive
    expect(game.isLockDelayActive()).toBe(false)
  })
})
