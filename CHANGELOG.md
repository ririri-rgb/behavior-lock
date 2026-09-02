# Changelog

All notable changes to this project will be documented here.

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
