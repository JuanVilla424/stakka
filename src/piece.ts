import type { Block } from './types'

export enum TetrominoType {
  I = 0,
  O = 1,
  T = 2,
  S = 3,
  Z = 4,
  J = 5,
  L = 6,
}

// 4 rotation states per piece; true = block present
// I and O use 4×4, others use 3×3
export const TETROMINO_SHAPES: Record<TetrominoType, boolean[][][]> = {
  [TetrominoType.I]: [
    [
      [false, false, false, false],
      [true, true, true, true],
      [false, false, false, false],
      [false, false, false, false],
    ],
    [
      [false, false, true, false],
      [false, false, true, false],
      [false, false, true, false],
      [false, false, true, false],
    ],
    [
      [false, false, false, false],
      [false, false, false, false],
      [true, true, true, true],
      [false, false, false, false],
    ],
    [
      [false, true, false, false],
      [false, true, false, false],
      [false, true, false, false],
      [false, true, false, false],
    ],
  ],
  [TetrominoType.O]: [
    [
      [false, true, true, false],
      [false, true, true, false],
      [false, false, false, false],
      [false, false, false, false],
    ],
    [
      [false, true, true, false],
      [false, true, true, false],
      [false, false, false, false],
      [false, false, false, false],
    ],
    [
      [false, true, true, false],
      [false, true, true, false],
      [false, false, false, false],
      [false, false, false, false],
    ],
    [
      [false, true, true, false],
      [false, true, true, false],
      [false, false, false, false],
      [false, false, false, false],
    ],
  ],
  [TetrominoType.T]: [
    [
      [false, true, false],
      [true, true, true],
      [false, false, false],
    ],
    [
      [false, true, false],
      [false, true, true],
      [false, true, false],
    ],
    [
      [false, false, false],
      [true, true, true],
      [false, true, false],
    ],
    [
      [false, true, false],
      [true, true, false],
      [false, true, false],
    ],
  ],
  [TetrominoType.S]: [
    [
      [false, true, true],
      [true, true, false],
      [false, false, false],
    ],
    [
      [false, true, false],
      [false, true, true],
      [false, false, true],
    ],
    [
      [false, false, false],
      [false, true, true],
      [true, true, false],
    ],
    [
      [true, false, false],
      [true, true, false],
      [false, true, false],
    ],
  ],
  [TetrominoType.Z]: [
    [
      [true, true, false],
      [false, true, true],
      [false, false, false],
    ],
    [
      [false, false, true],
      [false, true, true],
      [false, true, false],
    ],
    [
      [false, false, false],
      [true, true, false],
      [false, true, true],
    ],
    [
      [false, true, false],
      [true, true, false],
      [true, false, false],
    ],
  ],
  [TetrominoType.J]: [
    [
      [true, false, false],
      [true, true, true],
      [false, false, false],
    ],
    [
      [false, true, true],
      [false, true, false],
      [false, true, false],
    ],
    [
      [false, false, false],
      [true, true, true],
      [false, false, true],
    ],
    [
      [false, true, false],
      [false, true, false],
      [true, true, false],
    ],
  ],
  [TetrominoType.L]: [
    [
      [false, false, true],
      [true, true, true],
      [false, false, false],
    ],
    [
      [false, true, false],
      [false, true, false],
      [false, true, true],
    ],
    [
      [false, false, false],
      [true, true, true],
      [true, false, false],
    ],
    [
      [true, true, false],
      [false, true, false],
      [false, true, false],
    ],
  ],
}

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  [TetrominoType.I]: '#00f0f0',
  [TetrominoType.O]: '#f0f000',
  [TetrominoType.T]: '#a000f0',
  [TetrominoType.S]: '#00f000',
  [TetrominoType.Z]: '#f00000',
  [TetrominoType.J]: '#0000f0',
  [TetrominoType.L]: '#f0a000',
}

export class Piece {
  type: TetrominoType
  x: number
  y: number
  rotation: number

  constructor(type: TetrominoType, x = 3, y = 0, rotation = 0) {
    this.type = type
    this.x = x
    this.y = y
    this.rotation = rotation
  }

  getBlocks(): Block[] {
    const shape = TETROMINO_SHAPES[this.type][this.rotation]
    const blocks: Block[] = []
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          blocks.push({ x: this.x + col, y: this.y + row })
        }
      }
    }
    return blocks
  }

  clone(): Piece {
    return new Piece(this.type, this.x, this.y, this.rotation)
  }
}
