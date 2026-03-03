import { describe, it, expect } from 'vitest'
import { BagRandomizer } from '../randomizer'
import { TetrominoType } from '../piece'

describe('BagRandomizer', () => {
  it('next() returns a valid TetrominoType', () => {
    const r = new BagRandomizer()
    const t = r.next()
    expect(t).toBeGreaterThanOrEqual(TetrominoType.I)
    expect(t).toBeLessThanOrEqual(TetrominoType.L)
  })

  it('every 7 consecutive pieces contains all 7 types exactly once', () => {
    const r = new BagRandomizer()
    const bag = Array.from({ length: 7 }, () => r.next())
    expect(new Set(bag).size).toBe(7)
  })

  it('second batch of 7 pieces also contains all 7 types', () => {
    const r = new BagRandomizer()
    for (let i = 0; i < 7; i++) r.next()
    const bag = Array.from({ length: 7 }, () => r.next())
    expect(new Set(bag).size).toBe(7)
  })

  it('reset() causes next 7 pieces to again contain all types', () => {
    const r = new BagRandomizer()
    r.next()
    r.next()
    r.reset()
    const bag = Array.from({ length: 7 }, () => r.next())
    expect(new Set(bag).size).toBe(7)
  })

  it('peek() returns the requested count without consuming', () => {
    const r = new BagRandomizer()
    const peeked = r.peek(3)
    expect(peeked).toHaveLength(3)
    expect(r.next()).toBe(peeked[0])
    expect(r.next()).toBe(peeked[1])
    expect(r.next()).toBe(peeked[2])
  })

  it('peek() does not consume pieces already in the bag', () => {
    const r = new BagRandomizer()
    // Consume 3 to leave 4 in the bag
    r.next()
    r.next()
    r.next()
    const peeked = r.peek(3)
    expect(r.next()).toBe(peeked[0])
    expect(r.next()).toBe(peeked[1])
    expect(r.next()).toBe(peeked[2])
  })

  it('peek() beyond one bag returns valid types', () => {
    const r = new BagRandomizer()
    const peeked = r.peek(14)
    expect(peeked).toHaveLength(14)
    for (const t of peeked) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(6)
    }
  })

  it('peek() first 7 span all types when starting fresh', () => {
    const r = new BagRandomizer()
    const peeked = r.peek(7)
    expect(new Set(peeked).size).toBe(7)
  })

  it('multiple calls to next() across bags always produce valid types', () => {
    const r = new BagRandomizer()
    for (let i = 0; i < 70; i++) {
      const t = r.next()
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(6)
    }
  })
})
