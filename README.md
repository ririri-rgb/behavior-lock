# behavior-lock

**Lock your software's behavior before AI touches the code.**

> Detect unintended behavior changes after AI-assisted refactoring.

`behavior-lock` records observable command behavior before a refactor and compares it with what the software does afterward. It is designed for AI-assisted refactoring, large code changes, dependency upgrades, migrations, and legacy modernization—but it works without AI and without any cloud service.

```bash
npx behavior-lock record
# change code with an AI coding agent or by hand
npx behavior-lock verify
```

```text
Behavior Lock

✓ 12 behaviors unchanged

✗ 2 behavioral changes detected

Result: FAILED
```

## Why

Tests encode assertions developers chose to write. They can miss output formatting, exit codes, defaults, filesystem-facing CLI behavior, and other details users observe. Behavior Lock complements tests by capturing selected observable behavior before risky code modification and turning unexpected drift into a reviewable failure.

This is not a claim to invent a new testing theory. The approach is related to golden master and characterization testing. The focus here is a small, deterministic CLI workflow for modern large-scale and AI-assisted code modification.

## Quick start

Requires Node.js 20 or newer.

Create `behavior-lock.json` at your repository root:

```json
{
  "version": 1,
  "checks": [
    {
      "type": "command",
      "name": "cli-help",
      "command": "node",
      "args": ["dist/cli.js", "--help"]
    },
    {
      "type": "command",
      "name": "cli-version",
      "command": "node",
      "args": ["dist/cli.js", "--version"]
    }
  ]
}
```

Record the known behavior:

```bash
npx behavior-lock record
```

Commit `.behavior-lock/baseline.json` with your code. After a refactor:

```bash
npx behavior-lock verify
```

Exit code `0` means unchanged, `1` means behavior changed, and `2` means configuration or execution failed.

## What v0.1 captures

For each configured command, Behavior Lock records:

- process exit code
- termination signal
- stdout
- stderr

The baseline is deterministic JSON: no timestamps and no machine-specific absolute paths are written by Behavior Lock.

## Readable diffs

A change is reported at the field level. Text streams receive a line-oriented diff:

```text
✗ cli-help

stdout changed:

- --json    Output JSON
+ --format  Select output format

Result: FAILED
```

## Normalization

Line endings are normalized to `\n` automatically so Windows CRLF does not create noise. Dynamic text can be masked with regular expressions:

```json
{
  "type": "command",
  "name": "generated-output",
  "command": "node",
  "args": ["script.mjs"],
  "normalize": {
    "stdout": {
      "replacements": [
        {
          "pattern": "requestId=[a-zA-Z0-9-]+",
          "replacement": "requestId=<ignored>"
        },
        {
          "pattern": "createdAt=[^\\n]+",
          "replacement": "createdAt=<ignored>"
        }
      ]
    }
  }
}
```

Patterns default to the `g` flag. You may provide `flags` explicitly.

Normalization is intentionally narrow in v0.1. JSON-field ignores, unordered-array comparison, and richer structured normalization are roadmap items rather than partially implemented promises.

## Command configuration

```json
{
  "type": "command",
  "name": "example",
  "command": "node",
  "args": ["dist/cli.js", "--help"],
  "cwd": "packages/example",
  "env": {
    "NODE_ENV": "test"
  },
  "timeoutMs": 10000,
  "maxOutputBytes": 262144
}
```

Defaults are a 30-second timeout and a combined stdout/stderr limit of 1 MiB.

Commands run sequentially in v0.1. This favors predictable resource use and readable failure behavior over maximum speed.

## Safety model

A Behavior Lock configuration is executable intent: `record` and `verify` run the commands it names. Treat an unfamiliar repository's `behavior-lock.json` with the same caution as its package scripts.

Behavior Lock does **not** execute checks on clone, install, import, or configuration discovery. A user must explicitly invoke `record` or `verify`.

v0.1 deliberately uses `spawn(command, args, { shell: false })`; it does not interpolate a shell command string. Shell behavior is therefore not implicit. A project can still explicitly configure a shell executable such as `sh` with `-c`, but doing so opts into that shell's risks.

Commands inherit the current environment by default, with optional configured overrides. Do not place secrets directly in committed configuration or baselines. See [SECURITY.md](SECURITY.md).

## CI

Commit the baseline, then verify it in pull requests:

```yaml
- name: Verify behavior
  run: npx behavior-lock verify
```

A behavioral change exits `1`, so ordinary CI fails without special integration. Configuration or command execution errors exit `2`.

This makes future PR annotations or comments possible without requiring them in the core workflow.

## Example project

A runnable example lives in [`examples/basic-cli`](examples/basic-cli). In this repository:

```bash
npm install
npm run example
```

The demo records the example, verifies it unchanged, modifies its observable output in a temporary copy, and shows the resulting failure.

## Behavior Lock vs other testing approaches

- **Unit tests:** assert chosen behavior at focused boundaries. Behavior Lock captures configured observable process behavior and compares before/after results.
- **Snapshot testing:** commonly snapshots values inside a test framework. Behavior Lock is a repository-level CLI workflow intended to guard refactors and migrations across tools and languages reachable through commands.
- **Regression testing:** a broad category that includes many strategies. Behavior Lock is one regression technique, not a replacement for a test suite.
- **Contract testing:** validates an agreed interface between components. Behavior Lock v0.1 compares concrete observed command behavior against a repository baseline.
- **Golden master / characterization testing:** the closest conceptual relatives. Behavior Lock packages that idea around deterministic, reviewable baselines and an AI/refactor-oriented CLI workflow.

Keep normal tests. Behavior Lock is most useful as an additional guard when changing more code than you can comfortably reason about line by line.

## Intentional behavior changes

There is no interactive “press Enter to accept” flow. If a change is intentional:

1. review the `verify` diff;
2. run `npx behavior-lock record` explicitly;
3. inspect the Git diff of `.behavior-lock/baseline.json`;
4. commit the baseline change with the code change.

This makes accepting new behavior a deliberate version-control action.

## Philosophy

> Tests describe what developers remembered to test. Behavior Lock records what the software actually did.

The statement is a product heuristic, not a reason to replace tests. Behavior Lock only records the behavior you configure it to observe.

## Roadmap

After the command-first v0.1 is stable, likely additions include HTTP checks, structured JSON comparison, filesystem behavior, OpenAPI/browser adapters, baseline subsets, GitHub annotations, and a plugin API. AI-generated explanations may be useful later, but core record/verify behavior will remain local and deterministic.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local development and architecture notes.

## License

MIT
