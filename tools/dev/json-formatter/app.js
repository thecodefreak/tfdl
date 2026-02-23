(() => {
  const STORAGE_KEY = "tool-json-formatter-input";
  const SAMPLE_JSON = {
    name: "Amal",
    project: "gumgum",
    tools: [
      { id: "json", enabled: true },
      { id: "regex", enabled: true },
      { id: "img", enabled: true }
    ],
    metadata: {
      createdAt: "2026-02-23T19:00:00Z",
      note: "Edit me"
    }
  };

  const refs = {
    inputEditor: document.getElementById("inputEditor"),
    outputEditor: document.getElementById("outputEditor"),
    inputStats: document.getElementById("inputStats"),
    outputStats: document.getElementById("outputStats"),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage"),
    parseLocation: document.getElementById("parseLocation"),
    errorPreview: document.getElementById("errorPreview"),
    sortKeys: document.getElementById("sortKeys"),
    preserveOutputFocus: document.getElementById("preserveOutputFocus"),
    validateBtn: document.getElementById("validateBtn"),
    format2Btn: document.getElementById("format2Btn"),
    format4Btn: document.getElementById("format4Btn"),
    minifyBtn: document.getElementById("minifyBtn"),
    parseStringBtn: document.getElementById("parseStringBtn"),
    useOutputBtn: document.getElementById("useOutputBtn"),
    copyOutputBtn: document.getElementById("copyOutputBtn"),
    clearBtn: document.getElementById("clearBtn"),
    sampleBtn: document.getElementById("sampleBtn"),
    pasteBtn: document.getElementById("pasteBtn"),
    selectOutputBtn: document.getElementById("selectOutputBtn"),
    downloadBtn: document.getElementById("downloadBtn")
  };

  initialize();

  function initialize() {
    restoreDraft();
    bindEvents();
    updateStats();
    setStatus("idle", "Ready.");
    refs.errorPreview.textContent = "No error.";
  }

  function bindEvents() {
    refs.validateBtn.addEventListener("click", () => validateOnly());
    refs.format2Btn.addEventListener("click", () => transformJSON({ mode: "format", spaces: 2 }));
    refs.format4Btn.addEventListener("click", () => transformJSON({ mode: "format", spaces: 4 }));
    refs.minifyBtn.addEventListener("click", () => transformJSON({ mode: "minify" }));
    refs.parseStringBtn.addEventListener("click", parseStringifiedJSON);
    refs.useOutputBtn.addEventListener("click", useOutputAsInput);
    refs.copyOutputBtn.addEventListener("click", copyOutput);
    refs.clearBtn.addEventListener("click", clearEditors);
    refs.sampleBtn.addEventListener("click", loadSample);
    refs.pasteBtn.addEventListener("click", pasteIntoInput);
    refs.selectOutputBtn.addEventListener("click", selectOutput);
    refs.downloadBtn.addEventListener("click", downloadOutput);

    refs.inputEditor.addEventListener("input", () => {
      persistDraft();
      updateStats();
      clearErrorUIToIdle();
    });

    refs.outputEditor.addEventListener("input", updateStats);

    refs.sortKeys.addEventListener("change", () => {
      setStatus("idle", `Sort keys ${refs.sortKeys.checked ? "enabled" : "disabled"}.`);
    });

    window.addEventListener("keydown", onGlobalKeydown);
  }

  function onGlobalKeydown(event) {
    const isModifier = event.metaKey || event.ctrlKey;
    if (!isModifier) return;

    const key = event.key.toLowerCase();
    if (key === "enter") {
      event.preventDefault();
      transformJSON({ mode: "format", spaces: 2 });
      return;
    }

    if (event.shiftKey && key === "m") {
      event.preventDefault();
      transformJSON({ mode: "minify" });
      return;
    }

    if (event.shiftKey && key === "s") {
      event.preventDefault();
      refs.sortKeys.checked = !refs.sortKeys.checked;
      setStatus("idle", `Sort keys ${refs.sortKeys.checked ? "enabled" : "disabled"}.`);
    }
  }

  function validateOnly() {
    const raw = refs.inputEditor.value;
    if (!raw.trim()) {
      setStatus("warn", "Input is empty.");
      refs.errorPreview.textContent = "Paste JSON to validate.";
      refs.parseLocation.classList.add("is-hidden");
      return;
    }

    const result = parseJSONWithDetails(raw);
    if (!result.ok) {
      applyParseError(result.error, raw);
      return;
    }

    refs.outputEditor.value = "";
    updateStats();
    setStatus("ok", "Valid JSON.");
    refs.errorPreview.textContent = "No error.";
    refs.parseLocation.classList.add("is-hidden");
  }

  function transformJSON(options) {
    const raw = refs.inputEditor.value;
    if (!raw.trim()) {
      setStatus("warn", "Input is empty.");
      refs.errorPreview.textContent = "Paste JSON to format or minify.";
      refs.parseLocation.classList.add("is-hidden");
      return;
    }

    const result = parseJSONWithDetails(raw);
    if (!result.ok) {
      applyParseError(result.error, raw);
      return;
    }

    let value = result.value;
    if (refs.sortKeys.checked) {
      value = deepSortKeys(value);
    }

    const output =
      options.mode === "minify"
        ? JSON.stringify(value)
        : JSON.stringify(value, null, Number.isFinite(options.spaces) ? options.spaces : 2);

    refs.outputEditor.value = output;
    updateStats();
    refs.errorPreview.textContent = "No error.";
    refs.parseLocation.classList.add("is-hidden");

    const actionLabel = options.mode === "minify" ? "Minified" : `Formatted (${options.spaces} spaces)`;
    setStatus("ok", `${actionLabel}.`);
    focusAfterTransform();
  }

  function parseStringifiedJSON() {
    const raw = refs.inputEditor.value.trim();
    if (!raw) {
      setStatus("warn", "Input is empty.");
      return;
    }

    let current = raw;
    let passes = 0;
    let parsed;

    while (passes < 5) {
      const result = parseJSONWithDetails(current);
      if (!result.ok) {
        if (passes === 0) {
          applyParseError(result.error, refs.inputEditor.value);
          return;
        }
        break;
      }

      parsed = result.value;
      passes += 1;

      if (typeof parsed === "string") {
        current = parsed;
        continue;
      }

      refs.outputEditor.value = JSON.stringify(refs.sortKeys.checked ? deepSortKeys(parsed) : parsed, null, 2);
      updateStats();
      setStatus("ok", `Parsed stringified JSON (${passes} pass${passes === 1 ? "" : "es"}).`);
      refs.errorPreview.textContent = "No error.";
      refs.parseLocation.classList.add("is-hidden");
      focusAfterTransform();
      return;
    }

    if (typeof parsed === "string") {
      setStatus("warn", "Input is still a JSON string after 5 passes.");
      refs.outputEditor.value = parsed;
      updateStats();
      return;
    }

    setStatus("warn", "Input parsed, but no nested stringified JSON object/array was found.");
  }

  function useOutputAsInput() {
    if (!refs.outputEditor.value) {
      setStatus("warn", "Output is empty.");
      return;
    }
    refs.inputEditor.value = refs.outputEditor.value;
    persistDraft();
    updateStats();
    setStatus("idle", "Output copied into input.");
    refs.inputEditor.focus();
    refs.inputEditor.setSelectionRange(0, refs.inputEditor.value.length);
  }

  async function copyOutput() {
    const text = refs.outputEditor.value;
    if (!text) {
      setStatus("warn", "Output is empty.");
      return;
    }
    try {
      await copyText(text);
      setStatus("ok", "Output copied.");
      flashButton(refs.copyOutputBtn);
    } catch {
      setStatus("error", "Copy failed. Select output and copy manually.");
    }
  }

  async function pasteIntoInput() {
    try {
      if (!navigator.clipboard?.readText) {
        setStatus("warn", "Clipboard API not available. Paste manually.");
        refs.inputEditor.focus();
        return;
      }
      const text = await navigator.clipboard.readText();
      refs.inputEditor.value = text;
      persistDraft();
      updateStats();
      setStatus("idle", "Clipboard pasted into input.");
      refs.inputEditor.focus();
    } catch {
      setStatus("warn", "Clipboard read blocked. Use Ctrl/Cmd+V.");
      refs.inputEditor.focus();
    }
  }

  function selectOutput() {
    refs.outputEditor.focus();
    refs.outputEditor.select();
    setStatus("idle", "Output selected.");
  }

  function downloadOutput() {
    const text = refs.outputEditor.value;
    if (!text) {
      setStatus("warn", "Output is empty.");
      return;
    }
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("ok", "Downloaded formatted.json.");
    flashButton(refs.downloadBtn);
  }

  function clearEditors() {
    refs.inputEditor.value = "";
    refs.outputEditor.value = "";
    persistDraft();
    updateStats();
    refs.errorPreview.textContent = "No error.";
    refs.parseLocation.textContent = "";
    refs.parseLocation.classList.add("is-hidden");
    setStatus("idle", "Cleared input and output.");
    refs.inputEditor.focus();
  }

  function loadSample() {
    refs.inputEditor.value = JSON.stringify(SAMPLE_JSON, null, 2);
    persistDraft();
    updateStats();
    setStatus("idle", "Loaded sample JSON.");
    refs.inputEditor.focus();
  }

  function parseJSONWithDetails(raw) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  function applyParseError(error, raw) {
    const detail = extractErrorLocation(error.message, raw);
    const locationText = detail.position !== null ? `line ${detail.line}, col ${detail.column} (pos ${detail.position})` : "position unknown";
    setStatus("error", `Invalid JSON: ${error.message}`);
    refs.parseLocation.textContent = locationText;
    refs.parseLocation.classList.remove("is-hidden");
    refs.errorPreview.textContent = detail.preview || error.message;

    if (detail.position !== null) {
      refs.inputEditor.focus();
      try {
        refs.inputEditor.setSelectionRange(detail.position, Math.min(detail.position + 1, raw.length));
      } catch {
        // ignore selection errors
      }
    }
  }

  function extractErrorLocation(message, raw) {
    const byPos = /position\s+(\d+)/i.exec(message);
    let position = null;
    if (byPos) {
      position = Number.parseInt(byPos[1], 10);
    }

    if (!Number.isFinite(position)) {
      position = null;
    }

    let line = null;
    let column = null;
    let preview = "";

    if (position !== null) {
      const lc = positionToLineColumn(raw, position);
      line = lc.line;
      column = lc.column;
      preview = buildErrorPreview(raw, lc.line, lc.column);
    } else {
      preview = message;
      line = "?";
      column = "?";
    }

    return { position, line, column, preview };
  }

  function positionToLineColumn(text, position) {
    const bounded = Math.max(0, Math.min(position, text.length));
    let line = 1;
    let column = 1;
    for (let i = 0; i < bounded; i += 1) {
      if (text[i] === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
    return { line, column };
  }

  function buildErrorPreview(text, line, column) {
    const lines = text.split(/\r?\n/);
    const idx = Math.max(0, Number(line) - 1);
    const target = lines[idx] ?? "";
    const prev = idx > 0 ? lines[idx - 1] : null;
    const next = idx + 1 < lines.length ? lines[idx + 1] : null;
    const caretPad = Math.max(0, Number(column) - 1);
    const caretLine = `${" ".repeat(caretPad)}^`;
    const out = [];

    if (prev !== null) out.push(`${idx}: ${prev}`);
    out.push(`${idx + 1}: ${target}`);
    out.push(`   ${caretLine}`);
    if (next !== null) out.push(`${idx + 2}: ${next}`);

    return out.join("\n");
  }

  function deepSortKeys(value) {
    if (Array.isArray(value)) {
      return value.map(deepSortKeys);
    }
    if (value && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
        out[key] = deepSortKeys(value[key]);
      }
      return out;
    }
    return value;
  }

  function updateStats() {
    refs.inputStats.textContent = buildStats(refs.inputEditor.value);
    refs.outputStats.textContent = buildStats(refs.outputEditor.value);
  }

  function buildStats(text) {
    const chars = text.length;
    const lines = text.length ? text.split(/\r?\n/).length : 1;
    const bytes = new TextEncoder().encode(text).length;
    return `chars: ${chars} • bytes: ${bytes} • lines: ${lines}`;
  }

  function setStatus(kind, message) {
    refs.statusBadge.className = `status-badge ${kind}`;
    refs.statusBadge.textContent = kind;
    refs.statusMessage.textContent = message;
  }

  function clearErrorUIToIdle() {
    if (refs.statusBadge.textContent === "error") {
      setStatus("idle", "Ready.");
      refs.parseLocation.classList.add("is-hidden");
      refs.errorPreview.textContent = "No error.";
    }
  }

  function focusAfterTransform() {
    if (!refs.preserveOutputFocus.checked) return;
    refs.outputEditor.focus();
    refs.outputEditor.setSelectionRange(0, refs.outputEditor.value.length);
  }

  function persistDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, refs.inputEditor.value);
    } catch {
      // localStorage unavailable
    }
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (typeof saved === "string" && saved.length > 0) {
        refs.inputEditor.value = saved;
      }
    } catch {
      // ignore
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
})();
