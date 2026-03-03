import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Game, GameState } from '../game'
import { Piece, TetrominoType } from '../piece'

vi.stubGlobal('requestAnimationFrame', () => 0)
vi.stubGlobal('cancelAnimationFrame', () => {})
vi.stubGlobal('document', {
  addEventListener: () => {},
  removeEventListener: () => {},
})

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
  board: { setCell(x: number, y: number, v: number): void }
  scoreManager: {
    processLineClear(n: number, t: string): void
    addHardDrop(n: number): void
  }
  spawnPiece(): void
  lockPieceFull(): void
  state: GameState
  currentPiece: Piece | null
}

function fillBoard(game: Game): void {
  const internal = game as unknown as GameInternal
  for (let y = 0; y < 22; y++) {
    for (let x = 0; x < 10; x++) {
      internal.board.setCell(x, y, 1)
    }
  }
}

describe('game state transitions', () => {
  let game: Game

  beforeEach(() => {
    game = new Game(createMockCanvas())
  })

  it('initial state is IDLE', () => {
    expect(game.getState()).toBe(GameState.IDLE)
  })

  it('start() transitions IDLE → PLAYING', () => {
    game.start()
    expect(game.getState()).toBe(GameState.PLAYING)
  })

  it('pause() transitions PLAYING → PAUSED', () => {
    game.start()
    game.pause()
    expect(game.getState()).toBe(GameState.PAUSED)
  })

  it('pause() is ignored when not PLAYING', () => {
    game.pause()
    expect(game.getState()).toBe(GameState.IDLE)
  })

  it('resume() transitions PAUSED → PLAYING', () => {
    game.start()
    game.pause()
    game.resume()
    expect(game.getState()).toBe(GameState.PLAYING)
  })

  it('resume() is ignored when not PAUSED', () => {
    game.start()
    game.resume()
    expect(game.getState()).toBe(GameState.PLAYING)
  })

  it('reset() returns to IDLE from PLAYING', () => {
    game.start()
    game.reset()
    expect(game.getState()).toBe(GameState.IDLE)
  })

  it('reset() returns to IDLE from PAUSED', () => {
    game.start()
    game.pause()
    game.reset()
    expect(game.getState()).toBe(GameState.IDLE)
  })
})

describe('game over detection', () => {
  let game: Game

  beforeEach(() => {
    game = new Game(createMockCanvas())
    ;(game as unknown as { state: GameState }).state = GameState.PLAYING
  })

  it('game over triggers when piece spawns into filled board', () => {
    fillBoard(game)
    ;(game as unknown as GameInternal).spawnPiece()
    expect(game.getState()).toBe(GameState.GAME_OVER)
  })

  it('currentPiece is null after game over', () => {
    fillBoard(game)
    ;(game as unknown as GameInternal).spawnPiece()
    expect(game.getCurrentPiece()).toBeNull()
  })

  it('game over fires onStateChange callback with GAME_OVER', () => {
    const cb = vi.fn()
    game.setOnStateChange(cb)
    fillBoard(game)
    ;(game as unknown as GameInternal).spawnPiece()
    expect(cb).toHaveBeenCalledWith(GameState.GAME_OVER)
  })

  it('normal spawn does not trigger game over on empty board', () => {
    ;(game as unknown as GameInternal).spawnPiece()
    expect(game.getState()).toBe(GameState.PLAYING)
    expect(game.getCurrentPiece()).not.toBeNull()
  })
})

describe('state change callback', () => {
  let game: Game

  beforeEach(() => {
    game = new Game(createMockCanvas())
  })

  it('fires with PAUSED when pause() is called', () => {
    const cb = vi.fn()
    game.setOnStateChange(cb)
    game.start()
    game.pause()
    expect(cb).toHaveBeenCalledWith(GameState.PAUSED)
  })

  it('callback is not called before state changes', () => {
    const cb = vi.fn()
    game.setOnStateChange(cb)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('reset clears state', () => {
  let game: Game

  beforeEach(() => {
    game = new Game(createMockCanvas())
  })

  it('score is 0 after reset', () => {
    ;(game as unknown as GameInternal).scoreManager.addHardDrop(10)
    game.reset()
    expect(game.getScore()).toBe(0)
  })

  it('lines is 0 after reset', () => {
    ;(game as unknown as GameInternal).scoreManager.processLineClear(4, 'none')
    game.reset()
    expect(game.getLines()).toBe(0)
  })

  it('level is 1 after reset', () => {
    for (let i = 0; i < 10; i++) {
      ;(game as unknown as GameInternal).scoreManager.processLineClear(
        1,
        'none'
      )
    }
    game.reset()
    expect(game.getLevel()).toBe(1)
  })

  it('currentPiece is null after reset', () => {
    game.start()
    game.reset()
    expect(game.getCurrentPiece()).toBeNull()
  })

  it('holdPiece is null after reset', () => {
    game.start()
    ;(game as unknown as { holdPiece: TetrominoType | null }).holdPiece =
      TetrominoType.T
    game.reset()
    expect(game.getHoldPiece()).toBeNull()
  })
})

describe('level and lines tracking', () => {
  let game: Game

  beforeEach(() => {
    game = new Game(createMockCanvas())
  })

  it('starts at level 1 with 0 lines', () => {
    expect(game.getLevel()).toBe(1)
    expect(game.getLines()).toBe(0)
  })

  it('clearing 10 lines advances to level 2', () => {
    for (let i = 0; i < 10; i++) {
      ;(game as unknown as GameInternal).scoreManager.processLineClear(
        1,
        'none'
      )
    }
    expect(game.getLevel()).toBe(2)
    expect(game.getLines()).toBe(10)
  })

  it('clearing 20 lines advances to level 3', () => {
    for (let i = 0; i < 20; i++) {
      ;(game as unknown as GameInternal).scoreManager.processLineClear(
        1,
        'none'
      )
    }
    expect(game.getLevel()).toBe(3)
    expect(game.getLines()).toBe(20)
  })

  it('getScore() reflects accumulated score', () => {
    ;(game as unknown as GameInternal).scoreManager.addHardDrop(5)
    expect(game.getScore()).toBe(10) // 2 pts per cell
  })
})
