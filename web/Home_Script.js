const Grid_loader = document.querySelector("#grid_loader");
const api = "http://localhost:3001";

init();


async function init()
{
    showLoading();
    try
    {
    const boards = await Load_boards();
    Render_boards(boards);
    }
    catch(err)
    {
        showError("Couldn't load boards. Is the API running?")
    }

}


async function Load_boards()
{
    const res = await fetch (`${api}/Boards`);
    if(!res.ok)
    {
        throw new Error("Can't load the boards");
    }
    const body = await res.json();
    return body.data;
}

function Render_boards(Boards =[])
{
    if (!Grid_loader) return;
    if(!Boards || Boards.length === 0)
    {
        Grid_loader.innerHTML = "<p>Please create a new Board</p>";
        return;
    }
    Grid_loader.innerHTML = Boards.map(b => `
        <div class="board-card-wrapper">
            <a href="index.html?id=${b.id}" class="board-link">${b.Title}</a>
            <button type="button" class="fav-btn" title="Add to favorites">★</button>
        </div>
    `).join("");
}

function showLoading()
{
    Grid_loader.innerHTML ="<p class='loading'>Loading Tasks…</p>";
}
function showError(message)
{
    Grid_loader.innerHTML =`<p class='error'>${message}</p>`;
}