// Minesweeper aibou plugin — bridges game state to the companion protocol

import type {
  AibouPlugin,
  GameStateEvent,
  GameStateEventTrigger,
  PluginManifest,
} from "@aibou-dev/core"
import type { MinesweeperState } from "./game.js"

let sessionCounter = 0

const manifest: PluginManifest = {
  gameId: "minesweeper",
  gameName: "Minesweeper",
  version: "0.1.0",
  gameContext: `
    Minesweeper is a logic puzzle on a grid of hidden cells. Some cells contain
    mines. When a safe cell is revealed, it shows a number indicating how many
    of its 8 neighbors are mines. A zero-cell triggers a chain reveal of all
    connected zero-cells. The player wins by revealing every non-mine cell.

    Crucially, some board positions are genuinely ambiguous — no amount of logic
    can determine which cell is safe. The companion should acknowledge this
    uncertainty honestly rather than pretending to know.
  `,
  companionHints: [
    "Never reveal mine locations, even if you can deduce them from rawBoard",
    "Acknowledge when a situation is a 50/50 guess — that's part of the game",
    "Celebrate chain reveals — they're satisfying",
    "When the player hits a mine, commiserate naturally, don't analyze what went wrong immediately",
    "Use spatial language: 'top-left corner', 'that cluster near the center'",
  ],
}

function summarizeState(state: MinesweeperState): string {
  const totalCells = state.rows * state.cols
  const safeCells = totalCells - state.totalMines
  const percentage = safeCells > 0
    ? Math.round((state.revealedCount / safeCells) * 100)
    : 0

  const parts: string[] = [
    `${state.rows}x${state.cols} board, ${state.totalMines} mines.`,
    `${state.revealedCount} of ${safeCells} safe cells revealed (${percentage}%).`,
  ]

  if (state.flaggedCount > 0) {
    parts.push(`${state.flaggedCount} flags placed.`)
  }

  if (state.lastAction) {
    const { type, row, col, chainSize } = state.lastAction
    if (type === "reveal") {
      if (chainSize && chainSize > 1) {
        parts.push(`Last move: opened (${row},${col}), triggered a chain reveal of ${chainSize} cells!`)
      } else {
        const cell = state.board[row]?.[col]
        if (cell?.mine) {
          parts.push(`Last move: opened (${row},${col}) — hit a mine.`)
        } else if (cell) {
          parts.push(`Last move: opened (${row},${col}), revealed a ${cell.adjacentMines}.`)
        }
      }
    } else if (type === "flag") {
      parts.push(`Last move: flagged (${row},${col}).`)
    } else if (type === "unflag") {
      parts.push(`Last move: removed flag from (${row},${col}).`)
    } else if (type === "chord") {
      parts.push(`Last move: chord-clicked (${row},${col}), revealed ${chainSize ?? 0} cells.`)
    }
  }

  if (state.phase === "won") {
    parts.push("Board cleared — victory!")
  } else if (state.phase === "lost") {
    parts.push("Hit a mine — game over.")
  }

  return parts.join(" ")
}

function shouldReact(event: GameStateEvent): boolean {
  const { trigger } = event.companion
  if (trigger === "game_start" || trigger === "game_end" || trigger === "player_request") {
    return true
  }

  // React to notable game events
  if (trigger === "player_action" || trigger === "game_event") {
    const raw = event.state.rawBoard as MinesweeperState | undefined
    if (!raw?.lastAction) return false

    // Chain reveals are exciting
    if (raw.lastAction.chainSize && raw.lastAction.chainSize >= 5) return true

    // React when progress crosses thresholds
    const safeCells = raw.rows * raw.cols - raw.totalMines
    const pct = safeCells > 0 ? raw.revealedCount / safeCells : 0
    if (pct >= 0.75 && pct - (raw.lastAction.chainSize ?? 1) / safeCells < 0.75) return true

    return false
  }

  if (trigger === "idle") return true

  return false
}

export const MinesweeperPlugin: AibouPlugin = {
  manifest,

  summarizeState(gameState: unknown): string {
    return summarizeState(gameState as MinesweeperState)
  },

  createEvent(
    gameState: unknown,
    trigger: GameStateEventTrigger,
  ): GameStateEvent {
    const state = gameState as MinesweeperState

    const event: GameStateEvent = {
      gameId: "minesweeper",
      sessionId: `ms-${++sessionCounter}`,
      timestamp: Date.now(),
      state: {
        phase: state.phase,
        boardSummary: summarizeState(state),
        availableActions: getAvailableActions(state),
        lastAction: state.lastAction
          ? { description: describeAction(state.lastAction), data: state.lastAction }
          : undefined,
        rawBoard: state,
      },
      companion: {
        shouldReact: false, // will be set below
        trigger,
      },
    }

    event.companion.shouldReact = shouldReact(event)
    return event
  },

  shouldReact,
}

function getAvailableActions(state: MinesweeperState): string[] {
  if (state.phase !== "playing") return []
  return [
    "reveal a cell",
    "place or remove a flag",
    "chord-click a numbered cell (if adjacent flags match the number)",
  ]
}

function describeAction(action: NonNullable<MinesweeperState["lastAction"]>): string {
  const { type, row, col, chainSize } = action
  switch (type) {
    case "reveal":
      return chainSize && chainSize > 1
        ? `Revealed cell (${row},${col}), triggering a chain of ${chainSize}`
        : `Revealed cell (${row},${col})`
    case "flag":
      return `Flagged cell (${row},${col})`
    case "unflag":
      return `Removed flag from (${row},${col})`
    case "chord":
      return `Chord-clicked (${row},${col}), revealing ${chainSize ?? 0} cells`
    default:
      return `${type} at (${row},${col})`
  }
}
