function easeOutQuad(t: number): number {
  return t * (2 - t)
}

export interface Popup {
  text: string
  x: number
  y: number
  color: string
  age: number
  duration: number
  fontSize: number
}

export class PopupManager {
  private popups: Popup[] = []

  addPopup(
    text: string,
    x: number,
    y: number,
    color: string,
    fontSize = 18,
    duration = 800
  ): void {
    this.popups.push({ text, x, y, color, age: 0, duration, fontSize })
  }

  update(dt: number): void {
    for (const popup of this.popups) {
      popup.age += dt
    }
    this.popups = this.popups.filter((p) => p.age < p.duration)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.popups.length === 0) return
    ctx.save()
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    for (const p of this.popups) {
      const progress = p.age / p.duration
      const alpha = 1 - progress
      const offsetY = -40 * easeOutQuad(progress)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.font = `bold ${p.fontSize}px monospace`
      ctx.fillText(p.text, p.x, p.y + offsetY)
    }
    ctx.restore()
  }

  clear(): void {
    this.popups = []
  }

  reset(): void {
    this.clear()
  }

  get count(): number {
    return this.popups.length
  }
}
