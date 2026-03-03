import { describe, it, expect, vi } from 'vitest'
import { PopupManager } from '../effects'

function createMockCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    textAlign: '',
    shadowColor: '',
    shadowBlur: 0,
    globalAlpha: 1,
    fillStyle: '',
    font: '',
  } as unknown as CanvasRenderingContext2D
}

describe('PopupManager', () => {
  it('starts empty — draw does not call ctx.save', () => {
    const pm = new PopupManager()
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('addPopup causes text to be drawn', () => {
    const pm = new PopupManager()
    pm.addPopup('TETRIS!', 300, 200, '#ffd700')
    const ctx = createMockCtx()
    pm.update(0)
    pm.draw(ctx)
    expect(ctx.fillText).toHaveBeenCalledWith('TETRIS!', 300, 200)
  })

  it('update removes popups at or beyond 800ms', () => {
    const pm = new PopupManager()
    pm.addPopup('SINGLE', 300, 200, '#ffffff')
    pm.update(800)
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('popup remains active at 799ms', () => {
    const pm = new PopupManager()
    pm.addPopup('SINGLE', 300, 200, '#ffffff')
    pm.update(799)
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('reset clears all popups', () => {
    const pm = new PopupManager()
    pm.addPopup('TETRIS!', 300, 200, '#ffd700')
    pm.reset()
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('popups float upward — y decreases as age increases', () => {
    const pm = new PopupManager()
    pm.addPopup('TETRIS!', 300, 200, '#ffd700')
    pm.update(400) // t = 0.5, easeOutQuad(0.5) = 0.75, offsetY = -30, y = 170
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.fillText).toHaveBeenCalledWith('TETRIS!', 300, 170)
  })

  it('popup alpha decreases to 0.5 at halfway point', () => {
    const pm = new PopupManager()
    pm.addPopup('SINGLE', 300, 200, '#ffffff')
    pm.update(400) // t = 0.5, alpha = 0.5
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.globalAlpha).toBe(0.5)
  })

  it('multiple popups are all drawn', () => {
    const pm = new PopupManager()
    pm.addPopup('TETRIS!', 300, 200, '#ffd700')
    pm.addPopup('COMBO ×2', 300, 228, '#ffcc00')
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.fillText).toHaveBeenCalledTimes(2)
  })

  it('custom fontSize is applied', () => {
    const pm = new PopupManager()
    pm.addPopup('COMBO ×3', 300, 200, '#ffcc00', 24)
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.font).toBe('bold 24px monospace')
  })

  it('update accumulates dt across multiple calls', () => {
    const pm = new PopupManager()
    pm.addPopup('DOUBLE', 300, 200, '#ffffff')
    pm.update(400)
    pm.update(400) // total 800ms — should expire
    const ctx = createMockCtx()
    pm.draw(ctx)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('addPopup increases count', () => {
    const pm = new PopupManager()
    expect(pm.count).toBe(0)
    pm.addPopup('SINGLE', 300, 200, '#ffffff')
    expect(pm.count).toBe(1)
    pm.addPopup('DOUBLE', 300, 228, '#ffffff')
    expect(pm.count).toBe(2)
  })

  it('custom duration of 500ms: active at 499ms, expired at 500ms', () => {
    const pm1 = new PopupManager()
    pm1.addPopup('TETRIS!', 300, 200, '#ffd700', 18, 500)
    pm1.update(499)
    const ctx1 = createMockCtx()
    pm1.draw(ctx1)
    expect(ctx1.fillText).toHaveBeenCalled()

    const pm2 = new PopupManager()
    pm2.addPopup('TETRIS!', 300, 200, '#ffd700', 18, 500)
    pm2.update(500)
    const ctx2 = createMockCtx()
    pm2.draw(ctx2)
    expect(ctx2.save).not.toHaveBeenCalled()
  })
})
