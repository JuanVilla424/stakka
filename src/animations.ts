import { TETROMINO_COLORS, TetrominoType } from './piece'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

interface Animation {
  elapsed: number
  duration: number
  draw: (ctx: CanvasRenderingContext2D, t: number) => void
}

interface ShakeState {
  elapsed: number
  duration: number
  amplitude: number
}

export class AnimationManager {
  private animations: Animation[] = []
  private particles: Particle[] = []
  private shake: ShakeState | null = null

  update(dt: number): void {
    for (const anim of this.animations) {
      anim.elapsed += dt
    }
    this.animations = this.animations.filter((a) => a.elapsed < a.duration)

    const GRAVITY = 0.0005 // px/ms²
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += GRAVITY * dt
      p.life -= dt / 500
    }
    this.particles = this.particles.filter((p) => p.life > 0)

    if (this.shake) {
      this.shake.elapsed += dt
      if (this.shake.elapsed >= this.shake.duration) {
        this.shake = null
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const anim of this.animations) {
      const t = Math.min(anim.elapsed / anim.duration, 1)
      anim.draw(ctx, t)
    }
    ctx.restore()
  }

  drawParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.restore()
  }

  isAnimating(): boolean {
    return this.animations.length > 0 || this.particles.length > 0
  }

  getShakeOffset(): { x: number; y: number } {
    if (!this.shake) return { x: 0, y: 0 }
    const t = 1 - this.shake.elapsed / this.shake.duration
    const amplitude = this.shake.amplitude * t
    return {
      x: Math.sin(this.shake.elapsed * 0.08) * amplitude,
      y: Math.cos(this.shake.elapsed * 0.105) * amplitude,
    }
  }

  addLineClear(
    clearedGridRows: number[],
    colorData: number[][],
    cellSize: number,
    boardOffsetX: number,
    isTetris: boolean
  ): void {
    const canvasRows = clearedGridRows.map((r) => r - 2).filter((r) => r >= 0)
    const boardWidth = 10 * cellSize

    this.animations.push({
      elapsed: 0,
      duration: 300,
      draw: (ctx, t) => {
        const alpha = t < 0.5 ? 1.0 : (1.0 - t) * 2
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        for (const row of canvasRows) {
          ctx.fillRect(boardOffsetX, row * cellSize, boardWidth, cellSize)
        }
      },
    })

    for (let ri = 0; ri < clearedGridRows.length; ri++) {
      const gridRow = clearedGridRows[ri]
      if (gridRow < 2) continue
      const canvasRow = gridRow - 2
      const colors = colorData[ri]
      for (let col = 0; col < 10; col++) {
        const colorIndex = colors[col]
        if (colorIndex === 0) continue
        const color = TETROMINO_COLORS[(colorIndex - 1) as TetrominoType]
        const cx = boardOffsetX + col * cellSize + cellSize / 2
        const cy = canvasRow * cellSize + cellSize / 2
        const count = 1 + Math.floor(Math.random() * 2)
        for (let k = 0; k < count; k++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 0.05 + Math.random() * 0.2
          this.particles.push({
            x: cx + (Math.random() - 0.5) * cellSize,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.1,
            life: 0.8 + Math.random() * 0.2,
            color,
            size: 2 + Math.random() * 2,
          })
        }
      }
    }

    if (isTetris) {
      this.shake = { elapsed: 0, duration: 200, amplitude: 3 }
    }
  }

  addLockFlash(
    blocks: { x: number; y: number }[],
    cellSize: number,
    boardOffsetX: number
  ): void {
    this.animations.push({
      elapsed: 0,
      duration: 50,
      draw: (ctx, t) => {
        ctx.fillStyle = `rgba(255,255,255,${1 - t})`
        for (const b of blocks) {
          if (b.y < 2) continue
          const cx = boardOffsetX + b.x * cellSize
          const cy = (b.y - 2) * cellSize
          ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2)
        }
      },
    })
  }

  addHardDropTrail(
    blockCols: number[],
    fromGridY: number,
    toGridY: number,
    color: string,
    cellSize: number,
    boardOffsetX: number
  ): void {
    if (fromGridY >= toGridY) return
    this.animations.push({
      elapsed: 0,
      duration: 200,
      draw: (ctx, t) => {
        for (let gridRow = fromGridY; gridRow < toGridY; gridRow++) {
          if (gridRow < 2) continue
          const canvasRow = gridRow - 2
          const posFraction = (gridRow - fromGridY) / (toGridY - fromGridY)
          const alpha = (1 - posFraction) * (1 - t) * 0.6
          if (alpha <= 0) continue
          ctx.fillStyle = color
          ctx.globalAlpha = alpha
          for (const col of blockCols) {
            ctx.fillRect(
              boardOffsetX + col * cellSize + 2,
              canvasRow * cellSize + 2,
              cellSize - 4,
              cellSize - 4
            )
          }
        }
        ctx.globalAlpha = 1
      },
    })
  }

  addLevelUp(canvasWidth: number, canvasHeight: number): void {
    this.animations.push({
      elapsed: 0,
      duration: 100,
      draw: (ctx, t) => {
        ctx.fillStyle = `rgba(255,255,255,${0.2 * (1 - t)})`
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      },
    })
  }

  reset(): void {
    this.animations = []
    this.particles = []
    this.shake = null
  }
}
