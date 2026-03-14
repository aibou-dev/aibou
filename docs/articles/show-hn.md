Show HN: aibou – open protocol for AI companions in games

I built an open protocol that connects games to AI companions — not as hint systems, but as partners who share the player's uncertainty.

Most AI in games knows the answer and performs not-knowing. aibou flips that: the companion only sees what the player sees, described in natural language via a `boardSummary` field. The AI's confusion is genuine.

The protocol separates three layers: game plugin (emits state as text), companion adapter (wraps any LLM), and persona (character personality in plain text). Each is independently swappable — different game, different AI, different character.

The technical core is simple: a plugin implements `summarizeState()` that describes the board as if explaining to a friend. That text is what the AI reads. No game-specific schemas for the AI to learn.

Live demo (Minesweeper + a companion called Nagi): https://aibou.dev

GitHub: https://github.com/aibou-dev/aibou

TypeScript, MIT licensed, published on npm as `@aibou-dev/core`. Still rough around the edges — only one game plugin so far — but the protocol is stable and the demo works. Would love feedback on the design, especially from anyone who's tried putting AI into games.
