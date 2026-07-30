const today_list = document.querySelector("#Today-List");
const form_overlay = document.querySelector("#form-overlay");
const task_form = document.querySelector("#task_form");
const form_open_btn = document.querySelector("#open-form-btn");
const form_close_btn = document.querySelector("#Close-form-btn");
const Add_new_list = document.querySelector("#Board");
const item_delete_btn=document.querySelector("#Item_delete_btn");
const task_counter = document.querySelector("#Task-counter");
const API = "http://localhost:3001";

init();

async function init() {
    showLoading();
    try{
    const TodayTasks = await LoadTodayList();
    RenderTodayTask(TodayTasks);}
    catch (err)
    {
        showError("Couldn't load workouts. Is the API running?")
    }

}

async function LoadTodayList() {    
    const res = await fetch(`${API}/Tasks`);
    if(!res.ok)
    {
        throw new Error("Failed to load");
    }
    const body = await res.json();
    return body.data;
}

async function createTodayTask(name,start,end) {
    const res = await fetch(`${API}/Tasks`,
        {
            method: "POST",
            headers:{ "Content-Type": "application/json" },
            body:  JSON.stringify({ name, Start: start, End: end }),
        });
        if(!res.ok) throw new Error ("Failed to create");
        return res.json();
}

async function DeleteTodayTask(id) {
    const res = await fetch(`${API}/Tasks/${id}`,{
        method:"DELETE",
    });
    if (!res.ok) {
    throw new Error("Failed to delete task");
  }
  return res.json();
}

form_open_btn.addEventListener("click",() =>{
    form_overlay.classList.remove("hidden");
});


form_close_btn.addEventListener("click",()=>
{
    form_overlay.classList.add("hidden");
    task_form.reset();
});
task_form.addEventListener("submit", async (event)=>
{
    event.preventDefault();

    const name = document.querySelector("#Task_name").value;
    const start = document.querySelector("#Task_Start_time").value;
    const end = document.querySelector("#Task_End_time").value;

  try{
    await createTodayTask(name,start,end);
    const tasks = await LoadTodayList();
    RenderTodayTask(tasks);

    form_overlay.classList("hidden");
    task_form.reset();
  }
  catch (err){
    console.error("Error creating task:", err);
  }

});

today_list.addEventListener("click", async(event)=>
{
    const deleteBtn = event.target.closest(".delete-btn");

    const id = Number(deleteBtn.dataset.id);
    try{
       await DeleteTodayTask(id);
       const updatedlist = LoadTodayList();
       await RenderTodayTask(updatedlist);
    }
    catch (err)
    {
        console.error("Error deleting task:", err);
    }
});
function RenderTodayTask(tasks = []) {

    if(task_counter)
    {
        task_counter.textContent = tasks.length;
    }
    if (!tasks || tasks.length == 0) {
        today_list.innerHTML = "<li><p>Nothing was added yet</p></li>";
        return;
    }
    today_list.innerHTML = tasks.map(w =>
    `<li class="list-item">
      <label for=" task-check-box">
            <input type="checkbox" class="List-checkbox" id="Task-${w.id}" ${w.Done ? "checked" : ""}>
        </label>
         <div class="List-task-text">
            <span> ${w.name}</span>
        </div>
        <div class="List-task-text">
            <span> ${w.Start}</span>
        </div>
        <div class="List-task-text">
            <span> ${w.End}</span>
        </div>
    <div class="List-btn-display">
        <button class="List-btn">Update</button>
        <button type="button" class="List-btn delete-btn" data-id="${w.id}">Delete</button>
    </div>
    </li>`
    ).join("");
    console.log("This works");
}
function showLoading()
{
    today_list.innerHTML ="<p class='loading'>Loading Tasks…</p>";
}
function showError(message)
{
    today_list.innerHTML =`<p class='error'>${message}}</p>`;
}