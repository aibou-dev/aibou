import { MinesweeperGame } from "@aibou-dev/plugin-minesweeper"
import type { MinesweeperState } from "@aibou-dev/plugin-minesweeper"
import { MinesweeperPlugin } from "@aibou-dev/plugin-minesweeper"
import { BunshinAvatar } from "@aibou-dev/bunshin"
import type {
  CompanionResponse,
  GameStateEvent,
  ConversationTurn,
} from "@aibou-dev/core"

// ─── Local companion (no API key needed) ───────────────────

const localResponses = createLocalCompanion()

function createLocalCompanion() {
  // Offline companion that generates contextual responses without an API
  const reactions: Record<string, string[]> = {
    game_start: [
      "New board. Let's see what we're working with.",
      "Fresh start. I like the possibilities here.",
      "Alright, let's go. No mines yet... technically.",
    ],
    chain_reveal: [
      "Oh nice — that opened up a lot.",
      "yatta! Look at all that space.",
      "That chain reveal was satisfying.",
      "That's a good chunk of the board cleared.",
    ],
    close_call: [
      "...that was close to something dangerous.",
      "muzukashii... careful around there.",
      "I don't love the numbers in that area.",
    ],
    progress: [
      "We're making good progress.",
      "More than halfway there. The tricky part is coming.",
      "Getting into the endgame territory now.",
    ],
    won: [
      "yatta! Clean sweep. That felt good.",
      "Nice. No guesses needed — all logic.",
      "Board cleared. That's how it's done.",
    ],
    lost: [
      "...ah. That one stings.",
      "Rough. That was a tough spot though, don't beat yourself up.",
      "nani? I thought that was safe too.",
    ],
    idle: [
      "Take your time. I'm looking at the same thing you are.",
      "muzukashii... this one's tricky.",
      "I keep staring at that area too. No clear answer.",
    ],
    flag: [
      "Noted. That feels right to me.",
      "I was thinking the same spot.",
    ],
    default: [
      "Hmm, interesting move.",
      "Let's see where that takes us.",
      "Okay, what's next...",
    ],
  }

  // Player chat responses — keyword-matched for common questions
  const chatResponses: { pattern: RegExp; replies: string[]; emotion: CompanionResponse["emotion"] }[] = [
    {
      pattern: /where.*(open|start|click|begin|first)|first.*(move|click|open)|what.*(open|click)/i,
      replies: [
        "Corners are usually a safe bet to start. Less neighbors, more room to chain.",
        "I'd try a corner. Worst case it's a number, best case it opens up a big area.",
        "Anywhere works for the first click — you're guaranteed safe. But corners give you the best chain potential.",
      ],
      emotion: "thinking",
    },
    {
      pattern: /safe|danger|risky|mine.*here|flag.*this/i,
      replies: [
        "Hard to say for sure... look at the numbers around it and count the flags.",
        "I'm not confident either way. muzukashii...",
        "Trust the numbers. If the math doesn't add up to a mine, it's probably safe.",
      ],
      emotion: "thinking",
    },
    {
      pattern: /help|stuck|hint|what.*do|suggest|advice/i,
      replies: [
        "Look for cells where the numbers already match the adjacent flags. Those neighbors are safe to open.",
        "Try the edges — cells with fewer neighbors are easier to reason about.",
        "Any spots where a number touches exactly that many unrevealed cells? Those are all mines — flag them.",
      ],
      emotion: "curious",
    },
    {
      pattern: /flag|should.*flag/i,
      replies: [
        "If the numbers point to it, flag it. Trust your logic.",
        "When in doubt, don't flag — come back to it after revealing more.",
      ],
      emotion: "thinking",
    },
    {
      pattern: /good|nice|great|awesome|cool/i,
      replies: [
        "Right? That was a solid move.",
        "We're getting somewhere. Keep it up.",
      ],
      emotion: "happy",
    },
    {
      pattern: /scared|nervous|afraid|worry/i,
      replies: [
        "Yeah, this part is tense. But we've made it this far.",
        "Take a breath. The board isn't going anywhere.",
        "I'm a little nervous too, honestly.",
      ],
      emotion: "worried",
    },
  ]

  const defaultChatReplies = [
    "Hmm, I'm not sure about that. Let's just focus on the board.",
    "Interesting thought. What are you seeing that I'm not?",
    "I hear you. What do you think?",
  ]

  // Post-game chat — reflective, no board-state assumptions
  const postGameLostChat: { pattern: RegExp; replies: string[]; emotion: CompanionResponse["emotion"] }[] = [
    {
      pattern: /why|how|what happened/i,
      replies: [
        "That area was ambiguous — no way to know for sure. Don't blame yourself.",
        "Sometimes the board just doesn't give you enough information. That was one of those.",
      ],
      emotion: "thinking",
    },
    {
      pattern: /again|rematch|one more|retry|new/i,
      replies: [
        "Let's go. Hit New Game — I have a good feeling about the next one.",
        "Rematch? I'm in. We'll get it this time.",
      ],
      emotion: "excited",
    },
  ]

  const postGameWonChat: { pattern: RegExp; replies: string[]; emotion: CompanionResponse["emotion"] }[] = [
    {
      pattern: /again|rematch|one more|retry|new/i,
      replies: [
        "Another round? Let's keep the streak going.",
        "I'm down. Let's see if we can do it even faster.",
      ],
      emotion: "excited",
    },
  ]

  const defaultPostGameReplies: Record<string, { replies: string[]; emotion: CompanionResponse["emotion"] }> = {
    lost: {
      replies: [
        "Yeah... that was rough. Want to go again?",
        "These things happen. Ready for another round?",
        "I know. Take a second, then let's try again.",
      ],
      emotion: "worried",
    },
    won: {
      replies: [
        "Still buzzing from that win. Another one?",
        "That was clean. Want to push our luck?",
        "yatta! Go again whenever you're ready.",
      ],
      emotion: "happy",
    },
  }

  return {
    react(event: GameStateEvent, playerMessage?: string): CompanionResponse {
      // Handle player chat with keyword matching
      if (event.companion.trigger === "player_request" && playerMessage) {
        const phase = event.state.phase

        // Post-game conversation — different tone, no board advice
        if (phase === "lost" || phase === "won") {
          const postPool = phase === "lost" ? postGameLostChat : postGameWonChat
          for (const { pattern, replies, emotion } of postPool) {
            if (pattern.test(playerMessage)) {
              return {
                message: replies[Math.floor(Math.random() * replies.length)],
                emotion,
              }
            }
          }
          const defaults = defaultPostGameReplies[phase]
          return {
            message: defaults.replies[Math.floor(Math.random() * defaults.replies.length)],
            emotion: defaults.emotion,
          }
        }

        // In-game conversation
        for (const { pattern, replies, emotion } of chatResponses) {
          if (pattern.test(playerMessage)) {
            return {
              message: replies[Math.floor(Math.random() * replies.length)],
              emotion,
            }
          }
        }
        return {
          message: defaultChatReplies[Math.floor(Math.random() * defaultChatReplies.length)],
          emotion: "curious",
        }
      }

      const state = event.state.rawBoard as MinesweeperState | undefined
      let category = "default"
      let emotion: CompanionResponse["emotion"] = "neutral"

      if (event.companion.trigger === "game_start") {
        category = "game_start"
        emotion = "curious"
      } else if (event.state.phase === "won") {
        category = "won"
        emotion = "excited"
      } else if (event.state.phase === "lost") {
        category = "lost"
        emotion = "worried"
      } else if (event.companion.trigger === "idle") {
        category = "idle"
        emotion = "thinking"
      } else if (state?.lastAction) {
        if (state.lastAction.type === "flag") {
          category = "flag"
          emotion = "thinking"
        } else if (state.lastAction.chainSize && state.lastAction.chainSize >= 5) {
          category = "chain_reveal"
          emotion = "excited"
        } else {
          // Check progress
          const safeCells = state.rows * state.cols - state.totalMines
          const pct = safeCells > 0 ? state.revealedCount / safeCells : 0
          if (pct >= 0.5) {
            category = "progress"
            emotion = "happy"
          }
        }
      }

      const pool = reactions[category] ?? reactions.default
      const message = pool[Math.floor(Math.random() * pool.length)]
      return { message, emotion }
    },
  }
}

// ─── Game state ────────────────────────────────────────────

const game = new MinesweeperGame()
let currentState: MinesweeperState
const history: ConversationTurn[] = []

const ROWS = 9
const COLS = 9
const MINES = 10

// ─── DOM ───────────────────────────────────────────────────

const boardEl = document.getElementById("board") as HTMLDivElement
const statusEl = document.getElementById("status") as HTMLSpanElement
const messagesEl = document.getElementById("messages") as HTMLDivElement
const emotionEl = document.getElementById("companion-emotion") as HTMLDivElement
const avatarEl = document.getElementById("companion-avatar") as HTMLDivElement
const chatInput = document.getElementById("chat-input") as HTMLInputElement
const chatSend = document.getElementById("chat-send") as HTMLButtonElement
const newGameBtn = document.getElementById("new-game") as HTMLButtonElement

// ─── Bunshin avatar ───────────────────────────────────────

const avatar = new BunshinAvatar(avatarEl, {
  name: "nagi",
  size: 96,
  accentColor: "#7c5cbf",
  animate: true,
})

// ─── Rendering ─────────────────────────────────────────────

function renderBoard(state: MinesweeperState) {
  boardEl.style.gridTemplateColumns = `repeat(${state.cols}, 32px)`
  boardEl.innerHTML = ""

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.board[r][c]
      const el = document.createElement("div")
      el.className = "cell"

      if (cell.flagged && !cell.revealed) {
        el.classList.add("hidden", "flagged")
        el.textContent = "⚑"
      } else if (!cell.revealed) {
        el.classList.add("hidden")
      } else if (cell.mine) {
        el.classList.add("revealed", "mine")
        el.textContent = "✸"
      } else {
        el.classList.add("revealed")
        if (cell.adjacentMines > 0) {
          el.textContent = String(cell.adjacentMines)
          el.dataset.n = String(cell.adjacentMines)
        }
      }

      el.addEventListener("click", () => handleReveal(r, c))
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        handleFlag(r, c)
      })
      el.addEventListener("dblclick", () => handleChord(r, c))

      boardEl.appendChild(el)
    }
  }

  // Update status
  const safeCells = state.rows * state.cols - state.totalMines
  const minesLeft = state.totalMines - state.flaggedCount
  if (state.phase === "won") {
    statusEl.textContent = "✓ cleared!"
  } else if (state.phase === "lost") {
    statusEl.textContent = "✗ game over"
  } else {
    statusEl.textContent = `${state.rows}×${state.cols} · ${minesLeft} mines left · ${Math.round((state.revealedCount / safeCells) * 100)}%`
  }
}

function addMessage(text: string, type: "companion" | "system") {
  // Demote previous "latest" messages to "past"
  if (type === "companion") {
    messagesEl.querySelectorAll(".message.companion.latest").forEach(el => {
      el.classList.remove("latest")
      el.classList.add("past")
    })
  }

  const el = document.createElement("div")
  el.className = `message ${type}${type === "companion" ? " latest" : ""}`
  el.textContent = text
  messagesEl.appendChild(el)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function setEmotion(emotion: CompanionResponse["emotion"]) {
  const labels: Record<string, string> = {
    neutral: "neutral",
    curious: "curious ◉",
    excited: "excited ★",
    worried: "worried ~",
    happy: "happy ♪",
    thinking: "thinking ...",
  }
  emotionEl.textContent = labels[emotion ?? "neutral"] ?? "neutral"
  avatar.setEmotion(emotion ?? "neutral")
}

// ─── Companion integration ─────────────────────────────────

function companionReact(event: GameStateEvent, playerMessage?: string) {
  if (!event.companion.shouldReact) return

  const response = localResponses.react(event, playerMessage)
  addMessage(response.message, "companion")
  setEmotion(response.emotion)

  history.push({
    role: "companion",
    message: response.message,
    timestamp: Date.now(),
  })
}

// ─── Game actions ──────────────────────────────────────────

function startGame() {
  currentState = game.newGame(ROWS, COLS, MINES)
  renderBoard(currentState)
  messagesEl.innerHTML = ""
  history.length = 0

  const event = MinesweeperPlugin.createEvent(currentState, "game_start")
  event.companion.shouldReact = true
  companionReact(event)
}

function handleReveal(row: number, col: number) {
  if (currentState.phase !== "playing") return
  const prevRevealed = currentState.revealedCount
  currentState = game.reveal(row, col)
  renderBoard(currentState)

  const trigger = currentState.phase === "won" || currentState.phase === "lost"
    ? "game_end" as const
    : "player_action" as const

  const event = MinesweeperPlugin.createEvent(currentState, trigger)

  // Force react on game end or big chain reveals
  if (trigger === "game_end") {
    event.companion.shouldReact = true
  } else if (currentState.revealedCount - prevRevealed >= 5) {
    event.companion.shouldReact = true
  }

  companionReact(event)
}

function handleFlag(row: number, col: number) {
  if (currentState.phase !== "playing") return
  currentState = game.toggleFlag(row, col)
  renderBoard(currentState)
}

function handleChord(row: number, col: number) {
  if (currentState.phase !== "playing") return
  const prevRevealed = currentState.revealedCount
  currentState = game.chord(row, col)
  renderBoard(currentState)

  const trigger = currentState.phase === "won" || currentState.phase === "lost"
    ? "game_end" as const
    : "player_action" as const

  const event = MinesweeperPlugin.createEvent(currentState, trigger)
  if (trigger === "game_end" || currentState.revealedCount - prevRevealed >= 5) {
    event.companion.shouldReact = true
  }
  companionReact(event)
}

// ─── Chat ──────────────────────────────────────────────────

function handleChat() {
  const text = chatInput.value.trim()
  if (!text) return

  chatInput.value = ""
  addMessage(text, "system")
  history.push({ role: "player", message: text, timestamp: Date.now() })

  // Create a player_request event, passing the message for context
  const event = MinesweeperPlugin.createEvent(currentState, "player_request")
  event.companion.shouldReact = true
  companionReact(event, text)
}

chatSend.addEventListener("click", handleChat)
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleChat()
})

newGameBtn.addEventListener("click", startGame)

// ─── Init ──────────────────────────────────────────────────

startGame()
