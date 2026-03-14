// Claude companion adapter — connects aibou to the Anthropic Messages API

import Anthropic from "@anthropic-ai/sdk"
import type {
  AibouCompanionAdapter,
  CompanionContext,
  CompanionResponse,
  GameStateEvent,
  SessionSummary,
} from "@aibou-dev/core"

export interface ClaudeAdapterOptions {
  apiKey: string
  model?: string
}

export class ClaudeAdapter implements AibouCompanionAdapter {
  private client: Anthropic
  private model: string

  constructor(options: ClaudeAdapterOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey })
    this.model = options.model ?? "claude-sonnet-4-20250514"
  }

  async react(
    event: GameStateEvent,
    context: CompanionContext,
  ): Promise<CompanionResponse> {
    const systemPrompt = this.buildSystemPrompt(event, context)
    const messages = this.buildMessages(event, context)

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map(block => block.text)
      .join("")

    return this.parseResponse(text)
  }

  async summarizeSession(
    events: GameStateEvent[],
    responses: CompanionResponse[],
  ): Promise<SessionSummary | null> {
    if (events.length === 0) return null

    const timeline = events.map((e, i) => {
      const resp = responses[i]
      return `[${e.companion.trigger}] ${e.state.boardSummary}${resp ? `\nCompanion: "${resp.message}"` : ""}`
    }).join("\n\n")

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: `You summarize game sessions into brief player observations and memorable moments.
Respond in this exact JSON format:
{"observations": ["observation 1", "observation 2"], "moment": "description of a memorable moment or null"}`,
      messages: [{
        role: "user",
        content: `Summarize this ${events[0].gameId} session:\n\n${timeline}`,
      }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map(block => block.text)
      .join("")

    try {
      const parsed = JSON.parse(text) as {
        observations?: string[]
        moment?: string | null
      }
      return {
        newObservations: parsed.observations ?? [],
        memorableMoment: parsed.moment
          ? { gameId: events[0].gameId, description: parsed.moment }
          : undefined,
      }
    } catch {
      return {
        newObservations: [],
      }
    }
  }

  private buildSystemPrompt(
    event: GameStateEvent,
    context: CompanionContext,
  ): string {
    const { persona } = context
    const parts: string[] = []

    parts.push(`You are ${persona.name}, a game companion.`)
    parts.push(`Personality: ${persona.personality.trim()}`)
    parts.push(`Speaking style: ${persona.speakingStyle.trim()}`)
    parts.push(`Exploration style: ${persona.explorationStyle}`)

    if (persona.language && persona.language !== "en") {
      parts.push(`Respond in: ${persona.language}`)
    }

    // Game context from plugin manifest
    const rawBoard = event.state.rawBoard as { rows?: number } | undefined
    parts.push(`\nGame: You are watching a game of ${event.gameId}.`)

    // Companion hints
    const hints = (event.state.rawBoard as Record<string, unknown>)?.companionHints
    if (!hints) {
      // Use hardcoded approach — hints come from the plugin, not rawBoard
      parts.push(`\nIMPORTANT RULES:
- You do NOT know where the mines are. Your uncertainty is genuine.
- Never give the player the answer. Think alongside them.
- Keep responses short — 1-3 sentences max.
- Express emotion naturally through word choice, not emojis.
- End your response with a JSON tag on its own line: [emotion:STATE]
  where STATE is one of: neutral, curious, excited, worried, happy, thinking`)
    }

    // Memory context
    if (context.memory.longTerm.playerObservations.length > 0) {
      parts.push(`\nWhat you know about this player:\n${context.memory.longTerm.playerObservations.join("\n")}`)
    }

    if (context.memory.longTerm.sharedMoments.length > 0) {
      const moments = context.memory.longTerm.sharedMoments
        .slice(-3)
        .map(m => m.description)
        .join("\n")
      parts.push(`\nShared moments you might reference naturally:\n${moments}`)
    }

    return parts.join("\n")
  }

  private buildMessages(
    event: GameStateEvent,
    context: CompanionContext,
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = []

    // Add recent conversation history
    for (const turn of context.recentHistory.slice(-10)) {
      messages.push({
        role: turn.role === "companion" ? "assistant" : "user",
        content: turn.message,
      })
    }

    // Current game state as the latest user message
    const triggerDesc = {
      player_action: "The player just acted.",
      game_event: "Something happened in the game.",
      idle: "The player has been thinking for a while.",
      game_start: "A new game just started!",
      game_end: "The game just ended.",
      player_request: "The player is asking you something.",
    }[event.companion.trigger]

    messages.push({
      role: "user",
      content: `[Game State] ${triggerDesc}\n\n${event.state.boardSummary}`,
    })

    return messages
  }

  private parseResponse(text: string): CompanionResponse {
    // Extract emotion tag if present
    const emotionMatch = text.match(/\[emotion:(\w+)\]\s*$/)
    let message = text
    let emotion: CompanionResponse["emotion"] = "neutral"

    if (emotionMatch) {
      message = text.replace(/\[emotion:\w+\]\s*$/, "").trim()
      const rawEmotion = emotionMatch[1].toLowerCase()
      const validEmotions = ["neutral", "curious", "excited", "worried", "happy", "thinking"] as const
      if (validEmotions.includes(rawEmotion as typeof validEmotions[number])) {
        emotion = rawEmotion as CompanionResponse["emotion"]
      }
    }

    return { message, emotion }
  }
}
