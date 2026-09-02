# Security Policy

## Supported versions

Security fixes are provided for the latest released version of `behavior-lock`. The current v0.2 work may exist on an unreleased branch before publication.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature when available. Do not open a public issue containing exploit details, credentials, or captured secrets.

## Command execution trust model

`behavior-lock.json` is executable intent. `record`, one-command capture, and `verify` run executables with the permissions of the current user.

Behavior Lock therefore follows these rules:

- it never executes checks merely because a repository was cloned, dependencies were installed, `init` analyzed metadata, or a config was discovered;
- execution requires an explicit `record` or `verify` action from the user/CI;
- commands are spawned as an executable plus argument array with `shell: false`; there is no implicit shell interpolation;
- checks have a default 30-second timeout;
- combined captured stdout/stderr is limited to 1 MiB by default;
- text diff generation is bounded so large outputs do not trigger an unbounded quadratic LCS allocation;
- remote configuration is not fetched or executed;
- baselines are local JSON and intentionally contain captured behavior, so commands that print secrets can place those secrets in `.behavior-lock/baseline.json`;
- `json-command` parsing and `ignorePaths` happen locally after capture; ignored paths are replaced before they are persisted to a newly recorded baseline.

Review unfamiliar `behavior-lock.json` files before running them. A configuration can explicitly invoke a shell, package manager, script, network client, or any other executable available to the current user even though Behavior Lock itself does not enable a shell implicitly.

## Baseline hygiene

Before committing a baseline:

1. review `git diff -- .behavior-lock behavior-lock.json`;
2. verify captured output contains no credentials, tokens, personal data, or machine-specific secrets;
3. use text replacement or JSON `ignorePaths` only for values that are intentionally nondeterministic;
4. do not treat normalization as a secret-management system—prefer commands that do not print secrets at all.
