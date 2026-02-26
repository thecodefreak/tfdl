(() => {
  const SAMPLE_TEXT = [
    "Word Counter is useful when drafting blog posts, commit messages, documentation, or client notes.",
    "Paste text into the editor and the tool will estimate reading and speaking time, count paragraphs and sentences, and list your most frequent words.",
    "Everything runs locally in the browser so nothing is uploaded."
  ].join("\n\n");

  const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by", "can", "could", "did",
    "do", "does", "for", "from", "had", "has", "have", "he", "her", "here", "hers", "him", "his",
    "how", "i", "if", "in", "into", "is", "it", "its", "just", "me", "more", "most", "my", "no",
    "not", "of", "on", "or", "our", "ours", "out", "she", "so", "some", "than", "that", "the",
    "their", "theirs", "them", "then", "there", "these", "they", "this", "those", "to", "too",
    "up", "us", "very", "was", "we", "were", "what", "when", "where", "which", "who", "why",
    "will", "with", "you", "your", "yours"
  ]);

  const wordSegmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

  const sentenceSegmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "sentence" })
    : null;

  const graphemeSegmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  const refs = {
    panel: document.querySelector(".wc-panel"),
    inputText: document.querySelector("#inputText"),
    analyzeBtn: document.querySelector("#analyzeBtn"),
    copySummaryBtn: document.querySelector("#copySummaryBtn"),
    loadSampleBtn: document.querySelector("#loadSampleBtn"),
    clearBtn: document.querySelector("#clearBtn"),
    pasteBtn: document.querySelector("#pasteBtn"),
    selectAllBtn: document.querySelector("#selectAllBtn"),
    liveAnalyzeToggle: document.querySelector("#liveAnalyzeToggle"),
    includeNumbersToggle: document.querySelector("#includeNumbersToggle"),
    ignoreCommonWordsToggle: document.querySelector("#ignoreCommonWordsToggle"),
    minTopWordLengthInput: document.querySelector("#minTopWordLengthInput"),
    readingWpmInput: document.querySelector("#readingWpmInput"),
    speakingWpmInput: document.querySelector("#speakingWpmInput"),
    editorStatus: document.querySelector("#editorStatus"),
    selectionHint: document.querySelector("#selectionHint"),
    liveStateHint: document.querySelector("#liveStateHint"),
    statusBadge: document.querySelector("#statusBadge"),
    statusMessage: document.querySelector("#statusMessage"),
    topWordsMeta: document.querySelector("#topWordsMeta"),
    topWordsList: document.querySelector("#topWordsList"),
    topWordsEmpty: document.querySelector("#topWordsEmpty"),
    selectionBadge: document.querySelector("#selectionBadge"),
    selectionStats: document.querySelector("#selectionStats"),
    detailStats: document.querySelector("#detailStats"),
    warningList: document.querySelector("#warningList"),
    metricWords: document.querySelector("#metricWords"),
    metricUniqueWords: document.querySelector("#metricUniqueWords"),
    metricCharacters: document.querySelector("#metricCharacters"),
    metricNoSpaces: document.querySelector("#metricNoSpaces"),
    metricLines: document.querySelector("#metricLines"),
    metricParagraphs: document.querySelector("#metricParagraphs"),
    metricSentences: document.querySelector("#metricSentences"),
    metricAvgWordLength: document.querySelector("#metricAvgWordLength"),
    metricReadTime: document.querySelector("#metricReadTime"),
    metricSpeakTime: document.querySelector("#metricSpeakTime")
  };

  if (!(refs.panel instanceof HTMLElement) || !(refs.inputText instanceof HTMLTextAreaElement)) {
    return;
  }

  const state = {
    debounceId: 0,
    lastMetrics: null
  };

  bindEvents();
  clampNumericInput(refs.minTopWordLengthInput, 1, 12, 3);
  clampNumericInput(refs.readingWpmInput, 80, 600, 225);
  clampNumericInput(refs.speakingWpmInput, 60, 300, 130);
  renderSelectionStats(null);
  renderDetailStats(null);
  analyzeAndRender("init");

  function bindEvents() {
    refs.analyzeBtn?.addEventListener("click", () => analyzeAndRender("manual"));
    refs.copySummaryBtn?.addEventListener("click", (event) => copySummary(event.currentTarget));
    refs.loadSampleBtn?.addEventListener("click", () => loadSampleText());
    refs.clearBtn?.addEventListener("click", () => clearText());
    refs.pasteBtn?.addEventListener("click", (event) => pasteClipboard(event.currentTarget));
    refs.selectAllBtn?.addEventListener("click", () => selectAllText());

    refs.panel.addEventListener("input", onPanelInput);
    refs.panel.addEventListener("change", onPanelInput);

    refs.inputText.addEventListener("select", () => renderSelectionFromTextarea());
    refs.inputText.addEventListener("keyup", () => renderSelectionFromTextarea());
    refs.inputText.addEventListener("mouseup", () => renderSelectionFromTextarea());

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        analyzeAndRender("hotkey");
      }
    });
  }

  function onPanelInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target === refs.minTopWordLengthInput) {
      clampNumericInput(refs.minTopWordLengthInput, 1, 12, 3);
    }
    if (target === refs.readingWpmInput) {
      clampNumericInput(refs.readingWpmInput, 80, 600, 225);
    }
    if (target === refs.speakingWpmInput) {
      clampNumericInput(refs.speakingWpmInput, 60, 300, 130);
    }

    updateLiveStateHint();

    if (refs.liveAnalyzeToggle?.checked) {
      scheduleAnalyze();
    }
  }

  function scheduleAnalyze() {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
    }
    state.debounceId = window.setTimeout(() => {
      state.debounceId = 0;
      analyzeAndRender("live");
    }, 120);
  }

  function analyzeAndRender(source) {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
      state.debounceId = 0;
    }

    const text = refs.inputText.value || "";
    const options = readOptions();
    const metrics = analyzeText(text, options);
    state.lastMetrics = metrics;

    renderMetrics(metrics);
    renderTopWords(metrics.topWords, metrics.filteredWordCountForTopList);
    renderDetailStats(metrics);
    renderSelectionFromTextarea(metrics);
    renderEditorStatus(metrics, source);
    renderWarnings(metrics.warnings);
    setStatus(metrics.statusKind, metrics.statusMessage);
  }

  function readOptions() {
    return {
      includeNumbersAsWords: Boolean(refs.includeNumbersToggle?.checked),
      ignoreCommonWords: Boolean(refs.ignoreCommonWordsToggle?.checked),
      minTopWordLength: clamp(readInt(refs.minTopWordLengthInput, 3), 1, 12),
      readingWpm: clamp(readInt(refs.readingWpmInput, 225), 80, 600),
      speakingWpm: clamp(readInt(refs.speakingWpmInput, 130), 60, 300)
    };
  }

  function analyzeText(text, options) {
    const normalizedLineText = String(text || "").replace(/\r\n?/g, "\n");
    const hasVisibleText = /\S/.test(normalizedLineText);
    const characterCount = countGraphemes(normalizedLineText);
    const charactersNoSpaces = countGraphemesIgnoringWhitespace(normalizedLineText);

    const lineList = normalizedLineText.length ? normalizedLineText.split("\n") : [];
    const lineCount = normalizedLineText.length ? lineList.length : 0;
    const nonEmptyLineCount = lineList.filter((line) => /\S/.test(line)).length;
    const paragraphCount = hasVisibleText
      ? normalizedLineText.trim().split(/\n\s*\n+/).filter((part) => /\S/.test(part)).length
      : 0;
    const sentenceCount = countSentences(normalizedLineText);

    const rawTokens = extractWordTokens(normalizedLineText);
    const countedTokens = options.includeNumbersAsWords ? rawTokens : rawTokens.filter((token) => !token.isNumberLike);
    const wordCount = countedTokens.length;
    const uniqueWordCount = new Set(countedTokens.map((token) => token.norm)).size;

    const wordLengths = countedTokens.map((token) => token.length);
    const avgWordLength = wordLengths.length
      ? wordLengths.reduce((sum, len) => sum + len, 0) / wordLengths.length
      : 0;
    const longestWordToken = countedTokens.reduce((longest, token) => {
      if (!longest || token.length > longest.length) return token;
      if (token.length === longest.length && token.norm < longest.norm) return token;
      return longest;
    }, null);

    let letters = 0;
    let digits = 0;
    let spaces = 0;
    let punctuationAndSymbols = 0;
    for (const ch of normalizedLineText) {
      if (/\p{L}/u.test(ch)) {
        letters += 1;
      } else if (/\p{N}/u.test(ch)) {
        digits += 1;
      } else if (/\s/u.test(ch)) {
        spaces += 1;
      } else {
        punctuationAndSymbols += 1;
      }
    }

    const longestLine = lineList.reduce((max, line) => Math.max(max, countGraphemes(line)), 0);
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const averageWordsPerParagraph = paragraphCount > 0 ? wordCount / paragraphCount : 0;

    const readSeconds = wordCount > 0 ? (wordCount / options.readingWpm) * 60 : 0;
    const speakSeconds = wordCount > 0 ? (wordCount / options.speakingWpm) * 60 : 0;

    const topWordsModel = buildTopWords(countedTokens, {
      ignoreCommonWords: options.ignoreCommonWords,
      minLength: options.minTopWordLength
    });

    const warnings = [];
    if (!hasVisibleText) {
      warnings.push("Add text to analyze counts and timing.");
    }
    if (wordCount > 0 && sentenceCount === 0) {
      warnings.push("No sentence punctuation detected. Sentence count may be lower than expected.");
    }
    if (rawTokens.length > 0 && !options.includeNumbersAsWords && countedTokens.length < rawTokens.length) {
      warnings.push("Numeric tokens are excluded from word count.");
    }
    if (wordCount > 0 && wordCount < 50) {
      warnings.push("Short samples can make reading-time and frequency results noisy.");
    }

    const statusKind = hasVisibleText ? (warnings.length ? "warn" : "ok") : "idle";
    const statusMessage = !hasVisibleText
      ? "Ready. Paste or type text to analyze."
      : `Analyzed ${formatNumber(wordCount)} word${wordCount === 1 ? "" : "s"} across ${formatNumber(paragraphCount)} paragraph${paragraphCount === 1 ? "" : "s"}.`;

    return {
      text: normalizedLineText,
      hasVisibleText,
      options,
      words: wordCount,
      uniqueWords: uniqueWordCount,
      characters: characterCount,
      charactersNoSpaces,
      lines: lineCount,
      nonEmptyLines: nonEmptyLineCount,
      paragraphs: paragraphCount,
      sentences: sentenceCount,
      avgWordLength,
      readSeconds,
      speakSeconds,
      letters,
      digits,
      spaces,
      punctuationAndSymbols,
      longestWord: longestWordToken ? longestWordToken.raw : "",
      longestWordLength: longestWordToken ? longestWordToken.length : 0,
      longestLine,
      averageWordsPerSentence,
      averageWordsPerParagraph,
      topWords: topWordsModel.items,
      filteredWordCountForTopList: topWordsModel.total,
      warnings,
      statusKind,
      statusMessage
    };
  }

  function extractWordTokens(text) {
    const tokens = [];

    if (wordSegmenter) {
      for (const segment of wordSegmenter.segment(text)) {
        if (!segment.isWordLike) continue;
        const normalized = normalizeWordToken(segment.segment);
        if (!normalized) continue;
        tokens.push({
          raw: segment.segment.trim(),
          norm: normalized,
          length: countGraphemes(normalized),
          isNumberLike: isNumberToken(normalized)
        });
      }
      return tokens;
    }

    const fallbackPattern = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
    for (const match of text.matchAll(fallbackPattern)) {
      const raw = match[0];
      const normalized = normalizeWordToken(raw);
      if (!normalized) continue;
      tokens.push({
        raw,
        norm: normalized,
        length: countGraphemes(normalized),
        isNumberLike: isNumberToken(normalized)
      });
    }

    return tokens;
  }

  function normalizeWordToken(token) {
    const cleaned = String(token || "")
      .trim()
      .replace(/^[^\p{L}\p{N}]+/gu, "")
      .replace(/[^\p{L}\p{N}]+$/gu, "")
      .replace(/[’]/g, "'")
      .toLowerCase();
    return cleaned;
  }

  function isNumberToken(token) {
    return /^\p{N}+(?:[.,:/-]\p{N}+)*$/u.test(token);
  }

  function countSentences(text) {
    if (!/\S/.test(text)) return 0;

    if (sentenceSegmenter) {
      let count = 0;
      for (const segment of sentenceSegmenter.segment(text)) {
        if (/\S/.test(segment.segment)) count += 1;
      }
      if (count > 0) return count;
    }

    const matches = text.trim().match(/[^.!?]+(?:[.!?]+|$)/g);
    if (!matches) return 0;
    return matches.filter((chunk) => /\S/.test(chunk)).length;
  }

  function countGraphemes(text) {
    const value = String(text || "");
    if (!value) return 0;
    if (graphemeSegmenter) {
      let count = 0;
      for (const _segment of graphemeSegmenter.segment(value)) {
        count += 1;
      }
      return count;
    }
    return Array.from(value).length;
  }

  function countGraphemesIgnoringWhitespace(text) {
    let count = 0;
    for (const grapheme of iterateGraphemes(String(text || ""))) {
      if (!/\s/u.test(grapheme)) {
        count += 1;
      }
    }
    return count;
  }

  function *iterateGraphemes(text) {
    if (!text) return;
    if (graphemeSegmenter) {
      for (const segment of graphemeSegmenter.segment(text)) {
        yield segment.segment;
      }
      return;
    }
    yield *Array.from(text);
  }

  function buildTopWords(tokens, config) {
    const counts = new Map();
    let filteredTotal = 0;

    for (const token of tokens) {
      if (token.length < config.minLength) continue;
      if (config.ignoreCommonWords && STOP_WORDS.has(token.norm)) continue;
      filteredTotal += 1;
      counts.set(token.norm, (counts.get(token.norm) || 0) + 1);
    }

    const items = Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 12)
      .map(([word, count]) => ({
        word,
        count,
        share: filteredTotal > 0 ? count / filteredTotal : 0
      }));

    return { items, total: filteredTotal };
  }

  function renderMetrics(metrics) {
    setText(refs.metricWords, formatNumber(metrics.words));
    setText(refs.metricUniqueWords, formatNumber(metrics.uniqueWords));
    setText(refs.metricCharacters, formatNumber(metrics.characters));
    setText(refs.metricNoSpaces, formatNumber(metrics.charactersNoSpaces));
    setText(refs.metricLines, formatNumber(metrics.lines));
    setText(refs.metricParagraphs, formatNumber(metrics.paragraphs));
    setText(refs.metricSentences, formatNumber(metrics.sentences));
    setText(refs.metricAvgWordLength, metrics.words ? formatDecimal(metrics.avgWordLength, 1) : "0");
    setText(refs.metricReadTime, formatDuration(metrics.readSeconds));
    setText(refs.metricSpeakTime, formatDuration(metrics.speakSeconds));
  }

  function renderTopWords(items, filteredTotal) {
    setText(refs.topWordsMeta, `${items.length} item${items.length === 1 ? "" : "s"}`);

    if (!Array.isArray(items) || !items.length) {
      if (refs.topWordsList) refs.topWordsList.innerHTML = "";
      refs.topWordsEmpty?.classList.remove("is-hidden");
      if (refs.topWordsEmpty) {
        refs.topWordsEmpty.textContent = filteredTotal > 0
          ? "No repeated words yet with the current filters."
          : "Add more text to populate the frequency list.";
      }
      return;
    }

    refs.topWordsEmpty?.classList.add("is-hidden");
    refs.topWordsList.innerHTML = items.map((item) => {
      const pct = Math.max(8, Math.round(item.share * 100));
      return `
        <li class="wc-top-word-row">
          <div class="wc-top-word-main">
            <div class="wc-top-word-label">${escapeHtml(item.word)}</div>
            <div class="wc-top-word-meta">
              <div class="wc-top-word-bar" aria-hidden="true">
                <div class="wc-top-word-bar-fill" style="width:${pct}%"></div>
              </div>
              <span class="wc-top-word-count">${formatPercent(item.share)}</span>
            </div>
          </div>
          <span class="code-chip mono">${formatNumber(item.count)}</span>
        </li>`;
    }).join("");
  }

  function renderDetailStats(metrics) {
    if (!metrics) {
      if (refs.detailStats) refs.detailStats.innerHTML = "";
      return;
    }

    const detailRows = [
      ["Letters", formatNumber(metrics.letters)],
      ["Digits", formatNumber(metrics.digits)],
      ["Spaces", formatNumber(metrics.spaces)],
      ["Punct/symbols", formatNumber(metrics.punctuationAndSymbols)],
      ["Non-empty lines", formatNumber(metrics.nonEmptyLines)],
      ["Longest line", `${formatNumber(metrics.longestLine)} chars`],
      ["Longest word", metrics.longestWord ? `${metrics.longestWord} (${metrics.longestWordLength})` : "n/a"],
      ["Words/sentence", metrics.sentences ? formatDecimal(metrics.averageWordsPerSentence, 1) : "n/a"],
      ["Words/paragraph", metrics.paragraphs ? formatDecimal(metrics.averageWordsPerParagraph, 1) : "n/a"]
    ];

    refs.detailStats.innerHTML = detailRows.map(([key, value]) => kvRowMarkup(key, value)).join("");
  }

  function renderSelectionFromTextarea(baseMetrics) {
    const textarea = refs.inputText;
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = end > start ? textarea.value.slice(start, end) : "";
    const selectedChars = countGraphemes(selectedText);

    setText(refs.selectionBadge, `selection: ${formatNumber(selectedChars)} chars`);
    if (!selectedText) {
      setText(refs.selectionHint, "No selection");
      renderSelectionStats(null);
      return;
    }

    const metrics = analyzeText(selectedText, (baseMetrics && baseMetrics.options) || readOptions());
    setText(
      refs.selectionHint,
      `Selection ${formatNumber(start)}-${formatNumber(end)} (${formatNumber(metrics.words)} words, ${formatNumber(metrics.characters)} chars)`
    );
    renderSelectionStats(metrics);
  }

  function renderSelectionStats(metrics) {
    if (!refs.selectionStats) return;

    const rows = !metrics ? [
      ["Words", "0"],
      ["Characters", "0"],
      ["No spaces", "0"],
      ["Lines", "0"],
      ["Sentences", "0"]
    ] : [
      ["Words", formatNumber(metrics.words)],
      ["Characters", formatNumber(metrics.characters)],
      ["No spaces", formatNumber(metrics.charactersNoSpaces)],
      ["Lines", formatNumber(metrics.lines)],
      ["Sentences", formatNumber(metrics.sentences)]
    ];

    refs.selectionStats.innerHTML = rows.map(([key, value]) => kvRowMarkup(key, value)).join("");
  }

  function renderWarnings(warnings) {
    if (!refs.warningList) return;
    if (!Array.isArray(warnings) || warnings.length === 0) {
      refs.warningList.innerHTML = "";
      refs.warningList.classList.add("is-hidden");
      return;
    }
    refs.warningList.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    refs.warningList.classList.remove("is-hidden");
  }

  function renderEditorStatus(metrics, source) {
    if (!refs.editorStatus) return;
    const sourceLabel = source === "live" ? "live" : source === "manual" ? "manual" : source;

    if (!metrics.hasVisibleText) {
      refs.editorStatus.textContent = "Ready. Paste or type text to analyze.";
      return;
    }

    refs.editorStatus.textContent =
      `${formatNumber(metrics.characters)} chars | ${formatNumber(metrics.words)} words | ${formatNumber(metrics.sentences)} sentences | ${sourceLabel}`;
  }

  function setStatus(kind, message) {
    const normalized = ["ok", "warn", "idle"].includes(kind) ? kind : "idle";
    if (refs.statusBadge) {
      refs.statusBadge.className = `wc-status-badge ${normalized}`;
      refs.statusBadge.textContent = normalized;
    }
    if (refs.statusMessage) {
      refs.statusMessage.textContent = message || "";
    }
  }

  function updateLiveStateHint() {
    setText(refs.liveStateHint, refs.liveAnalyzeToggle?.checked ? "Live analysis on" : "Live analysis off");
  }

  function loadSampleText() {
    refs.inputText.value = SAMPLE_TEXT;
    refs.inputText.focus({ preventScroll: true });
    refs.inputText.setSelectionRange(0, refs.inputText.value.length);
    analyzeAndRender("sample");
  }

  function clearText() {
    refs.inputText.value = "";
    refs.inputText.focus({ preventScroll: true });
    analyzeAndRender("clear");
  }

  async function pasteClipboard(button) {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
      setStatus("warn", "Clipboard paste is not available in this browser.");
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      refs.inputText.value = text || "";
      refs.inputText.focus({ preventScroll: true });
      flashButton(button, "Pasted");
      analyzeAndRender("paste");
    } catch {
      setStatus("warn", "Clipboard paste was blocked. Use keyboard paste instead.");
    }
  }

  function selectAllText() {
    refs.inputText.focus({ preventScroll: true });
    refs.inputText.select();
    refs.inputText.setSelectionRange(0, refs.inputText.value.length);
    renderSelectionFromTextarea();
  }

  function copySummary(button) {
    if (!state.lastMetrics) {
      setStatus("warn", "Nothing to copy yet.");
      return;
    }

    const m = state.lastMetrics;
    const summary = [
      "Word Counter Summary",
      `Words: ${formatNumber(m.words)}`,
      `Unique words: ${formatNumber(m.uniqueWords)}`,
      `Characters: ${formatNumber(m.characters)}`,
      `Characters (no spaces): ${formatNumber(m.charactersNoSpaces)}`,
      `Sentences: ${formatNumber(m.sentences)}`,
      `Paragraphs: ${formatNumber(m.paragraphs)}`,
      `Lines: ${formatNumber(m.lines)}`,
      `Read time (${m.options.readingWpm} WPM): ${formatDuration(m.readSeconds)}`,
      `Speak time (${m.options.speakingWpm} WPM): ${formatDuration(m.speakSeconds)}`,
      `Top words: ${m.topWords.slice(0, 5).map((item) => `${item.word} (${item.count})`).join(", ") || "n/a"}`
    ].join("\n");

    copyText(summary).then((ok) => {
      if (ok) {
        flashButton(button, "Copied");
        setStatus("ok", "Copied summary metrics.");
      } else {
        setStatus("warn", "Copy failed in this browser.");
      }
    });
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    try {
      return Boolean(document.execCommand("copy"));
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function flashButton(button, label) {
    if (!(button instanceof HTMLButtonElement)) return;
    const original = button.textContent || "";
    button.textContent = label;
    button.classList.add("copy-ok");
    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copy-ok");
    }, 700);
  }

  function clampNumericInput(input, min, max, fallback) {
    if (!(input instanceof HTMLInputElement)) return;
    input.value = String(clamp(readInt(input, fallback), min, max));
  }

  function readInt(input, fallback) {
    if (!(input instanceof HTMLInputElement)) return fallback;
    const value = Number.parseInt(input.value, 10);
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
    const rounded = Math.max(1, Math.round(seconds));
    if (rounded < 60) return `${rounded}s`;

    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (hours === 0 && secs > 0) parts.push(`${secs}s`);
    return parts.join(" ");
  }

  function formatNumber(value) {
    return Number.isFinite(value) ? value.toLocaleString() : "0";
  }

  function formatDecimal(value, digits) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Number(value.toFixed(digits));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
  }

  function formatPercent(value) {
    if (!Number.isFinite(value) || value <= 0) return "0%";
    const pct = value * 100;
    return pct >= 10 ? `${pct.toFixed(1).replace(/\.0$/, "")}%` : `${pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
  }

  function kvRowMarkup(key, value) {
    return `<div class="wc-kv-item"><div class="wc-kv-key">${escapeHtml(key)}</div><div class="wc-kv-value">${escapeHtml(String(value))}</div></div>`;
  }

  function setText(node, value) {
    if (node) node.textContent = String(value);
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
