const params = new URLSearchParams(window.location.search);
const query = params.get("query") || "";
const task = params.get("task") || "";

const queryDisplayEl = document.getElementById("queryDisplay");
const taskLineEl = document.getElementById("taskLine");
const backBtn = document.getElementById("backBtn");

queryDisplayEl.textContent = query || "(unknown)";

if (task) {
  taskLineEl.innerHTML = `Current task: <strong>${task}</strong>`;
}

backBtn.addEventListener("click", () => {
  window.location.href = "https://www.youtube.com/";
});
