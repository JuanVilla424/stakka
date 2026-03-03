import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TouchManager, isTouchDevice } from '../touch'
import { GameAction } from '../input'

type HandlerMap = Record<string, (e: Event) => void>

function createMockContainer(width = 400, left = 0) {
  const handlers: HandlerMap = {}
  const el = {
    addEventListener: (type: string, handler: EventListener) => {
      handlers[type] = handler
    },
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left, width, top: 0, height: 600 }),
  } as unknown as HTMLElement
  return { el, handlers }
}

function touchEvent(id: number, x: number, y: number): TouchEvent {
  return {
    changedTouches: [
      { identifier: id, clientX: x, clientY: y },
    ] as unknown as TouchList,
    preventDefault: vi.fn(),
  } as unknown as TouchEvent
}

function fire(
  handlers: HandlerMap,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  id: number,
  x: number,
  y: number
): void {
  handlers[type]?.(touchEvent(id, x, y))
}

describe('isTouchDevice', () => {
  it('returns false in node environment (no window.ontouchstart or maxTouchPoints)', () => {
    expect(isTouchDevice()).toBe(false)
  })
})

describe('TouchManager', () => {
  let tm: TouchManager
  let container: ReturnType<typeof createMockContainer>

  beforeEach(() => {
    vi.useFakeTimers()
    tm = new TouchManager()
    container = createMockContainer(400, 0)
    tm.attach(container.el)
  })

  afterEach(() => {
    tm.detach()
    vi.useRealTimers()
  })

  it('swipe left beyond threshold emits MOVE_LEFT', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 160, 300) // dx = -40 > 30 threshold
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.MOVE_LEFT)
  })

  it('swipe right beyond threshold emits MOVE_RIGHT', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 240, 300) // dx = 40 > 30 threshold
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.MOVE_RIGHT)
  })

  it('swipe down beyond threshold emits SOFT_DROP', () => {
    fire(container.handlers, 'touchstart', 0, 200, 200)
    fire(container.handlers, 'touchmove', 0, 200, 240) // dy = 40 > 30 threshold
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.SOFT_DROP)
  })

  it('swipe up beyond hard drop threshold emits HARD_DROP', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 200, 240) // dy = -60 < -50 threshold
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.HARD_DROP)
  })

  it('small horizontal movement below threshold emits no action', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 215, 300) // dx = 15 < 30 threshold
    const actions = tm.update(0)
    expect(actions).not.toContain(GameAction.MOVE_LEFT)
    expect(actions).not.toContain(GameAction.MOVE_RIGHT)
  })

  it('tap right half of container emits ROTATE_CW', () => {
    // container: left=0, width=400; midpoint=200; tap at x=250 → right half
    fire(container.handlers, 'touchstart', 0, 250, 300)
    vi.advanceTimersByTime(100) // 100ms < tapMaxDuration=200ms
    fire(container.handlers, 'touchend', 0, 250, 300)
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.ROTATE_CW)
  })

  it('tap left half of container emits ROTATE_CCW', () => {
    // container: left=0, width=400; midpoint=200; tap at x=150 → left half
    fire(container.handlers, 'touchstart', 0, 150, 300)
    vi.advanceTimersByTime(100)
    fire(container.handlers, 'touchend', 0, 150, 300)
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.ROTATE_CCW)
  })

  it('slow tap (>= tapMaxDuration) emits no rotation', () => {
    fire(container.handlers, 'touchstart', 0, 250, 300)
    vi.advanceTimersByTime(250) // 250ms >= tapMaxDuration=200ms — also triggers long press
    fire(container.handlers, 'touchend', 0, 250, 300)
    const actions = tm.update(0)
    expect(actions).not.toContain(GameAction.ROTATE_CW)
    expect(actions).not.toContain(GameAction.ROTATE_CCW)
  })

  it('long press (>= longPressDuration) emits HOLD', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    vi.advanceTimersByTime(500) // >= longPressDuration=500ms
    const actions = tm.update(0)
    expect(actions).toContain(GameAction.HOLD)
  })

  it('hard drop fires only once when drag continues past threshold', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 200, 240) // fires hard drop
    fire(container.handlers, 'touchmove', 0, 200, 220) // should not fire again
    const actions = tm.update(0)
    expect(actions.filter((a) => a === GameAction.HARD_DROP)).toHaveLength(1)
  })

  it('horizontal swipe emits multiple steps for large movement', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 290, 300) // dx = 90 → 3 steps (floor(90/30)=3)
    const actions = tm.update(0)
    expect(actions.filter((a) => a === GameAction.MOVE_RIGHT)).toHaveLength(3)
  })

  it('DAS auto-repeats action while swipe is held after delay', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 160, 300) // MOVE_LEFT, swipeHeld=true
    tm.update(0) // consume initial action

    // advance past DAS delay (167ms) without releasing touch
    const actions = tm.update(200)
    expect(actions).toContain(GameAction.MOVE_LEFT)
  })

  it('DAS does not repeat before delay elapses', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 160, 300)
    tm.update(0) // consume initial

    const actions = tm.update(100) // 100ms < 167ms DAS delay
    expect(actions).not.toContain(GameAction.MOVE_LEFT)
  })

  it('reset() clears queued actions and stops DAS', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchmove', 0, 160, 300) // queues MOVE_LEFT
    tm.reset()
    const actions = tm.update(0)
    expect(actions).toHaveLength(0)
  })

  it('second touch start while first is active is ignored', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    fire(container.handlers, 'touchstart', 1, 100, 100) // second finger ignored
    fire(container.handlers, 'touchmove', 1, 50, 100) // huge move on second touch
    const actions = tm.update(0)
    // No left move because touch 1 was not tracked
    expect(actions).not.toContain(GameAction.MOVE_LEFT)
  })

  it('touchcancel behaves the same as touchend', () => {
    fire(container.handlers, 'touchstart', 0, 150, 300)
    vi.advanceTimersByTime(100)
    fire(container.handlers, 'touchcancel', 0, 150, 300) // treated as end
    const actions = tm.update(0)
    // Short tap on left side → ROTATE_CCW
    expect(actions).toContain(GameAction.ROTATE_CCW)
  })

  it('detach() clears long press timer so HOLD is not emitted after detach', () => {
    fire(container.handlers, 'touchstart', 0, 200, 300)
    // Detach mid-press cancels the long press timer
    tm.detach()
    vi.advanceTimersByTime(600) // would have triggered long press if not detached
    const actions = tm.update(0)
    expect(actions).not.toContain(GameAction.HOLD)
  })
})
