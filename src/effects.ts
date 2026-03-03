const POPUP_DURATION = 800

interface Popup {
  text: string
  x: number
  y: number
  color: string
  age: number
  fontSize: number
}

export class PopupManager {
  private popups: Popup[] = []

  addPopup(
    text: string,
    x: number,
    y: number,
    color: string,
    fontSize = 18
  ): void {
    this.popups.push({ text, x, y, color, age: 0, fontSize })
  }

  update(dt: number): void {
    for (const popup of this.popups) {
      popup.age += dt
    }
    this.popups = this.popups.filter((p) => p.age < POPUP_DURATION)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.popups.length === 0) return
    ctx.save()
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    for (const p of this.popups) {
      const t = p.age / POPUP_DURATION
      ctx.globalAlpha = 1 - t
      ctx.fillStyle = p.color
      ctx.font = `bold ${p.fontSize}px monospace`
      ctx.fillText(p.text, p.x, p.y - t * 40)
    }
    ctx.restore()
  }

  reset(): void {
    this.popups = []
  }
}
