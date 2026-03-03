import { describe, it, expect } from 'vitest'
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
      font: '',
      textAlign: '',
      fillText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      roundRect: () => {},
    }),
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement
}

type GameInternal = {
  holdCurrentPiece: () => void
  holdPiece: TetrominoType | null
  canHold: boolean
  lockPieceFull: () => void
}

function setupGame() {
  const game = new Game(createMockCanvas())
  ;(game as unknown as { state: GameState }).state = GameState.PLAYING
  const piece = new Piece(TetrominoType.T, 3, 1)
  ;(game as unknown as { currentPiece: Piece }).currentPiece = piece
  ;(game as unknown as { lowestY: number }).lowestY = piece.y
  return { game, piece }
}

describe('hold piece', () => {
  it('starts with no held piece and canHold true', () => {
    const game = new Game(createMockCanvas())
    expect(game.getHoldPiece()).toBeNull()
    expect(game.getCanHold()).toBe(true)
  })

  it('hold with empty hold slot stores piece type and spawns next', () => {
    const { game, piece } = setupGame()
    const originalType = piece.type
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.getHoldPiece()).toBe(originalType)
    expect(game.getCurrentPiece()).not.toBe(piece)
    expect(game.getCurrentPiece()).not.toBeNull()
  })

  it('hold swaps current piece with held piece', () => {
    const { game } = setupGame()
    ;(game as unknown as GameInternal).holdPiece = TetrominoType.I
    const currentType = game.getCurrentPiece()!.type
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.getHoldPiece()).toBe(currentType)
    expect(game.getCurrentPiece()!.type).toBe(TetrominoType.I)
  })

  it('swapped-in piece has rotation 0 and spawn position', () => {
    const { game } = setupGame()
    ;(game as unknown as GameInternal).holdPiece = TetrominoType.L
    ;(game as unknown as GameInternal).holdCurrentPiece()
    const newPiece = game.getCurrentPiece()!
    expect(newPiece.type).toBe(TetrominoType.L)
    expect(newPiece.rotation).toBe(0)
    expect(newPiece.x).toBe(3)
    expect(newPiece.y).toBe(1)
  })

  it('sets canHold to false after holding', () => {
    const { game } = setupGame()
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.getCanHold()).toBe(false)
  })

  it('cannot hold twice in succession', () => {
    const { game } = setupGame()
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.getCanHold()).toBe(false)

    const holdAfterFirst = game.getHoldPiece()
    const currentAfterFirst = game.getCurrentPiece()!.type

    // Attempt a second hold — should be ignored
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.getHoldPiece()).toBe(holdAfterFirst)
    expect(game.getCurrentPiece()!.type).toBe(currentAfterFirst)
  })

  it('canHold resets to true after piece locks', () => {
    const { game } = setupGame()
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.getCanHold()).toBe(false)
    ;(game as unknown as GameInternal).lockPieceFull()
    expect(game.getCanHold()).toBe(true)
  })

  it('hold resets lock delay state on swap', () => {
    const { game } = setupGame()
    ;(game as unknown as { lockDelayActive: boolean }).lockDelayActive = true
    ;(game as unknown as { lockTimer: number }).lockTimer = 300
    ;(game as unknown as GameInternal).holdPiece = TetrominoType.S
    ;(game as unknown as GameInternal).holdCurrentPiece()
    expect(game.isLockDelayActive()).toBe(false)
    expect(game.getLockTimer()).toBe(0)
  })
})

describe('next piece preview', () => {
  it('getNextPieces returns the requested count', () => {
    const { game } = setupGame()
    const peeked = game.getNextPieces(5)
    expect(peeked).toHaveLength(5)
  })

  it('getNextPieces returns valid tetromino types', () => {
    const { game } = setupGame()
    const peeked = game.getNextPieces(5)
    for (const t of peeked) {
      expect(t).toBeGreaterThanOrEqual(TetrominoType.I)
      expect(t).toBeLessThanOrEqual(TetrominoType.L)
    }
  })

  it('first peeked piece matches the piece actually spawned next', () => {
    const { game } = setupGame()
    const peeked = game.getNextPieces(3)
    // Hard drop locks the manually placed piece and spawns the next from randomizer
    game.hardDrop()
    expect(game.getCurrentPiece()!.type).toBe(peeked[0])
  })

  it('peek does not consume pieces from the randomizer', () => {
    const { game } = setupGame()
    const first = game.getNextPieces(1)[0]
    const firstAgain = game.getNextPieces(1)[0]
    expect(firstAgain).toBe(first)
  })
})
