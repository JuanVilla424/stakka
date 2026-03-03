export enum GameAction {
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  SOFT_DROP = 'SOFT_DROP',
  HARD_DROP = 'HARD_DROP',
  ROTATE_CW = 'ROTATE_CW',
  ROTATE_CCW = 'ROTATE_CCW',
  HOLD = 'HOLD',
  PAUSE = 'PAUSE',
  RESTART = 'RESTART',
  MUTE = 'MUTE',
}

const DEFAULT_BINDINGS: [string, GameAction][] = [
  ['ArrowLeft', GameAction.MOVE_LEFT],
  ['a', GameAction.MOVE_LEFT],
  ['ArrowRight', GameAction.MOVE_RIGHT],
  ['d', GameAction.MOVE_RIGHT],
  ['ArrowDown', GameAction.SOFT_DROP],
  ['s', GameAction.SOFT_DROP],
  [' ', GameAction.HARD_DROP],
  ['ArrowUp', GameAction.ROTATE_CW],
  ['w', GameAction.ROTATE_CW],
  ['z', GameAction.ROTATE_CCW],
  ['c', GameAction.HOLD],
  ['Shift', GameAction.HOLD],
  ['Escape', GameAction.PAUSE],
  ['F1', GameAction.PAUSE],
  ['r', GameAction.RESTART],
  ['m', GameAction.MUTE],
  ['M', GameAction.MUTE],
]

// Actions that fire once per keydown (not repeating)
const SINGLE_PRESS_ACTIONS = new Set<GameAction>([
  GameAction.HARD_DROP,
  GameAction.ROTATE_CW,
  GameAction.ROTATE_CCW,
  GameAction.HOLD,
  GameAction.PAUSE,
  GameAction.RESTART,
  GameAction.MUTE,
])

export interface InputConfig {
  dasDelay?: number
  arrRate?: number
}

export class InputManager {
  private bindings: Map<string, GameAction>
  private keysDown: Map<string, number> = new Map()
  private processedKeys: Set<string> = new Set()

  private dasDelay: number
  private arrRate: number

  private dasTimer: { left: number; right: number } = { left: 0, right: 0 }
  private arrTimer: { left: number; right: number } = { left: 0, right: 0 }
  private dasCharged: { left: boolean; right: boolean } = {
    left: false,
    right: false,
  }
  private lastDirection: 'left' | 'right' | null = null

  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void

  constructor(config: InputConfig = {}) {
    this.dasDelay = config.dasDelay ?? 167
    this.arrRate = config.arrRate ?? 33
    this.bindings = new Map(DEFAULT_BINDINGS)
    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
    this.boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e)
  }

  attach(): void {
    document.addEventListener('keydown', this.boundKeyDown)
    document.addEventListener('keyup', this.boundKeyUp)
  }

  detach(): void {
    if (typeof document === 'undefined') return
    document.removeEventListener('keydown', this.boundKeyDown)
    document.removeEventListener('keyup', this.boundKeyUp)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const action = this.bindings.get(e.key)
    if (action === undefined) return

    e.preventDefault()

    // Don't re-register if already tracked (browser fires repeated keydown while held)
    if (this.keysDown.has(e.key)) return

    this.keysDown.set(e.key, performance.now())

    // Update last direction for DAS priority
    if (action === GameAction.MOVE_LEFT) {
      this.lastDirection = 'left'
    } else if (action === GameAction.MOVE_RIGHT) {
      this.lastDirection = 'right'
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = this.bindings.get(e.key)
    if (action === undefined) return

    this.keysDown.delete(e.key)
    this.processedKeys.delete(e.key)

    if (action === GameAction.MOVE_LEFT) {
      this.dasTimer.left = 0
      this.arrTimer.left = 0
      this.dasCharged.left = false
      // If right is still held, switch direction priority
      if (this.isActionKeyDown(GameAction.MOVE_RIGHT)) {
        this.lastDirection = 'right'
      } else {
        this.lastDirection = null
      }
    } else if (action === GameAction.MOVE_RIGHT) {
      this.dasTimer.right = 0
      this.arrTimer.right = 0
      this.dasCharged.right = false
      if (this.isActionKeyDown(GameAction.MOVE_LEFT)) {
        this.lastDirection = 'left'
      } else {
        this.lastDirection = null
      }
    }
  }

  update(dt: number): GameAction[] {
    const actions: GameAction[] = []

    // --- Single-press actions ---
    for (const [key] of this.keysDown) {
      const action = this.bindings.get(key)
      if (
        action !== undefined &&
        SINGLE_PRESS_ACTIONS.has(action) &&
        !this.processedKeys.has(key)
      ) {
        this.processedKeys.add(key)
        actions.push(action)
      }
    }

    // --- Soft drop (continuous while held, no DAS) ---
    if (this.isActionKeyDown(GameAction.SOFT_DROP)) {
      actions.push(GameAction.SOFT_DROP)
    }

    // --- DAS/ARR for horizontal movement ---
    const leftHeld = this.isActionKeyDown(GameAction.MOVE_LEFT)
    const rightHeld = this.isActionKeyDown(GameAction.MOVE_RIGHT)

    if (!leftHeld && !rightHeld) {
      // Neither held — nothing to do
    } else {
      // Determine active direction (most recent key wins)
      const activeDir = this.lastDirection

      if (activeDir === 'left' && leftHeld) {
        // First frame: emit immediately (DAS timer starts at 0)
        if (this.dasTimer.left === 0 && !this.dasCharged.left) {
          actions.push(GameAction.MOVE_LEFT)
        }

        this.dasTimer.left += dt

        if (!this.dasCharged.left) {
          if (this.dasTimer.left >= this.dasDelay) {
            this.dasCharged.left = true
            this.arrTimer.left = 0
            // Emit one move at DAS trigger if arrRate > 0 (the next ARR tick handles it)
            // With arrRate=0, teleport to wall handled below
          }
        }

        if (this.dasCharged.left) {
          if (this.arrRate === 0) {
            // Instant wall shift — emit many moves (game resolves collisions)
            for (let i = 0; i < 10; i++) {
              actions.push(GameAction.MOVE_LEFT)
            }
          } else {
            this.arrTimer.left += dt
            while (this.arrTimer.left >= this.arrRate) {
              actions.push(GameAction.MOVE_LEFT)
              this.arrTimer.left -= this.arrRate
            }
          }
        }
      } else if (activeDir === 'right' && rightHeld) {
        if (this.dasTimer.right === 0 && !this.dasCharged.right) {
          actions.push(GameAction.MOVE_RIGHT)
        }

        this.dasTimer.right += dt

        if (!this.dasCharged.right) {
          if (this.dasTimer.right >= this.dasDelay) {
            this.dasCharged.right = true
            this.arrTimer.right = 0
          }
        }

        if (this.dasCharged.right) {
          if (this.arrRate === 0) {
            for (let i = 0; i < 10; i++) {
              actions.push(GameAction.MOVE_RIGHT)
            }
          } else {
            this.arrTimer.right += dt
            while (this.arrTimer.right >= this.arrRate) {
              actions.push(GameAction.MOVE_RIGHT)
              this.arrTimer.right -= this.arrRate
            }
          }
        }
      }
    }

    return actions
  }

  reset(): void {
    this.keysDown.clear()
    this.processedKeys.clear()
    this.dasTimer = { left: 0, right: 0 }
    this.arrTimer = { left: 0, right: 0 }
    this.dasCharged = { left: false, right: false }
    this.lastDirection = null
  }

  isKeyDown(action: GameAction): boolean {
    return this.isActionKeyDown(action)
  }

  private isActionKeyDown(action: GameAction): boolean {
    for (const [key, act] of this.bindings) {
      if (act === action && this.keysDown.has(key)) return true
    }
    return false
  }
}
