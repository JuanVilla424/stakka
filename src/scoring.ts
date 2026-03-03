export type TSpinType = 'none' | 'mini' | 'full'

export interface ScoreEvent {
  points: number
  label: string
  isBackToBack: boolean
  color: string
}

// Gravity delay in ms per level using the guideline formula.
// Precomputed for levels 1-20+. Values below 11ms are clamped to 11.
function computeGravityDelay(level: number): number {
  const delay = Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000
  return Math.max(Math.floor(delay), 11)
}

export class ScoreManager {
  private _score = 0
  private _level = 1
  private _totalLines = 0
  private _combo = -1
  private _backToBack = false
  private _startingLevel = 1

  constructor(startingLevel = 1) {
    this._startingLevel = startingLevel
    this._level = startingLevel
  }

  get score(): number {
    return this._score
  }

  get level(): number {
    return this._level
  }

  get totalLines(): number {
    return this._totalLines
  }

  get combo(): number {
    return this._combo
  }

  processLineClear(linesCleared: number, tSpinType: TSpinType): ScoreEvent {
    // No lines and no t-spin: reset combo, no points
    if (linesCleared === 0 && tSpinType === 'none') {
      this._combo = -1
      return { points: 0, label: '', isBackToBack: false, color: '#ffffff' }
    }

    const level = this._level
    let basePoints = 0
    let label = ''
    let isDifficult = false

    if (tSpinType === 'mini') {
      // T-Spin Mini variants
      isDifficult = linesCleared > 0
      switch (linesCleared) {
        case 0:
          basePoints = 100
          label = 'T-SPIN MINI'
          break
        case 1:
          basePoints = 200
          label = 'T-SPIN MINI SINGLE'
          break
        default:
          // Mini with 2+ lines treated as mini double (non-standard, use 400)
          basePoints = 400
          label = 'T-SPIN MINI DOUBLE'
          isDifficult = true
      }
    } else if (tSpinType === 'full') {
      // Full T-Spin variants
      isDifficult = linesCleared > 0
      switch (linesCleared) {
        case 0:
          basePoints = 400
          label = 'T-SPIN'
          break
        case 1:
          basePoints = 800
          label = 'T-SPIN SINGLE'
          break
        case 2:
          basePoints = 1200
          label = 'T-SPIN DOUBLE'
          break
        case 3:
          basePoints = 1600
          label = 'T-SPIN TRIPLE'
          break
        default:
          basePoints = 1600
          label = 'T-SPIN TRIPLE'
      }
    } else {
      // Normal line clears
      switch (linesCleared) {
        case 1:
          basePoints = 100
          label = 'SINGLE'
          break
        case 2:
          basePoints = 300
          label = 'DOUBLE'
          break
        case 3:
          basePoints = 500
          label = 'TRIPLE'
          break
        case 4:
          basePoints = 800
          label = 'TETRIS!'
          isDifficult = true
          break
        default:
          basePoints = 800
          label = 'TETRIS!'
          isDifficult = true
      }
    }

    // Back-to-back: applies only to difficult clears chained with previous difficult
    const applyB2B = this._backToBack && isDifficult && linesCleared > 0
    if (applyB2B) {
      basePoints = Math.floor(basePoints * 1.5)
      label += ' B2B'
    }

    // Update back-to-back flag
    if (linesCleared > 0) {
      this._backToBack = isDifficult
    }

    // Combo
    this._combo += 1
    let comboBonus = 0
    if (this._combo > 0) {
      comboBonus = 50 * this._combo * level
    }

    const points = basePoints * level + comboBonus
    this._score += points

    // Append combo label
    if (this._combo > 0) {
      label += '\nCOMBO \xD7' + this._combo
    }

    // Update lines and level
    this._totalLines += linesCleared
    this._level = this._startingLevel + Math.floor(this._totalLines / 10)

    let color = '#ffffff'
    if (tSpinType === 'mini' || tSpinType === 'full') {
      color = '#a000f0'
    } else if (linesCleared >= 4) {
      color = '#ffd700'
    }

    return { points, label, isBackToBack: applyB2B, color }
  }

  addSoftDrop(cells: number): void {
    this._score += cells
  }

  addHardDrop(cells: number): void {
    this._score += cells * 2
  }

  getGravityDelay(): number {
    return computeGravityDelay(this._level)
  }

  reset(startingLevel = 1): void {
    this._startingLevel = startingLevel
    this._level = startingLevel
    this._score = 0
    this._totalLines = 0
    this._combo = -1
    this._backToBack = false
  }
}
