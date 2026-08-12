import { defineConfig } from "drizzle-kit";
import { sqliteTable, integer, text, primaryKey, index,} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { timestamp } from "drizzle-orm/gel-core";

const dbPath = process.env.DATABASE_URL || "./data/app.db";

export const Boards = sqliteTable("Boards",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        Title: text("Title").notNull(),
        Created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),

    }
);

export const ListTables = sqliteTable("ListTables",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        Title: text("Title").notNull(),
        Board_id: integer("Board_id").notNull().references(() => Boards.id, { onDelete: "cascade" }),
        Created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    },
    (table)=>[index("idx_list_board_id").on(table.Board_id),

    ]
);

export const Tasks = sqliteTable("Tasks",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        Start: text("date").notNull(),
        End: text("End").notNull(),
        Done: integer("done", { mode: "boolean" }).default(false),
        Created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
        List_id: integer("List_id").notNull().references(() => ListTables.id, { onDelete: "cascade" })
    },
    (table)=>[index("idx_Tasks_List").on(table.List_id),]
);

export const Tags = sqliteTable("Tags",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        Tags: text("Tags").notNull(),
        color: text("color").default("#0079bf"),
        Created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`)
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

export const BoardRelation = relations(Boards,({many})=>({ListTables: many(ListTables)}));
export const ListTableRelation = relations(ListTables,({one,many})=>({
    board:one(Boards,{
        fields:[ListTables.Board_id],
        references:[Boards.id],
    }),
    Tasks:many(Tasks),

})
);
export const TasksRelation = relations(Tasks,({one,many})=>({
    list: one(ListTables,{
        fields:[Tasks.List_id],
        references:[ListTables.id],
    }),
    Task_tags:many(Task_tags),
}));

export const Tag_taskRelation= relations(Task_tags,({one})=>({
    task:one(Tasks,{
        fields:[Task_tags.Tasks_id],
        references:[Tasks.id],
    }),
    tag: one(Tags,{
        fields:[Task_tags.Tags_id],
        references:[Tags.id],
    }),
}));