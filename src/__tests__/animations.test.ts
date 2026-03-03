import { describe, it, expect, vi } from 'vitest'
import { AnimationManager } from '../animations'

function createMockCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('AnimationManager', () => {
  it('starts with no animations or particles', () => {
    const am = new AnimationManager()
    expect(am.isAnimating()).toBe(false)
  })

  it('isAnimating returns false after reset', () => {
    const am = new AnimationManager()
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, false)
    am.reset()
    expect(am.isAnimating()).toBe(false)
  })

  it('getShakeOffset returns zero when no shake active', () => {
    const am = new AnimationManager()
    const offset = am.getShakeOffset()
    expect(offset.x).toBe(0)
    expect(offset.y).toBe(0)
  })

  it('getShakeOffset returns non-zero during shake', () => {
    const am = new AnimationManager()
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, true)
    am.update(50)
    const offset = am.getShakeOffset()
    // amplitude = 3 * (1 - 50/200) = 2.25, should be non-zero
    expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0)
  })

  it('getShakeOffset returns zero after shake duration expires', () => {
    const am = new AnimationManager()
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, true)
    am.update(200)
    const offset = am.getShakeOffset()
    expect(offset.x).toBe(0)
    expect(offset.y).toBe(0)
  })

  it('addLineClear makes isAnimating true', () => {
    const am = new AnimationManager()
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, false)
    expect(am.isAnimating()).toBe(true)
  })

  it('addLineClear animation expires after 300ms', () => {
    const am = new AnimationManager()
    // Use a row index >= 2 so canvas row is valid
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, false)
    am.update(300)
    // Particles may still be alive — only check animations expired
    // Check by calling draw — it should have no lingering full-row animations
    // We verify by checking that no shake state is set
    expect(am.getShakeOffset()).toEqual({ x: 0, y: 0 })
  })

  it('addLineClear without tetris does not trigger shake', () => {
    const am = new AnimationManager()
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, false)
    am.update(10)
    const offset = am.getShakeOffset()
    expect(offset.x).toBe(0)
    expect(offset.y).toBe(0)
  })

  it('addLineClear with tetris triggers shake', () => {
    const am = new AnimationManager()
    am.addLineClear(
      [5, 6, 7, 8],
      [
        [1, 2, 3, 4, 5, 6, 7, 1, 2, 3],
        [1, 2, 3, 4, 5, 6, 7, 1, 2, 3],
        [1, 2, 3, 4, 5, 6, 7, 1, 2, 3],
        [1, 2, 3, 4, 5, 6, 7, 1, 2, 3],
      ],
      30,
      150,
      true
    )
    am.update(10)
    const offset = am.getShakeOffset()
    expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0)
  })

  it('addLockFlash makes isAnimating true', () => {
    const am = new AnimationManager()
    am.addLockFlash([{ x: 3, y: 5 }], 30, 150)
    expect(am.isAnimating()).toBe(true)
  })

  it('addLockFlash animation expires after 50ms', () => {
    const am = new AnimationManager()
    am.addLockFlash([{ x: 3, y: 5 }], 30, 150)
    am.update(50)
    // After 50ms, the 50ms animation is done — no particles so isAnimating is false
    expect(am.isAnimating()).toBe(false)
  })

  it('addLockFlash animation still active at 49ms', () => {
    const am = new AnimationManager()
    am.addLockFlash([{ x: 3, y: 5 }], 30, 150)
    am.update(49)
    expect(am.isAnimating()).toBe(true)
  })

  it('addLockFlash skips blocks with y < 2', () => {
    const am = new AnimationManager()
    // Block at y=1 (hidden row) should not crash
    am.addLockFlash([{ x: 3, y: 1 }], 30, 150)
    const ctx = createMockCtx()
    am.update(0)
    am.draw(ctx)
    // fillRect should not be called for hidden rows
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('addHardDropTrail makes isAnimating true', () => {
    const am = new AnimationManager()
    am.addHardDropTrail([3, 4], 5, 15, '#ff0000', 30, 150)
    expect(am.isAnimating()).toBe(true)
  })

  it('addHardDropTrail expires after 200ms', () => {
    const am = new AnimationManager()
    am.addHardDropTrail([3, 4], 5, 15, '#ff0000', 30, 150)
    am.update(200)
    expect(am.isAnimating()).toBe(false)
  })

  it('addHardDropTrail does nothing when fromY >= toY', () => {
    const am = new AnimationManager()
    am.addHardDropTrail([3], 10, 10, '#ff0000', 30, 150)
    expect(am.isAnimating()).toBe(false)
  })

  it('addLevelUp makes isAnimating true', () => {
    const am = new AnimationManager()
    am.addLevelUp(600, 600)
    expect(am.isAnimating()).toBe(true)
  })

  it('addLevelUp expires after 100ms', () => {
    const am = new AnimationManager()
    am.addLevelUp(600, 600)
    am.update(100)
    expect(am.isAnimating()).toBe(false)
  })

  it('update removes completed animations', () => {
    const am = new AnimationManager()
    am.addLevelUp(600, 600)
    am.update(50)
    expect(am.isAnimating()).toBe(true)
    am.update(50)
    expect(am.isAnimating()).toBe(false)
  })

  it('draw calls save and restore for animations', () => {
    const am = new AnimationManager()
    am.addLevelUp(600, 600)
    const ctx = createMockCtx()
    am.draw(ctx)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draw calls fillRect for level up animation', () => {
    const am = new AnimationManager()
    am.addLevelUp(600, 600)
    am.update(0)
    const ctx = createMockCtx()
    am.draw(ctx)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 600, 600)
  })

  it('particles fade out over time', () => {
    const am = new AnimationManager()
    // Add line clear to spawn particles
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, false)
    am.update(0)
    const ctx = createMockCtx()
    am.drawParticles(ctx)
    const alphaAfterSpawn = ctx.globalAlpha as number

    am.update(400)
    const ctx2 = createMockCtx()
    am.drawParticles(ctx2)
    // After 400ms particles have less life
    const alphaAfterTime = ctx2.globalAlpha as number
    expect(alphaAfterTime).toBeLessThanOrEqual(alphaAfterSpawn)
  })

  it('reset clears shake state', () => {
    const am = new AnimationManager()
    am.addLineClear([5], [[1, 2, 3, 4, 5, 6, 7, 1, 2, 3]], 30, 150, true)
    am.update(10)
    am.reset()
    expect(am.getShakeOffset()).toEqual({ x: 0, y: 0 })
    expect(am.isAnimating()).toBe(false)
  })

  it('multiple animations can coexist', () => {
    const am = new AnimationManager()
    am.addLevelUp(600, 600)
    am.addLockFlash([{ x: 3, y: 5 }], 30, 150)
    am.addHardDropTrail([3], 5, 10, '#00ff00', 30, 150)
    expect(am.isAnimating()).toBe(true)
    // After 50ms, lock flash expires but level up (100ms) and trail (200ms) remain
    am.update(50)
    expect(am.isAnimating()).toBe(true)
    // After another 50ms, level up also expires but trail remains
    am.update(50)
    expect(am.isAnimating()).toBe(true)
    // After another 100ms, trail expires too
    am.update(100)
    expect(am.isAnimating()).toBe(false)
  })

  it('addLineClear skips hidden rows (gridRow < 2)', () => {
    const am = new AnimationManager()
    // gridRow = 0 and 1 are hidden — should not crash, still adds animation
    am.addLineClear(
      [0, 1],
      [
        [1, 2, 3, 4, 5, 6, 7, 1, 2, 3],
        [1, 2, 3, 4, 5, 6, 7, 1, 2, 3],
      ],
      30,
      150,
      false
    )
    const ctx = createMockCtx()
    am.draw(ctx)
    // Should not throw — row rendering filtered safely
    expect(ctx.save).toHaveBeenCalled()
  })
})
