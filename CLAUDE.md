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
- `docs/SPEC.md` — Full protocol specification (source of truth for types)
- `docs/PERSONA.md` — Nagi demo companion persona definition

## Key conventions
- Types in `packages/core/src/types.ts` mirror SPEC.md exactly
- Persona configs implement `PersonaConfig` from types
- Game plugins implement `AibouPlugin` interface
- Companion adapters implement `AibouCompanionAdapter` interface

## Spec
@docs/SPEC.md
