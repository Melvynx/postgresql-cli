import { Command } from "commander";
import { output } from "../lib/output.js";
import { handleError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import {
  addDatabase,
  removeDatabase,
  listDatabases,
  getDatabase,
  resolveConnectionString,
} from "../lib/db-store.js";
import {
  runQuery,
  getSchema,
  getTables,
  describeTable,
  testConnection,
} from "../lib/pg-client.js";

function resolveDb(name: string) {
  const db = getDatabase(name);
  if (!db) {
    throw new CliError(2, `Database "${name}" not found.`, "Run: postgresql-cli database list");
  }
  return resolveConnectionString(db);
}

export const databaseResource = new Command("database")
  .description("Manage PostgreSQL databases")
  .enablePositionalOptions()
  .passThroughOptions();

databaseResource
  .command("add")
  .description("Register a database connection")
  .argument("<name>", "Alias for this database (e.g. prod, staging)")
  .argument("<connection-string>", 'Connection URL or env var name (e.g. "DATABASE_URL")')
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    '\nExamples:\n  postgresql-cli database add prod "postgresql://user:pass@host:5432/db"\n  postgresql-cli database add staging "DATABASE_URL"',
  )
  .action(async (name: string, connectionString: string, opts: { json?: boolean }) => {
    try {
      addDatabase(name, connectionString);
      if (opts.json) {
        output({ name, connectionString: connectionString.startsWith("postgres") ? "***" : connectionString, status: "added" }, { json: true });
      } else {
        log.success(`Database "${name}" registered`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("list")
  .description("List all registered databases")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  postgresql-cli database list")
  .action(async (opts: { json?: boolean }) => {
    try {
      const dbs = listDatabases().map((d) => ({
        name: d.name,
        connection: d.connectionString.startsWith("postgres")
          ? d.connectionString.replace(/\/\/[^@]+@/, "//***@")
          : d.connectionString,
        added: d.addedAt,
      }));
      output(dbs, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("remove")
  .description("Remove a registered database")
  .argument("<name>", "Database alias to remove")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  postgresql-cli database remove staging")
  .action(async (name: string, opts: { json?: boolean }) => {
    try {
      const removed = removeDatabase(name);
      if (!removed) {
        throw new CliError(2, `Database "${name}" not found.`, "Run: postgresql-cli database list");
      }
      if (opts.json) {
        output({ name, status: "removed" }, { json: true });
      } else {
        log.success(`Database "${name}" removed`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("test")
  .description("Test connection to a registered database")
  .argument("<name>", "Database alias")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  postgresql-cli database test prod")
  .action(async (name: string, opts: { json?: boolean }) => {
    try {
      const connStr = resolveDb(name);
      await testConnection(connStr);
      if (opts.json) {
        output({ name, status: "connected" }, { json: true });
      } else {
        log.success(`Connected to "${name}"`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("query")
  .description("Run a SQL query against a database")
  .argument("<name>", "Database alias")
  .argument("<sql>", "SQL query to execute")
  .option("--json", "Output as JSON")
  .option("--format <fmt>", "Output format: text, json, csv, yaml")
  .addHelpText(
    "after",
    '\nExamples:\n  postgresql-cli database query prod "SELECT * FROM users LIMIT 10"\n  postgresql-cli database query prod "INSERT INTO logs (msg) VALUES (\'hello\')" --json',
  )
  .action(async (name: string, sql: string, opts: { json?: boolean; format?: string }) => {
    try {
      const connStr = resolveDb(name);
      const result = await runQuery(connStr, sql);

      if (result.command === "SELECT" || result.rows.length > 0) {
        output(result.rows, { json: opts.json, format: opts.format });
      } else {
        if (opts.json) {
          output({ command: result.command, rowCount: result.rowCount }, { json: true });
        } else {
          log.success(`${result.command} - ${result.rowCount} row(s) affected`);
        }
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("schema")
  .description("Get full database schema (tables, columns, types, constraints, indexes)")
  .argument("<name>", "Database alias")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  postgresql-cli database schema prod --json")
  .action(async (name: string, opts: { json?: boolean }) => {
    try {
      const connStr = resolveDb(name);
      const schema = await getSchema(connStr);

      if (opts.json) {
        output(schema, { json: true });
      } else {
        for (const table of schema) {
          const t = table as any;
          console.log(`\n${pc.bold(pc.white(t.table))} (${t.type})`);

          if (t.columns?.length) {
            console.log(pc.dim("  Columns:"));
            for (const col of t.columns) {
              const nullable = col.nullable ? pc.dim(" nullable") : "";
              const def = col.default ? pc.dim(` default=${col.default}`) : "";
              console.log(`    ${pc.cyan(col.name)} ${col.type}${nullable}${def}`);
            }
          }

          if (t.constraints?.length) {
            console.log(pc.dim("  Constraints:"));
            for (const c of t.constraints) {
              const ref = c.references ? ` -> ${c.references}` : "";
              console.log(`    ${pc.yellow(c.type)} ${c.column}${ref}`);
            }
          }

          if (t.indexes?.length) {
            console.log(pc.dim("  Indexes:"));
            for (const idx of t.indexes) {
              console.log(`    ${pc.dim(idx.name)}`);
            }
          }
        }
        console.log(`\n${pc.dim(`${schema.length} table(s)`)}`);
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("tables")
  .description("List all tables with row counts and sizes")
  .argument("<name>", "Database alias")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  postgresql-cli database tables prod")
  .action(async (name: string, opts: { json?: boolean }) => {
    try {
      const connStr = resolveDb(name);
      const tables = await getTables(connStr);
      output(tables, { json: opts.json });
    } catch (err) {
      handleError(err, opts.json);
    }
  });

databaseResource
  .command("describe")
  .description("Get detailed schema for a single table")
  .argument("<name>", "Database alias")
  .argument("<table>", "Table name")
  .option("--json", "Output as JSON")
  .addHelpText("after", "\nExample:\n  postgresql-cli database describe prod users --json")
  .action(async (name: string, table: string, opts: { json?: boolean }) => {
    try {
      const connStr = resolveDb(name);
      const info = await describeTable(connStr, table);

      if (opts.json) {
        output(info, { json: true });
      } else {
        const t = info as any;
        console.log(`\n${pc.bold(pc.white(t.table))}`);
        if (t.estimated_rows !== undefined) {
          console.log(`  Rows: ~${t.estimated_rows}  Size: ${t.total_size} (data: ${t.data_size}, indexes: ${t.index_size})`);
        }

        if (t.columns?.length) {
          console.log(pc.dim("\n  Columns:"));
          for (const col of t.columns) {
            const nullable = col.nullable ? pc.dim(" nullable") : "";
            const def = col.default_value ? pc.dim(` default=${col.default_value}`) : "";
            console.log(`    ${pc.cyan(col.name)} ${col.type}${nullable}${def}`);
          }
        }

        if (t.constraints?.length) {
          console.log(pc.dim("\n  Constraints:"));
          for (const c of t.constraints) {
            const ref = c.foreign_table ? ` -> ${c.foreign_table}.${c.foreign_column}` : "";
            console.log(`    ${pc.yellow(c.type)} ${c.column}${ref}`);
          }
        }

        if (t.indexes?.length) {
          console.log(pc.dim("\n  Indexes:"));
          for (const idx of t.indexes) {
            console.log(`    ${pc.dim(idx.definition)}`);
          }
        }
      }
    } catch (err) {
      handleError(err, opts.json);
    }
  });

import pc from "picocolors";
