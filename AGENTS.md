<!--THIS IS A GENERATED FILE - DO NOT MODIFY DIRECTLY, FOR MANUAL ADJUSTMENTS UPDATE `AGENTS_CUSTOM.MD`-->
# ALWAYS READ THESE FILE(S)
- @AGENTS_CUSTOM.md

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-22T05:24:24Z
**Commit:** 2292919
**Branch:** main

## OVERVIEW
Pi package. Adds `browser` tool backed by `dev-browser` CLI. Package ships TypeScript source from repo root; no build-output layer.

## STRUCTURE
```text
./
├── extensions/        # tool entrypoint, command grammar, runtime session state
├── tests/             # Vitest coverage for parser, transport, temp files, executor
├── docs/
│   ├── commands.md    # user-facing command grammar
│   ├── prd/           # product docs, not runtime code
│   └── plans/         # migration planning artifacts
├── package.json       # publish surface, scripts, Pi extension registration
├── tsconfig.json      # strict noEmit TS checks
├── biome.json         # tab formatting scope
└── README.md          # install, usage, troubleshooting, verification
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Tool registration, execution, rendering | `extensions/dev-browser.ts` | Pi extension entrypoint; owns install prompt, exec, cleanup |
| Command grammar, usage errors, script generation | `extensions/dev-browser-core.ts` | Pure command parsing/building plus transport validation |
| Session serialization, shutdown state | `extensions/dev-browser-runtime.ts` | Queue + page-open tracking |
| Unit coverage | `tests/dev-browser-core.test.ts` | Parser, transport, temp-file, runtime behavior |
| User command docs | `docs/commands.md` | Canonical grammar reference |
| Install/publish surface | `package.json`, `README.md` | `pi.extensions`, published `files`, npm scripts |

## CONVENTIONS
- Repo root = package root. Keep install-critical files at root.
- Published package ships `extensions/` directly. `tsc` verifies only; no emit step.
- Formatting uses tabs via Biome.
- Package entrypoint for Pi lives in `package.json -> pi.extensions -> ./extensions/dev-browser.ts`.
- Command grammar must stay aligned across `TOOL_DESCRIPTION`, `docs/commands.md`, `README.md`, and tests.
- Hidden `.pi-lens/` files exist for local analysis only. Ignore for package behavior.

## ANTI-PATTERNS (THIS PROJECT)
- Do not add command support in code without docs and tests.
- Do not auto-stop global `dev-browser` daemon during session cleanup.
- Do not widen published `files` list casually; package surface intentionally narrow.
- Do not move extension entrypoint without updating `package.json`.
- Do not treat docs PRDs/plans as runtime source.

## UNIQUE STYLES
- Three-way split: Pi glue in `dev-browser.ts`, pure grammar in `dev-browser-core.ts`, session coordination in `dev-browser-runtime.ts`.
- Screenshot path returns inline image content after file readback, not text-only path.
- Transport contract strict: default headless, connect explicit, HTTPS-ignore managed-only.
- Session cleanup closes only owned page. Shared browser daemon stays untouched.

## COMMANDS
```bash
npm install
npm run lint
npm run typecheck
npm test
npm run check
npm pack --dry-run
```

## NOTES
- Current automated tests hit core/runtime helpers. Full extension install prompt path not directly unit-tested.
- `extensions/AGENTS.md` covers tool-internal editing rules. Read it before changing command behavior.
