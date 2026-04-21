# PRD-0001: Package pi-dev-browser for GitHub Install via Pi

- **Status:** Active
- **Date:** 2026-04-21
- **Author:** Magi Metal
- **Related:** README updates, changelog setup, package/distribution metadata, future ADRs if packaging architecture branches materially
- **Supersedes:** None

## Problem Statement

`pi-dev-browser` needs a clean package distribution surface so Pi users can install it directly from GitHub into a fresh target repository with predictable setup steps. Current target repo is effectively empty, which leaves package scope, install requirements, repository hygiene, and release-readiness ambiguous. This work defines v1 requirements for migrating existing `pi-dev-browser` package assets into this repo, documenting browser CLI prerequisites, and making repository state ready for maintainable delivery.

## User Stories

- As a Pi user, I want to install `pi-dev-browser` from GitHub and understand required CLI/browser dependencies so that installation succeeds without guesswork.
- As a maintainer, I want repo-level packaging artifacts, linting, changelog, and README guidance in place so that package can be committed, reviewed, and pushed as a coherent distributable unit.

## Scope

### In Scope

- Migrate existing `pi-dev-browser` package contents into this target repository as package source of truth.
- Add or update package metadata needed for Pi to install package directly from GitHub.
- Document `dev-browser` CLI install requirements, including external runtime or browser prerequisites users must satisfy before first use.
- Expand `README.md` with install, setup, usage, and troubleshooting guidance relevant to GitHub-based Pi package installation.
- Add linting configuration and documented lint command for package repository quality checks.
- Add changelog artifact and define how package changes should be recorded.
- Leave repository in commit-ready and push-ready state for initial package publication workflow.

### Out of Scope

- Changing end-user behavior of `pi-dev-browser` beyond packaging, install, and documentation needs.
- Publishing to npm or any registry outside GitHub-installable Pi package flow.
- Full CI/CD, automated release pipelines, or GitHub Actions unless later scope explicitly requires them.
- Architectural redesign of browser automation internals; if migration exposes major architecture choices, capture separately in an ADR.

## Acceptance Criteria

- [ ] Repository contains required package files and metadata for Pi to install `pi-dev-browser` from GitHub without undocumented manual steps.
- [ ] `README.md` explains install flow, `dev-browser` CLI prerequisites, initial setup, basic usage, and troubleshooting for common missing-dependency cases.
- [ ] Linting can be run from documented repository command, and changelog file exists with initial entry or documented starting structure.
- [ ] Package scope explicitly excludes registry publishing, unrelated feature work, and internal browser-tool redesign in this iteration.
- [ ] Repository output is organized for maintainer handoff, commit, and push without missing foundational documentation artifacts.

## Technical Surface

- **Repository root:** `README.md`, package manager metadata, package installation metadata, lint configuration, changelog, ignore files, and any top-level package entrypoints required for Pi package consumption.
- **Package source:** migrated `pi-dev-browser` implementation files and package manifest fields needed for GitHub install path.
- **CLI dependency surface:** `dev-browser` CLI install requirements, browser/runtime dependency notes, and first-run validation guidance.
- **Documentation:** `docs/prd/`, README install docs, changelog conventions, and any package-specific troubleshooting notes created during migration.
- **Related ADRs:** None yet. Create ADR only if migration forces non-trivial packaging architecture decision or binary/runtime distribution strategy.

## UX Notes

Installation docs should optimize for first-run clarity: exact install source, prerequisites before invocation, expected success signal, and plain-language recovery steps when browser dependencies are missing. Examples should favor copy-pasteable commands and short validation steps over narrative explanation.

## Open Questions

- What exact repository/package structure will Pi expect for GitHub-installable packages in this migration target?
- Which browser dependency model will be documented as required: bundled browser, system Chrome/Chromium, Playwright-managed browser, or multiple supported paths?
- What changelog format should this repo standardize on for package release notes?
- Does initial scope require example install command snippets for both maintainers and end users, or only Pi package consumers?

## Revision History

- 2026-04-21: Draft created
- 2026-04-21: Status changed to Active after plan review passed and implementation began
