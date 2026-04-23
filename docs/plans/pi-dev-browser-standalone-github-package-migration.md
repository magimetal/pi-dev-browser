# Plan: PRD-0001 pi-dev-browser Standalone GitHub Package Migration

- **Status:** Revised draft for execution
- **Date:** 2026-04-21
- **Scope:** Migrate local `pi-dev-browser` package into repo root as standalone GitHub-installable Pi package, add repo docs/tooling/changelog/license baseline, prove install/discovery in isolated environments before and after push, then close with scoped commit and push.
- **References:**
  - PRD: `docs/prd/0001-package-pi-dev-browser-for-github-install-via-pi.md`
  - Target repo: `.`
  - Source package: `/Users/magimetal/.pi/agent/packages/pi-dev-browser`
  - Pi package docs: `/Users/magimetal/.nvm/versions/node/v24.14.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/packages.md`
  - Example package manifest: `/Users/magimetal/.pi/agent/packages/pi-agents/package.json`
  - Global Pi settings false-pass hazard: `/Users/magimetal/.pi/agent/settings.json`
- **Primary objective:** Turn this repo into source-of-truth standalone `pi-dev-browser` package that Pi can install from GitHub, with explicit dependency contract, documented `dev-browser` prerequisites, clean verification evidence, dead-code cleanup, and pre-push plus post-push isolated install smoke.

## Planning Assumptions

- Repo root becomes package root. Required for `pi install git:github.com/magimetal/pi-dev-browser` and `pi install https://github.com/magimetal/pi-dev-browser` flows.
- Source package at `/Users/magimetal/.pi/agent/packages/pi-dev-browser` is current functional baseline. Execution should preserve behavior first, then harden repo/package surface.
- Current global Pi settings already include local package registration for `pi-dev-browser` via `/Users/magimetal/.pi/agent/settings.json`. Any install/discovery check run against normal global settings can false-pass. Isolated smoke verification is mandatory.
- Pi package docs require Pi runtime imports to remain in `peerDependencies` with `"*"`; local verification/tooling packages belong in `devDependencies`; third-party runtime npm deps belong in `dependencies` only if actually imported at runtime.
- Git installs run `npm install` when `package.json` exists. Clean `npm install` success is therefore mandatory gate before claiming GitHub-installable readiness.
- Initial standalone repo version will normalize source `0.0.1-local` to `0.0.1` and must match changelog entry. Local-only suffix must not ship.
- License decision is resolved in-plan: keep source `MIT` license and add root `LICENSE` artifact so repo/package metadata do not point at missing license text.
- No ADR required up front. If execution uncovers packaging architecture beyond straightforward migration, stop and open separate ADR follow-up instead of expanding this migration.
- Scope stays bounded to package migration, repo-root tooling/docs/license/changelog, verification, commit, and push. No browser-tool redesign, registry publishing, CI build-out, or unrelated refactors.

## Hard Guardrails

- Do not edit repository files outside migration/support scope required by PRD-0001.
- Do not change browser tool behavior except where needed for packaging, docs clarity, tests, or standalone repo wiring.
- Do not add unsupported Pi package manifest keys or packaged resource types.
- Do not ship `0.0.1-local`; ship resolved standalone version `0.0.1` only if changelog and package metadata agree.
- Do not leave package metadata claiming `MIT` without root `LICENSE` file.
- Do not bundle Pi runtime modules. Keep Pi runtime imports in `peerDependencies`; keep local verification stack in `devDependencies`.
- Do not place `dev-browser` CLI in npm dependencies when it is external prerequisite documented in README.
- Do not treat install/discovery as verified if command evidence comes from contaminated global settings at `/Users/magimetal/.pi/agent/settings.json`.
- Do not push before mandatory isolated pre-push smoke passes.
- Do not declare complete until mandatory isolated post-push smoke passes, or blocker is explicitly captured with command evidence.
- Do not keep `.pi-lens/`, temp outputs, packed tarballs, scratch dirs, or duplicate migrated files in git-tracked output.
- Do not hide lint/type errors with `as any`, `@ts-ignore`, or `@ts-expect-error`.

## Current Evidence Snapshot

### Target repo now

- `README.md` is placeholder only.
- `docs/prd/0001-package-pi-dev-browser-for-github-install-via-pi.md` defines migration requirements and acceptance criteria.
- No repo-root `package.json`, runtime code, tests, license, changelog, lint config, or verification scripts exist yet.

### Source package now

- `package.json` declares `name: "pi-dev-browser"`, `version: "0.0.1"`, `license: "MIT"`, `pi.extensions: ["./extensions/dev-browser.ts"]`
- Source `peerDependencies` already include `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`, `typebox`
- Source `devDependencies` already include local verification stack `@types/node`, `typescript`, `vitest`
- Source tree contains `extensions/*.ts`, `tests/dev-browser-core.test.ts`, `docs/commands.md`, `README.md`, `vitest.config.ts`, `package-lock.json`

### Known false-pass hazard

- `/Users/magimetal/.pi/agent/settings.json` currently contains `"./packages/pi-dev-browser"` in global `packages`.
- Impact: `pi list`, `pi config`, or runtime discovery run against default user config can succeed even if this standalone repo migration is broken.
- Control: all install/discovery smoke must run in clean temp repo with isolated `HOME` and repo-local install target, then capture fresh `pi list` and `pi config` evidence from that clean environment.

## PRD Acceptance Traceability

| PRD acceptance focus | Planned phase(s) |
| --- | --- |
| Repo contains package files/metadata for GitHub Pi install | 1, 2 |
| `README.md` explains install flow, prerequisites, setup, usage, troubleshooting | 3 |
| Linting documented and runnable, changelog exists | 3, 4 |
| Scope excludes registry publishing, unrelated feature work, browser redesign | all guardrails |
| Repo ready for maintainer handoff, commit, push, install proof | 4 |

## Exact Files and Artifacts Likely Touched During Execution

### Repo-root package and tooling

- `package.json`
- `package-lock.json`
- `tsconfig.json` *(new, required)*
- `vitest.config.ts`
- `biome.json` *(new, likely required)*
- `.gitignore` *(new or expanded, required)*
- `CHANGELOG.md` *(new)*
- `LICENSE` *(new, required)*
- `README.md`

### Runtime and tests

- `extensions/dev-browser.ts`
- `extensions/dev-browser-core.ts`
- `extensions/dev-browser-runtime.ts`
- `tests/dev-browser-core.test.ts`

### Package docs

- `docs/commands.md`
- existing PRD file for reference only: `docs/prd/0001-package-pi-dev-browser-for-github-install-via-pi.md`

### Verification artifacts

- clean temp repo created during smoke verification
- clean temp HOME used to isolate Pi global settings during smoke verification
- git index/status for scoped migration set
- commit message for standalone package migration
- existing `origin` remote `git@github.com:magimetal/pi-dev-browser.git`

## Phase 1 — Package Contract, Inventory, and Isolation Rules

### Milestone

Execution starts with exact source-to-target map, standalone dependency contract, and isolation rules that prevent false-pass verification.

### Task 1.1 — Build migration inventory and copy map

- **What:** Enumerate every source artifact to copy, rewrite, create, or omit when moving from local Pi package path into repo root.
- **References:** `/Users/magimetal/.pi/agent/packages/pi-dev-browser`, target repo `.`, `docs/prd/0001-package-pi-dev-browser-for-github-install-via-pi.md`
- **Acceptance criteria:** Inventory maps each source file to target path and labels action as copy, rewrite, create-new, or omit.
- **Guardrails:** Do not start edits before full inventory exists. Do not omit docs, tests, or license implications from inventory.
- **Verification:** Manual inventory review against source tree and PRD scope.

### Task 1.2 — Lock repo-root package shape and dependency contract

- **What:** Confirm repo root package shape and document exact dependency ownership for standalone install.
- **References:** Pi package docs `docs/packages.md`, source `package.json`, `/Users/magimetal/.pi/agent/packages/pi-agents/package.json`
- **Acceptance criteria:** Execution path is explicit:
  - repo root is package root
  - `pi.extensions` points at repo-root extension entry
  - Pi runtime imports remain in `peerDependencies`
  - local verification/tooling packages remain in `devDependencies`
  - no external prerequisite such as `dev-browser` CLI is mis-modeled as npm runtime dependency
  - shipped `files` allowlist covers runtime/docs/license/changelog artifacts only
- **Guardrails:** Do not create nested package directory. Do not add unsupported `pi` manifest keys. Do not leave dependency placement implicit.
- **Verification:** Manual manifest/dependency checklist before editing `package.json`.

### Task 1.3 — Define isolated smoke-test harness and false-pass controls

- **What:** Specify exact clean-environment install/discovery proof required before push and after push.
- **References:** `/Users/magimetal/.pi/agent/settings.json`, Pi package docs install/list/config behavior, target repo `.`
- **Acceptance criteria:** Plan requires both:
  - pre-push smoke in clean temp repo using isolated `HOME` and repo-local install source
  - post-push smoke in clean temp repo using isolated `HOME` and GitHub install source
  - `pi list` evidence from clean temp repo
  - `pi config` evidence from clean temp repo
  - explicit note that existing global `./packages/pi-dev-browser` registration must not be source of truth
- **Guardrails:** Do not use default global config/home for smoke proof. Do not accept manual narrative without command output.
- **Verification:** Manual review of planned smoke commands before implementation starts.

### Task 1.4 — Define cleanup, ignore, version, and license rules before import

- **What:** Lock cleanup rules for dead code, ignored outputs, shipped version, and required license artifact before files move.
- **References:** target `README.md`; source `package.json`; planned `.gitignore`; package manifest `files`
- **Acceptance criteria:** Rules are explicit:
  - placeholder README content must go
  - unused imports/exports and duplicate migrated files must go
  - `.pi-lens/`, temp outputs, tarballs, and scratch dirs must be ignored and untracked
  - final package version is `0.0.1`
  - root `LICENSE` must exist and match `package.json#license`
- **Guardrails:** Do not delete files without verifying no references remain. Do not keep `0.0.1-local`. Do not leave ignore policy ambiguous.
- **Verification:** Manual checklist review against source manifest and repo file plan.

### Phase 1 exit gate

- Source-to-target map complete.
- Repo-root package shape chosen.
- Dependency contract explicit.
- Isolated smoke rules explicit.
- Cleanup/version/license rules explicit.

## Phase 2 — Migrate Functional Baseline into Standalone Repo Root

### Milestone

Target repo contains working `pi-dev-browser` source, tests, docs, manifest, and license at repo root with behavior preserved from source baseline.

### Task 2.1 — Copy runtime, tests, docs, and baseline metadata into repo root

- **What:** Migrate source package runtime files, tests, docs reference, and metadata into repo root.
- **References:** `/Users/magimetal/.pi/agent/packages/pi-dev-browser/package.json`, `/Users/magimetal/.pi/agent/packages/pi-dev-browser/extensions/*`, `/Users/magimetal/.pi/agent/packages/pi-dev-browser/tests/*`, `/Users/magimetal/.pi/agent/packages/pi-dev-browser/docs/commands.md`, `/Users/magimetal/.pi/agent/packages/pi-dev-browser/vitest.config.ts`
- **Acceptance criteria:** Repo root includes `extensions/`, `tests/`, `docs/commands.md`, `package.json`, `package-lock.json`, and `vitest.config.ts` adapted for standalone repo use.
- **Guardrails:** Preserve current browser tool behavior. Do not broaden scope into feature redesign. Do not leave nested copied package root inside repo.
- **Verification:** Manual tree review against migration inventory.

### Task 2.2 — Rewrite package manifest for standalone GitHub install

- **What:** Update root `package.json` from local-package form to standalone GitHub package form with final package identity, dependency contract, version, metadata, and shipped file allowlist.
- **References:** source `package.json`; Pi package docs; reference package manifests from `pi-agents`, `pi-gizmo`, `pi-gremlins`
- **Acceptance criteria:** `package.json` includes all of:
  - final `name: "pi-dev-browser"`
  - `version: "0.0.1"`
  - `license: "MIT"`
  - repository/homepage/bugs metadata for this repo
  - `keywords` including `pi-package`
  - `pi.extensions` pointing to `./extensions/dev-browser.ts`
  - `files` allowlist covering shipped runtime/docs/README/CHANGELOG/LICENSE artifacts
  - Pi runtime imports in `peerDependencies` only
  - local verification packages in `devDependencies` only
  - third-party runtime deps in `dependencies` only if actual runtime imports require them
- **Guardrails:** Do not ship `0.0.1-local`. Do not omit `LICENSE` from shipped artifact if referenced. Do not add unsupported resource types. Do not leave dependency placement based on guesswork; audit imports first.
- **Verification:** Planned checks: manifest review, dependency-to-import audit, `npm pack --dry-run` later in Phase 4.

### Task 2.3 — Add standalone config baseline and ignore policy

- **What:** Add repo-root config needed for typecheck, lint, tests, and clean git state.
- **References:** migrated TypeScript files; `vitest.config.ts`; reference configs from `pi-gizmo`; planned `.gitignore`
- **Acceptance criteria:** Repo has enough config to run `npm install`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run check`, and `.gitignore` excludes at minimum `node_modules/`, `.pi-lens/`, temp outputs, packed tarballs, and other generated verification artifacts.
- **Guardrails:** Keep config minimal and scoped to current package. Do not add CI-only complexity. Do not ignore authored source or required docs.
- **Verification:** Planned commands: `npm install`, `git status --short`, manual `.gitignore` review.

### Task 2.4 — Preserve baseline tests and extend only for migration-owned behavior

- **What:** Keep source regression coverage, then extend tests only where migration changes package/documented behavior expectations.
- **References:** `tests/dev-browser-core.test.ts`; runtime files under `extensions/`; PRD install/setup acceptance criteria
- **Acceptance criteria:** Existing tests survive migration, and any migration-introduced behavior or parser/doc contract change has matching test coverage where appropriate.
- **Guardrails:** Do not drop characterization tests during import. Do not add broad feature tests unrelated to migration scope.
- **Verification:** Planned command: `npm test`.

### Task 2.5 — Add root license artifact and align metadata

- **What:** Add root `LICENSE` file for MIT license and align shipped package/docs metadata to that decision.
- **References:** source `package.json#license`, root `README.md`, root `package.json`
- **Acceptance criteria:** Root `LICENSE` exists, license text matches `MIT`, package metadata matches artifact, and shipped file allowlist includes license if package ship rules require it.
- **Guardrails:** Do not change license away from source declaration in this migration. Do not leave README/package metadata pointing at missing artifact.
- **Verification:** Manual file review plus `npm pack --dry-run` file list check later.

### Phase 2 exit gate

- Repo-root package shape exists.
- Runtime, tests, docs, manifest, and license imported.
- Dependency contract explicit in manifest.
- Config and ignore baseline in place.

## Phase 3 — README, Linting, Changelog, and Dead-Code Hardening

### Milestone

Standalone repo clearly documents GitHub install flow, `dev-browser` prerequisites, local quality commands, and change history, with dead code and generated junk removed before verification.

### Task 3.1 — Replace placeholder README with standalone package README

- **What:** Rewrite root `README.md` to cover GitHub-based Pi install, `dev-browser` CLI prerequisites, initial setup, basic browser workflow, supported commands, transport parameters, troubleshooting, and maintainer verification commands.
- **References:** source `README.md`; source `docs/commands.md`; PRD acceptance criteria; Pi package docs install examples; repo remote `git@github.com:magimetal/pi-dev-browser.git`
- **Acceptance criteria:** README includes copy-pasteable install examples for GitHub install, explicit prerequisite commands such as `npm install -g dev-browser` and `dev-browser install`, basic usage flow, common missing-dependency troubleshooting, quality commands, and note that package install proof is captured through isolated smoke verification.
- **Guardrails:** README stays bounded to current package. Do not document npm publishing. Do not describe undocumented Pi package behavior.
- **Verification:** Manual README checklist against PRD acceptance criteria; planned repo search ensuring placeholder README text removed.

### Task 3.2 — Keep command reference aligned with README and runtime contract

- **What:** Review and update `docs/commands.md` so command grammar stays consistent with tool description, README examples, parser behavior, and tests.
- **References:** `docs/commands.md`; `extensions/dev-browser.ts`; `extensions/dev-browser-core.ts`; source README supported-command list
- **Acceptance criteria:** README, docs, runtime, and tests agree on command syntax, supported flags, and transport parameter semantics.
- **Guardrails:** Do not document commands not supported by parser/tests. Do not let README drift from runtime behavior.
- **Verification:** Manual four-way review plus planned command tests.

### Task 3.3 — Add linting baseline and documented quality scripts

- **What:** Add lint configuration, likely `biome.json`, and wire root scripts such as `lint`, `format`, `typecheck`, `test`, and aggregate `check` into `package.json`.
- **References:** `pi-gizmo/package.json`, `pi-gizmo/biome.json`, migrated TypeScript files, PRD linting requirement
- **Acceptance criteria:** Linting command exists, is documented in README, participates in aggregate `check`, and verification stack remains in `devDependencies`.
- **Guardrails:** Do not add overlapping lint stacks. Do not leave lint command undocumented. Do not relax rules only to silence migration issues.
- **Verification:** Planned commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run check`.

### Task 3.4 — Add Keep a Changelog baseline aligned to first standalone version

- **What:** Create `CHANGELOG.md` using Keep a Changelog structure with initial standalone package entry aligned to version `0.0.1`.
- **References:** `pi-gizmo/CHANGELOG.md`, `pi-gremlins/CHANGELOG.md`, PRD changelog requirement, root `package.json`
- **Acceptance criteria:** `CHANGELOG.md` exists, uses Keep a Changelog headings, includes `Unreleased` section plus initial `0.0.1` entry, and version text matches `package.json`.
- **Guardrails:** Do not invent prior release history. Do not leave version mismatch between changelog and package manifest.
- **Verification:** Manual changelog structure/version review.

### Task 3.5 — Remove dead code, migration leftovers, and generated junk before final verification

- **What:** Sweep repo for unused imports, unused exports, stale placeholder content, copied-but-unreferenced files, obsolete docs text, `.pi-lens` output, tarballs, temp dirs, and accidental duplicate artifacts from migration.
- **References:** all migrated files; `package.json#files`; `.gitignore`; repo-wide searches; git status
- **Acceptance criteria:**
  - no dead imports/exports remain in touched files
  - no duplicate source copies remain
  - no tracked `.pi-lens/` or temp verification outputs remain
  - final repo file set matches actual shipped package contents
  - every deleted file/path has reference proof captured before removal
- **Guardrails:** Verify references before deleting files. Do not keep scratch files, generated tarballs, or stale copied README variants. Do not rely on manual eyeballing alone for dead-code cleanup.
- **Verification:** Planned execution checks:
  - `npm run lint`
  - `npm run typecheck`
  - `rg -n "dev-browser|pi-dev-browser" README.md docs extensions tests package.json`
  - repo-wide reference search for any file considered for deletion
  - manual review of repo-root file list against `package.json#files` and `.gitignore`

### Phase 3 exit gate

- README satisfies PRD install/setup/troubleshooting acceptance.
- Linting baseline exists and is documented.
- Changelog exists and matches version `0.0.1`.
- License artifact exists.
- Dead-code and generated-junk cleanup complete.

## Phase 4 — Verification, Install Proof, Commit, Push, and Post-Push Proof

### Milestone

Repo proves standalone package readiness through clean install, local quality checks, isolated install/discovery smoke before push and after push, then scoped git closure.

### Task 4.1 — Run clean `npm install` gate

- **What:** Prove dependency graph installs cleanly in standalone repo before any claim about GitHub install readiness.
- **References:** final `package.json`, `package-lock.json`, repo root config files
- **Acceptance criteria:** `npm install` succeeds from clean repo state without manual dependency patching, and resulting lockfile/install state matches committed intent.
- **Guardrails:** Do not skip this gate. Do not rely on pre-existing `node_modules`. Do not treat git-based Pi install as safe if root `npm install` fails locally.
- **Verification:** Planned commands:
  - `npm install`
  - `git status --short`

### Task 4.2 — Run full local verification matrix

- **What:** Execute repo checks covering lint, typecheck, tests, and package artifact contents after clean install succeeds.
- **References:** final `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, runtime/tests/config files
- **Acceptance criteria:** All planned local verification commands succeed, or blocker is captured before any commit/push.
- **Guardrails:** Do not claim completion without command evidence. Do not skip lint, typecheck, test, or package artifact check.
- **Verification:** Planned commands:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run check`
  - `npm pack --dry-run`

### Task 4.3 — Mandatory isolated pre-push `pi install` smoke from local repo path

- **What:** Prove clean install/discovery works from local repo path before push, without contamination from existing global Pi settings.
- **References:** target repo `.`, `/Users/magimetal/.pi/agent/settings.json`, Pi package docs install/list/config behavior
- **Acceptance criteria:** In clean temp repo with isolated `HOME`, execution captures evidence showing:
  - install source is local absolute path to current repo
  - `pi install -l /absolute/path/to/repo` succeeds
  - `pi list` shows expected package source from clean temp repo context
  - `pi config` shows expected packaged extension visibility from clean temp repo context
  - results do not depend on existing global `./packages/pi-dev-browser` registration
- **Guardrails:** Do not run smoke from current working repo. Do not reuse user home. Do not accept pass without storing command output. Do not push if this smoke fails.
- **Verification:** Planned command pattern:
  - `TMP_HOME="$(mktemp -d)"`
  - `TMP_REPO="$(mktemp -d)"`
  - `cd "$TMP_REPO" && git init`
  - `HOME="$TMP_HOME" pi install -l /absolute/path/to/current/repo`
  - `HOME="$TMP_HOME" pi list`
  - `HOME="$TMP_HOME" pi config`
  - inspect temp repo `.pi/settings.json` if needed to confirm local registration source

### Task 4.4 — Final git hygiene, commit, and push

- **What:** Verify final git diff stays scoped, then create commit and push current branch to existing `origin` remote.
- **References:** `git status`, `git diff --stat`, remote `git@github.com:magimetal/pi-dev-browser.git`
- **Acceptance criteria:** Working tree contains only intended migration files, commit message clearly describes standalone package migration, and branch pushes successfully to remote.
- **Guardrails:** Do not commit generated junk, temp files, or unrelated repo changes. Do not push before Tasks 4.1 through 4.3 pass.
- **Verification:** Planned commands:
  - `git status --short`
  - `git diff --stat`
  - `git add <intended files>`
  - `git commit -m "Migrate pi-dev-browser into standalone GitHub-installable Pi package"`
  - `git push origin <current-branch>`

### Task 4.5 — Mandatory isolated post-push `pi install` smoke from exact pushed GitHub ref

- **What:** Prove clean install/discovery works from exact pushed GitHub branch, tag, or SHA after push using same clean temp repo context as pre-push smoke and a fresh isolated `HOME`.
- **References:** pushed repo URL plus exact pushed ref, Pi package docs install/list/config behavior, clean temp repo rules from Task 1.3, pre-push harness shape from Task 4.3
- **Acceptance criteria:** In fresh clean temp repo with fresh isolated `HOME`, execution captures evidence showing:
  - exact pushed ref is chosen and recorded before smoke begins (`<branch>`, `<tag>`, or `<sha>`)
  - `pi install -l git:github.com/magimetal/pi-dev-browser@<exact-pushed-ref>` succeeds *(or exact pushed URL form selected during execution, but still pinned to same exact ref)*
  - `pi list` shows expected GitHub package source pinned to exact pushed ref in clean temp repo context
  - `pi config` shows expected packaged extension visibility in same clean temp repo context
  - evidence bundle records exact ref used so reviewers can verify smoke matched pushed contents
  - no dependency on existing user-global package registration remains
- **Guardrails:** Do not use bare GitHub source without `@<exact-pushed-ref>`. Do not reuse pre-push `HOME`. Do not change temp repo isolation rules between pre-push and post-push smoke. Do not declare task complete after push alone. If post-push smoke fails, capture blocker and remediate before final closure.
- **Verification:** Planned command pattern:
  - `PUSHED_REF="<exact branch|tag|sha that was pushed>"`
  - `TMP_HOME="$(mktemp -d)"`
  - `TMP_REPO="$(mktemp -d)"`
  - `cd "$TMP_REPO" && git init`
  - `HOME="$TMP_HOME" pi install -l "git:github.com/magimetal/pi-dev-browser@$PUSHED_REF"`
  - `HOME="$TMP_HOME" pi list`
  - `HOME="$TMP_HOME" pi config`
  - record `PUSHED_REF`, install command, and command output in verification evidence

### Phase 4 exit gate

- Clean `npm install` passed.
- Local lint/typecheck/test/package-artifact checks passed.
- Mandatory isolated pre-push smoke passed with `pi list` and `pi config` evidence.
- Commit created and branch pushed.
- Mandatory isolated post-push smoke passed with `pi list` and `pi config` evidence.

## Recommended Execution Order

1. Task 1.1 — build migration inventory and copy map
2. Task 1.2 — lock repo-root package shape and dependency contract
3. Task 1.3 — define isolated smoke-test harness and false-pass controls
4. Task 1.4 — define cleanup, ignore, version, and license rules
5. Task 2.1 — copy runtime, tests, docs, and baseline metadata into repo root
6. Task 2.2 — rewrite package manifest for standalone GitHub install
7. Task 2.3 — add standalone config baseline and ignore policy
8. Task 2.4 — preserve baseline tests and extend only for migration-owned behavior
9. Task 2.5 — add root license artifact and align metadata
10. Task 3.1 — replace placeholder README with standalone package README
11. Task 3.2 — align `docs/commands.md` with runtime contract
12. Task 3.3 — add linting baseline and quality scripts
13. Task 3.4 — add Keep a Changelog baseline aligned to `0.0.1`
14. Task 3.5 — remove dead code, migration leftovers, and generated junk
15. Task 4.1 — run clean `npm install` gate
16. Task 4.2 — run full local verification matrix
17. Task 4.3 — run mandatory isolated pre-push local-path smoke
18. Task 4.4 — final git hygiene, commit, and push
19. Task 4.5 — run mandatory isolated post-push GitHub-source smoke

## Revised Verification Matrix

| Area | Why it matters | Verification |
| --- | --- | --- |
| Source import completeness | missing runtime/tests/docs breaks migration | manual tree review vs source inventory |
| Package dependency contract | wrong peer/dev/runtime placement breaks standalone install or bundles wrong modules | import audit vs `package.json` sections |
| Version and license closure | package cannot ship with local suffix or missing license artifact | `package.json` review, `CHANGELOG.md` review, root `LICENSE` presence |
| Clean local dependency install | Pi git installs run `npm install`; broken install blocks package consumers | `npm install` |
| Pi package manifest correctness | GitHub `pi install` depends on root package shape | manifest review, `npm pack --dry-run` |
| Runtime regression safety | migration must preserve behavior | `npm test` |
| Type safety | standalone repo needs maintainable baseline | `npm run typecheck` |
| Linting baseline | PRD explicitly requires documented linting | `npm run lint` |
| Aggregate maintainer command | handoff needs single repeatable quality gate | `npm run check` |
| README prerequisite clarity | users need `dev-browser` install steps and failure recovery | manual README checklist against PRD |
| Command/docs/runtime alignment | docs drift creates broken workflows | manual review plus tests |
| Changelog/version alignment | release surface must be coherent | manual `CHANGELOG.md` + `package.json` review |
| Dead-code cleanup | copied leftovers and stale exports confuse source of truth | lint/typecheck output, reference searches before delete, repo file review |
| Ignore cleanup | `.pi-lens/` and temp outputs must stay untracked | `.gitignore` review, `git status --short` |
| Pre-push install proof | local repo must install cleanly in isolated Pi environment before push | clean temp repo + isolated `HOME`, `pi install -l /absolute/path/to/repo`, `pi list`, `pi config` |
| Post-push install proof | GitHub source must install cleanly for real users from exact pushed contents, not default-branch drift | same clean temp repo harness shape as pre-push smoke + fresh isolated `HOME`, record exact pushed branch/tag/SHA, `pi install -l git:github.com/magimetal/pi-dev-browser@<exact-pushed-ref>`, `pi list`, `pi config` |
| Commit/push closure | user explicitly wants pushed repo with evidence-backed readiness | `git status --short`, `git diff --stat`, `git commit`, `git push origin <branch>` |

## Residual Risks and Unknowns

### Risk 1 — `pi` CLI or isolated temp environment unavailable during execution
- **Impact:** mandatory install smoke cannot complete.
- **Control:** stop with blocker and capture exact command failure; do not downgrade smoke to optional.

### Risk 2 — Post-push GitHub install fails due to remote/auth/ref state
- **Impact:** repo pushes but package not yet consumer-ready.
- **Control:** mandatory post-push smoke remains completion gate; remediate before declaring success.

### Risk 3 — README or docs overpromise browser prerequisite behavior not covered by tests
- **Impact:** install succeeds but first runtime use still confuses users.
- **Control:** tie docs to actual parser/runtime behavior and keep prerequisite section explicit and narrow.

## Key Assumptions for Execution

- Repo root is intended long-term source of truth for `pi-dev-browser`.
- `npm` remains package manager and lockfile format.
- Biome is acceptable lint baseline because existing standalone Pi package repos already use it.
- Existing source tests remain useful characterization coverage after migration.
- No ADR required unless migration unexpectedly introduces broader packaging architecture decisions.
- Commit and push remain in same execution dispatch once all verification gates pass.

## Self-Review Checklist

- [x] Existing plan artifact updated in place only
- [x] No repository files edited outside `docs/plans/`
- [x] Plan references PRD, source package path, target repo, Pi package docs, and global settings false-pass hazard
- [x] Tasks include What, References, Acceptance criteria, Guardrails, Verification
- [x] Mandatory isolated pre-push and post-push `pi install` smoke added
- [x] Post-push smoke pinned to exact pushed branch/tag/SHA and requires recorded ref evidence
- [x] `pi list` and `pi config` evidence required in clean temp repo
- [x] False-pass risk from `/Users/magimetal/.pi/agent/settings.json` explicitly controlled
- [x] Standalone dependency contract explicit: peerDependencies vs devDependencies vs runtime deps
- [x] Clean `npm install` gate added
- [x] Dead-code verification and ignore cleanup strengthened for `.pi-lens/` and temp outputs
- [x] Version and license decisions resolved in tasks
