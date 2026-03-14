---
title: "aibou: an open protocol for AI companions in games"
published: false
tags: opensource, gamedev, ai, typescript
---

Most AI in games knows the answer and pretends not to. aibou is different — it's a companion that genuinely doesn't know, and finds that interesting rather than frustrating. Think less "hint system" and more "friend watching over your shoulder."

## The problem

Every AI game assistant I've used has the same issue: it's an oracle wearing a mask. It knows where the mines are. It knows the optimal move. The "personality" is just a delay before giving you the answer.

That's fine for a hint system, but it's not a companion. A companion sits in uncertainty with you. When the board is ambiguous and logic can't help, a companion says "I don't know either" — and means it.

aibou is an open protocol built around that idea. The companion never sees more than the player sees. Its uncertainty is real.

## How it works

aibou connects three independent pieces:

| Component | Role |
|---|---|
| **Game Plugin** | Describes game state as natural language |
| **Companion Adapter** | Connects to any LLM and generates responses |
| **aibou Runtime** | Orchestrates events, memory, and timing |

The key insight is `boardSummary` — the plugin doesn't hand the AI a data structure. It hands it a paragraph of text, written as if explaining the situation to a friend:

```typescript
// from packages/plugin-minesweeper/src/plugin.ts

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

  if (state.lastAction) {
    const { type, row, col, chainSize } = state.lastAction
    if (type === "reveal") {
      if (chainSize && chainSize > 1) {
        parts.push(`Last move: opened (${row},${col}), triggered a chain reveal of ${chainSize} cells!`)
      }
    }
  }

  return parts.join(" ")
}
```

This is the contract. If your `summarizeState` is good, everything else works. The companion reads text, not raw game data — which means the protocol works with any LLM, any game, any language.

The companion responds with a message and an optional `emotion` field:

```typescript
// from packages/core/src/types.ts

interface CompanionResponse {
  message: string
  emotion?: "neutral" | "curious" | "excited" | "worried" | "happy" | "thinking"
}
```

That `emotion` field feeds directly into [bunshin](https://github.com/aibou-dev/aibou/tree/main/packages/bunshin) (`@aibou-dev/bunshin`), a PNGTuber-style avatar engine that renders sprite-based expressions. The companion says something, the avatar reacts. No extra wiring needed.

## The protocol, not the app

aibou isn't a product — it's a protocol. The tagline is literal:

> Swap the game. Swap the AI. Swap the character.

- **Swap the game**: Implement `AibouPlugin` for your game. Minesweeper ships as a reference. Solitaire is next. Any game where a companion makes sense can plug in.
- **Swap the AI**: The `AibouCompanionAdapter` interface wraps any LLM. Claude, GPT-4o, a local model via Ollama — whatever you want.
- **Swap the character**: Personas are defined in plain text. The personality, speaking style, and exploration approach are all natural language strings that go straight into the system prompt.

```typescript
// Built-in demo companion persona

const NagiPersona: PersonaConfig = {
  name: "Nagi",
  personality: `
    Nagi is calm and observant, with a quiet intensity that surfaces when
    things get genuinely uncertain or interesting. She doesn't perform
    enthusiasm — but when something surprises her, you'll know.
  `,
  speakingStyle: `
    Short to medium sentences. No filler words.
    Occasionally uses Japanese words for emotional beats:
      - "yatta!" when genuinely excited
      - "muzukashii..." when something is hard
  `,
  explorationStyle: "balanced",
  language: "en",
}
```

## Nagi

Nagi (凪 — "the stillness before the storm") is the demo companion that ships with aibou. She plays Minesweeper with you in the browser demo.

![Nagi companion playing Minesweeper in the aibou demo — avatar on the right with chat messages, game board on the left](./screenshot-demo.png)

She doesn't give hints. When the board is ambiguous, she says things like "That corner... three ways it could go. I keep looking at it and not getting smarter. What's your read?"

She's just the demo persona. The protocol supports any character — you can define your own `PersonaConfig` with a personality, speaking style, and exploration approach.

## What's next

- `plugin-solitaire` — next official game plugin
- VRM avatar support in bunshin (3D models alongside PNGTuber sprites)
- `awesome-aibou` — a community list of plugins and personas. If you build one, I want to list it

## Try it

- **Live demo**: [aibou.dev](https://aibou.dev)
- **GitHub**: [github.com/aibou-dev/aibou](https://github.com/aibou-dev/aibou)
- **npm**: `npm install @aibou-dev/core`

The spec is intentionally small. If it speaks TypeScript types and honours the contract, it works.
