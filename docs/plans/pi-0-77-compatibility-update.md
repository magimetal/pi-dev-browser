# Pi 0.77.0 Compatibility Update Plan

## Summary Verdict

**Required compatibility work is minimal.** Based on changelog research for Pi `0.75.3 -> 0.77.0` and repository inspection, the extension's current `registerTool`, `execute`, `pi.exec`, `renderCall`, `renderResult`, and `session_shutdown` usage remains API-compatible with Pi 0.77.0.

Prioritize metadata/dependency alignment and one semantic cleanup: Pi docs clarify returned tool values do not set tool error state, and tool execution failures should throw. The current extension models failures with `isError?: boolean` on returned results, which is not a reliable Pi error-state mechanism. Decide whether browser command failures are intended to be agent-visible content or true tool execution failures, then adjust tests/docs accordingly.

## Key Assumptions

- Pi 0.77.0 keeps the extension registration and execution signatures compatible with the inspected source.
- The package ships TypeScript source directly through `package.json -> pi.extensions -> ./extensions/dev-browser.ts`.
- Future implementation may run verification commands, but this planning pass did not run build, lint, format, tests, or package commands.
- Peer dependencies intentionally remain broad unless package policy requires pinning supported Pi ranges.

## Priority Order

1. **Required:** Update Node engine and Pi development dependencies for 0.77.0 alignment.
2. **Required decision:** Normalize failure semantics around returned error objects vs thrown execution failures.
3. **Required:** Add/adjust tests for 0.77.0-facing behavior and dependency metadata.
4. **Optional:** Adopt Pi 0.77.0 improvements where they add value without redesign.
5. **Optional:** Update README/docs with compatibility notes and any changed failure behavior.

## Required Changes

### Task 1 — Align package metadata with Pi 0.77.0 runtime floor

**What**
- Update `engines.node` from `>=20.0.0` to `>=22.19.0` because Pi has required Node `>=22.19.0` since 0.75.0.
- Update Pi dev dependencies used for local typechecking/tests from `0.74.0` to `0.77.0`:
  - `@earendil-works/pi-coding-agent`
  - `@earendil-works/pi-tui`
- Regenerate `package-lock.json` with the resolved 0.77.0 package versions.

**References**
- `package.json`
- `package-lock.json`

**Acceptance criteria**
- `package.json` contains `"node": ">=22.19.0"`.
- `package.json` dev dependencies for both Pi packages are `0.77.0`.
- `package-lock.json` matches the updated dependency graph after `npm install`.
- No production source changes are mixed into this metadata-only commit/checkpoint.

**Guardrails**
- Do not change `pi.extensions` entrypoint.
- Do not broaden package contents in `files` unless required by packaging verification.
- Do not pin peer dependencies unless a deliberate compatibility policy decision is made.

**Verification**
```bash
npm install
npm run typecheck
npm test
npm run lint
npm pack --dry-run
```

### Task 2 — Decide and implement 0.77.0-compatible tool failure semantics

**What**
- Review every `createErrorResult(...)` call and classify it:
  1. **Expected browser/CLI outcome to show the model/user as content**: return a normal `AgentToolResult` with `details.error`, but do not rely on `isError`.
  2. **Actual tool execution failure**: throw an `Error` so Pi marks execution failed, matching clarified docs.
- Remove or stop depending on `BrowserToolResult.isError` unless local rendering still needs it only as an internal display hint.
- Recommended minimum adjustment:
  - For `dev-browser` not installed, aborted operation, unexpected exceptions, temp/script failures, and `pi.exec` infrastructure failures: throw.
  - For a browser command returning non-zero because the page/action failed: decide explicitly. If this should be recoverable agent feedback, return content with `details.error`; if it should stop as a failed tool call, throw.
- Update `renderResult(...)` so error display is based on `details.error` and/or thrown-failure behavior, not an assumption that returned `isError` sets Pi error state.

**References**
- `extensions/dev-browser.ts`
- `tests/dev-browser-core.test.ts` or a new focused extension behavior test file if one already exists/pattern supports it
- `README.md`
- `docs/commands.md`

**Acceptance criteria**
- No code path depends on returned `isError` to mark Pi tool execution failed.
- Tests cover at least:
  - non-zero `dev-browser` CLI result behavior chosen by the implementation;
  - missing `dev-browser` behavior;
  - abort/unexpected exception behavior if test harness can exercise `execute` directly.
- README/docs describe user-visible failure behavior accurately.

**Guardrails**
- Do not use `as any`, `@ts-ignore`, or `@ts-expect-error` to suppress type issues.
- Do not redesign command parsing, transport handling, or runtime state as part of this change.
- Do not remove user-helpful command output from browser failures unless the chosen behavior preserves it in the thrown message.

**Verification**
```bash
npm run typecheck
npm test
npm run lint
```

### Task 3 — Confirm `session_shutdown` cleanup remains safe under 0.77.0 signal fixes

**What**
- Pi 0.77.0 makes `session_shutdown` more likely to fire on `SIGTERM`/`SIGHUP`. Re-check cleanup idempotency and failure handling.
- Keep the current defensive behavior unless tests reveal a problem:
  - `await executor.drain()` before cleanup;
  - return when no browser page was opened;
  - close only the owned named page;
  - never call global `dev-browser stop`;
  - ignore cleanup failures during shutdown.
- Add a focused unit test for runtime state transitions if not already covered.

**References**
- `extensions/dev-browser.ts`
- `extensions/dev-browser-runtime.ts`
- `tests/dev-browser-core.test.ts` or a new runtime test file

**Acceptance criteria**
- Runtime state tests prove `recordSuccessfulAction(...)` marks page state correctly for normal actions and `close`.
- Cleanup remains idempotent and does not kill unrelated browser instances.
- No new shutdown path can hang indefinitely beyond existing `pi.exec` timeout behavior.

**Guardrails**
- Do not replace the internal serial executor unless a concrete bug is found.
- Do not add global daemon shutdown.
- Do not introduce broad lifecycle abstractions.

**Verification**
```bash
npm test
npm run typecheck
```

## Optional Improvements

### Task 4 — Consider Pi-native sequential execution mode

**What**
- Pi supports `executionMode?: "sequential" | "parallel"`. Evaluate whether `registerTool({ executionMode: "sequential" })` can replace or supplement `createSerialExecutor()`.
- Recommended decision point:
  - If Pi sequential execution serializes calls for the same tool with equivalent semantics, add `executionMode: "sequential"` and keep `createSerialExecutor()` only if needed for shutdown drain semantics.
  - If shutdown drain or compatibility uncertainty remains, keep the current executor and document why.

**References**
- `extensions/dev-browser.ts`
- `extensions/dev-browser-runtime.ts`

**Acceptance criteria**
- A documented decision exists in code comments or README if no change is made.
- If `executionMode` is added, typecheck passes against Pi 0.77.0.
- No concurrency regression for browser page state.

**Guardrails**
- Do not remove serialization without a test or manual proof that concurrent browser actions cannot interleave.
- Do not perform a broad executor refactor.

**Verification**
```bash
npm run typecheck
npm test
```

### Task 5 — Evaluate prompt guidance additions

**What**
- Pi docs recommend `promptSnippet`/`promptGuidelines`. The current `TOOL_DESCRIPTION` already includes workflow guidance.
- Decide whether to keep guidance in `description` only or add Pi-native prompt guidance fields for better model behavior.

**References**
- `extensions/dev-browser.ts`
- `extensions/dev-browser-core.ts` (`TOOL_DESCRIPTION`)
- `README.md`
- `docs/commands.md`

**Acceptance criteria**
- If prompt guidance fields are added, they contain concise workflow instructions:
  - open URL;
  - run `snapshot -i`;
  - use `@refs` for interactions;
  - re-snapshot after page changes;
  - use `connect` only for existing Chrome state.
- Tool description remains concise and not duplicated excessively.
- Typecheck passes against Pi 0.77.0 types.

**Guardrails**
- Do not inflate prompts with full command documentation.
- Do not remove command help from user-facing docs.

**Verification**
```bash
npm run typecheck
npm test
```

### Task 6 — Document Pi 0.77.0 compatibility and changed behavior

**What**
- Update docs only after required implementation decisions are complete.
- Add a compatibility note for Pi `0.77.0` and Node `>=22.19.0`.
- If failure semantics changed, document when browser command failures are returned as content vs thrown as tool failures.

**References**
- `README.md`
- `docs/commands.md`
- `package.json`

**Acceptance criteria**
- README installation/prerequisites match `package.json` engine.
- Command docs accurately describe error behavior.
- No docs claim Pi API breaks that do not exist.

**Guardrails**
- Do not add unsupported version claims.
- Do not document optional `--exclude-tools`, `InputEvent.streamingBehavior`, or `pi.getAllTools` fixes as extension features unless this extension directly uses them.

**Verification**
```bash
npm run lint
npm pack --dry-run
```

## File-by-File Task Map

- `package.json`
  - Required: update Node engine and Pi dev dependency versions.
  - Optional: adjust peer dependency policy only if maintainers want explicit supported ranges.
- `package-lock.json`
  - Required: regenerate after dependency updates with `npm install`.
- `extensions/dev-browser.ts`
  - Required: update returned-error vs thrown-error behavior.
  - Required: keep/verify shutdown cleanup behavior.
  - Optional: add `executionMode: "sequential"` if verified useful.
  - Optional: add `promptSnippet`/`promptGuidelines` if supported and non-duplicative.
- `extensions/dev-browser-core.ts`
  - Optional: refine `TOOL_DESCRIPTION` only if prompt guidance fields move workflow text elsewhere.
- `extensions/dev-browser-runtime.ts`
  - Required: add tests around current runtime state; source change only if a bug is found.
- `tests/dev-browser-core.test.ts` or new focused test files
  - Required: add tests for metadata-adjacent behavior only where practical, failure semantics, and runtime state.
- `README.md`
  - Required if Node floor or failure semantics are user-visible.
- `docs/commands.md`
  - Required if command failure behavior changes.

## Verification Sequence for Implementation

Run in this order after implementing the tasks:

```bash
npm install
npm run typecheck
npm test
npm run lint
npm pack --dry-run
```

Expected results:
- `npm install` updates `package-lock.json` without dependency resolution errors.
- `npm run typecheck` passes with Pi 0.77.0 types.
- `npm test` passes, including new/updated failure semantics and runtime state tests.
- `npm run lint` passes without formatting or lint violations.
- `npm pack --dry-run` includes the extension entrypoint, docs, license, changelog if present, and excludes unintended files.

## Rollback and Checkpoints

1. **Checkpoint A — Metadata only**
   - Files: `package.json`, `package-lock.json`.
   - Rollback: restore both files together if dependency resolution or typecheck fails due to upstream package mismatch.
2. **Checkpoint B — Failure semantics**
   - Files: `extensions/dev-browser.ts`, tests, docs as needed.
   - Rollback: revert this checkpoint independently if behavior proves too disruptive; keep metadata update if compatible.
3. **Checkpoint C — Shutdown/runtime tests**
   - Files: tests and `extensions/dev-browser-runtime.ts` only if needed.
   - Rollback: remove tests or source adjustment if they encode incorrect assumptions about Pi shutdown ordering.
4. **Checkpoint D — Optional Pi-native enhancements**
   - Files: `extensions/dev-browser.ts`, `extensions/dev-browser-core.ts`, docs as needed.
   - Rollback: remove optional `executionMode`/prompt guidance fields while retaining required compatibility updates.

## Risks and Decision Points

- **Failure semantics risk:** Throwing for all non-zero browser command results may reduce agent recoverability. Decide whether browser action failures are expected task feedback or true tool execution failures.
- **Sequential execution risk:** Pi-native `executionMode: "sequential"` may not replace the internal executor's shutdown `drain()` behavior. Keep the internal executor unless equivalence is proven.
- **Dependency risk:** Updating local Pi packages from `0.74.0` to `0.77.0` may reveal type drift not identified by changelog research.
- **Docs risk:** Mentioning Pi features not used by this extension can confuse users. Keep docs scoped to this package.

## Non-Relevant Pi 0.77.0 Changes

No implementation work is currently recommended for:
- `--exclude-tools` CLI option;
- `InputEvent.streamingBehavior`;
- `pi.getAllTools` `promptGuidelines` fix, except optional prompt guidance adoption;
- `renderCall`/`renderResult` shorter signature compatibility, because current signatures remain compatible.

## Final Acceptance Criteria

- Package metadata reflects Pi 0.77.0-compatible development and Node runtime expectations.
- Extension typechecks against Pi 0.77.0 packages.
- Tool failure behavior no longer relies on returned `isError` to set Pi error state.
- Shutdown cleanup remains safe with more reliable `session_shutdown` emission on signals.
- Tests and docs match the chosen behavior.
- Verification sequence passes: `npm install`, `npm run typecheck`, `npm test`, `npm run lint`, `npm pack --dry-run`.
