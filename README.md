# behavior-lock

**Lock your software's behavior before AI touches the code.**

Behavior Lock captures observable repository behavior before a risky change, then tells you exactly what drifted afterward. It is a repository-level workflow for characterization/golden-master style regression checks; it does **not** claim to invent snapshot, golden master, characterization, or regression testing.

```bash
npx behavior-lock record --name cli-help -- my-cli --help

# refactor, migrate, upgrade dependencies, or let an AI coding agent edit the code

npx behavior-lock verify
```

That first command records the behavior **and** registers it in `behavior-lock.json`. No config file is required to try the tool.

## 5-minute start

Requires Node.js 22+.

### Option A: lock one command immediately

```bash
npx behavior-lock record --name cli-help -- node dist/cli.js --help
npx behavior-lock verify
```

A changed command exits with code `1`; configuration or execution errors exit with code `2`.

### Option B: initialize an existing repository

```bash
npx behavior-lock init
```

`init` recognizes common repository metadata (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`) and creates a safe empty `behavior-lock.json` when one does not already exist. It never overwrites an existing config.

For a detected runnable Node CLI entry, `init` may print conventional `--help` / `--version` **capture suggestions**, but it does not register or execute them automatically. Review a suggestion, then run it explicitly, for example:

```bash
npx behavior-lock record --name my-cli-help -- node dist/cli.js --help
```

This avoids pretending that every CLI implements conventional flags.

## What gets locked?

A command check records deterministic external behavior:

- exit code
- process signal
- stdout
- stderr

Example:

```json
{
  "version": 1,
  "checks": [
    {
      "type": "command",
      "name": "cli-help",
      "command": "node",
      "args": ["dist/cli.js", "--help"]
    }
  ]
}
```

Baselines live in `.behavior-lock/baseline.json` and are intended to be reviewed and committed to version control.

## Structured JSON behavior

Use `json-command` when stdout is JSON:

```json
{
  "type": "json-command",
  "name": "users",
  "command": "node",
  "args": ["cli.js", "--json"],
  "normalize": {
    "ignorePaths": ["$.requestId", "$.createdAt"]
  }
}
```

Behavior Lock parses the JSON and reports path-level changes instead of treating the entire document as a text blob:

```text
✗ users

$.users[0].name
- "Alice"
+ "Alicia"
```

You can also capture a JSON command directly:

```bash
npx behavior-lock record --json --name users -- node cli.js --json
```

## Normalization

Text command streams always normalize CRLF/CR line endings to LF. Optional regex replacement and trailing-whitespace normalization are available:

```json
{
  "normalize": {
    "stdout": {
      "trimTrailingWhitespace": true,
      "replacements": [
        { "pattern": "request-[a-f0-9]+", "replacement": "<request-id>" }
      ]
    }
  }
}
```

For structured JSON, use `ignorePaths` for intentionally unstable fields. More advanced array ordering and numeric tolerance are future work rather than silently guessed behavior.

## Safe behavior acceptance

Behavior Lock deliberately does not offer “verify failed → accept everything”. The recommended workflow is:

```text
verify
↓
human review
↓
record
↓
git diff
↓
commit
```

`record --name ... -- ...` only updates the named behavior in an existing baseline, so trying the zero-config flow does not implicitly accept unrelated changes.

## CI

The normal integration is one line after your project is built:

```yaml
- name: Verify behavior
  run: npx behavior-lock verify
```

For bots and other tooling:

```bash
npx behavior-lock verify --json
```

Example result:

```json
{
  "status": "changed",
  "unchanged": 10,
  "changed": 2,
  "checks": []
}
```

No GitHub token is required for core verification.

## Why not just use snapshot tests?

Snapshot tests are useful, and Behavior Lock is built on the same broad family of regression ideas. The difference is workflow and scope:

| Snapshot test suites | Behavior Lock |
| --- | --- |
| Usually tied to a test framework | Standalone repository-level CLI |
| Commonly compare values inside a test process | Captures external process behavior |
| Framework/language specific setup | Runs any executable command |
| Best when you already have tests | Useful when characterizing legacy or migration behavior before changing internals |
| Snapshot update flow is framework-specific | Explicit `record → review → git diff → commit` workflow |

Behavior Lock is especially useful when the risky change spans many files or technologies and the most important contract is what a user or another process can observe from the outside.

## Use cases

### CLI refactor

Lock `--help`, `--version`, exit codes, stderr, and JSON output before reorganizing the implementation.

### Framework migration

Capture stable commands or API-client fixtures around an Express → Fastify migration while internal architecture changes substantially.

### Legacy modernization

Characterize a poorly tested executable first, then rewrite internals with an external regression boundary.

### AI-assisted refactoring

Record externally visible behavior before an AI coding agent changes a large area of the codebase; verify afterward to catch unintended drift.

### Dependency upgrade

Detect user-visible output or compatibility changes caused by framework/runtime/library upgrades.

## Performance and safety limits

Behavior Lock executes user-configured commands, so `behavior-lock.json` should be treated as executable intent.

Current safeguards:

- `shell: false` by default
- no automatic execution on clone or install
- default command timeout: 30 seconds
- default combined stdout/stderr capture limit: 1 MiB per check
- bounded text diff generation; large line sets use a summary instead of allocating a full quadratic LCS matrix
- deterministic baselines: no timestamps, hostnames, durations, temp paths, or random run IDs are added by Behavior Lock

See [SECURITY.md](SECURITY.md) before using configuration from an untrusted repository.

## Self-dogfooding

Behavior Lock protects its own `--help` and `--version` output in CI using the committed `behavior-lock.json` and `.behavior-lock/baseline.json`.

> Behavior Lock protects Behavior Lock.

This is repository self-testing, not a claim of external production adoption.

## Current scope

v0.2 focuses on command behavior, structured JSON output, onboarding, bounded diffs, machine-readable verification, and cross-platform CI. HTTP checks and generated-file checks are intentionally deferred until they can be added without weakening the core execution and baseline model.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

CI runs on Ubuntu, macOS, and Windows with Node.js 22 and 24.

## Contributing

Issues and focused pull requests are welcome. Good future contribution areas include HTTP checks, file checks, richer normalization, reporters, and documentation examples. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
