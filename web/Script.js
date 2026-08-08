const today_list = document.querySelector("#Today-List");
const form_overlay = document.querySelector("#form-overlay");
const task_form = document.querySelector("#task_form");
const form_open_btn = document.querySelector("#open-form-btn");
const form_close_btn = document.querySelector("#Close-form-btn");
const Add_new_list = document.querySelector("#Board");
const item_delete_btn = document.querySelector("#Item_delete_btn");
const task_counter = document.querySelector("#Task-counter");
const board_area = document.querySelector("#board_area");
const save_btn = document.querySelector("#Save_btn");
const API = "http://localhost:3001";

const urlParams = new URLSearchParams(window.location.search);
const board_id = urlParams.get("id");

init();

async function init() {
    showLoading();
    try {
        const Selectedboard = await fetch_board_by_id(board_id);
        RenderBoard(Selectedboard.lists);
    }
    catch (err) {
        showError("Couldn't board lists Tasks. Is the API running?")
    }

}
async function createTask(name, start, end, listId) {
    const res = await fetch(`${API}/Tasks`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, Start: start, End: end, List_id: listId }),
        });
    if (!res.ok) throw new Error("Failed to create");
    return res.json();
}

async function DeleteTask(id) {
    const res = await fetch(`${API}/Tasks/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new Error("Failed to delete task");
    }
    return res.json();
}

let activeListId = null;

board_area.addEventListener("click", async (event) => {
    const addBtn = event.target.closest(".open-card-form");
    if (!addBtn) return;
    activeListId = Number(addBtn.dataset.listId);
    form_overlay.classList.remove("hidden");

});
task_form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.querySelector("#Task_name").value;
    const Start = document.querySelector("#Task_Start_time").value;
    const End = document.querySelector("#Task_End_time").value;
    if (!activeListId) {
        return;
    }
    try {
        await createTask(name, Start, End, activeListId);
        await refreshBoard();
        form_overlay.classList.add("hidden");
        task_form.reset();
        activeListId = null;
    } catch (err) {
        console.error("Error creating task:", err);
    }
});

board_area.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest(".delete-btn");

    const id = Number(deleteBtn.dataset.id);
    try {
        await DeleteTask(id);
        await refreshBoard();
    }
    catch (err) {
        console.error("Error deleting task:", err);
    }
});




async function fetch_board_by_id(id) {
    const res = await fetch(`${API}/Boards/${id}`);
    if (!res.ok) {
        throw new Error("Can't load the the board");
    }
    const body = await res.json();
    return body.data;
}

function RenderBoard(lists = []) {
    if (!board_area)
        return;
    if (!lists || lists.length === 0) {
        board_area.innerHTML = "<p>No lists created yet. Click 'Add another list' to start.</p>";
        return;
    }
    board_area.innerHTML = lists.map(list =>
        `<section class="single-board" data-list-id="${list.id}">
            <header class="Board-header">
                <button type="button" class="Board-name-btn">${list.Title}</button>
                <span class="Task-counter">${list.tasks ? list.tasks.length : 0}</span>
            </header>

            <article>
                <article class="top-List-items-display">
                    <div class="top-list-item">
                        <div class="List-task-text"><span>Name of project</span></div>
                        <div class="List-task-text"><span>Start-time</span></div>
                        <div class="List-task-text"><span>Estimated end time</span></div>
                        <div class="List-btn-display"></div>
                    </div>
                </article>

                <ul class="List-items-display">
                   ${renderTasks(list.tasks)}
                </ul>
            </article>

            <footer class="List-footer">
                <div>
                    <button type="button" class="Add-btn open-card-form" data-list-id="${list.id}">+ Add a card</button>
                </div>
            </footer>
        </section>
    `).join("");
}

function renderTasks(tasks = []) {
    if (!tasks || tasks.length === 0) {
        return `<li class="empty-list">No tasks yet</li>`;
    }

    return tasks.map(task => `
        <li class="list-item" data-task-id="${task.id}">
            <label for="Task-${task.id}">
                <input type="checkbox" class="List-checkbox" id="Task-${task.id}" ${task.Done ? "checked" : ""}>
            </label>
            <div class="List-task-text">
                <span>${task.name}</span>
            </div>
            <div class="List-btn-display">
                <button type="button" class="List-btn delete-btn" data-id="${task.id}">Delete</button>
            </div>
        </li>
    `).join("");
}

async function refreshBoard() {
    const board = await fetch_board_by_id(board_id);
    RenderBoard(board.lists);
}

function showLoading() {
    board_area.innerHTML = "<p class='loading'>Loading Tasks…</p>";
}
function showError(message) {
    board_area.innerHTML = `<p class='error'>${message}</p>`;
}