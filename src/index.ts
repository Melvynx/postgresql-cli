#!/usr/bin/env bun
import { Command } from "commander";
import { globalFlags } from "./lib/config.js";
import { databaseResource } from "./resources/database.js";

const program = new Command();

program
  .name("postgresql-cli")
  .description("CLI for managing PostgreSQL databases - register connections, run queries, inspect schemas")
  .version("0.1.0")
  .enablePositionalOptions()
  .passThroughOptions()
  .option("--verbose", "Enable debug logging", false)
  .option("--no-color", "Disable colored output")
  .option("--no-header", "Omit table/csv headers (for piping)")
  .hook("preAction", (_thisCmd, actionCmd) => {
    const root = actionCmd.optsWithGlobals();
    globalFlags.json = root.json ?? false;
    globalFlags.format = root.format ?? "text";
    globalFlags.verbose = root.verbose ?? false;
    globalFlags.noColor = root.color === false;
    globalFlags.noHeader = root.header === false;
  });

program.addCommand(databaseResource);

program.parse();
