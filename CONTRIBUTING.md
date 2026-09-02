# Contributing

Thanks for helping improve Behavior Lock.

## Local setup

Requires Node.js 20+ and npm.

```bash
npm install
npm run check
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run example
```

## Architecture

The v0.1 data flow is intentionally small:

```text
behavior-lock.json
  -> config validation
  -> command runner
  -> normalization
  -> baseline / current behavior
  -> diff engine
  -> reporter + CLI exit code
```

Core modules live under `src/`:

- `config.ts`: strict JSON configuration loading and validation
- `runner.ts`: subprocess execution and safety limits
- `normalize.ts`: deterministic stream normalization
- `baseline.ts`: versioned JSON baseline storage
- `diff.ts`: field and line-oriented comparison
- `reporter.ts`: human-readable terminal output
- `core.ts`: record/verify orchestration
- `cli.ts`: command parsing and exit codes

## Adding a check type

Check types should remain isolated behind a capture boundary. A new type should define configuration validation, a deterministic captured behavior shape, normalization rules, and comparison behavior without adding vendor-specific logic to the CLI.

Please include focused unit tests plus an end-to-end test demonstrating record, unchanged verification, and changed verification.

## Pull requests

Keep changes scoped. Do not document features before they work. New runtime dependencies require a clear reason because a small dependency and security surface is a project goal.
