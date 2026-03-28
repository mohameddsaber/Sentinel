(() => {
  const INIT_FLAG = "__sentinelContentScriptInitialized__";
  if (window[INIT_FLAG]) return;
  window[INIT_FLAG] = true;

  const OVERLAY_ID = "deepwork-distraction-overlay";
  const YT_STYLE_ID = "deepwork-youtube-focus-style";
  let lastUrl = "";
  let lastTitle = "";
  let extensionContextAlive = true;
  let metaIntervalId = null;
  let titleObserver = null;
  let navigationObserver = null;

  const teardown = () => {
    if (metaIntervalId) {
      clearInterval(metaIntervalId);
      metaIntervalId = null;
    }
    titleObserver?.disconnect();
    navigationObserver?.disconnect();
  };

  const markContextInvalidated = () => {
    extensionContextAlive = false;
    teardown();
  };

  const isContextAlive = () => {
    if (!extensionContextAlive) return false;
    try {
      return Boolean(chrome.runtime?.id);
    } catch {
      markContextInvalidated();
      return false;
    }
  };

  const safeSendMessage = async (message) => {
    if (!isContextAlive()) return null;
    try {
      return await chrome.runtime.sendMessage(message);
    } catch {
      markContextInvalidated();
      return null;
    }
  };

  const safeGetLocal = async (keys) => {
    if (!isContextAlive()) return null;
    try {
      return await chrome.storage.local.get(keys);
    } catch {
      markContextInvalidated();
      return null;
    }
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (!isContextAlive()) return;
    if (message.type === "distraction_prompt") {
      showPrompt(message.reason || "You might be drifting");
    }
  });

  // send url and title to background every 2 seconds or on change, whichever is sooner
  const sendMeta = () => {
    if (!isContextAlive()) return;
    const url = window.location.href;
    const title = document.title || "";
    if (url === lastUrl && title === lastTitle) return;
    lastUrl = url;
    lastTitle = title;
    void safeSendMessage({ type: "page_meta", url, title });
  };

  const observeTitle = () => {
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    // Observe changes to the title element to catch dynamic title updates (e.g., YouTube video titles)
    titleObserver = new MutationObserver(() => sendMeta());
    titleObserver.observe(titleEl, { childList: true });
  };

  // Intercept YouTube searches before they execute.
  // Watches for URL changes to /results?search_query=... and checks with
  // the background whether the query is on-task before allowing it through.
  let lastCheckedSearchHref = "";

  const normalizeSearchQuery = (query) =>
    String(query || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const checkYouTubeSearch = async (url) => {
    if (!isContextAlive()) return;
    try {
      const parsed = new URL(url);
      if (parsed.pathname !== "/results") {
        lastCheckedSearchHref = "";
        return;
      }
      const query = parsed.searchParams.get("search_query") || "";
      const normalizedQuery = normalizeSearchQuery(query);
      const searchHref = `${parsed.origin}${parsed.pathname}?search_query=${encodeURIComponent(normalizedQuery)}`;
      // Skip if no query or exact same URL check we already handled
      if (!normalizedQuery || searchHref === lastCheckedSearchHref) return;
      lastCheckedSearchHref = searchHref;

      const response = await safeSendMessage({
        type: "search_query_check",
        query,
      });

      if (response?.verdict === "prompt") {
        showSearchPrompt(response.query, response.currentTask);
      }
    } catch {
      // ignore — extension context may be invalidated
    }
  };

  sendMeta();
  observeTitle();
  checkYouTubeSearch(window.location.href);

  // send meta when tab becomes active
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      sendMeta();
    }
  });
  metaIntervalId = setInterval(sendMeta, 2000);
  void syncYouTubeFocusUI();

  // Re-sync focus UI on YouTube SPA navigations (URL changes without a full page load)
  // Also intercepts search navigations for off-task query checking.
  let lastHref = location.href;
  navigationObserver = new MutationObserver(() => {
    if (location.href !== lastHref) {
      const newHref = location.href;
      lastHref = newHref;
      // Check search query before the results page renders
      void checkYouTubeSearch(newHref);
      // Small delay so YouTube has rendered the new page's DOM before we hide elements
      setTimeout(() => {
        void syncYouTubeFocusUI();
      }, 300);
    }
  });
  navigationObserver.observe(document.body, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (!isContextAlive()) return;
    if (area !== "local") return;
    // If the deep work active state changes, update the YouTube focus UI accordingly
    if (changes.state) {
      void syncYouTubeFocusUI();
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

    focusBtn.addEventListener("click", async () => {
      await safeSendMessage({ type: "prompt_response", choice: "focus" });
      overlay.remove();
    });

    buttons.appendChild(focusBtn);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(detail);
    card.appendChild(buttons);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);
  }

  // Shown when a YouTube search query doesn't match the current task.
  // Lets the user refine the search, proceed anyway, or cancel.
  function showSearchPrompt(query, currentTask) {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      "position:fixed", "inset:0", "background:rgba(0,0,0,0.55)",
      "z-index:2147483647", "display:flex", "align-items:center",
      "justify-content:center", "font-family:Georgia,'Times New Roman',serif"
    ].join(";");

    const card = document.createElement("div");
    card.style.cssText = [
      "background:#f8f1e8", "color:#2c2a27", "padding:24px",
      "border-radius:14px", "max-width:400px", "width:90%",
      "box-shadow:0 20px 50px rgba(0,0,0,0.3)"
    ].join(";");

    const heading = document.createElement("h2");
    heading.textContent = "Off-task search detected";
    heading.style.cssText = "margin:0 0 6px;font-size:17px;";

    const taskLine = document.createElement("p");
    taskLine.style.cssText = "margin:0 0 14px;font-size:13px;opacity:0.7;";
    taskLine.textContent = `Your task: "${currentTask || "none set"}"`;

    const queryLine = document.createElement("p");
    queryLine.style.cssText = "margin:0 0 16px;font-size:14px;";
    queryLine.innerHTML = `Your search <strong>"${query}"</strong> doesn't seem related.`;

    // Refined search input
    const inputLabel = document.createElement("p");
    inputLabel.textContent = "Search for something related instead:";
    inputLabel.style.cssText = "margin:0 0 6px;font-size:13px;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `e.g. ${currentTask ? currentTask.split(" ").slice(0,3).join(" ") + " tutorial" : "your topic"}`;
    input.style.cssText = [
      "width:100%", "box-sizing:border-box", "padding:9px 12px",
      "border-radius:8px", "border:1px solid #ccc", "font-size:14px",
      "margin-bottom:14px", "background:#fff", "color:#2c2a27"
    ].join(";");

    // Buttons row
    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:10px;";

    const searchBtn = document.createElement("button");
    searchBtn.textContent = "Search this instead";
    searchBtn.style.cssText = [
      "flex:1", "padding:10px", "border-radius:8px",
      "border:1px solid #2c2a27", "background:#2c2a27",
      "color:#fff", "cursor:pointer", "font-size:13px"
    ].join(";");

    const proceedBtn = document.createElement("button");
    proceedBtn.textContent = "Proceed anyway";
    proceedBtn.style.cssText = [
      "flex:1", "padding:10px", "border-radius:8px",
      "border:1px solid #999", "background:transparent",
      "color:#2c2a27", "cursor:pointer", "font-size:13px"
    ].join(";");

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = [
      "padding:10px 14px", "border-radius:8px",
      "border:1px solid #ccc", "background:transparent",
      "color:#666", "cursor:pointer", "font-size:13px"
    ].join(";");

    searchBtn.addEventListener("click", () => {
      const refined = input.value.trim();
      if (!refined) return;
      lastCheckedSearchHref = "";
      overlay.remove();
      window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(refined)}`;
    });

    // Allow pressing Enter in the input to trigger the search
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchBtn.click();
    });

    proceedBtn.addEventListener("click", async () => {
      await safeSendMessage({
        type: "approve_search_query",
        query,
      });
      lastCheckedSearchHref = window.location.href;
      overlay.remove();
    });

    cancelBtn.addEventListener("click", () => {
      lastCheckedSearchHref = "";
      overlay.remove();
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = "https://www.youtube.com/";
    });

    buttons.append(searchBtn, proceedBtn, cancelBtn);
    card.append(heading, taskLine, queryLine, inputLabel, input, buttons);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);

    // Focus the input so the user can type immediately
    setTimeout(() => input.focus(), 50);
  }

  async function syncYouTubeFocusUI() {
    const state = await safeGetLocal(["state"]);
    if (state?.state?.deepWorkActive) {
      enforceYouTubeFocusUI();
      return;
    }
    removeYouTubeFocusUI();
  }
// remove recommendations and related videos from youtube homepage and watch page.
  function enforceYouTubeFocusUI() {
    if (!/^(www\.)?youtube\.com$/i.test(window.location.hostname)) return;
    // Remove existing style so re-injection after SPA navigation is clean
    removeYouTubeFocusUI();

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
      #related {
        display: none !important;
      }

      /* Autoplay — button in the player controls and the autonav pause screen */
      .ytp-autonav-toggle-button-container,
      ytd-toggle-button-renderer.ytd-autonav-pause-renderer,
      ytd-autonav-pause-renderer {
        display: none !important;
      }

      /* End-screen cards and info cards overlaid on the video */
      .ytp-endscreen-content,
      .ytp-ce-element,
      .ytp-cards-teaser,
      .ytp-cards-button,
      ytd-endscreen-element-renderer {
        display: none !important;
      }

      /* Comments */
      ytd-comments,
      #comments {
        display: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }
// remove the style when the session is inactive
  function removeYouTubeFocusUI() {
    const style = document.getElementById(YT_STYLE_ID);
    if (style) style.remove();
  }
})();
