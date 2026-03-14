// aibou protocol types — mirrors docs/SPEC.md v0.1

// ─── 1. GameState ───────────────────────────────────────────

/**
 * Emitted by a game plugin whenever the companion should be aware of what's happening.
 * The runtime decides whether to forward this to the companion based on `companion.shouldReact`.
 */
export interface GameStateEvent {
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
     */
    boardSummary: string

    /**
     * List of actions currently available to the player.
     * Described in natural language.
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
    trigger: GameStateEventTrigger
  }
}

/** What triggered a game state event */
export type GameStateEventTrigger =
  | "player_action"
  | "game_event"
  | "idle"
  | "game_start"
  | "game_end"
  | "player_request"

/** Represents a single action taken by the player */
export interface PlayerAction {
  /** Short description of the action in natural language */
  description: string

  /** Optional structured data (game-specific) */
  data?: unknown
}

// ─── 2. Plugin Interface ────────────────────────────────────

/**
 * A game plugin bridges a specific game to the aibou runtime.
 * Implement this interface to make any game companion-compatible.
 */
export interface AibouPlugin {
  /** Static metadata about this plugin */
  readonly manifest: PluginManifest

  /**
   * Convert the current game state into a GameStateEvent.
   * Called by the plugin whenever something notable happens.
   */
  createEvent(
    gameState: unknown,
    trigger: GameStateEventTrigger,
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

export interface PluginManifest {
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
   */
  gameContext: string

  /**
   * Optional hints for the companion about how to behave in this game.
   * Use this to shape companion personality for your game's vibe.
   */
  companionHints?: string[]
}

// ─── 3. Companion Interface ─────────────────────────────────

/**
 * An AI companion adapter wraps an LLM (or any AI) and
 * provides responses in the context of a game session.
 */
export interface AibouCompanionAdapter {
  /**
   * Generate a companion response to a game state event.
   * The companion should react naturally — with curiosity, uncertainty,
   * enthusiasm — not as an oracle that knows the answer.
   */
  react(
    event: GameStateEvent,
    context: CompanionContext,
  ): Promise<CompanionResponse>

  /**
   * Called at the end of a session to let the adapter
   * summarize what happened for long-term memory.
   * Return null to skip memory update.
   */
  summarizeSession?(
    events: GameStateEvent[],
    responses: CompanionResponse[],
  ): Promise<SessionSummary | null>
}

/** All context the companion needs to generate a response */
export interface CompanionContext {
  /** The persona configuration for this companion */
  persona: PersonaConfig

  /** Memory from past sessions */
  memory: CompanionMemory

  /** Recent exchanges in this session (for conversational continuity) */
  recentHistory: ConversationTurn[]
}

/** Companion response returned to the runtime */
export interface CompanionResponse {
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

export interface ConversationTurn {
  role: "companion" | "player"
  message: string
  timestamp: number
}

// ─── 4. Persona Config ──────────────────────────────────────

/**
 * Defines the personality and behavior style of a companion.
 * This is intentionally expressed in natural language —
 * it gets injected directly into the companion's system prompt.
 */
export interface PersonaConfig {
  /** Display name of the companion */
  name: string

  /**
   * Freeform personality description.
   * Write it as a character brief.
   */
  personality: string

  /**
   * How the companion speaks.
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

// ─── 5. Memory Schema ───────────────────────────────────────

/**
 * Persistent memory for a companion, stored across sessions.
 * Intentionally lightweight — summaries over raw logs.
 */
export interface CompanionMemory {
  /** Cross-session long-term memory */
  longTerm: {
    /**
     * Observations about the player's style and habits.
     * Written in natural language by the companion after each session.
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

export interface MemoryEntry {
  /** When this happened */
  timestamp: number

  /** Which game */
  gameId: string

  /**
   * What happened, in natural language.
   */
  description: string
}

export interface SessionSummary {
  /** New player observations to add to long-term memory */
  newObservations: string[]

  /** A memorable moment from this session, if any */
  memorableMoment?: Omit<MemoryEntry, "timestamp">
}

// ─── 6. Runtime Contract ────────────────────────────────────

/**
 * The aibou runtime. Wires together a plugin, companion, and persona.
 */
export interface AibouRuntime {
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

export interface AibouConfig {
  plugin: AibouPlugin
  companion: AibouCompanionAdapter
  persona: PersonaConfig

  /** Optional: override default memory storage */
  memoryStore?: MemoryStore
}

/** Pluggable memory storage backend */
export interface MemoryStore {
  load(personaId: string): Promise<CompanionMemory>
  save(personaId: string, memory: CompanionMemory): Promise<void>
}
