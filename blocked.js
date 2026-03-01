const urlEl = document.getElementById("url");
const backBtn = document.getElementById("back");
const breakBtn = document.getElementById("break");

const params = new URLSearchParams(window.location.search);
const original = params.get("url");
if (original) {
  urlEl.textContent = original;
}

backBtn.addEventListener("click", () => {
  window.history.back();
});

breakBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "start_break" });
  if (original) {
    window.location.href = original;
  }
});
