---
name: postgresql-cli
description: "Manage PostgreSQL databases via CLI - database connections, SQL queries, schema inspection, table descriptions. Use when user mentions 'postgresql', 'postgres', 'database query', 'SQL query', 'database schema', 'table schema', or wants to interact with PostgreSQL databases."
author: Melvyn
category: devtools
---

# postgresql-cli

Manage PostgreSQL databases from the CLI. Register database connections, run SQL queries, and inspect schemas.

Always use `--json` when calling programmatically.

## Setup

If `postgresql-cli` is not found, install and build it:
```bash
bun --version || curl -fsSL https://bun.sh/install | bash
npx api2cli bundle postgresql
npx api2cli link postgresql
```

`api2cli link` adds `~/.local/bin` to PATH automatically.

## Working Rules

- Always use `--json` for agent-driven calls so downstream steps can parse the result.
- Start with `--help` if the exact action or flags are unclear instead of guessing.
- Use `schema` or `describe` to understand database structure before writing queries.

## Connection Strings

Supports two formats:
- Direct URL: `postgresql-cli database add prod "postgresql://user:pass@host:5432/db"`
- Env var name: `postgresql-cli database add prod "DATABASE_URL"` (reads from environment at runtime)

Connections stored at `~/.config/postgresql-cli/databases.json` (chmod 600).

## database

| Command | Description |
|---------|-------------|
| `postgresql-cli database add <name> <connection-string> --json` | Register a database connection (URL or env var name) |
| `postgresql-cli database list --json` | List all registered databases |
| `postgresql-cli database remove <name> --json` | Remove a registered database |
| `postgresql-cli database test <name> --json` | Test connection to a registered database |
| `postgresql-cli database query <name> "<sql>" --json` | Run a SQL query against a database |
| `postgresql-cli database query <name> "<sql>" --format csv` | Run a SQL query with CSV output |
| `postgresql-cli database schema <name> --json` | Get full schema (tables, columns, types, constraints, indexes) |
| `postgresql-cli database tables <name> --json` | List all tables with estimated row counts and sizes |
| `postgresql-cli database describe <name> <table> --json` | Get detailed schema for a single table |

## Output Format

`--json` returns a standardized envelope:
```json
{ "ok": true, "data": [...], "meta": { "total": 42 } }
```

On error:
```json
{ "ok": false, "error": { "code": 1, "message": "...", "suggestion": "..." } }
```

## Quick Reference

```bash
postgresql-cli --help
postgresql-cli database --help
postgresql-cli database <action> --help
```

Global flags: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`

Exit codes: 0 = success, 1 = API error, 2 = usage error
