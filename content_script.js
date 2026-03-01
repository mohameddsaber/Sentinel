(() => {
  const OVERLAY_ID = "deepwork-distraction-overlay";
  const YT_STYLE_ID = "deepwork-youtube-focus-style";
  let lastUrl = "";
  let lastTitle = "";

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "distraction_prompt") {
      showPrompt(message.reason || "You might be drifting");
    }
  });

  const sendMeta = () => {
    const url = window.location.href;
    const title = document.title || "";
    if (url === lastUrl && title === lastTitle) return;
    lastUrl = url;
    lastTitle = title;
    chrome.runtime.sendMessage({ type: "page_meta", url, title }).catch(() => {});
  };

  const observeTitle = () => {
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => sendMeta());
    observer.observe(titleEl, { childList: true });
  };

  sendMeta();
  observeTitle();
  setInterval(sendMeta, 2000);
  syncYouTubeFocusUI();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.deepWorkActive) {
      syncYouTubeFocusUI();
    }
  });

  function showPrompt(reason) {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.45)";
    overlay.style.zIndex = "2147483647";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontFamily = "Georgia, 'Times New Roman', serif";

    const card = document.createElement("div");
    card.style.background = "#f8f1e8";
    card.style.color = "#2c2a27";
    card.style.padding = "20px";
    card.style.borderRadius = "14px";
    card.style.maxWidth = "360px";
    card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.25)";

    const title = document.createElement("h2");
    title.textContent = "You’re entering a distraction loop.";
    title.style.margin = "0 0 8px";
    title.style.fontSize = "18px";

    const subtitle = document.createElement("p");
    subtitle.textContent = "Stay in deep work?";
    subtitle.style.margin = "0 0 6px";

    const detail = document.createElement("p");
    detail.textContent = `Detected: ${reason}.`;
    detail.style.margin = "0 0 14px";
    detail.style.fontSize = "13px";
    detail.style.opacity = "0.8";

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "10px";

    const focusBtn = document.createElement("button");
    focusBtn.textContent = "Stay focused";
    focusBtn.style.flex = "1";
    focusBtn.style.padding = "10px";
    focusBtn.style.borderRadius = "8px";
    focusBtn.style.border = "1px solid #2c2a27";
    focusBtn.style.background = "#2c2a27";
    focusBtn.style.color = "#fff";
    focusBtn.style.cursor = "pointer";

    const breakBtn = document.createElement("button");
    breakBtn.textContent = "Take 5-minute break";
    breakBtn.style.flex = "1";
    breakBtn.style.padding = "10px";
    breakBtn.style.borderRadius = "8px";
    breakBtn.style.border = "1px solid #2c2a27";
    breakBtn.style.background = "#f8f1e8";
    breakBtn.style.color = "#2c2a27";
    breakBtn.style.cursor = "pointer";

    focusBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "prompt_response", choice: "focus" });
      overlay.remove();
    });

    breakBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "prompt_response", choice: "break" });
      overlay.remove();
    });

    buttons.appendChild(focusBtn);
    buttons.appendChild(breakBtn);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(detail);
    card.appendChild(buttons);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);
  }

  async function syncYouTubeFocusUI() {
    const state = await chrome.storage.local.get(["deepWorkActive"]);
    if (state.deepWorkActive) {
      enforceYouTubeFocusUI();
      return;
    }
    removeYouTubeFocusUI();
  }

  function enforceYouTubeFocusUI() {
    if (!/^(www\.)?youtube\.com$/i.test(window.location.hostname)) return;
    if (document.getElementById(YT_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = YT_STYLE_ID;
    style.textContent = `
      /* Homepage recommendation grid/shelves */
      ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] ytd-rich-section-renderer,
      ytd-browse[page-subtype="home"] ytd-rich-item-renderer,
      ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] #contents {
        display: none !important;
      }

      /* Watch-page algorithmic suggestions */
      ytd-watch-next-secondary-results-renderer,
      #secondary,
      ytd-compact-video-renderer,
      ytd-reel-shelf-renderer,
      #related,
      .ytp-endscreen-content,
      .ytp-ce-element {
        display: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function removeYouTubeFocusUI() {
    const style = document.getElementById(YT_STYLE_ID);
    if (style) style.remove();
  }
})();
