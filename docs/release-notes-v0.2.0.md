# behavior-lock v0.2.0

v0.2.0 focuses on making Behavior Lock easier to try, safer on large outputs, and more useful in CI without expanding into a large adapter or plugin surface.

## Highlights

- **One-command capture** — lock a behavior without writing config first:
  `behavior-lock record --name cli-help -- my-cli --help`
- **`behavior-lock init`** — conservatively detects common repository metadata and helps users get started without inventing commands.
- **Structured JSON behavior** — `json-command` parses JSON output and reports path-level changes.
- **`ignorePaths`** — ignore intentionally volatile JSON fields such as request IDs or timestamps.
- **Bounded text diffs** — large outputs avoid unbounded quadratic LCS allocation and fall back to a safe summary.
- **Machine-readable verification** — `behavior-lock verify --json` supports bots and integrations.
- **Cross-platform CI** — validated on Ubuntu, macOS, and Windows with Node.js 22 and 24.
- **Self-dogfooding** — Behavior Lock verifies its own `--help` and `--version` behavior in CI.

## Real-world validation

Behavior Lock was also dogfooded in [`ririri-rgb/repo-to-codex`](https://github.com/ririri-rgb/repo-to-codex).

It protects the CLI's full help output, unknown-option stderr/exit behavior, and deterministic preview output. A real refactor extracting CLI option parsing preserved all three contracts and passed both the project's normal checks and Behavior Lock.

A separate closed regression experiment kept repo-to-codex's existing lint, typecheck, tests, build, and package checks green while Behavior Lock detected that the still-supported `--force` option had disappeared from user-facing help.

Evidence:
- dogfooding/refactor PR: https://github.com/ririri-rgb/repo-to-codex/pull/1
- closed regression experiment: https://github.com/ririri-rgb/repo-to-codex/pull/2

## Release integrity

- The repository commits `package-lock.json`, and CI/release validation installs development dependencies with `npm ci`.
- CI builds an actual `behavior-lock@0.2.0` tarball, installs it, and smoke-tests the installed `behavior-lock --help` and `behavior-lock --version` entry points.
- The npm bin entry point resolves package-manager symlinks correctly, so local installs and `npx behavior-lock` execute the packaged CLI.
- The release workflow is manual-only, checks an existing exact version tag against `package.json` and current `main`, reruns validation, smoke-tests the exact tarball, and publishes that same tarball with npm provenance enabled.

## Scope

HTTP and generated-file checks are intentionally not part of v0.2.0. The current command/JSON feature set was sufficient for the repo-to-codex validation, so this release keeps the core small while those extensions remain future work.

## Upgrade notes

- Runtime support is Node.js 22 or newer.
- Baseline acceptance remains explicit: review a failed verification, run `record` deliberately, inspect the Git diff, then commit the accepted behavior change.
