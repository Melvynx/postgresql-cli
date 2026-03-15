import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

interface DatabaseEntry {
  name: string;
  connectionString: string;
  addedAt: string;
}

interface StoreData {
  databases: DatabaseEntry[];
}

const STORE_PATH = join(homedir(), ".config", "postgresql-cli", "databases.json");

function ensureStore(): StoreData {
  if (!existsSync(STORE_PATH)) {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const empty: StoreData = { databases: [] };
    writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2), { mode: 0o600 });
    return empty;
  }
  return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
}

function saveStore(data: StoreData): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
  chmodSync(STORE_PATH, 0o600);
}

export function addDatabase(name: string, connectionString: string): void {
  const store = ensureStore();
  const existing = store.databases.findIndex((d) => d.name === name);
  const entry: DatabaseEntry = { name, connectionString, addedAt: new Date().toISOString() };
  if (existing >= 0) {
    store.databases[existing] = entry;
  } else {
    store.databases.push(entry);
  }
  saveStore(store);
}

export function removeDatabase(name: string): boolean {
  const store = ensureStore();
  const before = store.databases.length;
  store.databases = store.databases.filter((d) => d.name !== name);
  if (store.databases.length === before) return false;
  saveStore(store);
  return true;
}

export function listDatabases(): DatabaseEntry[] {
  return ensureStore().databases;
}

export function getDatabase(name: string): DatabaseEntry | undefined {
  return ensureStore().databases.find((d) => d.name === name);
}

export function resolveConnectionString(entry: DatabaseEntry): string {
  const val = entry.connectionString;
  if (val.startsWith("postgresql://") || val.startsWith("postgres://")) {
    return val;
  }
  const envVal = process.env[val];
  if (!envVal) {
    throw new Error(`Environment variable "${val}" is not set. Export it or use a direct connection string.`);
  }
  return envVal;
}
