// Tab switching + RANK view rendering.
// Runs alongside popup.js and does not touch any of its code.
// Wrapped in an IIFE so names never collide with popup.js globals.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const RANKS = [
    { name: "RECRUIT",    minHours: 0,   badge: "I",   color: "#7a90a8" },
    { name: "CADET",      minHours: 5,   badge: "II",  color: "#4ade80" },
    { name: "OPERATIVE",  minHours: 25,  badge: "III", color: "#18d4f5" },
    { name: "SPECIALIST", minHours: 60,  badge: "IV",  color: "#a78bfa" },
    { name: "VANGUARD",   minHours: 120, badge: "V",   color: "#f59e0b" },
    { name: "SENTINEL",   minHours: 250, badge: "VI",  color: "#f43f5e" }
  ];

  /* ---------------------------------------------------------
     DATA SOURCE
     This is the only function to change when the backend is ready.
     It must resolve to an array of { startTime, endTime, durationMin, reason, task }.
     Later, something like:
       const { sessions = [] } = await chrome.storage.local.get("sessions");
       return sessions;
     --------------------------------------------------------- */
  async function loadSessions() {
    const { progress } = await chrome.storage.local.get("progress");
    return (progress && progress.sessions) || [];
  }

  /* ---------- helpers ---------- */

  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function startOfDay(offsetDays) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return d;
  }

  function formatDuration(min) {
    const total = Math.round(min);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (!h) return `${m}m`;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  /* ---------- stats ---------- */

  function computeStats(sessions) {
    const byDay = new Map();
    let totalMin = 0;
    let longest = 0;

    sessions.forEach((s) => {
      const min = Number(s.durationMin) || 0;
      totalMin += min;
      longest = Math.max(longest, min);
      const key = dayKey(s.startTime);
      byDay.set(key, (byDay.get(key) || 0) + min);
    });

    // Last 7 days, oldest first, ending today.
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(-i);
      days.push({ date, min: byDay.get(dayKey(date)) || 0 });
    }

    const weekKeys = new Set(days.map((d) => dayKey(d.date)));
    const weekMin = days.reduce((sum, d) => sum + d.min, 0);
    const weekSessions = sessions.filter((s) => weekKeys.has(dayKey(s.startTime))).length;
    const avg = weekSessions ? Math.round(weekMin / weekSessions) : 0;

    // Streak: consecutive days with work. Today doesn't break it until the day ends.
    let streak = 0;
    const cursor = startOfDay(0);
    if (!byDay.get(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while ((byDay.get(dayKey(cursor)) || 0) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const bestDay = byDay.size ? Math.max(...byDay.values()) : 0;

    return { totalMin, longest, days, weekMin, weekSessions, avg, streak, bestDay };
  }

  /* ---------- rank ---------- */

  function getRank(totalMin) {
    const hours = totalMin / 60;
    let idx = 0;
    RANKS.forEach((r, i) => {
      if (hours >= r.minHours) idx = i;
    });

    const current = RANKS[idx];
    const next = RANKS[idx + 1] || null;

    if (!next) return { idx, current, next: null, progress: 100, minutesLeft: 0 };

    const span = (next.minHours - current.minHours) * 60;
    const done = totalMin - current.minHours * 60;

    return {
      idx,
      current,
      next,
      progress: Math.max(0, Math.min(100, (done / span) * 100)),
      minutesLeft: Math.ceil(next.minHours * 60 - totalMin)
    };
  }

  /* ---------- render ---------- */

  function renderRank(stats) {
    const { idx, current, next, progress, minutesLeft } = getRank(stats.totalMin);

    $("rankCard").style.setProperty("--rank-color", current.color);
    $("rankBadge").textContent = current.badge;
    $("rankName").textContent = current.name;
    $("rankTotal").textContent = formatDuration(stats.totalMin);
    $("rankPosition").textContent = `RANK ${idx + 1} OF ${RANKS.length}`;
    $("rankBarFill").style.width = `${progress}%`;
    $("rankLeft").textContent = next ? formatDuration(minutesLeft) : "MAX RANK";
    $("rankNextName").textContent = next ? `to ${next.name}` : "";

    $("rankPips").querySelectorAll(".pip").forEach((pip, i) => {
      pip.classList.toggle("reached", i <= idx);
      pip.classList.toggle("current", i === idx);
    });

    $("rankEmpty").hidden = stats.totalMin > 0;
  }

  function renderStats(stats) {
    $("statWeek").textContent = formatDuration(stats.weekMin);
    $("statSessions").textContent = String(stats.weekSessions);
    $("statAvg").textContent = formatDuration(stats.avg);
    $("statStreak").textContent = `${stats.streak}d`;
    $("statBest").textContent = formatDuration(stats.bestDay);
    $("statLongest").textContent = formatDuration(stats.longest);

    $("statGrid").classList.toggle("is-empty", stats.totalMin === 0);
  }

  async function renderWeek(stats) {
    const {settings} = await chrome.storage.local.get("settings");
    const dailyGoal = Number(settings && settings.dailyMinutesGoal) || 120;
    const bars = $("weekBars").children;
    const labels = $("weekLabels").children;

    stats.days.forEach((day, i) => {
      const bar = bars[i];
      const ratio = Math.min(1, day.min / dailyGoal);
      const height = day.min > 0 ? Math.max(8, Math.round((ratio) * 52)) : 4;
      const isToday = i === stats.days.length - 1;

      bar.style.height = `${height}px`;
      bar.classList.toggle("has-data", day.min > 0 && !isToday);
      bar.classList.toggle("today", isToday);
      bar.classList.toggle("goal-met", day.min >= dailyGoal);
      bar.title = `${day.date.toLocaleDateString("en", { weekday: "short" })}: ${formatDuration(day.min)}`;

      labels[i].textContent = day.date.toLocaleDateString("en", { weekday: "narrow" });
      labels[i].classList.toggle("today", isToday);
    });
  }

  async function refresh() {
    const sessions = await loadSessions();
    const stats = computeStats(sessions);
    renderRank(stats);
    renderStats(stats);
    renderWeek(stats);
  }

  /* ---------- tabs ---------- */

  function showView(id) {
    document.querySelectorAll(".view").forEach((v) => {
      v.hidden = v.id !== id;
    });
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.view === id;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });

    if (id === "viewRank") refresh();

    try {
      chrome.storage.local.set({ lastView: id });
    } catch (e) {}
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => showView(tab.dataset.view));
  });

  // Draw once on open so the RANK tab is ready, then restore the last tab used.
  refresh();

  try {
    chrome.storage.local.get("lastView").then(({ lastView }) => {
      if (lastView && document.getElementById(lastView)) showView(lastView);
    });
  } catch (e) {}
})();
