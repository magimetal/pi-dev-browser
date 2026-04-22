<!--THIS IS A GENERATED FILE - DO NOT MODIFY DIRECTLY, FOR MANUAL ADJUSTMENTS UPDATE `AGENTS_CUSTOM.MD`-->
# EXTENSIONS KNOWLEDGE BASE

**Generated:** 2026-04-22T05:24:24Z
**Parent:** `../AGENTS.md`

## OVERVIEW
Extension implementation layer. One public Pi tool, three-file split: Pi glue, pure command grammar, runtime session coordination.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add or change tool params | `dev-browser.ts` | TypeBox schema, render labels, execute path |
| Add command grammar | `dev-browser-core.ts` | `parseCommand()` + `buildCommand()` + usage errors |
| Change transport behavior | `dev-browser-core.ts` | `resolveTransport()` + `buildDevBrowserArgs()` |
| Change screenshot or text result handling | `dev-browser.ts` | inline image response, truncation, error shaping |
| Change session lifecycle | `dev-browser-runtime.ts` | runtime flags, serial executor, drain semantics |
| Update coverage | `../tests/dev-browser-core.test.ts` | keep grammar and runtime assertions exact |

## CONVENTIONS
- Keep `dev-browser-core.ts` mostly pure. Only temp-file helpers touch fs/os.
- Every new command needs four synchronized updates: `TOOL_DESCRIPTION`, `docs/commands.md`, `README.md`, tests.
- Usage errors stay explicit and deterministic. Tests assert exact strings.
- `snapshot` output must rewrite `[ref=e12]` to `@e12` before returning tool text.
- All tool execution flows through serial executor. Browser calls intentionally single-filed.
- Cleanup closes owned page only. Never stop global `dev-browser` daemon.

## ANTI-PATTERNS
- Do not bypass `resolveTransport()`; transport validation stays centralized.
- Do not weaken grammar with undocumented aliases or loose extra args.
- Do not add long-lived state outside `dev-browser-runtime.ts` without shutdown review.
- Do not read screenshot files outside screenshot action path.
- Do not change page name or browser naming scheme without checking cleanup behavior and tests.

## NOTES
- `dev-browser.ts` owns interactive install prompt path for UI sessions. Non-UI sessions fail fast with manual install message.
- Locator contract uses `aria-ref=<ref>` from AI snapshot refs. Keep `click`/`fill`/`type`/`select`/`wait` aligned.
- `buildCommand()` emits dev-browser runtime scripts, not Playwright test snippets.
