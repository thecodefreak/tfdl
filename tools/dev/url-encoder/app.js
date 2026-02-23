(() => {
  const STORAGE_KEY = "tool-url-encoder-state";
  const SAMPLE_URL = "https://api.example.com/search?q=hello world&lang=en-US&tag=dev&tag=tools&page=2#results";
  const SAMPLE_QUERY = "name=Amal+Khan&city=San+Francisco&tool=json&tool=regex&redirect=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1";

  const refs = {
    modeSelect: document.getElementById("modeSelect"),
    liveRunToggle: document.getElementById("liveRunToggle"),
    trimInputToggle: document.getElementById("trimInputToggle"),
    multilineToggle: document.getElementById("multilineToggle"),
    inspectSourceSelect: document.getElementById("inspectSourceSelect"),
    inputEditor: document.getElementById("inputEditor"),
    outputEditor: document.getElementById("outputEditor"),
    queryJsonOutput: document.getElementById("queryJsonOutput"),
    inputStats: document.getElementById("inputStats"),
    outputStats: document.getElementById("outputStats"),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage"),
    modeSummary: document.getElementById("modeSummary"),
    errorPreview: document.getElementById("errorPreview"),
    breakdownMeta: document.getElementById("breakdownMeta"),
    urlBreakdownList: document.getElementById("urlBreakdownList"),
    queryRows: document.getElementById("queryRows"),
    queryEmpty: document.getElementById("queryEmpty"),
    queryMeta: document.getElementById("queryMeta"),
    runBtn: document.getElementById("runBtn"),
    swapBtn: document.getElementById("swapBtn"),
    useOutputBtn: document.getElementById("useOutputBtn"),
    copyOutputBtn: document.getElementById("copyOutputBtn"),
    clearBtn: document.getElementById("clearBtn"),
    sampleUrlBtn: document.getElementById("sampleUrlBtn"),
    sampleQueryBtn: document.getElementById("sampleQueryBtn"),
    pasteBtn: document.getElementById("pasteBtn"),
    selectOutputBtn: document.getElementById("selectOutputBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    copyQueryJsonBtn: document.getElementById("copyQueryJsonBtn")
  };

  initialize();

  function initialize() {
    restoreState();
    bindEvents();
    updateStats();
    if (refs.liveRunToggle.checked) {
      runTransform();
    } else {
      resetInspector();
      setStatus("idle", "Ready.");
    }
  }

  function bindEvents() {
    refs.runBtn.addEventListener("click", runTransform);
    refs.swapBtn.addEventListener("click", swapEditors);
    refs.useOutputBtn.addEventListener("click", useOutputAsInput);
    refs.copyOutputBtn.addEventListener("click", copyOutput);
    refs.clearBtn.addEventListener("click", clearEditors);
    refs.sampleUrlBtn.addEventListener("click", () => loadSample(SAMPLE_URL));
    refs.sampleQueryBtn.addEventListener("click", () => loadSample(SAMPLE_QUERY));
    refs.pasteBtn.addEventListener("click", pasteIntoInput);
    refs.selectOutputBtn.addEventListener("click", () => {
      refs.outputEditor.focus();
      refs.outputEditor.select();
    });
    refs.downloadBtn.addEventListener("click", downloadOutput);
    refs.copyQueryJsonBtn.addEventListener("click", copyQueryJson);

    [
      refs.modeSelect,
      refs.liveRunToggle,
      refs.trimInputToggle,
      refs.multilineToggle,
      refs.inspectSourceSelect
    ].forEach((el) => el.addEventListener("change", onConfigChanged));

    refs.inputEditor.addEventListener("input", () => {
      updateStats();
      onConfigChanged();
    });

    refs.outputEditor.addEventListener("input", updateStats);

    window.addEventListener("keydown", onGlobalKeydown);
  }

  function onGlobalKeydown(event) {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "enter") {
      event.preventDefault();
      runTransform();
    }
  }

  function onConfigChanged() {
    persistState();
    if (refs.liveRunToggle.checked) {
      runTransform();
    } else {
      inspectCurrentText();
      updateModeSummary();
    }
  }

  function runTransform() {
    const mode = refs.modeSelect.value;
    const input = getPreparedInput();
    refs.errorPreview.textContent = "No error.";

    try {
      const output = refs.multilineToggle.checked ? transformPerLine(input, mode) : transformValue(input, mode);
      refs.outputEditor.value = output;
      updateStats();
      updateModeSummary();
      inspectCurrentText();
      setStatus("ok", "Transform completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      refs.outputEditor.value = "";
      updateStats();
      updateModeSummary();
      inspectCurrentText();
      refs.errorPreview.textContent = message;
      setStatus("error", `Transform failed: ${message}`);
    }
  }

  function getPreparedInput() {
    const raw = refs.inputEditor.value;
    return refs.trimInputToggle.checked ? raw.trim() : raw;
  }

  function transformPerLine(input, mode) {
    const lines = input.split(/\r?\n/);
    return lines.map((line) => transformValue(line, mode)).join("\n");
  }

  function transformValue(input, mode) {
    switch (mode) {
      case "encode_component":
        return encodeURIComponent(input);
      case "decode_component":
        return decodeURIComponent(input);
      case "encode_uri":
        return encodeURI(input);
      case "decode_uri":
        return decodeURI(input);
      case "form_encode":
        return encodeURIComponent(input).replace(/%20/g, "+");
      case "form_decode":
        return decodeURIComponent(input.replace(/\+/g, " "));
      default:
        return input;
    }
  }

  function inspectCurrentText() {
    const source = refs.inspectSourceSelect.value === "output" ? refs.outputEditor.value : refs.inputEditor.value;
    renderUrlBreakdown(source);
    renderQueryInspector(source);
  }

  function renderUrlBreakdown(rawText) {
    const text = rawText.trim();
    if (!text) {
      refs.breakdownMeta.textContent = "none";
      refs.urlBreakdownList.innerHTML = '<p class="empty-pane">Paste a full URL to see protocol/host/path/search/hash.</p>';
      return;
    }

    let url;
    try {
      url = new URL(text);
    } catch {
      refs.breakdownMeta.textContent = "not a full URL";
      refs.urlBreakdownList.innerHTML = '<p class="empty-pane">Input is not an absolute URL. Query inspector can still parse raw query strings.</p>';
      return;
    }

    const items = [
      ["href", url.href],
      ["origin", url.origin],
      ["protocol", url.protocol],
      ["host", url.host],
      ["pathname", url.pathname || "/"],
      ["search", url.search || ""],
      ["hash", url.hash || ""]
    ];

    refs.breakdownMeta.textContent = `${url.protocol.replace(/:$/, "")} • ${url.host}`;
    refs.urlBreakdownList.innerHTML = items
      .map(
        ([key, value]) => `<div class="kv-item"><div class="kv-key">${escapeHtml(key)}</div><div class="kv-val">${escapeHtml(value)}</div></div>`
      )
      .join("");
  }

  function renderQueryInspector(rawText) {
    const extracted = extractQueryString(rawText);
    if (!extracted) {
      refs.queryRows.innerHTML = "";
      refs.queryEmpty.classList.remove("is-hidden");
      refs.queryMeta.textContent = "0 params";
      refs.queryJsonOutput.value = "";
      return;
    }

    const params = parseQueryString(extracted.query);
    if (!params.length) {
      refs.queryRows.innerHTML = "";
      refs.queryEmpty.classList.remove("is-hidden");
      refs.queryMeta.textContent = `0 params • ${extracted.kind}`;
      refs.queryJsonOutput.value = "";
      return;
    }

    refs.queryRows.innerHTML = params
      .map(
        (row, idx) => `<tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(row.keyDecoded)}</td>
          <td>${escapeHtml(row.valueDecoded)}</td>
          <td>${escapeHtml(row.rawPair)}</td>
        </tr>`
      )
      .join("");
    refs.queryEmpty.classList.add("is-hidden");

    const grouped = groupParams(params);
    refs.queryJsonOutput.value = JSON.stringify(grouped, null, 2);
    refs.queryMeta.textContent = `${params.length} param${params.length === 1 ? "" : "s"} • ${extracted.kind}`;
  }

  function extractQueryString(rawText) {
    const text = rawText.trim();
    if (!text) return null;

    try {
      const url = new URL(text);
      if (!url.search || url.search.length <= 1) return { kind: "full URL (empty query)", query: "" };
      return { kind: "full URL", query: url.search.slice(1) };
    } catch {
      // continue
    }

    const qIndex = text.indexOf("?");
    if (qIndex >= 0) {
      const hashIndex = text.indexOf("#", qIndex);
      const query = text.slice(qIndex + 1, hashIndex >= 0 ? hashIndex : undefined);
      return { kind: "URL-like string", query };
    }

    const normalized = text.startsWith("?") ? text.slice(1) : text;
    if (normalized.includes("=") || normalized.includes("&")) {
      return { kind: "raw query", query: normalized };
    }

    return null;
  }

  function parseQueryString(query) {
    if (!query) return [];
    const pairs = query.split("&").filter((pair) => pair.length > 0);

    return pairs.map((rawPair) => {
      const eqIndex = rawPair.indexOf("=");
      const rawKey = eqIndex >= 0 ? rawPair.slice(0, eqIndex) : rawPair;
      const rawValue = eqIndex >= 0 ? rawPair.slice(eqIndex + 1) : "";
      return {
        rawPair,
        rawKey,
        rawValue,
        keyDecoded: safeFormDecode(rawKey),
        valueDecoded: safeFormDecode(rawValue)
      };
    });
  }

  function safeFormDecode(value) {
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      return `[decode-error] ${value}`;
    }
  }

  function groupParams(params) {
    const out = {};
    for (const row of params) {
      if (Object.prototype.hasOwnProperty.call(out, row.keyDecoded)) {
        const existing = out[row.keyDecoded];
        if (Array.isArray(existing)) {
          existing.push(row.valueDecoded);
        } else {
          out[row.keyDecoded] = [existing, row.valueDecoded];
        }
      } else {
        out[row.keyDecoded] = row.valueDecoded;
      }
    }
    return out;
  }

  function updateModeSummary() {
    const mode = refs.modeSelect.value;
    const options = [];
    if (refs.liveRunToggle.checked) options.push("live");
    if (refs.trimInputToggle.checked) options.push("trim");
    if (refs.multilineToggle.checked) options.push("line-by-line");
    refs.modeSummary.textContent = `mode: ${mode}${options.length ? ` • ${options.join(", ")}` : ""}`;
  }

  function swapEditors() {
    const input = refs.inputEditor.value;
    refs.inputEditor.value = refs.outputEditor.value;
    refs.outputEditor.value = input;
    updateStats();
    persistState();
    inspectCurrentText();
    setStatus("idle", "Swapped input and output.");
  }

  function useOutputAsInput() {
    if (!refs.outputEditor.value) {
      setStatus("warn", "Output is empty.");
      return;
    }
    refs.inputEditor.value = refs.outputEditor.value;
    persistState();
    updateStats();
    if (refs.liveRunToggle.checked) {
      runTransform();
    } else {
      inspectCurrentText();
      setStatus("idle", "Output copied into input.");
    }
  }

  async function copyOutput() {
    const text = refs.outputEditor.value;
    if (!text) {
      setStatus("warn", "Output is empty.");
      return;
    }
    try {
      await copyText(text);
      flashButton(refs.copyOutputBtn);
      setStatus("ok", "Output copied.");
    } catch {
      setStatus("error", "Copy failed.");
    }
  }

  async function copyQueryJson() {
    const text = refs.queryJsonOutput.value;
    if (!text) {
      setStatus("warn", "Query JSON is empty.");
      return;
    }
    try {
      await copyText(text);
      flashButton(refs.copyQueryJsonBtn);
      setStatus("ok", "Query JSON copied.");
    } catch {
      setStatus("error", "Copy failed.");
    }
  }

  async function pasteIntoInput() {
    try {
      if (!navigator.clipboard?.readText) {
        setStatus("warn", "Clipboard API not available. Paste manually.");
        refs.inputEditor.focus();
        return;
      }
      refs.inputEditor.value = await navigator.clipboard.readText();
      updateStats();
      onConfigChanged();
      refs.inputEditor.focus();
    } catch {
      setStatus("warn", "Clipboard read blocked. Use Ctrl/Cmd+V.");
      refs.inputEditor.focus();
    }
  }

  function downloadOutput() {
    const text = refs.outputEditor.value;
    if (!text) {
      setStatus("warn", "Output is empty.");
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "url-transform.txt";
    a.click();
    URL.revokeObjectURL(url);
    flashButton(refs.downloadBtn);
    setStatus("ok", "Downloaded output.");
  }

  function clearEditors() {
    refs.inputEditor.value = "";
    refs.outputEditor.value = "";
    refs.queryJsonOutput.value = "";
    updateStats();
    persistState();
    resetInspector();
    setStatus("idle", "Cleared input and output.");
  }

  function loadSample(text) {
    refs.inputEditor.value = text;
    updateStats();
    onConfigChanged();
    refs.inputEditor.focus();
    refs.inputEditor.select();
  }

  function resetInspector() {
    refs.breakdownMeta.textContent = "none";
    refs.urlBreakdownList.innerHTML = '<p class="empty-pane">Paste a full URL to see protocol/host/path/search/hash.</p>';
    refs.queryRows.innerHTML = "";
    refs.queryEmpty.classList.remove("is-hidden");
    refs.queryMeta.textContent = "0 params";
    refs.queryJsonOutput.value = "";
    refs.errorPreview.textContent = "No error.";
    updateModeSummary();
  }

  function setStatus(kind, message) {
    refs.statusBadge.className = `status-badge ${kind}`;
    refs.statusBadge.textContent = kind;
    refs.statusMessage.textContent = message;
  }

  function updateStats() {
    refs.inputStats.textContent = buildStats(refs.inputEditor.value);
    refs.outputStats.textContent = buildStats(refs.outputEditor.value);
  }

  function buildStats(text) {
    const chars = text.length;
    const lines = chars ? text.split(/\r?\n/).length : 1;
    const bytes = new TextEncoder().encode(text).length;
    return `chars: ${chars} • bytes: ${bytes} • lines: ${lines}`;
  }

  function persistState() {
    const payload = {
      mode: refs.modeSelect.value,
      liveRun: refs.liveRunToggle.checked,
      trimInput: refs.trimInputToggle.checked,
      multiline: refs.multilineToggle.checked,
      inspectSource: refs.inspectSourceSelect.value,
      input: refs.inputEditor.value
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
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.mode === "string") refs.modeSelect.value = parsed.mode;
      refs.liveRunToggle.checked = parsed.liveRun !== false;
      refs.trimInputToggle.checked = Boolean(parsed.trimInput);
      refs.multilineToggle.checked = Boolean(parsed.multiline);
      if (typeof parsed.inspectSource === "string") refs.inspectSourceSelect.value = parsed.inspectSource;
      if (typeof parsed.input === "string") refs.inputEditor.value = parsed.input;
    } catch {
      // ignore restore failure
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
