import { GameAction } from './input'

export interface TouchConfig {
  swipeThresholdX?: number
  swipeThresholdY?: number
  hardDropThreshold?: number
  tapMaxDuration?: number
  tapMaxMovement?: number
  longPressDuration?: number
  dasDelay?: number
}

export class TouchManager {
  private swipeThresholdX: number
  private swipeThresholdY: number
  private hardDropThreshold: number
  private tapMaxDuration: number
  private tapMaxMovement: number
  private longPressDuration: number
  private dasDelay: number

  // Touch state
  private startX = 0
  private startY = 0
  private startTime = 0
  private currentX = 0
  private currentY = 0
  private touchId: number | null = null
  private swipeAxis: 'horizontal' | 'vertical' | null = null
  private hardDropFired = false

  // DAS for continuous swipe
  private dasTimer = 0
  private lastSwipeAction: GameAction | null = null
  private swipeHeld = false

  // Long press
  private longPressTimer: ReturnType<typeof setTimeout> | null = null
  private longPressFired = false

  // Action queue
  private actionQueue: GameAction[] = []

  // Container element
  private container: HTMLElement | null = null

  // Bound event handlers
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void
  private boundContextMenu: (e: Event) => void

  constructor(config: TouchConfig = {}) {
    this.swipeThresholdX = config.swipeThresholdX ?? 30
    this.swipeThresholdY = config.swipeThresholdY ?? 30
    this.hardDropThreshold = config.hardDropThreshold ?? 50
    this.tapMaxDuration = config.tapMaxDuration ?? 200
    this.tapMaxMovement = config.tapMaxMovement ?? 10
    this.longPressDuration = config.longPressDuration ?? 500
    this.dasDelay = config.dasDelay ?? 167

    this.boundTouchStart = (e: TouchEvent) => this.onTouchStart(e)
    this.boundTouchMove = (e: TouchEvent) => this.onTouchMove(e)
    this.boundTouchEnd = (e: TouchEvent) => this.onTouchEnd(e)
    this.boundContextMenu = (e: Event) => e.preventDefault()
  }

  attach(container: HTMLElement): void {
    this.container = container
    container.addEventListener('touchstart', this.boundTouchStart, {
      passive: false,
    })
    container.addEventListener('touchmove', this.boundTouchMove, {
      passive: false,
    })
    container.addEventListener('touchend', this.boundTouchEnd, {
      passive: false,
    })
    container.addEventListener('touchcancel', this.boundTouchEnd, {
      passive: false,
    })
    container.addEventListener('contextmenu', this.boundContextMenu)
  }

  detach(): void {
    if (!this.container) return
    this.container.removeEventListener('touchstart', this.boundTouchStart)
    this.container.removeEventListener('touchmove', this.boundTouchMove)
    this.container.removeEventListener('touchend', this.boundTouchEnd)
    this.container.removeEventListener('touchcancel', this.boundTouchEnd)
    this.container.removeEventListener('contextmenu', this.boundContextMenu)
    this.container = null
    this.clearLongPressTimer()
  }

  reset(): void {
    this.touchId = null
    this.swipeAxis = null
    this.hardDropFired = false
    this.dasTimer = 0
    this.lastSwipeAction = null
    this.swipeHeld = false
    this.longPressFired = false
    this.actionQueue = []
    this.clearLongPressTimer()
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault()

    // Only track first touch
    if (this.touchId !== null) return

    const touch = e.changedTouches[0]
    this.touchId = touch.identifier
    this.startX = touch.clientX
    this.startY = touch.clientY
    this.currentX = touch.clientX
    this.currentY = touch.clientY
    this.startTime = performance.now()
    this.swipeAxis = null
    this.hardDropFired = false
    this.dasTimer = 0
    this.lastSwipeAction = null
    this.swipeHeld = false
    this.longPressFired = false

    // Start long press timer
    this.clearLongPressTimer()
    this.longPressTimer = setTimeout(() => {
      const dx = Math.abs(this.currentX - this.startX)
      const dy = Math.abs(this.currentY - this.startY)
      if (dx < this.tapMaxMovement && dy < this.tapMaxMovement) {
        this.longPressFired = true
        this.actionQueue.push(GameAction.HOLD)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15)
        }
      }
    }, this.longPressDuration)
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault()
    if (this.touchId === null) return

    let touch: Touch | null = null
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        touch = e.changedTouches[i]
        break
      }
    }
    if (!touch) return

    this.currentX = touch.clientX
    this.currentY = touch.clientY

    const dx = this.currentX - this.startX
    const dy = this.currentY - this.startY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // Cancel long press if moved beyond tap threshold
    if (absDx > this.tapMaxMovement || absDy > this.tapMaxMovement) {
      this.clearLongPressTimer()
    }

    // Lock swipe axis on first significant movement
    if (this.swipeAxis === null) {
      if (absDx > 10 || absDy > 10) {
        this.swipeAxis = absDx >= absDy ? 'horizontal' : 'vertical'
      }
    }

    // Hard drop (upward swipe) — fire once
    if (
      !this.hardDropFired &&
      dy < -this.hardDropThreshold &&
      this.swipeAxis !== 'horizontal'
    ) {
      this.hardDropFired = true
      this.actionQueue.push(GameAction.HARD_DROP)
      this.clearLongPressTimer()
      return
    }

    // Horizontal swipe: step moves as finger drags
    if (this.swipeAxis === 'horizontal') {
      const steps = Math.floor(Math.abs(dx) / this.swipeThresholdX)
      if (steps > 0) {
        const action = dx < 0 ? GameAction.MOVE_LEFT : GameAction.MOVE_RIGHT
        for (let i = 0; i < steps; i++) {
          this.actionQueue.push(action)
        }
        // Reset start to current position so next move starts from here
        this.startX = this.currentX - (dx % this.swipeThresholdX)
        this.lastSwipeAction = action
        this.swipeHeld = true
        this.dasTimer = 0
      }
    }

    // Vertical soft drop: step moves as finger drags down
    if (this.swipeAxis === 'vertical' && !this.hardDropFired && dy > 0) {
      const steps = Math.floor(dy / this.swipeThresholdY)
      if (steps > 0) {
        for (let i = 0; i < steps; i++) {
          this.actionQueue.push(GameAction.SOFT_DROP)
        }
        this.startY = this.currentY - (dy % this.swipeThresholdY)
        this.lastSwipeAction = GameAction.SOFT_DROP
        this.swipeHeld = true
        this.dasTimer = 0
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault()
    if (this.touchId === null) return

    let touch: Touch | null = null
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        touch = e.changedTouches[i]
        break
      }
    }
    if (!touch) return

    this.clearLongPressTimer()

    const duration = performance.now() - this.startTime
    const dx = Math.abs(touch.clientX - this.startX)
    const dy = Math.abs(touch.clientY - this.startY)

    // Tap detection
    if (
      !this.longPressFired &&
      duration < this.tapMaxDuration &&
      dx < this.tapMaxMovement &&
      dy < this.tapMaxMovement
    ) {
      const screenWidth =
        this.container?.getBoundingClientRect().width ??
        (typeof window !== 'undefined' ? window.innerWidth : 360)
      const tapX = touch.clientX
      const containerLeft = this.container?.getBoundingClientRect().left ?? 0
      const relativeX = tapX - containerLeft

      if (relativeX >= screenWidth / 2) {
        this.actionQueue.push(GameAction.ROTATE_CW)
      } else {
        this.actionQueue.push(GameAction.ROTATE_CCW)
      }
    }

    // Reset state
    this.touchId = null
    this.swipeAxis = null
    this.hardDropFired = false
    this.swipeHeld = false
    this.lastSwipeAction = null
    this.dasTimer = 0
    this.longPressFired = false
  }

  update(dt: number): GameAction[] {
    // DAS: if finger still held in a swipe direction, auto-repeat after delay
    if (
      this.swipeHeld &&
      this.lastSwipeAction !== null &&
      this.touchId !== null
    ) {
      this.dasTimer += dt
      if (this.dasTimer >= this.dasDelay) {
        this.dasTimer -= this.dasDelay
        this.actionQueue.push(this.lastSwipeAction)
      }
    }

    const actions = this.actionQueue.slice()
    this.actionQueue = []
    return actions
  }
}

/**
 * Detects if the current device supports touch input.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
