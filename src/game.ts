import { Board } from './board'
import { Piece } from './piece'
import { BagRandomizer } from './randomizer'
import { Renderer } from './renderer'
import { tryRotate, detectTSpin } from './srs'

export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export class Game {
  private board: Board
  private renderer: Renderer
  private randomizer: BagRandomizer
  private currentPiece: Piece | null = null
  private lastMoveWasRotation = false
  private lastKickIndex = 0
  private state: GameState = GameState.IDLE
  private dropInterval = 1000
  private dropAccumulator = 0
  private lastTime = 0
  private rafId = 0
  private score = 0
  private boundKeyDown: (e: KeyboardEvent) => void

  constructor(canvas: HTMLCanvasElement) {
    this.board = new Board()
    this.renderer = new Renderer(canvas)
    this.randomizer = new BagRandomizer()
    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
  }

  start(): void {
    this.board.reset()
    this.randomizer.reset()
    this.dropAccumulator = 0
    this.lastTime = 0
    this.state = GameState.PLAYING
    this.spawnPiece()
    if (this.state === GameState.PLAYING) {
      document.addEventListener('keydown', this.boundKeyDown)
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }
  }

  pause(): void {
    if (this.state !== GameState.PLAYING) return
    this.state = GameState.PAUSED
    cancelAnimationFrame(this.rafId)
  }

  resume(): void {
    if (this.state !== GameState.PAUSED) return
    this.state = GameState.PLAYING
    this.lastTime = 0
    this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
  }

  reset(): void {
    cancelAnimationFrame(this.rafId)
    document.removeEventListener('keydown', this.boundKeyDown)
    this.board.reset()
    this.currentPiece = null
    this.state = GameState.IDLE
  }

  private gameLoop(timestamp: number): void {
    if (this.state !== GameState.PLAYING) return

    const delta =
      this.lastTime === 0 ? 0 : Math.min(timestamp - this.lastTime, 200)
    this.lastTime = timestamp
    this.dropAccumulator += delta

    while (this.dropAccumulator >= this.dropInterval) {
      this.tick()
      this.dropAccumulator -= this.dropInterval
    }

    this.renderer.drawFrame(this.board, this.currentPiece)

    if (this.state === GameState.PLAYING) {
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }
  }

  private tick(): void {
    if (!this.currentPiece) return

    const canMoveDown = !this.board.checkCollision(
      this.currentPiece,
      0,
      1,
      this.currentPiece.rotation
    )
    if (canMoveDown) {
      this.currentPiece.y += 1
    } else {
      detectTSpin(
        this.currentPiece,
        this.board,
        this.lastMoveWasRotation,
        this.lastKickIndex
      )
      this.board.lockPiece(this.currentPiece)
      this.board.clearLines()
      this.spawnPiece()
    }
  }

  private spawnPiece(): void {
    const type = this.randomizer.next()
    const piece = new Piece(type, 3, 1)
    if (this.board.checkCollision(piece, 0, 0, piece.rotation)) {
      this.state = GameState.GAME_OVER
      this.currentPiece = null
      return
    }
    this.currentPiece = piece
  }

  moveLeft(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    if (
      !this.board.checkCollision(
        this.currentPiece,
        -1,
        0,
        this.currentPiece.rotation
      )
    ) {
      this.currentPiece.x -= 1
      this.lastMoveWasRotation = false
      this.lastKickIndex = 0
    }
  }

  moveRight(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    if (
      !this.board.checkCollision(
        this.currentPiece,
        1,
        0,
        this.currentPiece.rotation
      )
    ) {
      this.currentPiece.x += 1
      this.lastMoveWasRotation = false
      this.lastKickIndex = 0
    }
  }

  moveDown(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    if (
      !this.board.checkCollision(
        this.currentPiece,
        0,
        1,
        this.currentPiece.rotation
      )
    ) {
      this.currentPiece.y += 1
      this.dropAccumulator = 0
      this.lastMoveWasRotation = false
      this.lastKickIndex = 0
    }
  }

  rotateCW(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    const result = tryRotate(this.currentPiece, this.board, 1)
    if (result.success) {
      this.lastMoveWasRotation = true
      this.lastKickIndex = result.kickIndex
    }
  }

  rotateCCW(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    const result = tryRotate(this.currentPiece, this.board, -1)
    if (result.success) {
      this.lastMoveWasRotation = true
      this.lastKickIndex = result.kickIndex
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        this.moveLeft()
        break
      case 'ArrowRight':
        e.preventDefault()
        this.moveRight()
        break
      case 'ArrowDown':
        e.preventDefault()
        this.moveDown()
        break
      case 'ArrowUp':
        e.preventDefault()
        this.rotateCW()
        break
      case 'z':
      case 'Z':
        e.preventDefault()
        this.rotateCCW()
        break
    }
  }

  getState(): GameState {
    return this.state
  }

  getScore(): number {
    return this.score
  }

  getCurrentPiece(): Piece | null {
    return this.currentPiece
  }

  getDropPosition(piece: Piece): number {
    let y = piece.y
    while (
      !this.board.checkCollision(piece, 0, y - piece.y + 1, piece.rotation)
    ) {
      y++
    }
    return y
  }

  getGhostY(): number | null {
    if (!this.currentPiece) return null
    return this.getDropPosition(this.currentPiece)
  }
}
