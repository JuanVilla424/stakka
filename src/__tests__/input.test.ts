import { describe, it, expect, beforeEach } from 'vitest'
import { InputManager, GameAction } from '../input'

type MockKeyEvent = { key: string; preventDefault: () => void }
type InputManagerPrivate = InputManager & {
  handleKeyDown: (e: MockKeyEvent) => void
  handleKeyUp: (e: { key: string }) => void
}

function pressKey(input: InputManager, key: string): void {
  const e: MockKeyEvent = { key, preventDefault: () => {} }
  ;(input as InputManagerPrivate).handleKeyDown(e)
}

function releaseKey(input: InputManager, key: string): void {
  const e = { key }
  ;(input as InputManagerPrivate).handleKeyUp(e)
}

function countAction(actions: GameAction[], action: GameAction): number {
  return actions.filter((a) => a === action).length
}

describe('InputManager', () => {
  let input: InputManager

  beforeEach(() => {
    input = new InputManager({ dasDelay: 167, arrRate: 33 })
  })

  it('emits MOVE_LEFT immediately on first update after keydown', () => {
    pressKey(input, 'ArrowLeft')
    const actions = input.update(16)
    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(1)
  })

  it('does not emit horizontal moves between initial press and DAS charge', () => {
    pressKey(input, 'ArrowLeft')
    input.update(1) // immediate move consumed, dasTimer=1

    // Three updates totalling 150ms — still under DAS (167ms)
    const a1 = input.update(50) // dasTimer=51
    const a2 = input.update(50) // dasTimer=101
    const a3 = input.update(50) // dasTimer=151

    expect(countAction(a1, GameAction.MOVE_LEFT)).toBe(0)
    expect(countAction(a2, GameAction.MOVE_LEFT)).toBe(0)
    expect(countAction(a3, GameAction.MOVE_LEFT)).toBe(0)
  })

  it('emits MOVE_LEFT via ARR after DAS charges', () => {
    pressKey(input, 'ArrowLeft')
    input.update(1) // immediate, dasTimer=1
    // DAS charges: dasTimer=1+166=167, arrTimer=0+166=166 → 5 ARR moves (leftover=1)
    input.update(166)

    // arrTimer=1+33=34 >= 33 → 1 MOVE_LEFT
    const actions = input.update(33)
    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(1)
  })

  it('ARR emits multiple moves per frame when dt spans multiple intervals', () => {
    pressKey(input, 'ArrowLeft')
    input.update(1) // immediate, dasTimer=1
    // DAS charges: dasTimer=167, arrTimer=166 → 5 ARR moves, leftover=1
    input.update(166)

    // arrTimer=1+66=67 → 67/33=2 moves (leftover=1)
    const actions = input.update(66)
    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(2)
  })

  it('resets DAS on key release and restarts from zero on re-press', () => {
    pressKey(input, 'ArrowLeft')
    input.update(1) // immediate move, dasTimer=1
    input.update(100) // dasTimer=101, still not charged

    releaseKey(input, 'ArrowLeft')
    // DAS resets: dasTimer.left=0, arrTimer.left=0, dasCharged.left=false

    pressKey(input, 'ArrowLeft')
    // First frame after re-press: dasTimer.left=0 → immediate move
    const actions = input.update(16)
    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(1)

    // Still pre-DAS (dasTimer=16, < 167)
    const actions2 = input.update(50) // dasTimer=66
    expect(countAction(actions2, GameAction.MOVE_LEFT)).toBe(0)
  })

  it('most recent key wins: pressing right after left returns only MOVE_RIGHT', () => {
    pressKey(input, 'ArrowLeft')
    input.update(16) // left gets immediate move

    pressKey(input, 'ArrowRight') // right is now most recent
    const actions = input.update(16)

    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(0)
    expect(countAction(actions, GameAction.MOVE_RIGHT)).toBe(1)
  })

  it('releasing newer key falls back to older key direction', () => {
    pressKey(input, 'ArrowLeft')
    input.update(1) // left immediate move, dasTimer.left=1

    pressKey(input, 'ArrowRight')
    input.update(16) // right immediate move; dasTimer.left stays at 1 (not active)

    releaseKey(input, 'ArrowRight') // lastDirection → 'left', right DAS resets

    // Left resumes: dasTimer.left=1 (not 0) → no immediate emit
    const actions = input.update(16)
    expect(countAction(actions, GameAction.MOVE_RIGHT)).toBe(0)
    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(0)

    // Charge left DAS: dasTimer.left = 1+16+150=167
    input.update(150) // DAS charges, ARR begins
    const actions2 = input.update(33)
    expect(countAction(actions2, GameAction.MOVE_LEFT)).toBeGreaterThan(0)
  })

  it('single-press actions fire exactly once per keydown even when key held', () => {
    pressKey(input, ' ') // Space = HARD_DROP

    const a1 = input.update(16)
    expect(countAction(a1, GameAction.HARD_DROP)).toBe(1)

    // Key still held — must not fire again
    const a2 = input.update(16)
    expect(countAction(a2, GameAction.HARD_DROP)).toBe(0)

    // Release and re-press — fires once more
    releaseKey(input, ' ')
    pressKey(input, ' ')
    const a3 = input.update(16)
    expect(countAction(a3, GameAction.HARD_DROP)).toBe(1)
  })

  it('SOFT_DROP fires every update while key held, no DAS gating', () => {
    pressKey(input, 'ArrowDown')

    expect(input.update(16)).toContain(GameAction.SOFT_DROP)
    expect(input.update(16)).toContain(GameAction.SOFT_DROP)
    expect(input.update(16)).toContain(GameAction.SOFT_DROP)
  })

  it('ARR=0 emits 10 MOVE_LEFT actions per update after DAS charges', () => {
    const fast = new InputManager({ dasDelay: 100, arrRate: 0 })
    pressKey(fast, 'ArrowLeft')
    fast.update(1) // immediate, dasTimer=1
    // dasTimer=1+100=101 >= 100 → DAS charges → 10 instant moves
    const actions = fast.update(100)
    expect(countAction(actions, GameAction.MOVE_LEFT)).toBe(10)
  })

  it('both ArrowLeft and a trigger MOVE_LEFT', () => {
    pressKey(input, 'a')
    const actions = input.update(16)
    expect(actions).toContain(GameAction.MOVE_LEFT)
  })

  it('unknown keys do not produce actions and do not throw', () => {
    expect(() => {
      pressKey(input, 'Q')
      const actions = input.update(16)
      expect(actions.length).toBe(0)
    }).not.toThrow()
  })

  it('ROTATE_CW fires once per keydown for ArrowUp and w', () => {
    pressKey(input, 'ArrowUp')
    const a1 = input.update(16)
    const a2 = input.update(16)
    expect(countAction(a1, GameAction.ROTATE_CW)).toBe(1)
    expect(countAction(a2, GameAction.ROTATE_CW)).toBe(0)

    input.reset()
    pressKey(input, 'w')
    expect(input.update(16)).toContain(GameAction.ROTATE_CW)
  })

  it('ROTATE_CCW fires for z key exactly once per keydown', () => {
    pressKey(input, 'z')
    const a1 = input.update(16)
    const a2 = input.update(16)
    expect(countAction(a1, GameAction.ROTATE_CCW)).toBe(1)
    expect(countAction(a2, GameAction.ROTATE_CCW)).toBe(0)
  })

  it('HOLD fires for c key and Shift key', () => {
    pressKey(input, 'c')
    expect(input.update(16)).toContain(GameAction.HOLD)

    input.reset()
    pressKey(input, 'Shift')
    expect(input.update(16)).toContain(GameAction.HOLD)
  })

  it('PAUSE fires for Escape and F1', () => {
    pressKey(input, 'Escape')
    expect(input.update(16)).toContain(GameAction.PAUSE)

    input.reset()
    pressKey(input, 'F1')
    expect(input.update(16)).toContain(GameAction.PAUSE)
  })

  it('RESTART fires for r key', () => {
    pressKey(input, 'r')
    expect(input.update(16)).toContain(GameAction.RESTART)
  })

  it('reset() clears all state so no actions fire until new keydown', () => {
    pressKey(input, 'ArrowLeft')
    input.update(1)

    input.reset()

    const actions = input.update(16)
    expect(actions.length).toBe(0)
  })
})
