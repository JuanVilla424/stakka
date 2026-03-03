import { TetrominoType } from './piece'

export class BagRandomizer {
  private bag: TetrominoType[] = []

  private shuffledBag(): TetrominoType[] {
    const types: TetrominoType[] = [0, 1, 2, 3, 4, 5, 6]
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[types[i], types[j]] = [types[j], types[i]]
    }
    return types
  }

  private ensureMinimum(count: number): void {
    while (this.bag.length < count) {
      // pop() consumes from the end, so prepend new bag to be consumed after current items
      this.bag = [...this.shuffledBag(), ...this.bag]
    }
  }

  next(): TetrominoType {
    this.ensureMinimum(1)
    return this.bag.pop()!
  }

  peek(count: number): TetrominoType[] {
    this.ensureMinimum(count)
    // bag is consumed from the end (pop), so reverse gives consumption order
    return [...this.bag].reverse().slice(0, count)
  }

  reset(): void {
    this.bag = []
  }
}
