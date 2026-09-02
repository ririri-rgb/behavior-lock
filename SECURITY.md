# Security Policy

## Supported versions

Security fixes are provided for the latest released version of `behavior-lock`.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature when available. Do not open a public issue containing exploit details or secrets.

## Command execution trust model

`behavior-lock record` and `behavior-lock verify` execute commands from the repository's `behavior-lock.json`. This is arbitrary program execution by design.

The CLI therefore follows these rules:

- it never executes configured checks merely because a repository was cloned, dependencies were installed, or the config was discovered;
- execution requires an explicit `record` or `verify` command;
- v0.1 executes an executable plus an argument array with `shell: false`, avoiding implicit shell interpolation;
- checks have a default 30-second timeout;
- captured output is limited to 1 MiB by default;
- remote configuration is not fetched or executed;
- baselines are plain local JSON and contain captured output, so users must ensure commands do not print secrets.

Review unfamiliar configuration before running it. A configuration can explicitly run a shell, package manager, script, or any other executable available to the current user.
