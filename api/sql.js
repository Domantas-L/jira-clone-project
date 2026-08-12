import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dbPath = process.env.DATABASE_URL || "./data/app.db";

const dir = path.dirname(dbPath);
if(!fs.existsSync(dir)){
    fs.mkdirSync(dir,{recursive:true});
}

const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");

export const database =drizzle(sqlite,{schema});
migrate(database,{migrationsFolder: "./drizzle"});

console.log("Database initialized and migrations applied successfully.");