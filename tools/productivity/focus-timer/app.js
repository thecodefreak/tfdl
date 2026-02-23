(() => {
  const SETTINGS_KEY = "tool-focus-timer-settings";
  const UI_KEY = "tool-focus-timer-ui";
  const STATS_KEY = "tool-focus-timer-stats-v1";
  const HISTORY_LIMIT = 40;

  const PHASES = {
    focus: { label: "Focus", accent: "rgba(110, 203, 255, 0.92)", kind: "focus" },
    short_break: { label: "Short Break", accent: "rgba(132, 243, 203, 0.92)", kind: "break" },
    long_break: { label: "Long Break", accent: "rgba(255, 211, 122, 0.92)", kind: "break" }
  };

  const PRESETS = {
    pomodoro: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4 },
    deep: { focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20, longBreakEvery: 4 },
    sprint: { focusMinutes: 90, shortBreakMinutes: 20, longBreakMinutes: 30, longBreakEvery: 3 }
  };

  const refs = {
    timerRing: document.getElementById("timerRing"),
    phaseLabel: document.getElementById("phaseLabel"),
    timeDisplay: document.getElementById("timeDisplay"),
    timerMeta: document.getElementById("timerMeta"),
    phaseTabs: Array.from(document.querySelectorAll(".phase-tab")),
    startPauseBtn: document.getElementById("startPauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    nextBtn: document.getElementById("nextBtn"),
    minusMinuteBtn: document.getElementById("minusMinuteBtn"),
    plusMinuteBtn: document.getElementById("plusMinuteBtn"),
    presetBtns: Array.from(document.querySelectorAll(".preset-btn")),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage"),
    requestNotifBtn: document.getElementById("requestNotifBtn"),
    copySummaryBtn: document.getElementById("copySummaryBtn"),
    todayDate: document.getElementById("todayDate"),
    todayFocusSessions: document.getElementById("todayFocusSessions"),
    todayFocusMinutes: document.getElementById("todayFocusMinutes"),
    cyclePosition: document.getElementById("cyclePosition"),
    currentPhaseStat: document.getElementById("currentPhaseStat"),
    queueList: document.getElementById("queueList"),
    focusMinutes: document.getElementById("focusMinutes"),
    shortBreakMinutes: document.getElementById("shortBreakMinutes"),
    longBreakMinutes: document.getElementById("longBreakMinutes"),
    longBreakEvery: document.getElementById("longBreakEvery"),
    applyDurationsBtn: document.getElementById("applyDurationsBtn"),
    autoStartBreaks: document.getElementById("autoStartBreaks"),
    autoStartFocus: document.getElementById("autoStartFocus"),
    soundEnabled: document.getElementById("soundEnabled"),
    desktopNotifyEnabled: document.getElementById("desktopNotifyEnabled"),
    taskNote: document.getElementById("taskNote"),
    historyList: document.getElementById("historyList"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn")
  };

  const state = {
    settings: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      soundEnabled: true,
      desktopNotifyEnabled: false,
      taskNote: ""
    },
    phase: "focus",
    remainingMs: 25 * 60 * 1000,
    phaseTotalMs: 25 * 60 * 1000,
    isRunning: false,
    endsAt: null,
    cycleFocusCompleted: 0,
    sessionSequence: 1,
    intervalId: null,
    todayStats: { focusSessions: 0, focusMinutes: 0, history: [] },
    statsDate: getTodayKey()
  };

  let audioContext = null;

  initialize();

  function initialize() {
    restoreSettings();
    restoreStats();
    applySettingsToForm();
    applyBehaviorToForm();
    setPhase("focus", { preserveRemaining: false, reason: "init" });
    bindEvents();
    tickUI();
    renderAll();
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  function bindEvents() {
    refs.startPauseBtn.addEventListener("click", toggleStartPause);
    refs.resetBtn.addEventListener("click", resetCurrentPhase);
    refs.nextBtn.addEventListener("click", () => advancePhase({ manual: true }));
    refs.minusMinuteBtn.addEventListener("click", () => adjustRemainingMinutes(-1));
    refs.plusMinuteBtn.addEventListener("click", () => adjustRemainingMinutes(1));
    refs.applyDurationsBtn.addEventListener("click", applyDurationSettings);
    refs.requestNotifBtn.addEventListener("click", requestNotifications);
    refs.copySummaryBtn.addEventListener("click", copyTodaySummary);
    refs.clearHistoryBtn.addEventListener("click", clearHistory);

    refs.phaseTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const phase = btn.dataset.phase;
        if (!phase || !PHASES[phase]) return;
        switchToPhase(phase);
      });
    });

    refs.presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => applyPreset(btn.dataset.preset || ""));
    });

    [refs.autoStartBreaks, refs.autoStartFocus, refs.soundEnabled, refs.desktopNotifyEnabled].forEach((input) => {
      input.addEventListener("change", applyBehaviorSettings);
    });

    refs.taskNote.addEventListener("input", () => {
      state.settings.taskNote = refs.taskNote.value;
      persistSettings();
    });

    [refs.focusMinutes, refs.shortBreakMinutes, refs.longBreakMinutes, refs.longBreakEvery].forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyDurationSettings();
        }
      });
    });

    window.addEventListener("keydown", onGlobalKeydown);
    window.addEventListener("beforeunload", () => {
      persistSettings();
      persistStats();
    });
  }

  function onGlobalKeydown(event) {
    const active = document.activeElement;
    const isTyping =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.isContentEditable;

    if (isTyping) return;

    if (event.code === "Space") {
      event.preventDefault();
      toggleStartPause();
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "r") {
      event.preventDefault();
      resetCurrentPhase();
      return;
    }
    if (key === "n") {
      event.preventDefault();
      advancePhase({ manual: true });
      return;
    }
    if (key === "-") {
      event.preventDefault();
      adjustRemainingMinutes(-1);
      return;
    }
    if (key === "+" || key === "=") {
      event.preventDefault();
      adjustRemainingMinutes(1);
    }
  }

  function toggleStartPause() {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    if (state.isRunning) return;
    if (state.remainingMs <= 0) {
      state.remainingMs = state.phaseTotalMs;
    }
    state.endsAt = Date.now() + state.remainingMs;
    state.isRunning = true;
    ensureTickLoop();
    setStatus("running", `${PHASES[state.phase].label} started.`);
    renderAll();
  }

  function pauseTimer() {
    if (!state.isRunning) return;
    syncRemainingFromClock();
    state.isRunning = false;
    state.endsAt = null;
    maybeStopTickLoop();
    setStatus("paused", `${PHASES[state.phase].label} paused.`);
    renderAll();
  }

  function resetCurrentPhase() {
    state.isRunning = false;
    state.endsAt = null;
    state.remainingMs = state.phaseTotalMs;
    maybeStopTickLoop();
    setStatus("idle", `${PHASES[state.phase].label} reset.`);
    renderAll();
  }

  function switchToPhase(phase) {
    state.isRunning = false;
    state.endsAt = null;
    maybeStopTickLoop();
    setPhase(phase, { preserveRemaining: false, reason: "manual-switch" });
    setStatus("idle", `Switched to ${PHASES[phase].label}.`);
    renderAll();
  }

  function setPhase(phase, options = {}) {
    const { preserveRemaining = false } = options;
    state.phase = phase;
    state.phaseTotalMs = getPhaseDurationMs(phase);
    if (!preserveRemaining) {
      state.remainingMs = state.phaseTotalMs;
    } else {
      state.remainingMs = Math.min(state.remainingMs, state.phaseTotalMs);
    }
  }

  function getPhaseDurationMs(phase) {
    if (phase === "focus") return state.settings.focusMinutes * 60 * 1000;
    if (phase === "short_break") return state.settings.shortBreakMinutes * 60 * 1000;
    return state.settings.longBreakMinutes * 60 * 1000;
  }

  function adjustRemainingMinutes(deltaMinutes) {
    const deltaMs = deltaMinutes * 60 * 1000;
    const minMs = 10 * 1000;
    const maxMs = 12 * 60 * 60 * 1000;
    if (state.isRunning) {
      syncRemainingFromClock();
    }
    state.remainingMs = clamp(state.remainingMs + deltaMs, minMs, maxMs);
    state.phaseTotalMs = Math.max(state.phaseTotalMs, state.remainingMs);
    if (state.isRunning) {
      state.endsAt = Date.now() + state.remainingMs;
    }
    setStatus(state.isRunning ? "running" : "idle", `${deltaMinutes > 0 ? "Added" : "Removed"} 1 minute.`);
    renderAll();
  }

  function applyPreset(presetId) {
    if (presetId === "custom") {
      applyDurationSettings();
      return;
    }
    const preset = PRESETS[presetId];
    if (!preset) return;
    state.settings = { ...state.settings, ...preset };
    applySettingsToForm();
    persistSettings();
    applyDurationSettings({ fromPreset: true, skipStatus: true });
    setStatus("idle", `Preset applied: ${presetId}.`);
  }

  function applyDurationSettings(options = {}) {
    const { fromPreset = false, skipStatus = false } = options;
    const next = {
      focusMinutes: clampInt(refs.focusMinutes.value, 1, 240, state.settings.focusMinutes),
      shortBreakMinutes: clampInt(refs.shortBreakMinutes.value, 1, 120, state.settings.shortBreakMinutes),
      longBreakMinutes: clampInt(refs.longBreakMinutes.value, 1, 180, state.settings.longBreakMinutes),
      longBreakEvery: clampInt(refs.longBreakEvery.value, 2, 12, state.settings.longBreakEvery)
    };
    state.settings = { ...state.settings, ...next };
    applySettingsToForm();
    persistSettings();

    const wasRunning = state.isRunning;
    const currentPhase = state.phase;
    state.isRunning = false;
    state.endsAt = null;
    maybeStopTickLoop();
    setPhase(currentPhase, { preserveRemaining: false, reason: fromPreset ? "preset" : "settings" });

    if (!skipStatus) {
      setStatus("idle", wasRunning ? "Durations applied and timer reset." : "Durations applied.");
    }
    renderAll();
  }

  function applyBehaviorSettings() {
    state.settings.autoStartBreaks = refs.autoStartBreaks.checked;
    state.settings.autoStartFocus = refs.autoStartFocus.checked;
    state.settings.soundEnabled = refs.soundEnabled.checked;
    state.settings.desktopNotifyEnabled = refs.desktopNotifyEnabled.checked;
    persistSettings();
    setStatus(state.isRunning ? "running" : "idle", "Behavior settings saved.");
    renderAll();
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setStatus("error", "Notifications not supported in this browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      refs.desktopNotifyEnabled.checked = permission === "granted";
      state.settings.desktopNotifyEnabled = refs.desktopNotifyEnabled.checked;
      persistSettings();
      setStatus(permission === "granted" ? "idle" : "warn", `Notification permission: ${permission}.`);
      renderAll();
    } catch {
      setStatus("error", "Failed to request notification permission.");
    }
  }

  async function copyTodaySummary() {
    const summary = buildTodaySummary();
    try {
      await copyText(summary);
      flashButton(refs.copySummaryBtn);
      setStatus("idle", "Today summary copied.");
    } catch {
      setStatus("error", "Copy failed.");
    }
  }

  function clearHistory() {
    state.todayStats.history = [];
    persistStats();
    renderHistory();
    setStatus(state.isRunning ? "running" : "idle", "History cleared.");
  }

  function ensureTickLoop() {
    if (state.intervalId !== null) return;
    state.intervalId = window.setInterval(onTick, 250);
  }

  function maybeStopTickLoop() {
    if (state.intervalId === null) return;
    if (state.isRunning) return;
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }

  function onTick() {
    if (!state.isRunning) {
      maybeStopTickLoop();
      return;
    }
    syncRemainingFromClock();
    if (state.remainingMs <= 0) {
      handlePhaseComplete();
      return;
    }
    tickUI();
  }

  function syncRemainingFromClock() {
    if (!state.isRunning || state.endsAt === null) return;
    state.remainingMs = Math.max(0, state.endsAt - Date.now());
  }

  function handlePhaseComplete() {
    const completedPhase = state.phase;
    state.isRunning = false;
    state.endsAt = null;
    state.remainingMs = 0;
    maybeStopTickLoop();

    if (completedPhase === "focus") {
      state.cycleFocusCompleted += 1;
      state.sessionSequence = (state.cycleFocusCompleted % state.settings.longBreakEvery) + 1;
      state.todayStats.focusSessions += 1;
      state.todayStats.focusMinutes += state.settings.focusMinutes;
      addHistoryEntry({ type: "focus_complete", phase: completedPhase, minutes: state.settings.focusMinutes });
    } else {
      addHistoryEntry({
        type: "break_complete",
        phase: completedPhase,
        minutes: completedPhase === "short_break" ? state.settings.shortBreakMinutes : state.settings.longBreakMinutes
      });
    }

    persistStats();
    notifyCompletion(completedPhase);

    const nextPhase = getNextPhaseAfter(completedPhase);
    setPhase(nextPhase, { preserveRemaining: false, reason: "phase-complete" });

    const shouldAutoStart = nextPhase === "focus" ? state.settings.autoStartFocus : state.settings.autoStartBreaks;
    if (shouldAutoStart) {
      startTimer();
      setStatus("running", `${PHASES[completedPhase].label} complete. Auto-started ${PHASES[nextPhase].label}.`);
    } else {
      setStatus("idle", `${PHASES[completedPhase].label} complete. Ready for ${PHASES[nextPhase].label}.`);
      renderAll();
    }
  }

  function getNextPhaseAfter(phase) {
    if (phase === "focus") {
      return state.cycleFocusCompleted % state.settings.longBreakEvery === 0 ? "long_break" : "short_break";
    }
    if (phase === "long_break") {
      return "focus";
    }
    return "focus";
  }

  function notifyCompletion(completedPhase) {
    if (state.settings.soundEnabled) {
      playBeepSequence(completedPhase === "focus" ? 2 : 1);
    }

    if (state.settings.desktopNotifyEnabled && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`${PHASES[completedPhase].label} complete`, {
          body: `Next: ${PHASES[getNextPhaseAfter(completedPhase)].label}`
        });
      } catch {
        // ignore
      }
    }
  }

  function playBeepSequence(count) {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContext;
      const now = ctx.currentTime;
      for (let i = 0; i < count; i += 1) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, now + i * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.22 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.14);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.22);
        osc.stop(now + i * 0.22 + 0.16);
      }
    } catch {
      // Audio may fail if blocked; ignore.
    }
  }

  function addHistoryEntry(entry) {
    const ts = new Date().toISOString();
    state.todayStats.history.unshift({ ...entry, ts });
    state.todayStats.history = state.todayStats.history.slice(0, HISTORY_LIMIT);
  }

  function renderAll() {
    ensureStatsDate();
    tickUI();
    renderPhaseTabs();
    renderStats();
    renderQueue();
    renderHistory();
    renderBehaviorState();
  }

  function tickUI() {
    const phase = PHASES[state.phase];
    const total = Math.max(1, state.phaseTotalMs);
    const remaining = Math.max(0, state.remainingMs);
    const elapsed = Math.max(0, total - remaining);
    const progress = clamp((elapsed / total) * 100, 0, 100);

    refs.timerRing.style.setProperty("--progress", String(progress));
    refs.timerRing.style.setProperty("--phase-accent", phase.accent);
    refs.phaseLabel.textContent = phase.label;
    refs.timeDisplay.textContent = formatMs(remaining);
    refs.currentPhaseStat.textContent = phase.label;
    refs.cyclePosition.textContent = `${Math.min((state.cycleFocusCompleted % state.settings.longBreakEvery) + 1, state.settings.longBreakEvery)}/${state.settings.longBreakEvery}`;
    refs.timerMeta.textContent = buildTimerMeta();
    refs.startPauseBtn.textContent = state.isRunning ? "Pause" : "Start";
    refs.statusBadge.classList.toggle("running", state.isRunning);
    refs.statusBadge.classList.toggle("paused", !state.isRunning && state.remainingMs < state.phaseTotalMs && state.remainingMs > 0);
    refs.statusBadge.classList.toggle("idle", !refs.statusBadge.classList.contains("running") && !refs.statusBadge.classList.contains("paused"));
    refs.todayDate.textContent = formatTodayLabel();
    updateDocumentTitle();
  }

  function buildTimerMeta() {
    const position = (state.cycleFocusCompleted % state.settings.longBreakEvery) + 1;
    if (state.phase === "focus") {
      return `session ${position} of ${state.settings.longBreakEvery} before long break`;
    }
    if (state.phase === "short_break") {
      return `next focus session ${position} • short recovery`;
    }
    return `long break after ${state.settings.longBreakEvery} focus sessions`;
  }

  function renderPhaseTabs() {
    refs.phaseTabs.forEach((btn) => {
      const active = btn.dataset.phase === state.phase;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  }

  function renderStats() {
    refs.todayFocusSessions.textContent = String(state.todayStats.focusSessions);
    refs.todayFocusMinutes.textContent = String(state.todayStats.focusMinutes);
  }

  function renderQueue() {
    const queue = [];
    let tempCompleted = state.cycleFocusCompleted;
    let phase = state.phase;
    queue.push({ phase, current: true });
    for (let i = 0; i < 5; i += 1) {
      if (phase === "focus") {
        tempCompleted += 1;
        phase = tempCompleted % state.settings.longBreakEvery === 0 ? "long_break" : "short_break";
      } else {
        phase = "focus";
      }
      queue.push({ phase, current: false });
    }

    refs.queueList.innerHTML = queue
      .map((item, idx) => {
        const minutes = Math.round(getPhaseDurationMinutes(item.phase));
        const label = PHASES[item.phase].label;
        return `<li class="${item.current ? "current" : ""}">${idx === 0 ? "Now" : `Next ${idx}`} • ${label} • ${minutes}m</li>`;
      })
      .join("");
  }

  function renderHistory() {
    if (!state.todayStats.history.length) {
      refs.historyList.innerHTML = '<li><span class="history-main">No events yet.</span><span class="history-meta">Complete a focus or break to log it here.</span></li>';
      return;
    }

    refs.historyList.innerHTML = state.todayStats.history
      .map((entry) => {
        const t = new Date(entry.ts);
        const label = entry.type === "focus_complete" ? "Focus complete" : `${PHASES[entry.phase].label} complete`;
        return `<li>
          <span class="history-main">${label} • ${entry.minutes}m</span>
          <span class="history-meta">${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </li>`;
      })
      .join("");
  }

  function renderBehaviorState() {
    refs.requestNotifBtn.textContent =
      "Notification" in window
        ? `Notifications: ${Notification.permission || "default"}`
        : "Notifications Unsupported";
    refs.requestNotifBtn.disabled = !("Notification" in window);
  }

  function setStatus(kind, message) {
    refs.statusBadge.className = `status-badge ${kind}`;
    refs.statusBadge.textContent = kind;
    refs.statusMessage.textContent = message;
  }

  function applySettingsToForm() {
    refs.focusMinutes.value = String(state.settings.focusMinutes);
    refs.shortBreakMinutes.value = String(state.settings.shortBreakMinutes);
    refs.longBreakMinutes.value = String(state.settings.longBreakMinutes);
    refs.longBreakEvery.value = String(state.settings.longBreakEvery);
  }

  function applyBehaviorToForm() {
    refs.autoStartBreaks.checked = state.settings.autoStartBreaks;
    refs.autoStartFocus.checked = state.settings.autoStartFocus;
    refs.soundEnabled.checked = state.settings.soundEnabled;
    refs.desktopNotifyEnabled.checked = state.settings.desktopNotifyEnabled;
    refs.taskNote.value = state.settings.taskNote || "";
  }

  function ensureStatsDate() {
    const today = getTodayKey();
    if (state.statsDate === today) return;
    state.statsDate = today;
    state.todayStats = { focusSessions: 0, focusMinutes: 0, history: [] };
    persistStats();
  }

  function restoreSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.settings = {
        ...state.settings,
        focusMinutes: clampInt(parsed.focusMinutes, 1, 240, state.settings.focusMinutes),
        shortBreakMinutes: clampInt(parsed.shortBreakMinutes, 1, 120, state.settings.shortBreakMinutes),
        longBreakMinutes: clampInt(parsed.longBreakMinutes, 1, 180, state.settings.longBreakMinutes),
        longBreakEvery: clampInt(parsed.longBreakEvery, 2, 12, state.settings.longBreakEvery),
        autoStartBreaks: Boolean(parsed.autoStartBreaks),
        autoStartFocus: Boolean(parsed.autoStartFocus),
        soundEnabled: parsed.soundEnabled !== false,
        desktopNotifyEnabled: Boolean(parsed.desktopNotifyEnabled),
        taskNote: typeof parsed.taskNote === "string" ? parsed.taskNote : ""
      };
    } catch {
      // ignore restore failure
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {
      // ignore localStorage failure
    }
  }

  function restoreStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const today = getTodayKey();
      if (parsed.date !== today) return;
      state.statsDate = today;
      state.todayStats = {
        focusSessions: clampInt(parsed.focusSessions, 0, 1000, 0),
        focusMinutes: clampInt(parsed.focusMinutes, 0, 100000, 0),
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : []
      };
    } catch {
      // ignore restore failure
    }
  }

  function persistStats() {
    ensureStatsDate();
    const payload = {
      date: state.statsDate,
      focusSessions: state.todayStats.focusSessions,
      focusMinutes: state.todayStats.focusMinutes,
      history: state.todayStats.history.slice(0, HISTORY_LIMIT)
    };
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage failure
    }
  }

  function buildTodaySummary() {
    ensureStatsDate();
    const lines = [
      `Focus Timer Summary (${state.statsDate})`,
      `Focus sessions: ${state.todayStats.focusSessions}`,
      `Focus minutes: ${state.todayStats.focusMinutes}`,
      `Current phase: ${PHASES[state.phase].label}`,
      `Remaining: ${formatMs(state.remainingMs)}`,
      `Task note: ${state.settings.taskNote || "(none)"}`
    ];
    return lines.join("\n");
  }

  function updateDocumentTitle() {
    const base = `${formatMs(state.remainingMs)} • ${PHASES[state.phase].label}`;
    document.title = state.isRunning ? `${base} • Focus Timer` : `Focus Timer • ${base}`;
  }

  function handleVisibilityChange() {
    if (!state.isRunning) return;
    syncRemainingFromClock();
    if (state.remainingMs <= 0) {
      handlePhaseComplete();
    } else {
      tickUI();
    }
  }

  function getPhaseDurationMinutes(phase) {
    return getPhaseDurationMs(phase) / 60000;
  }

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatTodayLabel() {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }

  function formatMs(ms) {
    const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function flashButton(button) {
    const prev = button.textContent;
    button.textContent = "Done";
    button.classList.add("flash-ok");
    window.setTimeout(() => {
      button.textContent = prev;
      button.classList.remove("flash-ok");
    }, 700);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampInt(value, min, max, fallback) {
    const n = typeof value === "number" ? value : parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.round(clamp(n, min, max));
  }
})();
