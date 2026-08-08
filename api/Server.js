
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { initDb, getDb, createNewTask, saveDb } = require("./sql");

const app = express();
const PORT = process.env.PORT || 3001;


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
///Board api

app.get("/Boards", (req, res) => {
    const db = getDb();
    const result = db.prepare("SELECT * FROM Boards ORDER BY id ASC");
    const rows = [];
    while (result.step()) {
        rows.push(result.getAsObject());
    }
    result.free();
    res.json({ data: rows });
})

app.delete("/Boards/:id", (req, res) => {
    const db = getDb();
    const { id } = req.params;

    db.run("DELETE FROM Boards WHERE id =?", [id]);
    saveDb();
    res.json({ message: `Board ${id} deleted successfully` });
});

app.post("/Boards", (req, res) => {
    const { Title } = req.body;
    if (!Title) {
        return res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Title required" },
        })
    }

    const db = getDb();
    db.run("INSERT INTO Boards (Title) VALUES (?)", [Title.trim()]);
    const result = db.exec("SELECT last_insert_rowid() AS id");
    const newID = result[0].values[0][0];
    const defaultList = ["To Do", "In Progress", "Done"];
    const createdLists = [];
    for (const listTitle of defaultList) {
        db.run("INSERT INTO ListTables (Title, Board_Id) VALUES (?,?)", [listTitle, newID]);
        const listResult =db.exec("SELECT last_insert_rowid() AS id");
        const listId = listResult[0].values[0][0];
        createdLists.push({ id: listId, Title: listTitle, Board_id: newID });
    }

    saveDb();
    res.status(201).json({
        data: {
            id: newID,
            Title: Title.trim(),
            lists: createdLists,
        }
    });
});

app.get("/Boards/:id", (req, res) => {
    const db = getDb();
    const { id } = req.params;

    const result = db.prepare("SELECT * FROM Boards WHERE id =?", [id]);
    if (!result.step()) {
        res.status(404).json({
            error: { code: "MISSING_ITEM", message: "No object contains this id" }
        });
        result.free();
        return;
    }
    const board = result.getAsObject();
    result.free();

    const lists = db.prepare("SELECT * FROM ListTables WHERE Board_id =? ORDER BY id ASC", [id]);
    const listsarray = [];
    while (lists.step()) {
        listsarray.push(lists.getAsObject());
    }
    lists.free()
    board.lists = listsarray.map((list) => {
        const tasks = db.prepare("SELECT * FROM Tasks WHERE List_id =? ORDER BY id ASC", [list.id])
        const tasksarray = [];
        while (tasks.step()) {
            const task = tasks.getAsObject();

            const tags = db.prepare("SELECT t.id,t.Tags, t.color FROM Tags t join Task_tags as tt ON t.id = tt.Tags_id WHERE tt.Tasks_id =?",[task.id]);
            const tagsarray =[];
            while(tags.step())
            {
                tagsarray.push(tags.getAsObject());
            }
            tags.free();
            tasksarray.push({...task,tags:tagsarray});
        }
        tasks.free();
        return { ...list, tasks: tasksarray };
    })
    return res.json({ data: board });

});

///List api
app.post("/Lists", (req, res) => {
    const { Title, Board_id } = req.body || {};
    if (!Title) {
        return res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Title required" },
        });
    }
    const db = getDb();
    db.run("INSERT INTO ListTables (Title,Board_id) VALUES (?,?)", [Title, Board_id]);
    const result = db.exec("SELECT last_insert_rowid() AS id");
    const newID = result[0].values[0][0];
    saveDb();
    res.status(201).json({
        data:
        {
            id: newID,
            Title: Title,
            Board_id: Number(Board_id),
        }
    });
});

app.delete("/Lists/:id", (req, res) => {
    const db = getDb();
    const { id } = req.params;
    db.run("DELETE FROM ListTables WHERE id = ?", [id]);
    saveDb();
    res.json({ message: `List ${id} deleted successfully` });
})

///Task api

app.delete("/Tasks/:id", (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.run("DELETE FROM Tasks WHERE id =?", [id]);
    saveDb();

    res.json({ message: `Task ${id} deleted successfully` });
});

app.post("/Tasks", (req, res) => {

    const { name, Start, End, List_id } = req.body || {};
    if (!name || !Start || !End || !List_id) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "name, Start, End, and List_id are required"
            },
        });
    }

    const db = getDb();
    db.run("INSERT INTO Tasks (name,Start,End,List_id,DONE) VALUES (?,?,?,?,0)", [name, Start, End, List_id]);

    const result = db.exec("SELECT last_insert_rowid() AS id");
    const newID = result[0].values[0][0];

    saveDb();
    res.status(201).json({
        data: {
            id: newID,
            name,
            Start,
            End,
            DONE: 0,
            List_id: Number(List_id),
        }
    });

});
app.post("/Tags",(req,res)=>
{
    const {Tags,color} = req.body||{};
    if (!Tags || typeof Tags !== "string" || !Tags.trim()) {
        return res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Tag name (Tags) is required" }
        });
    }
    const db = getDb();
    const tagColor = color && color.trim() ? color.trim() : '#0079bf';
    db.run("INSERT INTO Tags (Tags,color) VALUES(?,?)",[Tags,tagColor]);
    const result = db.exec("SELECT last_insert_rowid() AS id");
    const newID = result[0].values[0][0];

    saveDb();

    res.status(201).json({
        data: {
            id: newID,
            Tags: Tags.trim(),
            color: tagColor
        }
    });
});

app.delete("/Tasks/:taskId/tags/:tagId", (req, res) => {
    const { taskId, tagId } = req.params;
    const db = getDb();

    db.run("DELETE FROM Task_tags WHERE Tasks_id = ? AND Tags_id = ?", [taskId, tagId]);
    saveDb();

    res.json({ message: `Tag ${tagId} removed from Task ${taskId}` });
});

app.delete("/Tags/:id",(req,res)=>
{
    const {id} = req.params;
    const db = getDb();
    db.run("DELETE FROM Tags WHERE id =?",[id]);
    saveDb()
    res.json({ message: `Tag ${id} deleted successfully` });
});

app.post("/Tasks/:taskId/tags", (req, res) => {
    const { taskId } = req.params;
    const { tagId } = req.body || {};

    if (!tagId) {
        return res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "tagId is required" }
        });
    }
    const db = getDb();
    db.run("INSERT OR IGNORE INTO Task_tags (Tags_id, Tasks_id) VALUES (?, ?)", [tagId, taskId]);
    saveDb();
    res.status(201).json({
        message: `Tag ${tagId} successfully attached to Task ${taskId}`
    });
});

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});