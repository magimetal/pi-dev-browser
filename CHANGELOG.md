# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added generated root `AGENTS.md` and `extensions/AGENTS.md` knowledge-base docs for repo and extension-specific coding guidance.

### Changed
- Migrated package dependency metadata and extension TypeBox imports from `@sinclair/typebox` to `typebox` for Pi 0.69.0 compatibility.
- Bumped local Pi development dependencies to `@mariozechner/pi-coding-agent` and `@mariozechner/pi-tui` `0.69.0`, regenerating lockfile packages against new TypeBox 1.x dependency graph.
- Updated migration plan notes to reflect released `0.0.1` package version and `typebox` peer dependency naming.

## [0.0.1] - 2026-04-21

### Added
- Migrated `pi-dev-browser` into standalone repository-root Pi package layout for GitHub-based `pi install` flows.
- Added root package metadata, MIT license artifact, Biome linting, TypeScript typecheck, Vitest tests, and packaged file allowlist.
- Added README install/setup/troubleshooting guidance for `dev-browser` CLI prerequisites and local maintainer verification.
- Added command reference packaging and isolated local-path install smoke verification for clean Pi environments.

[Unreleased]: https://github.com/magimetal/pi-dev-browser/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/magimetal/pi-dev-browser/releases/tag/v0.0.1
