import { Board } from './board'
import { PopupManager } from './effects'
import { GameAction, InputManager } from './input'
import { Piece, TETROMINO_COLORS, TetrominoType } from './piece'
import { BagRandomizer } from './randomizer'
import { Renderer } from './renderer'
import { ScoreManager } from './scoring'
import { tryRotate, detectTSpin } from './srs'
import { audio, SoundEffect } from './audio'
import { TouchManager } from './touch'
import { AnimationManager } from './animations'

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
  private canvas: HTMLCanvasElement
  private board: Board
  private renderer: Renderer
  private randomizer: BagRandomizer
  private input: InputManager
  private touch: TouchManager
  private actionProvider: (() => GameAction[]) | null = null
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
  private animManager = new AnimationManager()
  private gravityPauseRemaining = 0
  private elapsedTime = 0
  private lockTimer = 0
  private lockResets = 0
  private lockDelayActive = false
  private lowestY = 0
  private onStateChange?: (state: GameState) => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.board = new Board()
    this.renderer = new Renderer(canvas)
    this.randomizer = new BagRandomizer()
    this.input = new InputManager()
    this.touch = new TouchManager()
  }

  setActionProvider(fn: () => GameAction[]): void {
    this.actionProvider = fn
  }

  setOnStateChange(cb: (state: GameState) => void): void {
    this.onStateChange = cb
  }

  start(): void {
    audio.ensureResumed()
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
    this.animManager.reset()
    this.gravityPauseRemaining = 0
    this.elapsedTime = 0
    this.state = GameState.PLAYING
    this.spawnPiece()
    if (this.state === GameState.PLAYING) {
      this.input.reset()
      this.input.attach()
      this.touch.attach(this.canvas)
      this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
    }
  }

  pause(): void {
    if (this.state !== GameState.PLAYING) return
    this.state = GameState.PAUSED
    this.input.detach()
    this.touch.detach()
    cancelAnimationFrame(this.rafId)
    this.onStateChange?.(GameState.PAUSED)
  }

  resume(): void {
    if (this.state !== GameState.PAUSED) return
    this.state = GameState.PLAYING
    this.lastTime = 0
    this.input.attach()
    this.input.reset()
    this.touch.attach(this.canvas)
    this.touch.reset()
    this.rafId = requestAnimationFrame((t) => this.gameLoop(t))
  }

  reset(): void {
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    this.input.reset()
    this.touch.detach()
    this.touch.reset()
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
    this.animManager.reset()
    this.gravityPauseRemaining = 0
    this.elapsedTime = 0
  }

  private gameLoop(timestamp: number): void {
    if (this.state !== GameState.PLAYING) return

    const delta =
      this.lastTime === 0 ? 0 : Math.min(timestamp - this.lastTime, 200)
    this.lastTime = timestamp
    this.elapsedTime += delta

    // Process input actions from all sources
    const externalActions = this.actionProvider ? this.actionProvider() : []
    const actions = [
      ...this.input.update(delta),
      ...this.touch.update(delta),
      ...externalActions,
    ]
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
        case GameAction.MUTE:
          audio.toggleMute()
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

    // Gravity pauses during line clear animation
    if (this.gravityPauseRemaining > 0) {
      this.gravityPauseRemaining -= delta
    } else {
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
    }

    this.popupManager.update(delta)
    this.animManager.update(delta)

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
      this.popupManager,
      this.animManager
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

    // Capture lock flash blocks before locking
    const lockBlocks = this.currentPiece.getBlocks()
    const cellSize = this.renderer.getCellSize()
    const boardOffsetX = this.renderer.getBoardOffsetX()

    const tSpinType = detectTSpin(
      this.currentPiece,
      this.board,
      this.lastMoveWasRotation,
      this.lastKickIndex
    )

    // Capture full row colors before clearing
    const { rows: fullRows, colorData } = this.board.captureFullRows()

    this.board.lockPiece(this.currentPiece)
    audio.play(SoundEffect.Lock)
    navigator.vibrate?.(10)

    // Lock flash animation
    this.animManager.addLockFlash(lockBlocks, cellSize, boardOffsetX)

    const cleared = this.board.clearLines()
    const prevLevel = this.scoreManager.level
    const event = this.scoreManager.processLineClear(cleared.length, tSpinType)

    if (cleared.length > 0) {
      navigator.vibrate?.(20)
      if (event.label.includes('TETRIS')) {
        audio.play(SoundEffect.Tetris)
      } else if (event.label.includes('T-SPIN')) {
        audio.play(SoundEffect.TSpin)
      } else {
        audio.play(SoundEffect.LineClear)
      }

      // Line clear animation + particles
      const isTetris = cleared.length >= 4
      this.animManager.addLineClear(
        fullRows,
        colorData,
        cellSize,
        boardOffsetX,
        isTetris
      )

      // Pause gravity during line clear flash
      this.gravityPauseRemaining = 300
    }

    const comboMatch = event.label.match(/COMBO[^\d]*(\d+)/)
    if (comboMatch) {
      audio.play(SoundEffect.Combo, { combo: parseInt(comboMatch[1], 10) })
    }

    if (this.scoreManager.level > prevLevel) {
      audio.play(SoundEffect.LevelUp)
      this.animManager.addLevelUp(
        this.renderer.getCanvasWidth(),
        this.renderer.getCanvasHeight()
      )
    }

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
      this.touch.detach()
      audio.play(SoundEffect.GameOver)
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
        this.touch.detach()
        audio.play(SoundEffect.GameOver)
        this.onStateChange?.(GameState.GAME_OVER)
        return
      }
      this.currentPiece = newPiece
      this.lockTimer = 0
      this.lockResets = 0
      this.lockDelayActive = false
      this.lowestY = newPiece.y
    }
    audio.play(SoundEffect.Hold)
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
      audio.play(SoundEffect.Move)
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
      audio.play(SoundEffect.Move)
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
      audio.play(SoundEffect.SoftDrop)
    }
  }

  hardDrop(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    audio.play(SoundEffect.HardDrop)
    navigator.vibrate?.(15)
    const dropY = this.getDropPosition(this.currentPiece)
    const distance = dropY - this.currentPiece.y

    // Hard drop trail animation
    if (distance > 0) {
      const blockCols = [
        ...new Set(this.currentPiece.getBlocks().map((b) => b.x)),
      ]
      const color = TETROMINO_COLORS[this.currentPiece.type]
      this.animManager.addHardDropTrail(
        blockCols,
        this.currentPiece.y,
        dropY,
        color,
        this.renderer.getCellSize(),
        this.renderer.getBoardOffsetX()
      )
    }

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
      audio.play(SoundEffect.Rotate)
    }
  }

  rotateCCW(): void {
    if (!this.currentPiece || this.state !== GameState.PLAYING) return
    const result = tryRotate(this.currentPiece, this.board, -1)
    if (result.success) {
      this.lastMoveWasRotation = true
      this.lastKickIndex = result.kickIndex
      this.resetLockTimer()
      audio.play(SoundEffect.Rotate)
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
