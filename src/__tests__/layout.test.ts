import { describe, it, expect, vi } from 'vitest'
import { LayoutManager } from '../layout'

describe('LayoutManager', () => {
  describe('calculateLayout', () => {
    it('clamps cellSize to minimum 16 on small viewport', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(375, 667)
      expect(lm.cellSize).toBe(16)
    })

    it('clamps cellSize to maximum 36 on large viewport', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1920, 1080)
      expect(lm.cellSize).toBe(36)
    })

    it('calculates unclamped cellSize correctly for mid-range viewport', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(768, 1024)
      // min(768*0.8/20, 1024*0.85/20) = min(30.72, 43.52) = floor(30.72) = 30
      expect(lm.cellSize).toBe(30)
    })

    it('sets breakpoint to mobile when width < 768', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(767, 900)
      expect(lm.breakpoint).toBe('mobile')
    })

    it('sets breakpoint to tablet when width is 768', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(768, 1024)
      expect(lm.breakpoint).toBe('tablet')
    })

    it('sets breakpoint to tablet when width is 1023', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1023, 768)
      expect(lm.breakpoint).toBe('tablet')
    })

    it('sets breakpoint to desktop when width >= 1024', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1024, 768)
      expect(lm.breakpoint).toBe('desktop')
    })

    it('sets nextPieceCount to 3 on mobile', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(375, 667)
      expect(lm.nextPieceCount).toBe(3)
    })

    it('sets nextPieceCount to 4 on tablet', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(768, 1024)
      expect(lm.nextPieceCount).toBe(4)
    })

    it('sets nextPieceCount to 5 on desktop', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1920, 1080)
      expect(lm.nextPieceCount).toBe(5)
    })

    it('sets canvasWidth to 20 * cellSize', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1920, 1080)
      expect(lm.canvasWidth).toBe(20 * lm.cellSize)
    })

    it('sets canvasHeight to 20 * cellSize', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1920, 1080)
      expect(lm.canvasHeight).toBe(20 * lm.cellSize)
    })
  })

  describe('snapshot', () => {
    it('returns current layout values', () => {
      const lm = new LayoutManager()
      lm.calculateLayout(1920, 1080)
      const snap = lm.snapshot()
      expect(snap.cellSize).toBe(lm.cellSize)
      expect(snap.breakpoint).toBe(lm.breakpoint)
      expect(snap.nextPieceCount).toBe(lm.nextPieceCount)
      expect(snap.canvasWidth).toBe(lm.canvasWidth)
      expect(snap.canvasHeight).toBe(lm.canvasHeight)
    })
  })

  describe('getOrientation', () => {
    it('returns portrait in node environment (window undefined)', () => {
      const lm = new LayoutManager()
      // In node env, window is undefined — getOrientation guards against this
      expect(lm.getOrientation()).toBe('portrait')
    })

    it('returns portrait when window height > width', () => {
      vi.stubGlobal('window', { innerWidth: 375, innerHeight: 667 })
      const lm = new LayoutManager()
      expect(lm.getOrientation()).toBe('portrait')
      vi.unstubAllGlobals()
    })

    it('returns landscape when window width > height', () => {
      vi.stubGlobal('window', { innerWidth: 667, innerHeight: 375 })
      const lm = new LayoutManager()
      expect(lm.getOrientation()).toBe('landscape')
      vi.unstubAllGlobals()
    })
  })

  describe('isMobileLandscape', () => {
    it('returns true when mobile breakpoint and landscape orientation', () => {
      vi.stubGlobal('window', { innerWidth: 667, innerHeight: 375 })
      const lm = new LayoutManager()
      lm.calculateLayout(667, 375)
      expect(lm.isMobileLandscape()).toBe(true)
      vi.unstubAllGlobals()
    })

    it('returns false when desktop breakpoint in landscape', () => {
      vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080 })
      const lm = new LayoutManager()
      lm.calculateLayout(1920, 1080)
      expect(lm.isMobileLandscape()).toBe(false)
      vi.unstubAllGlobals()
    })
  })

  describe('attach and detach', () => {
    it('calls resize callback on window resize event', async () => {
      const listeners: Record<string, EventListener> = {}
      const mockWindow = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: (e: string, fn: EventListener) => {
          listeners[e] = fn
        },
        removeEventListener: (e: string) => {
          delete listeners[e]
        },
      }
      vi.stubGlobal('window', mockWindow)
      const lm = new LayoutManager()
      const cb = vi.fn()
      lm.attach(cb)
      listeners['resize']?.(new Event('resize'))
      await new Promise((r) => setTimeout(r, 300))
      expect(cb).toHaveBeenCalledOnce()
      lm.detach()
      vi.unstubAllGlobals()
    })

    it('does not call callback after detach', async () => {
      const listeners: Record<string, EventListener> = {}
      const mockWindow = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: (e: string, fn: EventListener) => {
          listeners[e] = fn
        },
        removeEventListener: (e: string) => {
          delete listeners[e]
        },
      }
      vi.stubGlobal('window', mockWindow)
      const lm = new LayoutManager()
      const cb = vi.fn()
      lm.attach(cb)
      lm.detach()
      listeners['resize']?.(new Event('resize'))
      await new Promise((r) => setTimeout(r, 300))
      expect(cb).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })
})
