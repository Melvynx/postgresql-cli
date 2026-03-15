# postgresql-cli

CLI for managing PostgreSQL databases - register connections, run queries, inspect schemas. Made with [api2cli.dev](https://api2cli.dev).

## Install

```bash
npx api2cli install Melvynx/postgresql-cli
```

This clones the repo, builds the CLI, links it to your PATH, and installs the AgentSkill to your coding agents.

## Install AgentSkill only

```bash
npx skills add Melvynx/postgresql-cli
```

## Usage

### Register a database

```bash
# With a direct connection string
postgresql-cli database add prod "postgresql://user:pass@host:5432/mydb"

# With an environment variable name (reads from env at runtime)
postgresql-cli database add prod "DATABASE_URL"
```

### Manage databases

```bash
postgresql-cli database list
postgresql-cli database test prod
postgresql-cli database remove prod
```

### Run queries

```bash
postgresql-cli database query prod "SELECT * FROM users LIMIT 10"
postgresql-cli database query prod "INSERT INTO logs (msg) VALUES ('hello')" --json
postgresql-cli database query prod "SELECT name, email FROM users" --format csv
```

### Inspect schema

```bash
# Full schema - all tables, columns, types, constraints, indexes
postgresql-cli database schema prod --json

# List tables with row counts and sizes
postgresql-cli database tables prod

# Detailed schema for a single table
postgresql-cli database describe prod users --json
```

## Storage

Connection strings are stored in `~/.config/postgresql-cli/databases.json` (chmod 600).

## Global Flags

All commands support: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`

Exit codes: 0 = success, 1 = error, 2 = usage error
