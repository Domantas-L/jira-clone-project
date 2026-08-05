const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DATABASE_URL || "./data/app.db";

let db;

function saveDb() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
}

async function initDb() {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
        db = new SQL.Database(fs.readFileSync(dbPath));
    } else {
        db = new SQL.Database();
    }

    db.run("PRAGMA foreign_keys = ON");

    db.run(`CREATE TABLE IF NOT EXISTS Boards
        ( id INTEGER PRIMARY KEY AUTOINCREMENT,
         Title TEXT NOT NULL,
         Created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`

    );

    db.run(`CREATE TABLE IF NOT EXISTS ListTables
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
        Title TEXT NOT NULL,
        Board_id INTEGER NOT NULL,
         Created_at TEXT DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (Board_id) REFERENCES Boards(id) ON DELETE CASCADE);`);


    db.run(`CREATE TABLE IF NOT EXISTS Tasks
        ( id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         Start TEXT NOT NULL,
         End TEXT NOT NULL,
         DONE BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        List_id INTEGER NOT NULL,
        FOREIGN KEY (List_id) REFERENCES ListTables(id) ON DELETE CASCADE);`);

    db.run(`CREATE TABLE IF NOT EXISTS Tags
            (id INTEGER PRIMARY KEY AUTOINCREMENT,
            Tags TEXT NOT NULL,
            color TEXT DEFAULT '#0079bf',
            Created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);

    db.run(`CREATE TABLE IF NOT EXISTS Task_tags
        (Tags_id INTEGER NOT NULL,
        Tasks_id INTEGER NOT NULL,
        PRIMARY KEY(Tags_id,Tasks_id),
        FOREIGN KEY (Tags_id) REFERENCES Tags(id) ON DELETE CASCADE,
        FOREIGN KEY (Tasks_id) REFERENCES Tasks(id) ON DELETE CASCADE );`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_list_board_id ON ListTables (Board_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_Tasks_List ON Tasks (List_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_Tags_Tasks_id ON Task_tags (Tasks_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_Tasks_tag_id ON Task_tags (Tags_id);`);
    
    
    saveDb();
    console.log("Table created successfully");
}

function getDb() {
    return db;
}

module.exports = { initDb, getDb, saveDb };