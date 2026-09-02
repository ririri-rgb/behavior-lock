# Changelog

All notable changes to this project will be documented here.

## [0.2.0] - 2026-09-02

### Added

- `behavior-lock init` with conservative repository metadata detection
- one-command capture: `record --name <name> -- <command> [args...]`
- structured `json-command` checks with path-level diffs and `ignorePaths`
- machine-readable `verify --json`
- self-dogfooding of Behavior Lock's own `--help` and `--version`
- trailing-whitespace normalization option

### Changed

- text diffs are bounded; large outputs use a safe summary rather than allocating an unbounded LCS matrix
- CI targets Node.js 22/24 across Ubuntu, macOS, and Windows
- GitHub Actions use Node-24-compatible action releases
- package runtime floor is Node.js 22
- CI smoke-tests the actual packed npm artifact, including its installed CLI entry point
- the repository now commits `package-lock.json` and uses `npm ci` for reproducible CI and release dependency installation
- a guarded manual npm release workflow validates an exact version tag and the exact packed artifact before publication

### Fixed

- ESLint no longer sends `test/run-tests.mjs` through the TypeScript project service

### Validated

- dogfooded in `ririri-rgb/repo-to-codex` against real CLI help, error behavior, and deterministic preview output
- a behavior-preserving CLI argument-parsing refactor passed both the repository's normal checks and Behavior Lock
- a separate regression experiment kept the existing lint/typecheck/tests/build/package checks green while Behavior Lock detected a supported `--force` option disappearing from CLI help
- the packed `behavior-lock@0.2.0` artifact is installed and smoke-tested in CI before release

### Deferred

- HTTP and generated-file behavior checks remain planned for a later release; the repo-to-codex validation did not require either feature

## [0.1.0] - 2026-09-02

### Added

- `behavior-lock record` and `behavior-lock verify`
- command behavior capture for exit code, signal, stdout, and stderr
- deterministic JSON baselines in `.behavior-lock/baseline.json`
- line-ending normalization and regex-based dynamic-value masking
- human-readable field and line diffs
- subprocess timeout and output-size limits
- stable CLI exit codes for unchanged, changed, and execution/configuration errors
- end-to-end tests, cross-platform CI, and a runnable basic CLI example
