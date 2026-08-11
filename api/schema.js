import { defineConfig } from "drizzle-kit";
import { sqliteTable, integer, text, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const dbPath = process.env.DATABASE_URL || "./data/app.db";

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.js",
  out: "./drizzle",
});

export const Boards = sqliteTable("Boards",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        Title: text("Title").notNull(),
        Created_at: text("created_at").default("CURRENT_TIMESTAMP")

    }
);

export const ListTables = sqliteTable("ListTables",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        Title: text("Title").notNull(),
        Board_id: integer("Board_id").notNull().references(() => Boards.id, { onDelete: "cascade" }),
        Created_ad: text("created_at").default("CURRENT_TIMESTAMP"),
    }
);

export const Tasks = sqliteTable("Tasks",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        Start: text("date").notNull(),
        End: text("End").notNull(),
        Done: integer("done", { mode: "boolean" }).default(false),
        Created_ad: text("created_at").default("CURRENT_TIMESTAMP"),
        List_id: integer("List_id").notNull().references(() => ListTables.id, { onDelete: "cascade" })
    }
);

export const Tags = sqliteTable("Tags",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        Tags: text("Tags").notNull(),
        color: text("color").default("#0079bf"),
        Created_ad: text("created_at").default("CURRENT_TIMESTAMP")
    }
);

export const Task_tags = sqliteTable("Task_tags",
    {
        Tags_id: integer("Tags_id").notNull().references(() => Tags.id, { onDelete: "cascade" }),
        Tasks_id: integer("Tasks_id").notNull().references(() => Tasks.id, { onDelete: "cascade" })
    },
    (table) => [
        primaryKey({ columns: [table.Tags_id, table.Tasks_id] }),
        index("idx_Tags_Tasks_id").on(table.Tasks_id),
        index("idx_Tasks_tag_id").on(table.Tags_id),
]);