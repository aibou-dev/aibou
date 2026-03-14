# aibou spec v0.1

> AI companion protocol for games.  
> plug in your game. plug in your AI. plug in your character.

```
   ██████╗ ██╗ ██████╗  ██████╗ ██╗   ██╗
  ██╔══██╗██║██╔══██╗██╔═══██╗██║   ██║
  ███████║██║██████╔╝██║   ██║██║   ██║
  ██╔══██║██║██╔══██╗██║   ██║██║   ██║
  ██║  ██║██║██████╔╝╚██████╔╝╚██████╔╝
  ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝  ╚═════╝

  ┌────────────────────────────────────────────┐
  │  > COMPANION CONNECTED                     │
  │  > plug in your game.                      │
  │  > plug in your AI.                        │
  │  > plug in your character.   (ﾉ´ヮ`)ﾉ*:･ﾟ✧ │
  └────────────────────────────────────────────┘
```

---

## Overview

aibou is an open protocol that connects games to AI companions.  
It defines the contract between three independent components:

| Component | Role | Implemented by |
|---|---|---|
| **Game Plugin** | Describes game state in a standard format | Game developers / community |
| **Companion Adapter** | Connects to an LLM and generates responses | AI provider adapters |
| **aibou Runtime** | Orchestrates events, memory, and timing | This repo |

The key design principle: **the companion explores with the player, not ahead of them.**  
A companion should express genuine uncertainty, not hidden knowledge.

---

## 1. GameState

The core event emitted by a game plugin at meaningful moments.

```typescript
/**
 * Emitted by a game plugin whenever the companion should be aware of what's happening.
 * The runtime decides whether to forward this to the companion based on `companion.shouldReact`.
 */
interface GameStateEvent {
  /** Unique identifier for the game (e.g. "minesweeper", "solitaire") */
  gameId: string

  /** Unique identifier for the current play session */
  sessionId: string

  /** Unix timestamp in milliseconds */
  timestamp: number

  /** The current state of the game */
  state: {
    /** High-level phase of the game */
    phase: "idle" | "playing" | "paused" | "won" | "lost"

    /**
     * Human-readable summary of the current board/game state.
     * This is the primary input the companion receives.
     * Write it as if explaining to a friend over your shoulder.
     *
     * Example (minesweeper):
     * "12x12 board, 20 mines. 34 of 144 cells revealed.
     *  Last move: opened (3,7), revealed a 2.
     *  Corner area bottom-left looks safe but unconfirmed."
     */
    boardSummary: string

    /**
     * List of actions currently available to the player.
     * Described in natural language.
     *
     * Example: ["reveal a cell", "place a flag", "chord-click a number"]
     */
    availableActions: string[]

    /** The last action taken by the player, if any */
    lastAction?: PlayerAction

    /**
     * Optional: structured board data for plugins that want
     * to provide richer context. Format is game-specific and free-form.
     * The companion runtime will not interpret this directly.
     */
    rawBoard?: unknown
  }

  /** Hints to the runtime about companion behavior */
  companion: {
    /** Should the runtime ask the companion to react to this event? */
    shouldReact: boolean

    /** What triggered this event */
    trigger:
      | "player_action"   // player did something
      | "game_event"      // something happened in the game (e.g. chain reveal)
      | "idle"            // player hasn't acted for a while
      | "game_start"      // new game began
      | "game_end"        // game ended (win or loss)
      | "player_request"  // player explicitly asked the companion something
  }
}

/** Represents a single action taken by the player */
interface PlayerAction {
  /** Short description of the action in natural language */
  description: string

  /** Optional structured data (game-specific) */
  data?: unknown
}
```

---

## 2. Plugin Interface

The contract a game plugin must implement to work with the aibou runtime.

```typescript
/**
 * A game plugin bridges a specific game to the aibou runtime.
 * Implement this interface to make any game companion-compatible.
 */
interface AibouPlugin {
  /** Static metadata about this plugin */
  readonly manifest: PluginManifest

  /**
   * Convert the current game state into a GameStateEvent.
   * Called by the plugin whenever something notable happens.
   */
  createEvent(
    gameState: unknown,
    trigger: GameStateEvent["companion"]["trigger"]
  ): GameStateEvent

  /**
   * Translate raw game state into a human-readable summary.
   * This is the most important method to implement well.
   * The companion reads this text to understand what's happening.
   */
  summarizeState(gameState: unknown): string

  /**
   * Return true if the companion should react to this game event.
   * Controls how often the companion speaks — don't over-trigger.
   */
  shouldReact(event: GameStateEvent): boolean
}

interface PluginManifest {
  /** Unique plugin identifier (e.g. "minesweeper") */
  gameId: string

  /** Display name (e.g. "Minesweeper") */
  gameName: string

  /** Semver version string */
  version: string

  /**
   * Natural language description of this game for the companion.
   * The companion will read this to understand the game's context,
   * rules, and what kinds of uncertainty are normal.
   *
   * Example:
   * "Minesweeper is a logic puzzle where some cells contain hidden mines.
   *  Players reveal cells and use number clues to deduce mine locations.
   *  Crucially, some situations are genuinely unsolvable by logic alone —
   *  the companion should acknowledge this uncertainty honestly."
   */
  gameContext: string

  /**
   * Optional hints for the companion about how to behave in this game.
   * Use this to shape companion personality for your game's vibe.
   *
   * Example:
   * ["Never reveal mine positions even if deducible",
   *  "It's okay to say 'I don't know' — guessing is part of the game",
   *  "Celebrate chain reveals enthusiastically"]
   */
  companionHints?: string[]
}
```

---

## 3. Companion Interface

The contract an AI adapter must implement to be used as a companion.

```typescript
/**
 * An AI companion adapter wraps an LLM (or any AI) and
 * provides responses in the context of a game session.
 */
interface AibouCompanionAdapter {
  /**
   * Generate a companion response to a game state event.
   * The companion should react naturally — with curiosity, uncertainty,
   * enthusiasm — not as an oracle that knows the answer.
   */
  react(
    event: GameStateEvent,
    context: CompanionContext
  ): Promise<CompanionResponse>

  /**
   * Called at the end of a session to let the adapter
   * summarize what happened for long-term memory.
   * Return null to skip memory update.
   */
  summarizeSession?(
    events: GameStateEvent[],
    responses: CompanionResponse[]
  ): Promise<SessionSummary | null>
}

/** All context the companion needs to generate a response */
interface CompanionContext {
  /** The persona configuration for this companion */
  persona: PersonaConfig

  /** Memory from past sessions */
  memory: CompanionMemory

  /** Recent exchanges in this session (for conversational continuity) */
  recentHistory: ConversationTurn[]
}

/** Companion response returned to the runtime */
interface CompanionResponse {
  /** The text the companion says */
  message: string

  /**
   * Optional: emotional state hint for the avatar layer (bunshin).
   * The avatar can use this to pick an expression or animation.
   */
  emotion?: "neutral" | "curious" | "excited" | "worried" | "happy" | "thinking"

  /** Internal reasoning (not shown to player, useful for debugging) */
  _reasoning?: string
}

interface ConversationTurn {
  role: "companion" | "player"
  message: string
  timestamp: number
}
```

---

## 4. Persona Config

How a companion's personality is defined.

```typescript
/**
 * Defines the personality and behavior style of a companion.
 * This is intentionally expressed in natural language —
 * it gets injected directly into the companion's system prompt.
 */
interface PersonaConfig {
  /** Display name of the companion */
  name: string

  /**
   * Freeform personality description.
   * Write it as a character brief.
   *
   * Example:
   * "Haru is a cheerful and slightly clumsy companion who loves
   *  puzzles but often second-guesses themselves. They get excited
   *  about small victories and groan dramatically at bad luck."
   */
  personality: string

  /**
   * How the companion speaks.
   *
   * Example: "Casual and warm. Uses short sentences. Occasionally
   * uses Japanese words like 'yatta!' when excited."
   */
  speakingStyle: string

  /**
   * How the companion approaches uncertain situations.
   * This shapes whether they lean into guessing or prefer caution.
   */
  explorationStyle: "cautious" | "balanced" | "impulsive"

  /**
   * Language for companion responses.
   * Defaults to "en".
   */
  language?: string
}
```

---

## 5. Memory Schema

How the companion remembers across sessions.

```typescript
/**
 * Persistent memory for a companion, stored across sessions.
 * Intentionally lightweight — summaries over raw logs.
 */
interface CompanionMemory {
  /** Cross-session long-term memory */
  longTerm: {
    /**
     * Observations about the player's style and habits.
     * Written in natural language by the companion after each session.
     *
     * Example:
     * ["Tends to start from corners in Minesweeper",
     *  "Gets frustrated after 3+ losses in a row",
     *  "Likes to chat between moves"]
     */
    playerObservations: string[]

    /**
     * Memorable shared moments worth referencing.
     * Kept small — max 10 entries, oldest dropped first.
     */
    sharedMoments: MemoryEntry[]

    /** Games played together and rough session count */
    gamesPlayed: Record<string, number>
  }

  /** Short-term memory for the current session only */
  session: {
    /** Session start timestamp */
    startedAt: number

    /** Running exchange history (trimmed to last N turns by the runtime) */
    history: ConversationTurn[]
  }
}

interface MemoryEntry {
  /** When this happened */
  timestamp: number

  /** Which game */
  gameId: string

  /**
   * What happened, in natural language.
   *
   * Example: "Player pulled off a perfect no-flag clear on expert Minesweeper.
   *           We were both shocked it worked."
   */
  description: string
}

interface SessionSummary {
  /** New player observations to add to long-term memory */
  newObservations: string[]

  /** A memorable moment from this session, if any */
  memorableMoment?: Omit<MemoryEntry, "timestamp">
}
```

---

## 6. Runtime Contract

How the three pieces connect at runtime.

```typescript
/**
 * The aibou runtime. Wires together a plugin, companion, and persona.
 */
interface AibouRuntime {
  /** Initialize the runtime with required components */
  init(config: AibouConfig): void

  /**
   * Dispatch a game event to the runtime.
   * Called by the game plugin.
   * The runtime will decide whether to invoke the companion.
   */
  dispatch(event: GameStateEvent): Promise<CompanionResponse | null>

  /**
   * Player sent a direct message to the companion.
   * Always triggers a companion response.
   */
  playerMessage(message: string): Promise<CompanionResponse>

  /** End the current session and persist memory */
  endSession(): Promise<void>
}

interface AibouConfig {
  plugin: AibouPlugin
  companion: AibouCompanionAdapter
  persona: PersonaConfig

  /** Optional: override default memory storage */
  memoryStore?: MemoryStore
}

/** Pluggable memory storage backend */
interface MemoryStore {
  load(personaId: string): Promise<CompanionMemory>
  save(personaId: string, memory: CompanionMemory): Promise<void>
}
```

---

## Design Principles

1. **boardSummary is the contract.** The companion reads text, not raw game data. If your `summarizeState` is good, everything else works.

2. **The companion doesn't know more than the player.** Plugins should not expose information the player hasn't seen. The companion's uncertainty should be genuine.

3. **Personas are portable.** A persona config should work across any game. Game-specific behavior belongs in `companionHints`, not in the persona.

4. **Memory is summarized, not logged.** Raw event logs are not persisted. The companion distills sessions into observations and moments.

5. **bunshin is optional.** The avatar layer (`@aibou-dev/bunshin`) consumes `CompanionResponse.emotion` but the protocol works without it.

---

## Package Structure

```
@aibou-dev/core          # This spec as TypeScript types + runtime
@aibou-dev/bunshin       # Avatar overlay engine (PNGTuber / VRM)
@aibou-dev/adapter-claude    # Companion adapter for Claude
@aibou-dev/adapter-openai    # Companion adapter for OpenAI
@aibou-dev/adapter-ollama    # Companion adapter for local LLMs
@aibou-dev/plugin-minesweeper
@aibou-dev/plugin-solitaire
```

---

## Versioning

This document describes **spec v0.1**.  
Breaking changes to any interface increment the minor version.  
Additive changes (new optional fields) are non-breaking.

---

*aibou — 相棒 — companion*  
*bunshin — 分身 — avatar*
