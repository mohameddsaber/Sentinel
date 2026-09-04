(() => {
  const INIT_FLAG = "__sentinelContentScriptInitialized__";
  if (window[INIT_FLAG]) return;
  window[INIT_FLAG] = true;

  const OVERLAY_ID = "deepwork-distraction-overlay";
  const CHANNEL_PROMPT_ID = "deepwork-channel-approval-overlay";
  const YT_STYLE_ID = "deepwork-youtube-focus-style";
  let lastUrl = "";
  let lastTitle = "";
  let lastCategory = "";
  let extensionContextAlive = true;
  let metaIntervalId = null;
  let titleObserver = null;
  let navigationObserver = null;
  let lastPromptedChannelKey = "";
  let pendingChannelNavigationUrl = null;

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

  if (window.location.hostname.includes('youtube.com')) {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        let pollInterval = null;

        function extractCategory() {
          let cat = "";
          try {
            const player = document.querySelector('#movie_player');
            const urlParams = new URLSearchParams(window.location.search);
            const currentVideoId = urlParams.get('v');

            if (player && typeof player.getPlayerResponse === 'function') {
               const pr = player.getPlayerResponse();
               const videoId = pr?.videoDetails?.videoId;
               if (videoId && currentVideoId === videoId) {
                  cat = pr?.microformat?.playerMicroformatRenderer?.category || "";
               }
            }
            if (!cat && window.ytInitialPlayerResponse) {
               const videoId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
               if (videoId && currentVideoId === videoId) {
                  cat = window.ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer?.category || "";
               }
            }
          } catch(e) {}
          
          if (cat) {
            window.postMessage({ type: 'YT_CATEGORY_RESPONSE', category: cat, url: window.location.href }, '*');
            return true;
          }
          return false;
        }

        function startPolling() {
           if (pollInterval) clearInterval(pollInterval);
           let attempts = 0;
           pollInterval = setInterval(() => {
              if (extractCategory() || attempts++ > 20) {
                 clearInterval(pollInterval);
              }
           }, 50);
        }

        window.addEventListener('message', (event) => {
          if (event.source !== window) return;
          if (event.data && event.data.type === 'GET_YT_CATEGORY') {
            if (!extractCategory()) startPolling();
          }
        });

        window.addEventListener('yt-page-data-updated', startPolling);
        window.addEventListener('yt-navigate-finish', startPolling);
        
        const originalPushState = history.pushState;
        history.pushState = function() {
           originalPushState.apply(this, arguments);
           startPolling();
        };
      })();
    `;
    if (document.documentElement) document.documentElement.appendChild(script);
    if (script.parentNode) script.remove();
  }

  let ytCategoryFromPage = "";
  let currentTabUrl = location.href;
  let fetchingCategoryUrl = "";

  // send url and title to background every 2 seconds or on change, whichever is sooner
  const sendMeta = async () => {
    if (!isContextAlive()) return;
    const url = window.location.href;

    if (url !== currentTabUrl) {
      currentTabUrl = url;
      ytCategoryFromPage = ""; // Reset cached category on navigation
    }

    const title = document.title || "";
    let category = ytCategoryFromPage;

    if (url.includes("youtube.com")) {
      window.postMessage({ type: 'GET_YT_CATEGORY' }, '*');

      if (!category && url.includes("/watch") && fetchingCategoryUrl !== url) {
        fetchingCategoryUrl = url;
        try {
          const res = await fetch(url);
          const html = await res.text();
          const match = html.match(/<meta\s+itemprop="genre"\s+content="([^"]+)"/i) || html.match(/<meta\s+itemprop="category"\s+content="([^"]+)"/i);
          if (match && match[1]) {
            category = decodeHtmlEntities(match[1]);
            ytCategoryFromPage = category;
            console.log("[Sentinel Content Script] Fetched Category from HTML fallback:", category);
          }
        } catch (e) { }
      }
    }

    if (url === lastUrl && title === lastTitle && category === lastCategory) return;
    lastUrl = url;
    lastTitle = title;
    lastCategory = category;
    void safeSendMessage({ type: "page_meta", url, title, category });
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === "YT_CATEGORY_RESPONSE") {
      if (event.data.url === window.location.href && ytCategoryFromPage !== event.data.category) {
        ytCategoryFromPage = event.data.category;
        console.log(`[Sentinel Content Script] Fetched YouTube Category: "${ytCategoryFromPage}"`);
        sendMeta();
      }
    }
  });

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

  const isYouTubeChannelPath = (pathname) =>
    pathname.startsWith("/@") ||
    pathname.startsWith("/channel/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/user/");

  const removeChannelApprovalPrompt = () => {
    const overlay = document.getElementById(CHANNEL_PROMPT_ID);
    if (overlay) overlay.remove();
    pendingChannelNavigationUrl = null;
  };

  const getAbsoluteUrl = (value) => {
    try {
      return new URL(value, window.location.href).href;
    } catch {
      return null;
    }
  };

  const isPlainPrimaryClick = (event) =>
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;

  const shouldInterceptChannelUrl = (url) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return /^(www\.)?youtube\.com$/i.test(parsed.hostname) && isYouTubeChannelPath(parsed.pathname);
    } catch {
      return false;
    }
  };

  const getChannelDestinationFromEvent = (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor) return null;
    if (anchor.target && anchor.target !== "_self") return null;

    const destinationUrl = getAbsoluteUrl(anchor.getAttribute("href"));
    if (!shouldInterceptChannelUrl(destinationUrl)) return null;
    return destinationUrl;
  };

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

      if (response?.verdict === "hard_block") {
        window.location.href = chrome.runtime.getURL(
          `blocked/hard_blocked.html?query=${encodeURIComponent(response.query || query)}&task=${encodeURIComponent(response.currentTask || "")}`
        );
        return;
      }

      if (response?.verdict === "prompt") {
        window.location.href = chrome.runtime.getURL(
          `blocked/soft_blocked.html?query=${encodeURIComponent(response.query || query)}&task=${encodeURIComponent(response.currentTask || "")}&tabId=${encodeURIComponent(String(response.tabId || ""))}`
        );
        return;
      }
    } catch {
      // ignore — extension context may be invalidated
    }
  };

  const checkYouTubeChannelApproval = async (url) => {
    if (!isContextAlive()) return;

    try {
      const parsed = new URL(url);
      if (!/^(www\.)?youtube\.com$/i.test(parsed.hostname) || !isYouTubeChannelPath(parsed.pathname)) {
        lastPromptedChannelKey = "";
        removeChannelApprovalPrompt();
        return;
      }

      const response = await safeSendMessage({
        type: "youtube_channel_check",
        url,
      });

      if (response?.verdict === "allow") {
        lastPromptedChannelKey = "";
        removeChannelApprovalPrompt();
        return;
      }

      if (response?.verdict === "block") {
        removeChannelApprovalPrompt();
        window.location.href = chrome.runtime.getURL(
          `blocked/blocked.html?url=${encodeURIComponent(window.location.href)}`
        );
        return;
      }

      if (response?.verdict === "prompt") {
        if (response.channelKey === lastPromptedChannelKey &&
          document.getElementById(CHANNEL_PROMPT_ID)) {
          return;
        }
        lastPromptedChannelKey = response.channelKey || "";
        showChannelApprovalPrompt({
          channelLabel: response.channelLabel || "this channel",
          currentTask: response.currentTask || null,
          url,
        });
        return;
      }

      lastPromptedChannelKey = "";
      removeChannelApprovalPrompt();
    } catch {
      // ignore
    }
  };

  sendMeta();
  observeTitle();
  checkYouTubeSearch(window.location.href);
  checkYouTubeChannelApproval(window.location.href);

  document.addEventListener("click", (event) => {
    if (!isPlainPrimaryClick(event)) return;
    const destinationUrl = getChannelDestinationFromEvent(event);
    if (!destinationUrl) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void maybeGateYouTubeChannelNavigation(destinationUrl);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    const destinationUrl = getChannelDestinationFromEvent(event);
    if (!destinationUrl) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void maybeGateYouTubeChannelNavigation(destinationUrl);
  }, true);

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
      
      // Immediately request category and send meta on navigation
      if (newHref.includes("/watch")) {
         window.postMessage({ type: 'GET_YT_CATEGORY' }, '*');
         sendMeta();
      }

      // Check search query before the results page renders
      void checkYouTubeSearch(newHref);
      void checkYouTubeChannelApproval(newHref);
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
      if (!changes.state.newValue?.deepWorkActive) {
        lastPromptedChannelKey = "";
        removeChannelApprovalPrompt();
      } else {
        void checkYouTubeChannelApproval(window.location.href);
      }
    }
    if (changes.settings) {
      void checkYouTubeChannelApproval(window.location.href);
    }
  });

  async function maybeGateYouTubeChannelNavigation(destinationUrl) {
    const response = await safeSendMessage({
      type: "youtube_channel_check",
      url: destinationUrl,
    });

    if (!response || response.verdict === "allow") {
      window.location.href = destinationUrl;
      return;
    }

    if (response.verdict === "block") {
      removeChannelApprovalPrompt();
      window.location.href = chrome.runtime.getURL(
        `blocked/blocked.html?url=${encodeURIComponent(destinationUrl)}`
      );
      return;
    }

    if (response.verdict === "prompt") {
      if (response.channelKey === lastPromptedChannelKey &&
        document.getElementById(CHANNEL_PROMPT_ID)) {
        pendingChannelNavigationUrl = destinationUrl;
        return;
      }

      lastPromptedChannelKey = response.channelKey || "";
      showChannelApprovalPrompt({
        channelLabel: response.channelLabel || "this channel",
        currentTask: response.currentTask || null,
        url: destinationUrl,
        denyBehavior: "stay",
      });
    }
  }

  function showChannelApprovalPrompt({ channelLabel, currentTask, url, denyBehavior = "block" }) {
    removeChannelApprovalPrompt();
    pendingChannelNavigationUrl = url;

    const overlay = document.createElement("div");
    overlay.id = CHANNEL_PROMPT_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.62)";
    overlay.style.zIndex = "2147483647";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";
    overlay.style.fontFamily = "Georgia, 'Times New Roman', serif";

    const card = document.createElement("div");
    card.style.background = "#f8f1e8";
    card.style.color = "#2c2a27";
    card.style.padding = "22px";
    card.style.borderRadius = "14px";
    card.style.maxWidth = "420px";
    card.style.width = "100%";
    card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.25)";

    const title = document.createElement("h2");
    title.textContent = "Allow this channel?";
    title.style.margin = "0 0 10px";
    title.style.fontSize = "20px";

    const body = document.createElement("p");
    body.textContent = `You opened ${channelLabel}. Add it to your allowed channels to continue browsing it during deep work.`;
    body.style.margin = "0 0 10px";
    body.style.fontSize = "14px";
    body.style.lineHeight = "1.5";

    const taskLine = document.createElement("p");
    taskLine.textContent = `Current task: ${currentTask || "none set"}`;
    taskLine.style.margin = "0 0 18px";
    taskLine.style.fontSize = "13px";
    taskLine.style.opacity = "0.78";

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "10px";
    buttons.style.flexWrap = "wrap";

    const allowBtn = document.createElement("button");
    allowBtn.type = "button";
    allowBtn.textContent = "Add to allowed channels";
    allowBtn.style.flex = "1 1 200px";
    allowBtn.style.padding = "11px 12px";
    allowBtn.style.borderRadius = "8px";
    allowBtn.style.border = "1px solid #2c2a27";
    allowBtn.style.background = "#2c2a27";
    allowBtn.style.color = "#fff";
    allowBtn.style.cursor = "pointer";

    const denyBtn = document.createElement("button");
    denyBtn.type = "button";
    denyBtn.textContent = "Deny access";
    denyBtn.style.flex = "1 1 140px";
    denyBtn.style.padding = "11px 12px";
    denyBtn.style.borderRadius = "8px";
    denyBtn.style.border = "1px solid #b9a98f";
    denyBtn.style.background = "transparent";
    denyBtn.style.color = "#2c2a27";
    denyBtn.style.cursor = "pointer";

    allowBtn.addEventListener("click", async () => {
      allowBtn.disabled = true;
      denyBtn.disabled = true;
      const response = await safeSendMessage({
        type: "approve_youtube_channel",
        url,
      });

      if (response?.ok) {
        const approvedUrl = pendingChannelNavigationUrl || url;
        removeChannelApprovalPrompt();
        if (approvedUrl !== window.location.href) {
          window.location.href = approvedUrl;
        }
        return;
      }

      allowBtn.disabled = false;
      denyBtn.disabled = false;
    });

    denyBtn.addEventListener("click", () => {
      lastPromptedChannelKey = "";
      removeChannelApprovalPrompt();
      if (denyBehavior === "block") {
        window.location.href = chrome.runtime.getURL(
          `blocked/blocked.html?url=${encodeURIComponent(url)}`
        );
      }
    });

    buttons.append(allowBtn, denyBtn);
    card.append(title, body, taskLine, buttons);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);
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
