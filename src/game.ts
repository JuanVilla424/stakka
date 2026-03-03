import { Board } from './board'
import { GameAction, InputManager } from './input'
import { Piece, TetrominoType } from './piece'
import { BagRandomizer } from './randomizer'
import { Renderer } from './renderer'
import { ScoreManager } from './scoring'
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
  private input: InputManager
  private currentPiece: Piece | null = null
  private holdPiece: TetrominoType | null = null
  private canHold = true
  private lastMoveWasRotation = false
  private lastKickIndex = 0
  private state: GameState = GameState.IDLE
  private scoreManager = new ScoreManager()
  private normalDropInterval = 1000
  private dropInterval = 1000
  private dropAccumulator = 0
  private lastTime = 0
  private rafId = 0
  private softDropping = false
  private scorePopups: { label: string; startTime: number }[] = []
  private lockTimer = 0
  private lockResets = 0
  private lockDelayActive = false
  private lowestY = 0

  constructor(canvas: HTMLCanvasElement) {
    this.board = new Board()
    this.renderer = new Renderer(canvas)
    this.randomizer = new BagRandomizer()
    this.input = new InputManager()
  }

  start(): void {
    this.board.reset()
    this.randomizer.reset()
    this.scoreManager.reset()
    this.normalDropInterval = this.scoreManager.getGravityDelay()
    this.dropInterval = this.normalDropInterval
    this.dropAccumulator = 0
    this.lastTime = 0
    this.holdPiece = null
    this.canHold = true
    this.scorePopups = []
    this.state = GameState.PLAYING
    this.spawnPiece()
    if (this.state === GameState.PLAYING) {
      this.input.attach()
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }
  }

  pause(): void {
    if (this.state !== GameState.PLAYING) return
    this.state = GameState.PAUSED
    this.input.detach()
    cancelAnimationFrame(this.rafId)
  }

  resume(): void {
    if (this.state !== GameState.PAUSED) return
    this.state = GameState.PLAYING
    this.lastTime = 0
    this.input.attach()
    this.input.reset()
    this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
  }

  reset(): void {
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    this.input.reset()
    this.board.reset()
    this.scoreManager.reset()
    this.currentPiece = null
    this.holdPiece = null
    this.canHold = true
    this.state = GameState.IDLE
    this.softDropping = false
    this.lockDelayActive = false
    this.lockTimer = 0
    this.lockResets = 0
    this.scorePopups = []
  }

  private gameLoop(timestamp: number): void {
    if (this.state !== GameState.PLAYING) return

    const delta =
      this.lastTime === 0 ? 0 : Math.min(timestamp - this.lastTime, 200)
    this.lastTime = timestamp

    // Process input actions
    const actions = this.input.update(delta)
    for (const action of actions) {
      switch (action) {
        case GameAction.MOVE_LEFT:
          this.moveLeft()
          break
        case GameAction.MOVE_RIGHT:
          this.moveRight()
          break
        case GameAction.SOFT_DROP:
          this.moveDown()
          break
        case GameAction.HARD_DROP:
          this.hardDrop()
          break
        case GameAction.ROTATE_CW:
          this.rotateCW()
          break
        case GameAction.ROTATE_CCW:
          this.rotateCCW()
          break
        case GameAction.PAUSE:
          this.pause()
          return
        case GameAction.RESTART:
          // handled at app level when game is over
          break
        case GameAction.HOLD:
          this.holdCurrentPiece()
          break
      }
    }

    // Manage soft drop state
    const softDropHeld = this.input.isKeyDown(GameAction.SOFT_DROP)
    if (softDropHeld && !this.softDropping) {
      this.softDropping = true
      this.dropInterval = 50
    } else if (!softDropHeld && this.softDropping) {
      this.softDropping = false
      this.dropInterval = this.normalDropInterval
    }

    this.dropAccumulator += delta

    // Update lock delay timer
    if (this.lockDelayActive && this.currentPiece) {
      this.lockTimer -= delta
      if (this.lockTimer <= 0 || this.lockResets >= 15) {
        this.lockPieceFull()
      }
    }

    while (
      this.dropAccumulator >= this.dropInterval &&
      this.state === GameState.PLAYING
    ) {
      this.tick()
      this.dropAccumulator -= this.dropInterval
    }

    // Prune expired score popups (older than 1 second)
    this.scorePopups = this.scorePopups.filter(
      (p) => timestamp - p.startTime < 1000
    )

    const ghostY = this.currentPiece
      ? this.getDropPosition(this.currentPiece)
      : null
    const lockProgress = this.lockDelayActive
      ? Math.max(0, 1 - this.lockTimer / 500)
      : 0
    this.renderer.drawFrame(
      this.board,
      this.currentPiece,
      ghostY,
      lockProgress,
      this.holdPiece,
      this.canHold,
      this.randomizer.peek(5),
      this.scoreManager.score,
      this.scoreManager.level,
      this.scoreManager.totalLines,
      this.scorePopups.map((p) => ({
        label: p.label,
        alpha: 1 - (timestamp - p.startTime) / 1000,
      }))
    )

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
      if (this.softDropping) this.scoreManager.addSoftDrop(1)
      if (this.currentPiece.y > this.lowestY) {
        this.lowestY = this.currentPiece.y
        this.lockResets = 0
      }
      this.lockDelayActive = false
    } else {
      if (!this.lockDelayActive) {
        this.lockDelayActive = true
        this.lockTimer = 500
      }
    }
  }

  private lockPieceFull(): void {
    if (!this.currentPiece) return
    const tSpinType = detectTSpin(
      this.currentPiece,
      this.board,
      this.lastMoveWasRotation,
      this.lastKickIndex
    )
    this.board.lockPiece(this.currentPiece)
    const cleared = this.board.clearLines()
    const event = this.scoreManager.processLineClear(cleared.length, tSpinType)
    if (event.label) {
      this.scorePopups.push({ label: event.label, startTime: this.lastTime })
    }
    // Update gravity when level changes
    this.normalDropInterval = this.scoreManager.getGravityDelay()
    if (!this.softDropping) {
      this.dropInterval = this.normalDropInterval
    }
    this.canHold = true
    this.spawnPiece()
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
    this.lockTimer = 0
    this.lockResets = 0
    this.lockDelayActive = false
    this.lowestY = piece.y
  }

  private holdCurrentPiece(): void {
    if (!this.currentPiece || !this.canHold) return
    const currentType = this.currentPiece.type
    if (this.holdPiece === null) {
      this.holdPiece = currentType
      this.spawnPiece()
    } else {
      const swapType = this.holdPiece
      this.holdPiece = currentType
      const newPiece = new Piece(swapType, 3, 1)
      if (this.board.checkCollision(newPiece, 0, 0, newPiece.rotation)) {
        this.state = GameState.GAME_OVER
        this.currentPiece = null
        return
      }
      this.currentPiece = newPiece
      this.lockTimer = 0
      this.lockResets = 0
      this.lockDelayActive = false
      this.lowestY = newPiece.y
    }
    this.canHold = false
  }

  private resetLockTimer(): void {
    if (this.lockDelayActive && this.lockResets < 15) {
      this.lockTimer = 500
      this.lockResets += 1
    }
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
      this.resetLockTimer()
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
      this.resetLockTimer()
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
      this.scoreManager.addSoftDrop(1)
      this.dropAccumulator = 0
      this.lastMoveWasRotation = false
      this.lastKickIndex = 0
    }
  }

  hardDrop(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    const dropY = this.getDropPosition(this.currentPiece)
    const distance = dropY - this.currentPiece.y
    this.scoreManager.addHardDrop(distance)
    this.currentPiece.y = dropY
    this.lockPieceFull()
    this.dropAccumulator = 0
  }

  rotateCW(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    const result = tryRotate(this.currentPiece, this.board, 1)
    if (result.success) {
      this.lastMoveWasRotation = true
      this.lastKickIndex = result.kickIndex
      this.resetLockTimer()
    }
  }

  rotateCCW(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    const result = tryRotate(this.currentPiece, this.board, -1)
    if (result.success) {
      this.lastMoveWasRotation = true
      this.lastKickIndex = result.kickIndex
      this.resetLockTimer()
    }
  }

  getState(): GameState {
    return this.state
  }

  getScore(): number {
    return this.scoreManager.score
  }

  getLevel(): number {
    return this.scoreManager.level
  }

  getTotalLines(): number {
    return this.scoreManager.totalLines
  }

  getCurrentPiece(): Piece | null {
    return this.currentPiece
  }

  getHoldPiece(): TetrominoType | null {
    return this.holdPiece
  }

  getCanHold(): boolean {
    return this.canHold
  }

  getNextPieces(count: number): TetrominoType[] {
    return this.randomizer.peek(count)
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

  isLockDelayActive(): boolean {
    return this.lockDelayActive
  }

  getLockTimer(): number {
    return this.lockTimer
  }

  getLockResets(): number {
    return this.lockResets
  }

  isSoftDropping(): boolean {
    return this.softDropping
  }

  getDropInterval(): number {
    return this.dropInterval
  }
}
