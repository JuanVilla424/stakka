import { describe, it, expect } from 'vitest'
import {
  Piece,
  TetrominoType,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
} from '../piece'

describe('Piece', () => {
  it('creates a piece with default values', () => {
    const p = new Piece(TetrominoType.T)
    expect(p.type).toBe(TetrominoType.T)
    expect(p.x).toBe(3)
    expect(p.y).toBe(0)
    expect(p.rotation).toBe(0)
  })

  it('clone produces an independent copy', () => {
    const p = new Piece(TetrominoType.I, 5, 10, 2)
    const c = p.clone()
    expect(c.type).toBe(p.type)
    expect(c.x).toBe(p.x)
    expect(c.y).toBe(p.y)
    expect(c.rotation).toBe(p.rotation)
    c.x = 0
    expect(p.x).toBe(5)
  })

  it('getBlocks returns 4 blocks for all pieces and rotations', () => {
    for (const type of Object.values(TetrominoType).filter(
      (v) => typeof v === 'number'
    ) as TetrominoType[]) {
      for (let rot = 0; rot < 4; rot++) {
        const p = new Piece(type, 0, 0, rot)
        expect(p.getBlocks()).toHaveLength(4)
      }
    }
  })

  it('getBlocks accounts for piece position offset', () => {
    const p = new Piece(TetrominoType.O, 3, 2, 0)
    const blocks = p.getBlocks()
    for (const b of blocks) {
      expect(b.x).toBeGreaterThanOrEqual(3)
      expect(b.y).toBeGreaterThanOrEqual(2)
    }
  })

  it('all 7 tetromino types have exactly 4 rotation states', () => {
    for (const type of Object.values(TetrominoType).filter(
      (v) => typeof v === 'number'
    ) as TetrominoType[]) {
      expect(TETROMINO_SHAPES[type]).toHaveLength(4)
    }
  })

  it('each rotation state contains exactly 4 true cells', () => {
    for (const type of Object.values(TetrominoType).filter(
      (v) => typeof v === 'number'
    ) as TetrominoType[]) {
      for (let rot = 0; rot < 4; rot++) {
        const shape = TETROMINO_SHAPES[type][rot]
        const count = shape.flat().filter(Boolean).length
        expect(count).toBe(4)
      }
    }
  })

  it('TETROMINO_COLORS defines a color for each type', () => {
    for (const type of Object.values(TetrominoType).filter(
      (v) => typeof v === 'number'
    ) as TetrominoType[]) {
      expect(TETROMINO_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('I-piece rotation 0 spans a horizontal row', () => {
    const p = new Piece(TetrominoType.I, 0, 0, 0)
    const blocks = p.getBlocks()
    const ys = blocks.map((b) => b.y)
    expect(new Set(ys).size).toBe(1) // all same row
  })

  it('I-piece rotation 1 spans a vertical column', () => {
    const p = new Piece(TetrominoType.I, 0, 0, 1)
    const blocks = p.getBlocks()
    const xs = blocks.map((b) => b.x)
    expect(new Set(xs).size).toBe(1) // all same column
  })
})
