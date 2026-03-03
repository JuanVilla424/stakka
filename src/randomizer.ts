import { TetrominoType } from './piece'

export class BagRandomizer {
  private bag: TetrominoType[] = []

  private fillBag(): void {
    const types: TetrominoType[] = [0, 1, 2, 3, 4, 5, 6]
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[types[i], types[j]] = [types[j], types[i]]
    }
    this.bag = types
  }

  next(): TetrominoType {
    if (this.bag.length === 0) {
      this.fillBag()
    }
    return this.bag.pop()!
  }

  peek(count: number): TetrominoType[] {
    if (this.bag.length === 0) {
      this.fillBag()
    }
    // Pop order is reversed bag array
    const sequence: TetrominoType[] = [...this.bag].reverse()
    while (sequence.length < count) {
      const extra: TetrominoType[] = [0, 1, 2, 3, 4, 5, 6]
      for (let i = extra.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[extra[i], extra[j]] = [extra[j], extra[i]]
      }
      sequence.push(...[...extra].reverse())
    }
    return sequence.slice(0, count)
  }

  reset(): void {
    this.bag = []
  }
}
