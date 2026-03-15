# postgresql-cli

CLI for the postgresql API. Made with [api2cli.dev](https://api2cli.dev).

## Install

```bash
npx api2cli install <user>/postgresql-cli
```

This clones the repo, builds the CLI, links it to your PATH, and installs the AgentSkill to your coding agents.

## Install AgentSkill only

```bash
npx skills add <user>/postgresql-cli
```

## Usage

```bash
postgresql-cli auth set "your-token"
postgresql-cli auth test
postgresql-cli --help
```

## Resources

Run `postgresql-cli --help` to see available resources.

## Global Flags

All commands support: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`
