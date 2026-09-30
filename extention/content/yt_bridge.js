function ytBridge() {
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
    }
