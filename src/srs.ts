import type { Board } from './board'
import type { Piece } from './piece'
import { TetrominoType } from './piece'

export type RotateResult = { success: boolean; kickIndex: number }

// Wall kick offsets for J, L, S, T, Z pieces.
// [dx, dy] with y already negated for screen coordinates (y+ = down).
// Keys: "fromRotation>toRotation"
const JLSTZ_KICKS: Record<string, [number, number][]> = {
  // CW transitions
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  // CCW transitions
  '1>0': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
}

// Wall kick offsets for I piece (separate table per SRS spec).
const I_KICKS: Record<string, [number, number][]> = {
  // CW transitions
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  // CCW transitions
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
}

// tryRotate attempts to rotate the piece using SRS wall kicks.
// On success, mutates piece.x, piece.y, and piece.rotation.
// Returns success flag and which kick index (0 = no kick, 1-4 = wall kick).
export function tryRotate(
  piece: Piece,
  board: Board,
  direction: 1 | -1
): RotateResult {
  // O-piece does not rotate
  if (piece.type === TetrominoType.O) {
    return { success: false, kickIndex: -1 }
  }

  const targetRotation = (piece.rotation + direction + 4) % 4
  const key = `${piece.rotation}>${targetRotation}`
  const kicks = piece.type === TetrominoType.I ? I_KICKS[key] : JLSTZ_KICKS[key]

  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i]
    if (!board.checkCollision(piece, dx, dy, targetRotation)) {
      piece.x += dx
      piece.y += dy
      piece.rotation = targetRotation
      return { success: true, kickIndex: i }
    }
  }

  return { success: false, kickIndex: -1 }
}

// Detect T-Spin after a T-piece locks in place.
// Returns 'full', 'mini', or 'none'.
export function detectTSpin(
  piece: Piece,
  board: Board,
  lastMoveWasRotation: boolean,
  kickIndex: number
): 'none' | 'mini' | 'full' {
  if (piece.type !== TetrominoType.T) return 'none'
  if (!lastMoveWasRotation) return 'none'

  // Center of the T-piece bounding box in board coordinates
  const cx = piece.x + 1
  const cy = piece.y + 1

  const isBlocked = (x: number, y: number): boolean =>
    !board.isInBounds(x, y) || board.isOccupied(x, y)

  // All 4 diagonal corners around the center
  const corners = [
    { x: cx - 1, y: cy - 1 }, // top-left     [0]
    { x: cx + 1, y: cy - 1 }, // top-right    [1]
    { x: cx - 1, y: cy + 1 }, // bottom-left  [2]
    { x: cx + 1, y: cy + 1 }, // bottom-right [3]
  ]

  const occupiedCount = corners.filter((c) => isBlocked(c.x, c.y)).length
  if (occupiedCount < 3) return 'none'

  // Front corners are the two corners in the direction the T stem points
  let frontA: { x: number; y: number }
  let frontB: { x: number; y: number }
  switch (piece.rotation) {
    case 0: // stem up
      frontA = corners[0]
      frontB = corners[1]
      break
    case 1: // stem right
      frontA = corners[1]
      frontB = corners[3]
      break
    case 2: // stem down
      frontA = corners[2]
      frontB = corners[3]
      break
    default: // stem left (rotation 3)
      frontA = corners[0]
      frontB = corners[2]
  }

  const bothFrontOccupied =
    isBlocked(frontA.x, frontA.y) && isBlocked(frontB.x, frontB.y)

  // Kick index 4 (last-resort kick) with 3+ corners = full T-Spin override
  if (kickIndex === 4) return 'full'
  if (kickIndex === 0 || !bothFrontOccupied) return 'mini'
  return 'full'
}
