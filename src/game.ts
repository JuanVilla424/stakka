import { Board } from './board'
import { PopupManager } from './effects'
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

const POPUP_BOARD_Y = 200

function popupColor(text: string): string {
  if (text.startsWith('TETRIS')) return '#ffd700'
  if (text.startsWith('T-SPIN')) return '#a000f0'
  if (text.startsWith('COMBO')) return '#ffcc00'
  return '#ffffff'
}

function popupFontSize(text: string): number {
  const m = text.match(/COMBO ×(\d+)/)
  if (m) return Math.min(28, 18 + parseInt(m[1], 10) * 2)
  return 18
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
  private popupManager = new PopupManager()
  private elapsedTime = 0
  private lockTimer = 0
  private lockResets = 0
  private lockDelayActive = false
  private lowestY = 0
  private onStateChange?: (state: GameState) => void

  constructor(canvas: HTMLCanvasElement) {
    this.board = new Board()
    this.renderer = new Renderer(canvas)
    this.randomizer = new BagRandomizer()
    this.input = new InputManager()
  }

  setOnStateChange(cb: (state: GameState) => void): void {
    this.onStateChange = cb
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
    this.softDropping = false
    this.lockDelayActive = false
    this.lockTimer = 0
    this.lockResets = 0
    this.popupManager.reset()
    this.elapsedTime = 0
    this.state = GameState.PLAYING
    this.spawnPiece()
    if (this.state === GameState.PLAYING) {
      this.input.reset()
      this.input.attach()
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }
  }

  pause(): void {
    if (this.state !== GameState.PLAYING) return
    this.state = GameState.PAUSED
    this.input.detach()
    cancelAnimationFrame(this.rafId)
    this.onStateChange?.(GameState.PAUSED)
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
    this.popupManager.reset()
    this.elapsedTime = 0
  }

  private gameLoop(timestamp: number): void {
    if (this.state !== GameState.PLAYING) return

    const delta =
      this.lastTime === 0 ? 0 : Math.min(timestamp - this.lastTime, 200)
    this.lastTime = timestamp
    this.elapsedTime += delta

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

    this.popupManager.update(delta)

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
      this.elapsedTime,
      this.popupManager
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
      const cx = this.renderer.getBoardCenterX()
      event.label.split('\n').forEach((text, i) => {
        this.popupManager.addPopup(
          text,
          cx,
          POPUP_BOARD_Y + i * 28,
          popupColor(text),
          popupFontSize(text)
        )
      })
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
      this.input.detach()
      this.onStateChange?.(GameState.GAME_OVER)
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
        this.input.detach()
        this.onStateChange?.(GameState.GAME_OVER)
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

  getLines(): number {
    return this.scoreManager.totalLines
  }

  getElapsedTime(): number {
    return this.elapsedTime
  }

  getFormattedTime(): string {
    const totalSec = Math.floor(this.elapsedTime / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
