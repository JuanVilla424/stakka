import { describe, it, expect, beforeEach } from 'vitest'
import { ScoreManager } from '../scoring'

describe('ScoreManager', () => {
  let sm: ScoreManager

  beforeEach(() => {
    sm = new ScoreManager()
  })

  // --- Line clear points ---

  it('single clear awards 100 × level', () => {
    const ev = sm.processLineClear(1, 'none')
    expect(ev.points).toBe(100)
    expect(ev.label).toContain('SINGLE')
  })

  it('double clear awards 300 × level', () => {
    const ev = sm.processLineClear(2, 'none')
    expect(ev.points).toBe(300)
    expect(ev.label).toContain('DOUBLE')
  })

  it('triple clear awards 500 × level', () => {
    const ev = sm.processLineClear(3, 'none')
    expect(ev.points).toBe(500)
    expect(ev.label).toContain('TRIPLE')
  })

  it('tetris awards 800 × level', () => {
    const ev = sm.processLineClear(4, 'none')
    expect(ev.points).toBe(800)
    expect(ev.label).toContain('TETRIS!')
  })

  it('no lines + no t-spin returns 0 points and resets combo', () => {
    // First build a combo
    sm.processLineClear(1, 'none')
    sm.processLineClear(1, 'none')
    // Now miss
    const ev = sm.processLineClear(0, 'none')
    expect(ev.points).toBe(0)
    expect(sm.combo).toBe(-1)
  })

  // --- T-Spin scoring ---

  it('t-spin mini (0 lines) awards 100 × level', () => {
    const ev = sm.processLineClear(0, 'mini')
    expect(ev.points).toBe(100)
    expect(ev.label).toContain('T-SPIN MINI')
  })

  it('t-spin mini single awards 200 × level', () => {
    const ev = sm.processLineClear(1, 'mini')
    expect(ev.points).toBe(200)
    expect(ev.label).toContain('T-SPIN MINI SINGLE')
  })

  it('t-spin full (0 lines) awards 400 × level', () => {
    const ev = sm.processLineClear(0, 'full')
    expect(ev.points).toBe(400)
    expect(ev.label).toContain('T-SPIN')
  })

  it('t-spin single awards 800 × level', () => {
    const ev = sm.processLineClear(1, 'full')
    expect(ev.points).toBe(800)
    expect(ev.label).toContain('T-SPIN SINGLE')
  })

  it('t-spin double awards 1200 × level', () => {
    const ev = sm.processLineClear(2, 'full')
    expect(ev.points).toBe(1200)
    expect(ev.label).toContain('T-SPIN DOUBLE')
  })

  it('t-spin triple awards 1600 × level', () => {
    const ev = sm.processLineClear(3, 'full')
    expect(ev.points).toBe(1600)
    expect(ev.label).toContain('T-SPIN TRIPLE')
  })

  // --- Combo ---

  it('first clear has combo 0, no bonus', () => {
    const ev = sm.processLineClear(1, 'none')
    expect(sm.combo).toBe(0)
    expect(ev.points).toBe(100) // no combo bonus on first clear
  })

  it('second consecutive clear has combo 1 and adds 50 bonus', () => {
    sm.processLineClear(1, 'none') // combo 0
    const ev = sm.processLineClear(1, 'none') // combo 1
    expect(sm.combo).toBe(1)
    // 100 (single) + 50×1×1 (combo) = 150
    expect(ev.points).toBe(150)
    expect(ev.label).toContain('COMBO')
  })

  it('combo resets after a miss', () => {
    sm.processLineClear(1, 'none')
    sm.processLineClear(1, 'none')
    sm.processLineClear(0, 'none') // miss
    expect(sm.combo).toBe(-1)
    const ev = sm.processLineClear(1, 'none') // next clear starts fresh
    expect(sm.combo).toBe(0)
    expect(ev.points).toBe(100) // no combo bonus
  })

  it('combo counter increments correctly across multiple clears', () => {
    sm.processLineClear(1, 'none') // combo 0
    sm.processLineClear(1, 'none') // combo 1
    sm.processLineClear(1, 'none') // combo 2
    expect(sm.combo).toBe(2)
    // combo bonus at combo=2: 50×2×1 = 100 extra on top of 100 = 200
    // That last event should have points = 100 + 100 = 200
    const ev = sm.processLineClear(1, 'none') // combo 3
    expect(ev.points).toBe(100 + 50 * 3 * 1)
  })

  // --- Back-to-back ---

  it('back-to-back tetris applies 1.5× multiplier', () => {
    sm.processLineClear(4, 'none') // first tetris, sets b2b flag
    const ev = sm.processLineClear(4, 'none') // b2b tetris
    expect(ev.isBackToBack).toBe(true)
    // floor(800 * 1.5) * 1 + combo bonus(50×1×1) = 1200 + 50 = 1250
    expect(ev.points).toBe(1250)
    expect(ev.label).toContain('B2B')
  })

  it('back-to-back resets after non-difficult clear', () => {
    sm.processLineClear(4, 'none') // tetris → b2b true
    sm.processLineClear(1, 'none') // single → b2b resets
    const ev = sm.processLineClear(4, 'none') // tetris again, no b2b
    expect(ev.isBackToBack).toBe(false)
  })

  it('t-spin double triggers back-to-back', () => {
    sm.processLineClear(2, 'full') // t-spin double, sets b2b
    const ev = sm.processLineClear(4, 'none') // tetris after t-spin double
    expect(ev.isBackToBack).toBe(true)
  })

  // --- Level progression ---

  it('starts at level 1', () => {
    expect(sm.level).toBe(1)
  })

  it('level increases every 10 lines', () => {
    // Clear 10 singles
    for (let i = 0; i < 10; i++) {
      sm.processLineClear(1, 'none')
    }
    expect(sm.level).toBe(2)
    expect(sm.totalLines).toBe(10)
  })

  it('level 2 scores are doubled', () => {
    // Get to level 2
    for (let i = 0; i < 10; i++) sm.processLineClear(1, 'none')
    // Reset combo by missing
    sm.processLineClear(0, 'none')
    const ev = sm.processLineClear(1, 'none') // single at level 2
    expect(ev.points).toBe(200) // 100 × 2
  })

  it('level increases by tetris (4 lines)', () => {
    // 2 tetrises = 8 lines, then 1 double = 10 lines → level 2
    sm.processLineClear(4, 'none')
    sm.processLineClear(4, 'none')
    sm.processLineClear(2, 'none')
    expect(sm.totalLines).toBe(10)
    expect(sm.level).toBe(2)
  })

  it('custom starting level works', () => {
    const sm5 = new ScoreManager(5)
    expect(sm5.level).toBe(5)
    const ev = sm5.processLineClear(1, 'none')
    expect(ev.points).toBe(500) // 100 × 5
  })

  // --- Gravity delay ---

  it('level 1 gravity delay is ~1000ms', () => {
    expect(sm.getGravityDelay()).toBe(1000)
  })

  it('gravity delay decreases as level increases', () => {
    const d1 = sm.getGravityDelay()
    for (let i = 0; i < 10; i++) sm.processLineClear(1, 'none')
    const d2 = sm.getGravityDelay()
    expect(d2).toBeLessThan(d1)
  })

  it('gravity delay floor is 11ms at high levels', () => {
    const smHigh = new ScoreManager(30)
    expect(smHigh.getGravityDelay()).toBe(11)
  })

  it('level 20 gravity delay is 11ms', () => {
    const sm20 = new ScoreManager(20)
    expect(sm20.getGravityDelay()).toBe(11)
  })

  // --- Soft/Hard drop ---

  it('addSoftDrop adds 1 point per cell', () => {
    sm.addSoftDrop(5)
    expect(sm.score).toBe(5)
  })

  it('addHardDrop adds 2 points per cell', () => {
    sm.addHardDrop(10)
    expect(sm.score).toBe(20)
  })

  // --- Reset ---

  it('reset clears all state', () => {
    sm.processLineClear(4, 'none')
    sm.addHardDrop(5)
    sm.reset()
    expect(sm.score).toBe(0)
    expect(sm.level).toBe(1)
    expect(sm.totalLines).toBe(0)
    expect(sm.combo).toBe(-1)
  })
})
