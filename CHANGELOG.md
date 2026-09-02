# Changelog

All notable changes to this project will be documented here.

## [0.2.0] - Unreleased

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

### Fixed

- ESLint no longer sends `test/run-tests.mjs` through the TypeScript project service

### Deferred

- HTTP and generated-file behavior checks remain planned for a later release so v0.2 can keep the command/JSON core small and reliable

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
