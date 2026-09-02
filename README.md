# behavior-lock

**Lock your software's behavior before AI touches the code.**

Behavior Lock captures observable repository behavior before a risky change, then tells you what drifted afterward. It packages characterization/golden-master style regression checking into a repository-level CLI workflow; it does **not** claim to invent snapshot, golden master, characterization, or regression testing.

```bash
npx behavior-lock record --name cli-help -- my-cli --help

# refactor, migrate, upgrade dependencies, or let an AI coding agent edit the code

npx behavior-lock verify
```

The first command captures the behavior **and** registers it in `behavior-lock.json`. No config file is required to try the tool.

## Try it

Requires Node.js 22+.

Lock one real command immediately:

```bash
npx behavior-lock record --name cli-help -- node dist/cli.js --help
npx behavior-lock verify
```

A changed behavior exits with code `1`; configuration or execution errors exit with code `2`.

Or initialize an existing repository:

```bash
npx behavior-lock init
```

`init` recognizes common repository metadata (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`) and creates a safe empty `behavior-lock.json` when one does not already exist. It never overwrites an existing config.

For a detected runnable Node CLI entry, `init` may print conventional `--help` / `--version` **capture suggestions**, but it does not register or execute them automatically. Review a suggestion, then run it explicitly.

## Add it to your project

For ongoing use, install Behavior Lock as a development dependency rather than relying on an unpinned remote package resolution:

```bash
npm install --save-dev behavior-lock
```

Commit your package manifest and lockfile. Then record the behaviors you want to protect:

```bash
npx behavior-lock record --name cli-help -- node dist/cli.js --help
```

Commit both `behavior-lock.json` and `.behavior-lock/baseline.json` after reviewing them.

For CI, install from the committed lockfile first, then use the project-local Behavior Lock version:

```yaml
- run: npm ci
- name: Verify behavior
  run: npx behavior-lock verify
```

`npx` uses the locally installed dependency here, so the lockfile—not whatever version happens to be newest—controls the Behavior Lock version used by CI.

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

Behavior Lock parses the JSON and reports path-level changes instead of treating the whole document as a text blob:

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

`record --name ... -- ...` only updates the named behavior in an existing baseline, so the zero-config flow does not implicitly accept unrelated changes.

## CI and integrations

For human-readable CI output:

```bash
npx behavior-lock verify
```

For bots and other tooling:

```bash
npx behavior-lock verify --json
```

Example machine-readable result:

```json
{
  "status": "changed",
  "unchanged": 10,
  "changed": 2,
  "checks": []
}
```

No GitHub token is required for core verification.

## Real-world dogfooding: repo-to-codex

Behavior Lock is used in [`ririri-rgb/repo-to-codex`](https://github.com/ririri-rgb/repo-to-codex) to protect real CLI contracts during refactoring.

The committed baseline protects:

- complete `--help` output and exit behavior
- unknown-option stderr and exit code
- deterministic preview output for repo-to-codex's existing Next.js fixture

In [repo-to-codex PR #1](https://github.com/ririri-rgb/repo-to-codex/pull/1), CLI option parsing and help rendering were extracted from `src/cli/index.ts` into `src/cli/options.ts`. The normal lint/typecheck/test/build/package checks passed, and Behavior Lock also passed with all three behaviors unchanged.

A separate [closed regression experiment, PR #2](https://github.com/ririri-rgb/repo-to-codex/pull/2), reproduced a realistic follow-up mistake: `--force` was still accepted by the parser but its line disappeared from user-facing help. The existing lint, typecheck, tests, build, and package checks all still passed. Behavior Lock failed and reported:

```text
✗ cli-help

stdout changed:

-   --force    Allow overwriting generated target files
```

No existing tests were disabled or weakened for this experiment. The regression exposed a natural gap between internal test coverage and the external CLI contract.

## Why not just use snapshot tests?

Snapshot tests are useful, and Behavior Lock belongs to the same broad family of regression techniques. The difference is workflow and scope:

| Snapshot test suites | Behavior Lock |
| --- | --- |
| Usually tied to a test framework | Standalone repository-level CLI |
| Commonly compare values inside a test process | Captures external process behavior |
| Framework/language-specific setup | Runs any executable command |
| Best when the behavior already fits naturally inside tests | Useful for characterizing an executable before risky internal changes |
| Snapshot update flow is framework-specific | Explicit `record → review → git diff → commit` workflow |

Behavior Lock is not a replacement for good tests. It adds an external behavior boundary that can be useful when existing tests do not completely describe what users or other processes observe.

## Best fit today

The strongest v0.2 use cases are:

1. **CLI maintainers** protecting help text, exit codes, stderr/stdout, JSON output, and deterministic command output.
2. **Maintainers doing risky refactors, migrations, or legacy modernization** who want to characterize an executable before changing its internals.

AI-assisted refactoring increases the value of this workflow because large changes can happen quickly, but AI is not required for Behavior Lock to be useful.

## Use cases

### CLI refactor

Lock `--help`, `--version`, exit codes, stderr, and JSON output before reorganizing argument parsing, command routing, or internal modules.

### Legacy modernization

Characterize a poorly tested executable first, then rewrite internals behind an external regression boundary.

### Framework migration

Capture stable commands or client-visible fixtures while internal architecture changes substantially.

### Dependency upgrade

Detect user-visible output or compatibility changes caused by framework, runtime, or library upgrades.

### AI-assisted refactoring

Record externally visible behavior before an AI coding agent changes a large area of the codebase; verify afterward to catch unintended drift.

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

v0.2 focuses on command behavior, structured JSON output, onboarding, bounded diffs, machine-readable verification, and cross-platform CI. HTTP checks and generated-file checks remain intentionally deferred: the repo-to-codex dogfood exercise was successfully completed using the existing command checks alone.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

CI runs on Ubuntu, macOS, and Windows with Node.js 22 and 24 and smoke-tests the actual packed npm artifact.

## Contributing

Issues and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
