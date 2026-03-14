# aibou

```
   ██████╗ ██╗ ██████╗  ██████╗ ██╗   ██╗
  ██╔══██╗██║██╔══██╗██╔═══██╗██║   ██║
  ███████║██║██████╔╝██║   ██║██║   ██║
  ██╔══██║██║██╔══██╗██║   ██║██║   ██║
  ██║  ██║██║██████╔╝╚██████╔╝╚██████╔╝
  ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝  ╚═════╝

  ┌─────────────────────────────────────────────┐
  │  > COMPANION CONNECTED                      │
  │  > plug in your game.                       │
  │  > plug in your AI.                         │
  │  > plug in your character.    (ﾉ´ヮ`)ﾉ*:･ﾟ✧ │
  └─────────────────────────────────────────────┘
```

**aibou** (相棒) is an open protocol for AI companions in games.

Not a hint system. Not a walkthrough bot.  
A companion who explores alongside you — uncertain, curious, and present.

---

## The idea

Some of the best moments in gaming happen in the space between moves.
The pause before a risky play. The moment you're not sure if you're
brilliant or about to lose everything.

aibou puts an AI companion in that space — one that thinks out loud
with you, not ahead of you.

```
        _____
       /     \
      | ◉   ◉ |
      |   ∧   |     "...that corner has three possible reads.
       \  ─  /       I keep looking at it and not getting smarter."
    ────╰───╯────
       |  |  |
       nagi
```

---

## How it works

aibou connects three independent pieces:

```
  Your Game                aibou runtime             Your AI
  ─────────                ─────────────             ───────
  Plugin emits        →    orchestrates         →    Companion
  GameStateEvent           events + memory           reacts

  "revealed cell (3,7)     should nagi speak?        "muzukashii...
   number 2 appeared"      yes → build context       that corner is
                           → call companion           tricky. what's
                                                      your read?"
```

Each piece is swappable:

| Piece | Examples |
|---|---|
| Game | Minesweeper, Solitaire, Othello — or your own |
| AI | Claude, GPT-4o, Gemini, local LLM via Ollama |
| Companion | Nagi (built-in demo), or define your own persona |
| Avatar | PNGTuber, VRM via `@aibou-dev/bunshin` (optional) |

---

## Quick start

```bash
npm install @aibou-dev/core @aibou-dev/adapter-claude @aibou-dev/plugin-minesweeper
```

```typescript
import { AibouRuntime } from "@aibou-dev/core"
import { ClaudeAdapter } from "@aibou-dev/adapter-claude"
import { MinesweeperPlugin } from "@aibou-dev/plugin-minesweeper"
import { NagiPersona } from "@aibou-dev/core/personas"

const companion = new AibouRuntime({
  plugin: MinesweeperPlugin,
  companion: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY }),
  persona: NagiPersona,
})

// when something happens in your game:
const response = await companion.dispatch(event)
console.log(response?.message)
// → "That top-right corner... I'm not sure. What's your read?"

// when the player types something:
const reply = await companion.playerMessage("should I flag that?")
console.log(reply.message)
// → "I'd hold off. There's still a chance that cell is safe."
```

---

## Building a game plugin

The minimum surface to implement:

```typescript
import type { AibouPlugin } from "@aibou-dev/core"

export const MyGamePlugin: AibouPlugin = {
  manifest: {
    gameId: "my-game",
    gameName: "My Game",
    version: "0.1.0",
    gameContext: `
      Describe your game here in natural language.
      The companion reads this to understand rules and context.
      Be honest about where genuine uncertainty lives in your game.
    `,
  },

  summarizeState(gameState) {
    // This is the most important method.
    // Describe what's happening as if to a friend over your shoulder.
    return `Turn ${gameState.turn}. Player has ${gameState.score} points.
            Last move: ${gameState.lastMove}. Three options available.`
  },

  createEvent(gameState, trigger) {
    return {
      gameId: "my-game",
      sessionId: gameState.sessionId,
      timestamp: Date.now(),
      state: {
        phase: gameState.phase,
        boardSummary: this.summarizeState(gameState),
        availableActions: gameState.actions,
        lastAction: gameState.lastAction,
      },
      companion: {
        shouldReact: this.shouldReact({ state: { phase: gameState.phase } } as any),
        trigger,
      },
    }
  },

  shouldReact(event) {
    // Control how often the companion speaks.
    // Less is usually more.
    return (
      event.companion?.trigger === "game_end" ||
      event.companion?.trigger === "player_request" ||
      event.companion?.trigger === "game_event"
    )
  },
}
```

Publish it as `aibou-plugin-<your-game>` and open a PR to add it to the list below.

---

## Official packages

| Package | Description |
|---|---|
| `@aibou-dev/core` | Protocol types, runtime, memory engine |
| `@aibou-dev/bunshin` | Avatar overlay engine (PNGTuber / VRM) |
| `@aibou-dev/adapter-claude` | Companion adapter for Anthropic Claude |
| `@aibou-dev/adapter-openai` | Companion adapter for OpenAI |
| `@aibou-dev/adapter-ollama` | Companion adapter for local LLMs |
| `@aibou-dev/plugin-minesweeper` | Minesweeper plugin (demo) |
| `@aibou-dev/plugin-solitaire` | Solitaire plugin (demo) |

---

## Community plugins

> Built a plugin for your favorite game? Add it here.

<!-- awesome-aibou list -->

---

## Defining your own companion

You don't have to use Nagi. Any persona works:

```typescript
import type { PersonaConfig } from "@aibou-dev/core"

const MyCompanion: PersonaConfig = {
  name: "Rex",
  personality: `Rex is a loud, overconfident companion who is almost always
    wrong about what move to make next, but somehow keeps everyone's spirits up.`,
  speakingStyle: "Brash and enthusiastic. Lots of exclamation marks. Never admits doubt.",
  explorationStyle: "impulsive",
  language: "en",
}
```

---

## Avatar overlay (bunshin)

`@aibou-dev/bunshin` renders a floating avatar over any game window.

```bash
npm install @aibou-dev/bunshin
```

It consumes the `emotion` field from `CompanionResponse` to drive
expressions and animations. Supports PNGTuber (two-image) and VRM (3D) formats.

→ See [bunshin docs](https://github.com/aibou-dev/bunshin) for setup.

---

## Spec

The full protocol specification lives in [`docs/SPEC.md`](./docs/SPEC.md).

aibou is intentionally minimal. The spec defines interfaces, not implementations.
If it speaks TypeScript types and honours the contract, it works.

---

## Contributing

- **New game plugin?** → `aibou-plugin-<game>` on npm, PR to add to the list
- **New AI adapter?** → `@aibou-dev/adapter-<provider>` pattern
- **Spec feedback?** → Open an issue on this repo

---

## Name

**aibou** (相棒) — Japanese for *companion*, *partner*, *the other half of a duo*.  
**bunshin** (分身) — Japanese for *alter ego*, *avatar*, *one's other self*.

---

*aibou.dev — open protocol for AI companions in games*
