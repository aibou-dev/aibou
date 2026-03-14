# aibou — AI companion protocol for games

## Project overview
- Open protocol connecting games to AI companions
- Monorepo using npm workspaces
- TypeScript throughout

## Build & test
```bash
npm install          # install all workspace dependencies
npm run build        # build all packages
npm run typecheck    # run tsc --noEmit across all packages
npm test             # run tests
cd packages/demo && npx playwright test  # e2e tests
```

## Code style
- TypeScript strict mode enabled
- ES modules (import/export), not CommonJS
- 2-space indentation
- No semicolons (prettier default)
- Code comments in English

## Architecture
- `packages/core/` — Protocol types, runtime, memory engine (@aibou-dev/core)
- `packages/core/personas/` — Built-in persona configs
- `packages/plugin-minesweeper/` — Minesweeper game engine + aibou plugin
- `packages/adapter-claude/` — Claude API companion adapter
- `packages/bunshin/` — SVG avatar engine (PNGTuber-style, 6 emotions)
- `packages/demo/` — Browser demo (Vite, Playwright e2e tests)
- `docs/PERSONA.md` — Nagi demo companion persona definition (gitignored, local only)

## Key conventions
- Types in `packages/core/src/types.ts` are the protocol spec (source of truth)
- Persona configs implement `PersonaConfig` from types
- Game plugins implement `AibouPlugin` interface
- Companion adapters implement `AibouCompanionAdapter` interface

## Spec
@packages/core/src/types.ts
