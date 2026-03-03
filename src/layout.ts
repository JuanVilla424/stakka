export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

export interface Layout {
  cellSize: number
  breakpoint: Breakpoint
  nextPieceCount: number
  canvasWidth: number
  canvasHeight: number
}

const ROWS = 20
const TOTAL_COLS = 20 // 4 (hold) + 1 (gap) + 10 (board) + 1 (gap) + 4 (next)
const MIN_CELL = 16
const MAX_CELL = 36
const DEBOUNCE_MS = 250

export class LayoutManager {
  cellSize: number = MIN_CELL
  breakpoint: Breakpoint = 'desktop'
  nextPieceCount: number = 5
  canvasWidth: number = TOTAL_COLS * MIN_CELL
  canvasHeight: number = ROWS * MIN_CELL

  private onResize: ((layout: Layout) => void) | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private boundHandler: () => void

  constructor() {
    this.boundHandler = () => {
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.calculateLayout(window.innerWidth, window.innerHeight)
        if (this.onResize) this.onResize(this.snapshot())
      }, DEBOUNCE_MS)
    }
  }

  calculateLayout(viewportWidth: number, viewportHeight: number): void {
    const raw = Math.floor(
      Math.min(
        (viewportWidth * 0.8) / TOTAL_COLS,
        (viewportHeight * 0.85) / ROWS
      )
    )
    this.cellSize = Math.max(MIN_CELL, Math.min(MAX_CELL, raw))

    if (viewportWidth < 768) {
      this.breakpoint = 'mobile'
      this.nextPieceCount = 3
    } else if (viewportWidth < 1024) {
      this.breakpoint = 'tablet'
      this.nextPieceCount = 4
    } else {
      this.breakpoint = 'desktop'
      this.nextPieceCount = 5
    }

    this.canvasWidth = TOTAL_COLS * this.cellSize
    this.canvasHeight = ROWS * this.cellSize
  }

  attach(onResize: (layout: Layout) => void): void {
    this.onResize = onResize
    window.addEventListener('resize', this.boundHandler)
    window.addEventListener('orientationchange', this.boundHandler)
  }

  detach(): void {
    window.removeEventListener('resize', this.boundHandler)
    window.removeEventListener('orientationchange', this.boundHandler)
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.onResize = null
  }

  getOrientation(): Orientation {
    if (typeof window === 'undefined') return 'portrait'
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }

  isMobileLandscape(): boolean {
    return this.breakpoint === 'mobile' && this.getOrientation() === 'landscape'
  }

  snapshot(): Layout {
    return {
      cellSize: this.cellSize,
      breakpoint: this.breakpoint,
      nextPieceCount: this.nextPieceCount,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
    }
  }
}
