(() => {
  const STORAGE_KEY = "tool-regex-playground-state";
  const SAMPLE_TEXT = `User: Dev (id: 1024)\nEmail: dev@example.com\nOrder IDs: ORD-1001, ORD-1002, ORD-1042\nDate: 2026-02-23\nIP: 192.168.0.14\nTags: #regex #debug #tooling`;

  const refs = {
    patternInput: document.getElementById("patternInput"),
    replacementInput: document.getElementById("replacementInput"),
    matchLimitInput: document.getElementById("matchLimitInput"),
    textInput: document.getElementById("textInput"),
    replaceOutput: document.getElementById("replaceOutput"),
    runBtn: document.getElementById("runBtn"),
    sampleBtn: document.getElementById("sampleBtn"),
    clearBtn: document.getElementById("clearBtn"),
    copyMatchesBtn: document.getElementById("copyMatchesBtn"),
    selectTextBtn: document.getElementById("selectTextBtn"),
    copyReplacementBtn: document.getElementById("copyReplacementBtn"),
    replaceAllToggle: document.getElementById("replaceAllToggle"),
    liveRunToggle: document.getElementById("liveRunToggle"),
    flagInputs: Array.from(document.querySelectorAll("[data-flag]")),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage"),
    regexSignature: document.getElementById("regexSignature"),
    matchSummary: document.getElementById("matchSummary"),
    previewMeta: document.getElementById("previewMeta"),
    groupsMeta: document.getElementById("groupsMeta"),
    previewPane: document.getElementById("previewPane"),
    matchesList: document.getElementById("matchesList"),
    errorPreview: document.getElementById("errorPreview"),
    textStats: document.getElementById("textStats")
  };

  let lastRun = {
    regexSource: "",
    flags: "",
    matches: [],
    limited: false
  };

  initialize();

  function initialize() {
    restoreState();
    bindEvents();
    updateTextStats();
    if (refs.liveRunToggle.checked) {
      runRegex();
    } else {
      resetResults();
      setStatus("idle", "Ready.");
    }
  }

  function bindEvents() {
    refs.runBtn.addEventListener("click", runRegex);
    refs.sampleBtn.addEventListener("click", loadSample);
    refs.clearBtn.addEventListener("click", clearAll);
    refs.copyMatchesBtn.addEventListener("click", copyMatchesAsJson);
    refs.selectTextBtn.addEventListener("click", () => {
      refs.textInput.focus();
      refs.textInput.select();
    });
    refs.copyReplacementBtn.addEventListener("click", copyReplacement);

    refs.patternInput.addEventListener("input", onInputChanged);
    refs.replacementInput.addEventListener("input", onInputChanged);
    refs.textInput.addEventListener("input", () => {
      updateTextStats();
      onInputChanged();
    });
    refs.matchLimitInput.addEventListener("input", onInputChanged);
    refs.replaceAllToggle.addEventListener("change", onInputChanged);
    refs.liveRunToggle.addEventListener("change", () => {
      persistState();
      if (refs.liveRunToggle.checked) runRegex();
      else setStatus("idle", "Live run disabled.");
    });
    refs.flagInputs.forEach((input) => input.addEventListener("change", onInputChanged));

    window.addEventListener("keydown", onGlobalKeydown);
  }

  function onGlobalKeydown(event) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "enter") {
      event.preventDefault();
      runRegex();
    }
  }

  function onInputChanged() {
    persistState();
    if (refs.liveRunToggle.checked) {
      runRegex();
    }
  }

  function runRegex() {
    const source = refs.patternInput.value;
    const flags = buildFlags();
    const text = refs.textInput.value;
    const limit = getMatchLimit();

    refs.regexSignature.textContent = `regex: /${source || "(?:)"}/${flags}`;
    refs.errorPreview.textContent = "No error.";

    let regex;
    try {
      regex = new RegExp(source, flags);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error", `Invalid regex: ${message}`);
      refs.errorPreview.textContent = message;
      refs.matchSummary.textContent = "matches: 0";
      refs.previewMeta.textContent = "0 matches";
      refs.groupsMeta.textContent = "0 entries";
      refs.previewPane.innerHTML = '<p class="empty-pane">Regex failed to compile.</p>';
      refs.matchesList.innerHTML = '<p class="empty-pane">No matches.</p>';
      refs.replaceOutput.value = "";
      lastRun = { regexSource: source, flags, matches: [], limited: false };
      return;
    }

    const analysis = collectMatches(regex, text, limit);
    lastRun = { regexSource: source, flags, matches: analysis.matches, limited: analysis.limited };

    renderPreview(text, analysis.matches);
    renderMatchesList(analysis.matches, analysis.limited);
    renderReplacementPreview(text, source, flags);

    const matchCount = analysis.matches.length;
    refs.matchSummary.textContent = `matches: ${matchCount}${analysis.limited ? ` (limited to ${limit})` : ""}`;
    refs.previewMeta.textContent = `${matchCount} match${matchCount === 1 ? "" : "es"}${analysis.limited ? " • limited" : ""}`;
    refs.groupsMeta.textContent = `${countGroupRows(analysis.matches)} group entr${countGroupRows(analysis.matches) === 1 ? "y" : "ies"}`;

    if (analysis.matches.length === 0) {
      setStatus("warn", "No matches.");
    } else {
      setStatus("ok", `Matched ${analysis.matches.length} item${analysis.matches.length === 1 ? "" : "s"}.`);
    }
  }

  function collectMatches(regex, text, limit) {
    const matches = [];
    let limited = false;

    if (!regex.global && !regex.sticky) {
      const m = regex.exec(text);
      if (m) {
        matches.push(serializeMatch(m));
      }
      return { matches, limited };
    }

    regex.lastIndex = 0;
    while (matches.length < limit) {
      const m = regex.exec(text);
      if (!m) break;
      matches.push(serializeMatch(m));
      if (m[0] === "") {
        regex.lastIndex += 1;
        if (regex.lastIndex > text.length) break;
      }
    }

    if (matches.length >= limit) {
      const next = regex.exec(text);
      limited = Boolean(next);
    }

    return { matches, limited };
  }

  function serializeMatch(match) {
    const start = match.index ?? 0;
    const full = match[0] ?? "";
    const end = start + full.length;
    const groups = [];

    for (let i = 1; i < match.length; i += 1) {
      groups.push({ key: String(i), value: match[i] ?? null });
    }

    if (match.groups && typeof match.groups === "object") {
      for (const [name, value] of Object.entries(match.groups)) {
        groups.push({ key: `<${name}>`, value: value ?? null });
      }
    }

    return {
      index: start,
      end,
      value: full,
      groups,
      groupCount: groups.length
    };
  }

  function renderPreview(text, matches) {
    if (!text.length) {
      refs.previewPane.innerHTML = '<p class="empty-pane">No input text.</p>';
      return;
    }

    if (!matches.length) {
      refs.previewPane.textContent = text;
      return;
    }

    const parts = [];
    let cursor = 0;

    for (let i = 0; i < matches.length; i += 1) {
      const m = matches[i];
      const start = clamp(m.index, 0, text.length);
      const end = clamp(m.end, 0, text.length);

      if (start > cursor) {
        parts.push(escapeHtml(text.slice(cursor, start)));
      }

      if (end === start) {
        parts.push('<span class="zero-match">∅</span>');
      } else {
        parts.push(`<mark>${escapeHtml(text.slice(start, end))}</mark>`);
      }

      cursor = Math.max(cursor, end);
    }

    if (cursor < text.length) {
      parts.push(escapeHtml(text.slice(cursor)));
    }

    refs.previewPane.innerHTML = parts.join("");
  }

  function renderMatchesList(matches, limited) {
    if (!matches.length) {
      refs.matchesList.innerHTML = '<p class="empty-pane">No matches.</p>';
      return;
    }

    const cards = matches.map((m, idx) => {
      const groupsMarkup = m.groups.length
        ? `<div class="groups-list">${m.groups
            .map(
              (g) => `<div class="group-row"><span class="group-label">group ${escapeHtml(g.key)}</span><code>${escapeHtml(formatNullable(g.value))}</code></div>`
            )
            .join("")}</div>`
        : '<p class="empty-pane">No capture groups.</p>';

      return `
        <article class="match-card">
          <div class="match-meta">
            <span>#${idx + 1}</span>
            <span>range: ${m.index}-${m.end}</span>
            <span>len: ${m.end - m.index}</span>
            <span>groups: ${m.groupCount}</span>
          </div>
          <div class="match-value">${escapeHtml(m.value)}</div>
          ${groupsMarkup}
        </article>`;
    });

    if (limited) {
      cards.push('<p class="empty-pane">Match list truncated at current limit.</p>');
    }

    refs.matchesList.innerHTML = cards.join("");
  }

  function renderReplacementPreview(text, source, flags) {
    if (!text.length) {
      refs.replaceOutput.value = "";
      return;
    }

    const replacement = refs.replacementInput.value;
    if (replacement.length === 0) {
      refs.replaceOutput.value = "";
      return;
    }

    try {
      let useFlags = flags;
      if (refs.replaceAllToggle.checked && !useFlags.includes("g")) {
        useFlags += "g";
      }
      const regex = new RegExp(source, useFlags);
      refs.replaceOutput.value = text.replace(regex, replacement);
    } catch {
      refs.replaceOutput.value = "";
    }
  }

  async function copyMatchesAsJson() {
    try {
      await copyText(JSON.stringify(lastRun, null, 2));
      flashButton(refs.copyMatchesBtn);
      setStatus("ok", "Match results copied as JSON.");
    } catch {
      setStatus("error", "Copy failed.");
    }
  }

  async function copyReplacement() {
    if (!refs.replaceOutput.value) {
      setStatus("warn", "Replacement preview is empty.");
      return;
    }
    try {
      await copyText(refs.replaceOutput.value);
      flashButton(refs.copyReplacementBtn);
      setStatus("ok", "Replacement preview copied.");
    } catch {
      setStatus("error", "Copy failed.");
    }
  }

  function loadSample() {
    refs.patternInput.value = "(?:ORD|ID)-?(\\d+)|(?<email>[a-z]+@[a-z.]+)";
    refs.replacementInput.value = "[MATCH:$&]";
    refs.textInput.value = SAMPLE_TEXT;
    refs.flagInputs.forEach((input) => {
      input.checked = input.dataset.flag === "g" || input.dataset.flag === "i";
    });
    refs.replaceAllToggle.checked = true;
    persistState();
    updateTextStats();
    runRegex();
  }

  function clearAll() {
    refs.patternInput.value = "";
    refs.replacementInput.value = "";
    refs.textInput.value = "";
    refs.replaceOutput.value = "";
    refs.matchLimitInput.value = "500";
    refs.flagInputs.forEach((input) => {
      input.checked = input.dataset.flag === "g";
    });
    refs.replaceAllToggle.checked = true;
    refs.liveRunToggle.checked = true;
    persistState();
    updateTextStats();
    resetResults();
    setStatus("idle", "Cleared pattern, text, and results.");
  }

  function resetResults() {
    refs.regexSignature.textContent = "regex: /(?:)/g";
    refs.matchSummary.textContent = "matches: 0";
    refs.previewMeta.textContent = "0 matches";
    refs.groupsMeta.textContent = "0 entries";
    refs.previewPane.innerHTML = '<p class="empty-pane">No input text.</p>';
    refs.matchesList.innerHTML = '<p class="empty-pane">No matches.</p>';
    refs.errorPreview.textContent = "No error.";
    refs.replaceOutput.value = "";
  }

  function buildFlags() {
    const order = ["g", "i", "m", "s", "u", "y"];
    const selected = new Set(
      refs.flagInputs.filter((input) => input.checked && typeof input.dataset.flag === "string").map((input) => input.dataset.flag)
    );
    return order.filter((flag) => selected.has(flag)).join("");
  }

  function getMatchLimit() {
    const value = parseInt(refs.matchLimitInput.value, 10);
    return Number.isFinite(value) ? clamp(value, 1, 5000) : 500;
  }

  function updateTextStats() {
    const text = refs.textInput.value;
    const chars = text.length;
    const lines = chars ? text.split(/\r?\n/).length : 1;
    const bytes = new TextEncoder().encode(text).length;
    refs.textStats.textContent = `chars: ${chars} • bytes: ${bytes} • lines: ${lines}`;
  }

  function countGroupRows(matches) {
    let total = 0;
    for (const m of matches) total += m.groupCount;
    return total;
  }

  function setStatus(kind, message) {
    refs.statusBadge.className = `status-badge ${kind}`;
    refs.statusBadge.textContent = kind;
    refs.statusMessage.textContent = message;
  }

  function persistState() {
    const payload = {
      pattern: refs.patternInput.value,
      replacement: refs.replacementInput.value,
      text: refs.textInput.value,
      matchLimit: refs.matchLimitInput.value,
      replaceAll: refs.replaceAllToggle.checked,
      liveRun: refs.liveRunToggle.checked,
      flags: refs.flagInputs.filter((input) => input.checked).map((input) => input.dataset.flag)
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage failure
    }
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        refs.flagInputs.forEach((input) => {
          input.checked = input.dataset.flag === "g";
        });
        return;
      }
      const parsed = JSON.parse(raw);
      refs.patternInput.value = typeof parsed.pattern === "string" ? parsed.pattern : "";
      refs.replacementInput.value = typeof parsed.replacement === "string" ? parsed.replacement : "";
      refs.textInput.value = typeof parsed.text === "string" ? parsed.text : "";
      refs.matchLimitInput.value = typeof parsed.matchLimit === "string" ? parsed.matchLimit : "500";
      refs.replaceAllToggle.checked = Boolean(parsed.replaceAll);
      refs.liveRunToggle.checked = parsed.liveRun !== false;
      const flagSet = new Set(Array.isArray(parsed.flags) ? parsed.flags : ["g"]);
      refs.flagInputs.forEach((input) => {
        input.checked = flagSet.has(input.dataset.flag);
      });
    } catch {
      refs.flagInputs.forEach((input) => {
        input.checked = input.dataset.flag === "g";
      });
    }
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
    const previous = button.textContent;
    button.classList.add("flash-ok");
    button.textContent = "Done";
    window.setTimeout(() => {
      button.classList.remove("flash-ok");
      button.textContent = previous;
    }, 700);
  }

  function formatNullable(value) {
    return value === null ? "<undefined>" : String(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
