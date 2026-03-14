// Minesweeper game engine

export interface CellState {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacentMines: number
}

export type GamePhase = "idle" | "playing" | "won" | "lost"

export interface MinesweeperState {
  rows: number
  cols: number
  totalMines: number
  phase: GamePhase
  board: CellState[][]
  revealedCount: number
  flaggedCount: number
  lastAction?: { type: string; row: number; col: number; chainSize?: number }
}

export class MinesweeperGame {
  private board: CellState[][] = []
  private rows = 0
  private cols = 0
  private totalMines = 0
  private phase: GamePhase = "idle"
  private revealedCount = 0
  private flaggedCount = 0
  private minesPlaced = false
  private lastAction?: MinesweeperState["lastAction"]

  newGame(rows: number, cols: number, mines: number): MinesweeperState {
    this.rows = rows
    this.cols = cols
    this.totalMines = Math.min(mines, rows * cols - 1)
    this.phase = "playing"
    this.revealedCount = 0
    this.flaggedCount = 0
    this.minesPlaced = false
    this.lastAction = undefined

    // Initialize empty board — mines placed on first reveal
    this.board = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        mine: false,
        revealed: false,
        flagged: false,
        adjacentMines: 0,
      }))
    )

    return this.getState()
  }

  private placeMines(safeRow: number, safeCol: number): void {
    // Ensure first click is always safe
    const positions: [number, number][] = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue
        positions.push([r, c])
      }
    }

    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]]
    }

    for (let i = 0; i < this.totalMines && i < positions.length; i++) {
      const [r, c] = positions[i]
      this.board[r][c].mine = true
    }

    // Calculate adjacent mine counts
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c].mine) continue
        this.board[r][c].adjacentMines = this.neighbors(r, c)
          .filter(([nr, nc]) => this.board[nr][nc].mine)
          .length
      }
    }

    this.minesPlaced = true
  }

  private neighbors(row: number, col: number): [number, number][] {
    const result: [number, number][] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          result.push([nr, nc])
        }
      }
    }
    return result
  }

  reveal(row: number, col: number): MinesweeperState {
    if (this.phase !== "playing") return this.getState()
    if (!this.inBounds(row, col)) return this.getState()

    const cell = this.board[row][col]
    if (cell.revealed || cell.flagged) return this.getState()

    if (!this.minesPlaced) {
      this.placeMines(row, col)
    }

    if (cell.mine) {
      cell.revealed = true
      this.phase = "lost"
      this.lastAction = { type: "reveal", row, col }
      return this.getState()
    }

    // Flood fill for empty cells
    const chainSize = this.floodReveal(row, col)
    this.lastAction = { type: "reveal", row, col, chainSize }
    this.checkWin()
    return this.getState()
  }

  private floodReveal(row: number, col: number): number {
    const cell = this.board[row][col]
    if (cell.revealed || cell.flagged || cell.mine) return 0

    cell.revealed = true
    this.revealedCount++
    let count = 1

    if (cell.adjacentMines === 0) {
      for (const [nr, nc] of this.neighbors(row, col)) {
        count += this.floodReveal(nr, nc)
      }
    }

    return count
  }

  toggleFlag(row: number, col: number): MinesweeperState {
    if (this.phase !== "playing") return this.getState()
    if (!this.inBounds(row, col)) return this.getState()

    const cell = this.board[row][col]
    if (cell.revealed) return this.getState()

    cell.flagged = !cell.flagged
    this.flaggedCount += cell.flagged ? 1 : -1
    this.lastAction = { type: cell.flagged ? "flag" : "unflag", row, col }
    return this.getState()
  }

  chord(row: number, col: number): MinesweeperState {
    if (this.phase !== "playing") return this.getState()
    if (!this.inBounds(row, col)) return this.getState()

    const cell = this.board[row][col]
    if (!cell.revealed || cell.adjacentMines === 0) return this.getState()

    // Count adjacent flags
    const adjacentFlags = this.neighbors(row, col)
      .filter(([nr, nc]) => this.board[nr][nc].flagged)
      .length

    if (adjacentFlags !== cell.adjacentMines) return this.getState()

    // Reveal all non-flagged neighbors
    let totalChain = 0
    for (const [nr, nc] of this.neighbors(row, col)) {
      const neighbor = this.board[nr][nc]
      if (!neighbor.revealed && !neighbor.flagged) {
        if (neighbor.mine) {
          neighbor.revealed = true
          this.phase = "lost"
          this.lastAction = { type: "chord", row, col }
          return this.getState()
        }
        totalChain += this.floodReveal(nr, nc)
      }
    }

    this.lastAction = { type: "chord", row, col, chainSize: totalChain }
    this.checkWin()
    return this.getState()
  }

  private checkWin(): void {
    const safeCells = this.rows * this.cols - this.totalMines
    if (this.revealedCount >= safeCells) {
      this.phase = "won"
    }
  }

  private inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols
  }

  getState(): MinesweeperState {
    return {
      rows: this.rows,
      cols: this.cols,
      totalMines: this.totalMines,
      phase: this.phase,
      board: this.board.map(row => row.map(cell => ({ ...cell }))),
      revealedCount: this.revealedCount,
      flaggedCount: this.flaggedCount,
      lastAction: this.lastAction,
    }
  }
}
