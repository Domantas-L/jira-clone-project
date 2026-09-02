import 'dotenv/config';
import express from "express";
import cors from "cors";
import { database as db } from "./sql.js";
import * as schema from "./schema.js";
import { and, desc, eq, like, sql } from "drizzle-orm";
import authRouter, {requireAuth , requireRole } from "./Auth.js";


const app = express();
const PORT = process.env.PORT || 3001;
const { Boards, ListTables, Tasks, Tags, Task_tags, Users, refresh_token } = schema;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(req.method, req.path);
    next();
});
app.use(
    cors({
        origin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:5500",
    }),
);
app.use(authRouter);
///Board api

app.get("/Boards", requireAuth, async (req, res) => {
    try {

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
        const q = (req.query.q ?? "").trim();
        const offset = (page - 1) * limit;
        const userClause = eq(Boards.UserID, req.user.id);
        const searchClause = q ? like(Boards.Title, `%${q}%`) : undefined;
        const clause = searchClause ? and(userClause, searchClause) : userClause;


        const items = await db.select().from(Boards).where(clause).orderBy(desc(Boards.Created_at)).limit(limit).offset(offset);
        const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(Boards).where(clause);
        res.json({
            items,
            page,
            limit,
            total: count
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/Boards", requireAuth, async (req, res) => {
    try {
        const { Title } = req.body || {};
        if (!Title || typeof Title !== "string" || !Title.trim()) {
            return res.status(400).json({
                error: { code: "VALIDATION_ERROR", message: "Title is required" },
            });
        }
        const [newBoard] = await db.insert(Boards).values({ Title: Title.trim(), UserID: req.user.id }).returning();
        const defaultLists = await db.insert(ListTables).values([
            { Title: "To Do", Board_id: newBoard.id },
            { Title: "In Progress", Board_id: newBoard.id },
            { Title: "Done", Board_id: newBoard.id },
        ]).returning();
        res.status(201).json({
            data: {
                ...newBoard,
                lists: defaultLists,
            }
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
})


app.delete("/Boards/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params.id;
        const [deletedBoard] = await db.delete(Boards).where(and(eq(Boards.id, Number(id)),eq(Boards.UserID,req.user.id))).returning();
        if (!deletedBoard) {
            return res.status(404).json({ error: "No board found with this id" });
        }
        return res.status(200).json({
            message: "Board deleted succsesfully",
            board: deletedBoard,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/Boards/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const SelectedBoard = await db.query.Boards.findFirst({
            where: and( eq(Boards.id, Number(id)),eq(Boards.UserID,req.user.id)),
            with: {
                ListTables: {
                    with: {
                        Tasks: true,
                    },
                },
            },
        });
        if (!SelectedBoard) {
            return res.status(404).json({
                error: { code: "MISSING_ITEM", message: "No board found with this id" },
            });
        }
        return res.json({
            SelectedBoard,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "board server error" });
    }
});

app.post("/Lists", requireAuth, async (req, res) => {
    try {
        const { title, board_id } = req.body || {};
        if (!title) {
            return res.status(400).json({
                error: { code: "VALIDATION_ERROR", message: "Title required" },
            });
        }
        const [SeletedList] = await db.insert(ListTables).values({ Title: title.trim(), Board_id: Number(board_id), }).returning();
        res.status(201).json({
            data: SeletedList,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/Lists/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [DeletedList] = await db.delete(ListTables).where(eq(ListTables.id, Number(id))).returning();
        if (!DeletedList) {
            return res.status(404).json({
                error: { code: "MISSING_ITEM", message: "No list found with this id" },
            });
        }

        return res.status(200).json({
            message: "List deleted succsesfully",
            List: DeletedList,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/Tasks/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [DeletedTask] = await db.delete(Tasks).where(eq(Tasks.id, Number(id))).returning();
        if (!DeletedTask) {
            return res.status(404).json({
                error: { code: "MISSING_ITEM", message: "No Task found with this id" },
            });
        }
        return res.status(200).json({
            message: "Task deleted succsesfully",
            Task: DeletedTask,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/Tasks", requireAuth, async (req, res) => {
    try {
        const { Name, Start, End, List_id } = req.body || {};
        if (!Name || !Start || !End || !List_id) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "name, Start, End, and List_id are required"
                },
            });
        }
        const [NewTask] = await db.insert(Tasks).values({ name: Name, Start: Start, End: End, List_id: List_id }).returning();
        res.status(201).json({
            data: NewTask,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.get("/Tags", requireAuth, async (req, res) => {
    try {
        const allTags = await db.select().from(Tags);
        res.json({ data: allTags });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/Tags", requireAuth,requireRole("admin"), async (req, res) => {
    try {
        const { tags, Colour } = req.body || {};
        if (!tags || typeof tags !== "string" || !tags.trim()) {
            return res.status(400).json({
                error: { code: "VALIDATION_ERROR", message: "Tag name (Tags) is required" }
            });
        }
        const [NewTag] = await db.insert(Tags).values({ Tags: tags, color: Colour }).returning();
        res.status(201).json({
            data: NewTag,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/Tags/:id", requireAuth,requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const [DeletedTag] = await db.delete(Tags).where(eq(Tags.id, Number(id))).returning();
        if (!DeletedTag) {
            return res.status(404).json({
                error: { code: "MISSING_ITEM", message: "No Tag found with this id" },
            });
        }
        return res.status(200).json({
            message: "Tag deleted succsesfully",
            Tag: DeletedTag,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/Tasks/:taskId/tags/:tagId", requireAuth, async (req, res) => {
    try {
        const { taskId, tagId } = req.params;
        const [deletedTagTask] = await db.delete(Task_tags).where(and(eq(Task_tags.taskId, Number(taskId)), eq(Task_tags.tagId, Number(tagId)))).returning();
        if (!deletedTagTask) {
            return res.status(404).json({
                error: {
                    code: "MISSING_ITEM",
                    message: "No association found between this task and tag",
                },
            });
        }
        return res.status(200).json({
            message: "Tag_task deleted succsesfully",
            Tag_task: deletedTagTask,
        });

    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/Tasks/:taskId/tags", requireAuth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { tagId } = req.body || {};
        const [newTagTask] = await db.insert(Task_tags).values({ Tasks_id: Number(taskId), Tags_id: Number(tagId) }).returning();
        return res.status(201).json({
            message: "Tag attached to task successfully",
            data: newTagTask,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`));