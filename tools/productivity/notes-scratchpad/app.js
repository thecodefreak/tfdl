(() => {
  const STORAGE_KEY = "tool-notes-scratchpad-state-v1";
  const AUTOSAVE_DELAY_MS = 500;
  const MAX_SEARCH_BODY_CHARS = 12000;

  const refs = {
    notesList: document.getElementById("notesList"),
    notesEmptyState: document.getElementById("notesEmptyState"),
    noteCountLabel: document.getElementById("noteCountLabel"),
    noteSearchInput: document.getElementById("noteSearchInput"),
    pinnedOnlyToggle: document.getElementById("pinnedOnlyToggle"),
    sortSelect: document.getElementById("sortSelect"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    templateButtons: Array.from(document.querySelectorAll(".template-btn")),

    newNoteBtn: document.getElementById("newNoteBtn"),
    duplicateNoteBtn: document.getElementById("duplicateNoteBtn"),
    deleteNoteBtn: document.getElementById("deleteNoteBtn"),
    copyNoteBtn: document.getElementById("copyNoteBtn"),
    exportCurrentBtn: document.getElementById("exportCurrentBtn"),
    exportAllBtn: document.getElementById("exportAllBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),

    saveNowBtn: document.getElementById("saveNowBtn"),
    pinNoteBtn: document.getElementById("pinNoteBtn"),
    noteTitleInput: document.getElementById("noteTitleInput"),
    noteTagsInput: document.getElementById("noteTagsInput"),
    noteBodyInput: document.getElementById("noteBodyInput"),
    markdownPreviewToggle: document.getElementById("markdownPreviewToggle"),

    previewPane: document.getElementById("previewPane"),
    activeNoteUpdatedAt: document.getElementById("activeNoteUpdatedAt"),

    wordsStat: document.getElementById("wordsStat"),
    charsStat: document.getElementById("charsStat"),
    linesStat: document.getElementById("linesStat"),
    readTimeStat: document.getElementById("readTimeStat"),
    checklistStat: document.getElementById("checklistStat"),
    bytesStat: document.getElementById("bytesStat"),

    saveStateLabel: document.getElementById("saveStateLabel"),
    storageStateChip: document.getElementById("storageStateChip"),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage")
  };

  const state = {
    notes: [],
    activeNoteId: null,
    ui: {
      search: "",
      pinnedOnly: false,
      sort: "updated_desc",
      markdownPreview: true
    },
    autosaveTimer: 0,
    dirty: false,
    isLoadingEditor: false,
    lastSavedAt: 0,
    storageAvailable: true
  };

  initialize();

  function initialize() {
    restoreState();
    ensureActiveNote();
    syncControlsFromState();
    bindEvents();
    renderAll();
    setStatus("idle", "Ready.");
    setSaveLabelSaved();
    updateStorageChip();
  }

  function bindEvents() {
    refs.newNoteBtn.addEventListener("click", () => createNoteFromTemplate("blank"));
    refs.duplicateNoteBtn.addEventListener("click", duplicateActiveNote);
    refs.deleteNoteBtn.addEventListener("click", deleteActiveNote);
    refs.copyNoteBtn.addEventListener("click", copyActiveNoteText);
    refs.exportCurrentBtn.addEventListener("click", exportCurrentNote);
    refs.exportAllBtn.addEventListener("click", exportAllNotes);
    refs.importBtn.addEventListener("click", () => refs.importFileInput.click());
    refs.importFileInput.addEventListener("change", handleImportFilePicked);

    refs.saveNowBtn.addEventListener("click", () => flushAutosave({ reason: "Saved locally.", flashButtonEl: refs.saveNowBtn }));
    refs.pinNoteBtn.addEventListener("click", togglePinActiveNote);

    refs.noteSearchInput.addEventListener("input", () => {
      state.ui.search = refs.noteSearchInput.value;
      persistUiStateSoon();
      renderNotesList();
    });

    refs.clearSearchBtn.addEventListener("click", () => {
      if (!state.ui.search) return;
      state.ui.search = "";
      refs.noteSearchInput.value = "";
      persistUiStateSoon();
      renderNotesList();
      refs.noteSearchInput.focus();
      setStatus("idle", "Search cleared.");
    });

    refs.pinnedOnlyToggle.addEventListener("change", () => {
      state.ui.pinnedOnly = refs.pinnedOnlyToggle.checked;
      persistUiStateSoon();
      renderNotesList();
    });

    refs.sortSelect.addEventListener("change", () => {
      state.ui.sort = normalizeSortMode(refs.sortSelect.value);
      refs.sortSelect.value = state.ui.sort;
      persistUiStateSoon();
      renderNotesList();
    });

    refs.templateButtons.forEach((button) => {
      button.addEventListener("click", () => createNoteFromTemplate(button.dataset.template || "blank"));
    });

    refs.notesList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-note-id]");
      if (!button) return;
      selectNote(button.dataset.noteId);
    });

    refs.noteTitleInput.addEventListener("input", () => {
      if (state.isLoadingEditor) return;
      updateActiveNoteFromEditor({ title: refs.noteTitleInput.value });
    });

    refs.noteTagsInput.addEventListener("input", () => {
      if (state.isLoadingEditor) return;
      updateActiveNoteFromEditor({ tags: parseTagInput(refs.noteTagsInput.value) });
    });

    refs.noteBodyInput.addEventListener("input", () => {
      if (state.isLoadingEditor) return;
      updateActiveNoteFromEditor({ body: refs.noteBodyInput.value });
    });

    refs.noteBodyInput.addEventListener("keydown", handleBodyKeydown);

    refs.markdownPreviewToggle.addEventListener("change", () => {
      state.ui.markdownPreview = refs.markdownPreviewToggle.checked;
      persistUiStateSoon();
      renderPreviewAndStats();
      setStatus("idle", `Preview mode: ${state.ui.markdownPreview ? "Markdown-ish" : "Plain text"}.`);
    });

    window.addEventListener("keydown", handleGlobalKeydown);
    window.addEventListener("beforeunload", () => {
      if (state.autosaveTimer) flushAutosave({ silentStatus: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state.autosaveTimer) {
        flushAutosave({ silentStatus: true });
      }
    });
  }

  function handleGlobalKeydown(event) {
    const isModifier = event.metaKey || event.ctrlKey;
    if (!isModifier) return;

    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      flushAutosave({ reason: "Saved locally.", flashButtonEl: refs.saveNowBtn });
      return;
    }

    if (key === "n") {
      event.preventDefault();
      createNoteFromTemplate("blank");
      return;
    }

    if (key === "f") {
      event.preventDefault();
      refs.noteSearchInput.focus();
      refs.noteSearchInput.select();
    }
  }

  function handleBodyKeydown(event) {
    if (event.key !== "Tab") return;
    event.preventDefault();

    const textarea = refs.noteBodyInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const indent = "  ";

    textarea.value = `${value.slice(0, start)}${indent}${value.slice(end)}`;
    textarea.selectionStart = textarea.selectionEnd = start + indent.length;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.notes = [];
        state.activeNoteId = null;
        return;
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizeStoredState(parsed);
      state.notes = normalized.notes;
      state.activeNoteId = normalized.activeNoteId;
      state.ui = normalized.ui;
      state.storageAvailable = true;
    } catch (error) {
      state.notes = [];
      state.activeNoteId = null;
      state.storageAvailable = false;
      setStatus("error", "Failed to load local notes. Starting fresh.");
      console.error(error);
    }
  }

  function normalizeStoredState(value) {
    const notes = [];
    if (value && typeof value === "object" && Array.isArray(value.notes)) {
      for (const candidate of value.notes) {
        const note = normalizeNote(candidate);
        if (note) notes.push(note);
      }
    }

    const uiSource = value && typeof value === "object" && value.ui && typeof value.ui === "object" ? value.ui : {};
    const ui = {
      search: typeof uiSource.search === "string" ? uiSource.search.slice(0, 240) : "",
      pinnedOnly: Boolean(uiSource.pinnedOnly),
      sort: normalizeSortMode(uiSource.sort),
      markdownPreview: uiSource.markdownPreview !== false
    };

    let activeNoteId = typeof value?.activeNoteId === "string" ? value.activeNoteId : null;
    if (activeNoteId && !notes.some((note) => note.id === activeNoteId)) {
      activeNoteId = null;
    }

    return { notes, activeNoteId, ui };
  }

  function normalizeNote(value) {
    if (!value || typeof value !== "object") return null;

    const body = typeof value.body === "string" ? value.body : "";
    const title = typeof value.title === "string" ? value.title : "";
    const tags = normalizeTags(value.tags);
    const id = typeof value.id === "string" && value.id.trim() ? value.id : createId();

    const createdAt = normalizeTimestamp(value.createdAt) || Date.now();
    const updatedAt = normalizeTimestamp(value.updatedAt) || createdAt;

    return {
      id,
      title: title.slice(0, 500),
      body,
      tags,
      pinned: Boolean(value.pinned),
      createdAt,
      updatedAt
    };
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) {
      return dedupeStrings(
        value
          .map((item) => (typeof item === "string" ? item : String(item ?? "")))
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 24)
      );
    }

    if (typeof value === "string") {
      return parseTagInput(value);
    }

    return [];
  }

  function normalizeTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.trunc(value);
    if (typeof value === "string") {
      const ms = Date.parse(value);
      if (Number.isFinite(ms)) return ms;
    }
    return 0;
  }

  function ensureActiveNote() {
    if (!state.notes.length) {
      const note = buildNewNoteFromTemplate("blank");
      state.notes = [note];
      state.activeNoteId = note.id;
      flushAutosave({ reason: "Created first note.", silentStatus: true });
      return;
    }

    if (!state.notes.some((note) => note.id === state.activeNoteId)) {
      state.activeNoteId = state.notes[0].id;
    }
  }

  function syncControlsFromState() {
    refs.noteSearchInput.value = state.ui.search;
    refs.pinnedOnlyToggle.checked = state.ui.pinnedOnly;
    refs.sortSelect.value = state.ui.sort;
    refs.markdownPreviewToggle.checked = state.ui.markdownPreview;
  }

  function renderAll() {
    renderNotesList();
    renderEditorFromActiveNote();
    renderPreviewAndStats();
    renderActionStates();
    updateStorageChip();
  }

  function renderNotesList() {
    const filtered = getFilteredSortedNotes();
    refs.notesList.innerHTML = "";

    for (const note of filtered) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.noteId = note.id;
      button.className = [
        "note-list-item",
        note.id === state.activeNoteId ? "is-active" : "",
        note.pinned ? "is-pinned" : ""
      ]
        .filter(Boolean)
        .join(" ");

      const title = getNoteDisplayTitle(note);
      const preview = getNotePreview(note.body);
      const tags = note.tags.slice(0, 3);
      const stats = computeStats(note.body);

      button.innerHTML = `
        <div class="note-row-top">
          <span class="note-title">${escapeHtml(title)}</span>
          ${note.pinned ? '<span class="note-pin" aria-hidden="true">PIN</span>' : ""}
        </div>
        <div class="note-preview">${escapeHtml(preview)}</div>
        <div class="note-meta">
          <span>${escapeHtml(formatRelativeTime(note.updatedAt))}</span>
          <span>${stats.words}w</span>
          ${tags.map((tag) => `<span class="note-tag-chip">${escapeHtml(tag)}</span>`).join("")}
        </div>
      `;

      li.appendChild(button);
      refs.notesList.appendChild(li);
    }

    const total = state.notes.length;
    const shown = filtered.length;
    refs.noteCountLabel.textContent = shown === total ? String(total) : `${shown}/${total}`;
    refs.notesEmptyState.classList.toggle("is-hidden", shown !== 0);
    refs.clearSearchBtn.disabled = !state.ui.search;
  }

  function renderEditorFromActiveNote() {
    const note = getActiveNote();
    state.isLoadingEditor = true;

    if (!note) {
      refs.noteTitleInput.value = "";
      refs.noteTagsInput.value = "";
      refs.noteBodyInput.value = "";
      refs.activeNoteUpdatedAt.textContent = "updated: --";
      refs.pinNoteBtn.textContent = "Pin";
    } else {
      refs.noteTitleInput.value = note.title;
      refs.noteTagsInput.value = note.tags.join(", ");
      refs.noteBodyInput.value = note.body;
      refs.activeNoteUpdatedAt.textContent = `updated: ${formatTimestamp(note.updatedAt)}`;
      refs.pinNoteBtn.textContent = note.pinned ? "Unpin" : "Pin";
    }

    state.isLoadingEditor = false;
  }

  function renderPreviewAndStats() {
    const note = getActiveNote();
    const body = note?.body || "";
    renderPreview(body);
    renderStats(body);
    if (note) {
      refs.activeNoteUpdatedAt.textContent = `updated: ${formatTimestamp(note.updatedAt)}`;
    } else {
      refs.activeNoteUpdatedAt.textContent = "updated: --";
    }
  }

  function renderPreview(body) {
    if (!body.trim()) {
      refs.previewPane.innerHTML = '<p class="empty-preview">Empty note.</p>';
      return;
    }

    if (!state.ui.markdownPreview) {
      refs.previewPane.innerHTML = "";
      const pre = document.createElement("pre");
      pre.style.margin = "0";
      pre.style.whiteSpace = "pre-wrap";
      pre.style.font = 'inherit';
      pre.textContent = body;
      refs.previewPane.appendChild(pre);
      return;
    }

    refs.previewPane.innerHTML = renderMarkdownish(body);
  }

  function renderStats(body) {
    const stats = computeStats(body);
    refs.wordsStat.textContent = String(stats.words);
    refs.charsStat.textContent = String(stats.chars);
    refs.linesStat.textContent = String(stats.lines);
    refs.readTimeStat.textContent = String(stats.readMinutes);
    refs.checklistStat.textContent = `${stats.checkedChecklist}/${stats.totalChecklist}`;
    refs.bytesStat.textContent = String(stats.bytes);
  }

  function renderActionStates() {
    const hasNote = Boolean(getActiveNote());
    refs.duplicateNoteBtn.disabled = !hasNote;
    refs.deleteNoteBtn.disabled = !hasNote;
    refs.copyNoteBtn.disabled = !hasNote;
    refs.exportCurrentBtn.disabled = !hasNote;
    refs.saveNowBtn.disabled = !hasNote;
    refs.pinNoteBtn.disabled = !hasNote;
  }

  function getFilteredSortedNotes() {
    const query = state.ui.search.trim().toLowerCase();
    const filtered = state.notes.filter((note) => {
      if (state.ui.pinnedOnly && !note.pinned) return false;
      if (!query) return true;

      const haystack = [
        note.title,
        note.tags.join(" "),
        note.body.slice(0, MAX_SEARCH_BODY_CHARS)
      ]
        .join("\n")
        .toLowerCase();

      return haystack.includes(query);
    });

    filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      switch (state.ui.sort) {
        case "updated_asc":
          return compareNumbers(a.updatedAt, b.updatedAt) || compareTitles(a, b);
        case "created_desc":
          return compareNumbers(b.createdAt, a.createdAt) || compareTitles(a, b);
        case "title_asc":
          return compareTitles(a, b) || compareNumbers(b.updatedAt, a.updatedAt);
        case "updated_desc":
        default:
          return compareNumbers(b.updatedAt, a.updatedAt) || compareTitles(a, b);
      }
    });

    return filtered;
  }

  function compareNumbers(a, b) {
    return a - b;
  }

  function compareTitles(a, b) {
    return getNoteDisplayTitle(a).localeCompare(getNoteDisplayTitle(b), undefined, { sensitivity: "base" });
  }

  function getActiveNote() {
    return state.notes.find((note) => note.id === state.activeNoteId) || null;
  }

  function selectNote(noteId) {
    if (!noteId || noteId === state.activeNoteId) return;
    if (!state.notes.some((note) => note.id === noteId)) return;
    state.activeNoteId = noteId;
    persistUiStateSoon();
    renderNotesList();
    renderEditorFromActiveNote();
    renderPreviewAndStats();
    renderActionStates();
    refs.noteTitleInput.focus();
    setStatus("idle", "Switched note.");
  }

  function updateActiveNoteFromEditor(changes) {
    const note = getActiveNote();
    if (!note) return;

    let changed = false;

    if (Object.prototype.hasOwnProperty.call(changes, "title")) {
      const nextTitle = String(changes.title ?? "").slice(0, 500);
      if (note.title !== nextTitle) {
        note.title = nextTitle;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(changes, "tags")) {
      const nextTags = normalizeTags(changes.tags);
      if (!arraysEqual(note.tags, nextTags)) {
        note.tags = nextTags;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(changes, "body")) {
      const nextBody = String(changes.body ?? "");
      if (note.body !== nextBody) {
        note.body = nextBody;
        changed = true;
      }
    }

    if (!changed) return;

    note.updatedAt = Date.now();
    markDirty();
    scheduleAutosave();
    renderNotesList();
    renderPreviewAndStats();
    updateStorageChip();
  }

  function createNoteFromTemplate(templateId) {
    const note = buildNewNoteFromTemplate(templateId);
    state.notes.push(note);
    state.activeNoteId = note.id;
    markDirty();
    scheduleAutosave();
    renderAll();
    refs.noteTitleInput.focus();
    refs.noteTitleInput.select();
    setStatus("ok", `Created ${templateLabel(templateId)} note.`);
    flashButton(refs.newNoteBtn);
  }

  function buildNewNoteFromTemplate(templateId) {
    const now = Date.now();
    const template = getTemplate(templateId);
    return {
      id: createId(),
      title: template.title,
      body: template.body,
      tags: [...template.tags],
      pinned: false,
      createdAt: now,
      updatedAt: now
    };
  }

  function duplicateActiveNote() {
    const note = getActiveNote();
    if (!note) return;
    const now = Date.now();
    const copy = {
      ...note,
      id: createId(),
      title: note.title ? `${note.title} (copy)` : "Untitled note (copy)",
      tags: [...note.tags],
      createdAt: now,
      updatedAt: now
    };
    state.notes.push(copy);
    state.activeNoteId = copy.id;
    markDirty();
    scheduleAutosave();
    renderAll();
    refs.noteTitleInput.focus();
    refs.noteTitleInput.select();
    setStatus("ok", "Note duplicated.");
    flashButton(refs.duplicateNoteBtn);
  }

  function deleteActiveNote() {
    const note = getActiveNote();
    if (!note) return;

    const label = getNoteDisplayTitle(note);
    if (!window.confirm(`Delete note \"${label}\"?`)) return;

    state.notes = state.notes.filter((item) => item.id !== note.id);
    if (!state.notes.length) {
      const replacement = buildNewNoteFromTemplate("blank");
      state.notes = [replacement];
      state.activeNoteId = replacement.id;
    } else {
      state.activeNoteId = state.notes[0].id;
    }

    markDirty();
    scheduleAutosave();
    renderAll();
    setStatus("warn", `Deleted \"${label}\".`);
  }

  function togglePinActiveNote() {
    const note = getActiveNote();
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    markDirty();
    scheduleAutosave();
    renderNotesList();
    renderEditorFromActiveNote();
    renderPreviewAndStats();
    setStatus("ok", note.pinned ? "Note pinned." : "Note unpinned.");
    flashButton(refs.pinNoteBtn);
  }

  async function copyActiveNoteText() {
    const note = getActiveNote();
    if (!note) return;

    const text = buildClipboardTextForNote(note);
    try {
      await copyText(text);
      setStatus("ok", "Note copied.");
      flashButton(refs.copyNoteBtn);
    } catch {
      setStatus("error", "Copy failed. Select and copy manually.");
    }
  }

  function exportCurrentNote() {
    const note = getActiveNote();
    if (!note) return;

    const payload = {
      version: 1,
      type: "notes-scratchpad-note",
      exportedAt: new Date().toISOString(),
      note: cloneNote(note)
    };

    downloadJson(
      payload,
      `note-${slugifyFilename(getNoteDisplayTitle(note)) || "untitled"}-${dateStamp()}.json`
    );
    setStatus("ok", "Exported current note.");
    flashButton(refs.exportCurrentBtn);
  }

  function exportAllNotes() {
    const payload = {
      version: 1,
      type: "notes-scratchpad-bundle",
      exportedAt: new Date().toISOString(),
      activeNoteId: state.activeNoteId,
      ui: {
        search: "",
        pinnedOnly: false,
        sort: state.ui.sort,
        markdownPreview: state.ui.markdownPreview
      },
      notes: state.notes.map(cloneNote)
    };

    downloadJson(payload, `notes-scratchpad-${dateStamp()}.json`);
    setStatus("ok", `Exported ${state.notes.length} note${state.notes.length === 1 ? "" : "s"}.`);
    flashButton(refs.exportAllBtn);
  }

  async function handleImportFilePicked(event) {
    const file = event.target.files?.[0];
    refs.importFileInput.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedNotes = extractImportedNotes(parsed);

      if (!importedNotes.length) {
        setStatus("warn", "No valid notes found in import file.");
        return;
      }

      let importedCount = 0;
      let selectedImportedId = null;
      const existingIds = new Set(state.notes.map((note) => note.id));

      for (const note of importedNotes) {
        const normalized = normalizeNote(note);
        if (!normalized) continue;
        if (existingIds.has(normalized.id)) {
          normalized.id = createId();
        }
        existingIds.add(normalized.id);
        state.notes.push(normalized);
        importedCount += 1;
        if (!selectedImportedId) selectedImportedId = normalized.id;
      }

      if (!importedCount) {
        setStatus("warn", "Import file parsed, but no valid notes could be added.");
        return;
      }

      state.activeNoteId = selectedImportedId || state.activeNoteId;
      markDirty();
      flushAutosave({ reason: `Imported ${importedCount} note${importedCount === 1 ? "" : "s"}.` });
      renderAll();
      setStatus("ok", `Imported ${importedCount} note${importedCount === 1 ? "" : "s"}.`);
      flashButton(refs.importBtn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error", `Import failed: ${message}`);
    }
  }

  function extractImportedNotes(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (!parsed || typeof parsed !== "object") return [];
    if (Array.isArray(parsed.notes)) return parsed.notes;
    if (parsed.note && typeof parsed.note === "object") return [parsed.note];
    if ("body" in parsed || "title" in parsed) return [parsed];
    return [];
  }

  function parseTagInput(value) {
    return dedupeStrings(
      String(value ?? "")
        .split(/[\n,]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 24)
    );
  }

  function dedupeStrings(items) {
    const out = [];
    const seen = new Set();
    for (const item of items) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function markDirty() {
    state.dirty = true;
    setSaveLabelPending();
  }

  function scheduleAutosave() {
    if (state.autosaveTimer) {
      window.clearTimeout(state.autosaveTimer);
    }

    state.autosaveTimer = window.setTimeout(() => {
      state.autosaveTimer = 0;
      flushAutosave({ silentStatus: true });
    }, AUTOSAVE_DELAY_MS);
  }

  function persistUiStateSoon() {
    markDirty();
    scheduleAutosave();
    updateStorageChip();
  }

  function flushAutosave(options = {}) {
    const { reason, silentStatus = false, flashButtonEl = null } = options;

    if (state.autosaveTimer) {
      window.clearTimeout(state.autosaveTimer);
      state.autosaveTimer = 0;
    }

    if (!state.dirty && !reason) {
      setSaveLabelSaved();
      return true;
    }

    const payload = {
      version: 1,
      savedAt: Date.now(),
      activeNoteId: state.activeNoteId,
      ui: {
        search: state.ui.search,
        pinnedOnly: state.ui.pinnedOnly,
        sort: state.ui.sort,
        markdownPreview: state.ui.markdownPreview
      },
      notes: state.notes.map(cloneNote)
    };

    try {
      setSaveLabelSaving();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      state.storageAvailable = true;
      state.lastSavedAt = Date.now();
      state.dirty = false;
      setSaveLabelSaved();
      updateStorageChip();
      if (!silentStatus) {
        setStatus("ok", reason || "Saved locally.");
      }
      if (flashButtonEl) flashButton(flashButtonEl);
      return true;
    } catch (error) {
      state.storageAvailable = false;
      updateStorageChip();
      setSaveLabelError();
      setStatus("error", "Local save failed (storage unavailable or full).");
      console.error(error);
      return false;
    }
  }

  function updateStorageChip() {
    const payload = {
      notes: state.notes.map(cloneNote),
      ui: state.ui,
      activeNoteId: state.activeNoteId
    };
    const bytes = estimateBytes(JSON.stringify(payload));
    const kb = (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0);
    const prefix = state.storageAvailable ? "local" : "unavailable";
    refs.storageStateChip.textContent = `storage: ${prefix} • ${state.notes.length} • ${kb} KB`;
  }

  function setSaveLabelPending() {
    refs.saveStateLabel.textContent = "Unsaved changes • autosave pending";
  }

  function setSaveLabelSaving() {
    refs.saveStateLabel.textContent = "Saving locally...";
  }

  function setSaveLabelSaved() {
    const timeText = state.lastSavedAt ? formatClock(state.lastSavedAt) : "--:--";
    refs.saveStateLabel.textContent = `Saved locally • ${timeText}`;
  }

  function setSaveLabelError() {
    refs.saveStateLabel.textContent = "Save failed • local storage unavailable";
  }

  function setStatus(kind, message) {
    refs.statusBadge.classList.remove("ok", "warn", "error", "saving", "idle");
    if (kind && kind !== "idle") refs.statusBadge.classList.add(kind);
    refs.statusBadge.textContent = kind || "idle";
    refs.statusMessage.textContent = message;
  }

  function renderMarkdownish(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let paragraph = [];
    let listMode = "";
    let inCodeFence = false;
    let codeFence = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const content = paragraph.map((line) => applyInlineMarkup(line)).join("<br>");
      out.push(`<p>${content}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (!listMode) return;
      out.push(listMode === "ol" ? "</ol>" : "</ul>");
      listMode = "";
    };

    const flushCodeFence = () => {
      if (!inCodeFence) return;
      out.push(`<pre><code>${escapeHtml(codeFence.join("\n"))}</code></pre>`);
      inCodeFence = false;
      codeFence = [];
    };

    for (const rawLine of lines) {
      const line = rawLine;
      const trimmed = line.trim();

      if (/^```/.test(trimmed)) {
        flushParagraph();
        closeList();
        if (inCodeFence) {
          flushCodeFence();
        } else {
          inCodeFence = true;
          codeFence = [];
        }
        continue;
      }

      if (inCodeFence) {
        codeFence.push(line);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        closeList();
        continue;
      }

      const headingMatch = line.match(/^\s*(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        closeList();
        const level = headingMatch[1].length;
        out.push(`<h${level}>${applyInlineMarkup(headingMatch[2])}</h${level}>`);
        continue;
      }

      const checklistMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (checklistMatch) {
        flushParagraph();
        if (listMode !== "ul") {
          closeList();
          out.push("<ul>");
          listMode = "ul";
        }
        const checked = checklistMatch[1].toLowerCase() === "x";
        out.push(
          `<li class="check-item"><span class="check-box" aria-hidden="true">${checked ? "☑" : "☐"}</span>${applyInlineMarkup(checklistMatch[2])}</li>`
        );
        continue;
      }

      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (bulletMatch) {
        flushParagraph();
        if (listMode !== "ul") {
          closeList();
          out.push("<ul>");
          listMode = "ul";
        }
        out.push(`<li>${applyInlineMarkup(bulletMatch[1])}</li>`);
        continue;
      }

      const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        if (listMode !== "ol") {
          closeList();
          out.push("<ol>");
          listMode = "ol";
        }
        out.push(`<li>${applyInlineMarkup(orderedMatch[1])}</li>`);
        continue;
      }

      const quoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        flushParagraph();
        closeList();
        out.push(`<blockquote>${applyInlineMarkup(quoteMatch[1])}</blockquote>`);
        continue;
      }

      closeList();
      paragraph.push(line);
    }

    flushParagraph();
    closeList();
    if (inCodeFence) flushCodeFence();

    return out.join("");
  }

  function applyInlineMarkup(text) {
    let escaped = escapeHtml(text);

    const codeSegments = [];
    escaped = escaped.replace(/`([^`]+)`/g, (_, code) => {
      const token = `@@CODE${codeSegments.length}@@`;
      codeSegments.push(`<code>${code}</code>`);
      return token;
    });

    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/__(.+?)__/g, "<strong>$1</strong>");
    escaped = escaped.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
    escaped = escaped.replace(/~~(.+?)~~/g, "<s>$1</s>");
    escaped = linkifyUrls(escaped);

    escaped = escaped.replace(/@@CODE(\d+)@@/g, (match, indexText) => {
      const index = Number(indexText);
      return codeSegments[index] || match;
    });

    return escaped;
  }

  function linkifyUrls(htmlText) {
    return htmlText.replace(/(https?:\/\/[^\s<]+|mailto:[^\s<]+)/g, (url) => {
      const href = url.replace(/&amp;/g, "&");
      if (!isSafeHref(href)) return url;
      return `<a href="${escapeHtmlAttribute(href)}" target="_blank" rel="noreferrer">${url}</a>`;
    });
  }

  function isSafeHref(href) {
    return /^(https?:|mailto:)/i.test(href);
  }

  function computeStats(text) {
    const normalized = text.replace(/\r\n?/g, "\n");
    const words = normalized.trim() ? (normalized.trim().match(/\S+/g) || []).length : 0;
    const chars = normalized.length;
    const lines = normalized.length ? normalized.split("\n").length : 1;

    const checklistMatches = normalized.match(/^\s*[-*]\s+\[([ xX])\]\s+/gm) || [];
    let checkedChecklist = 0;
    for (const item of checklistMatches) {
      if (/\[[xX]\]/.test(item)) checkedChecklist += 1;
    }

    return {
      words,
      chars,
      lines,
      readMinutes: words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0,
      totalChecklist: checklistMatches.length,
      checkedChecklist,
      bytes: estimateBytes(normalized)
    };
  }

  function getNoteDisplayTitle(note) {
    const raw = (note.title || "").trim();
    return raw || "Untitled note";
  }

  function getNotePreview(body) {
    const normalized = (body || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "Empty note";
    return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized;
  }

  function buildClipboardTextForNote(note) {
    const lines = [];
    if (note.title.trim()) lines.push(note.title.trim());
    if (note.tags.length) lines.push(`tags: ${note.tags.join(", ")}`);
    if (lines.length && note.body.trim()) lines.push("");
    lines.push(note.body || "");
    return lines.join("\n").trimEnd();
  }

  function cloneNote(note) {
    return {
      id: note.id,
      title: note.title,
      body: note.body,
      tags: [...note.tags],
      pinned: Boolean(note.pinned),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
  }

  function normalizeSortMode(value) {
    switch (value) {
      case "updated_asc":
      case "created_desc":
      case "title_asc":
      case "updated_desc":
        return value;
      default:
        return "updated_desc";
    }
  }

  function getTemplate(templateId) {
    switch (templateId) {
      case "checklist":
        return {
          title: "Checklist",
          tags: ["checklist"],
          body: "- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3"
        };
      case "meeting":
        return {
          title: "Meeting Notes",
          tags: ["meeting"],
          body: "# Agenda\n- \n\n# Notes\n- \n\n# Action Items\n- [ ] "
        };
      case "code":
        return {
          title: "Code Snippet",
          tags: ["code"],
          body: "```js\nfunction example() {\n  return true;\n}\n```"
        };
      case "blank":
      default:
        return {
          title: "",
          tags: [],
          body: ""
        };
    }
  }

  function templateLabel(templateId) {
    switch (templateId) {
      case "checklist":
        return "checklist";
      case "meeting":
        return "meeting";
      case "code":
        return "code";
      default:
        return "blank";
    }
  }

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlAttribute(value) {
    return escapeHtml(value);
  }

  function formatTimestamp(ms) {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "--";
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${d} ${h}:${mi}`;
  }

  function formatClock(ms) {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "--:--";
    const h = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${mi}:${s}`;
  }

  function formatRelativeTime(ms) {
    const deltaMs = Date.now() - ms;
    if (!Number.isFinite(deltaMs)) return "--";
    const abs = Math.abs(deltaMs);
    const suffix = deltaMs >= 0 ? "ago" : "from now";

    if (abs < 30_000) return "just now";
    if (abs < 3_600_000) {
      const mins = Math.max(1, Math.round(abs / 60_000));
      return `${mins}m ${suffix}`;
    }
    if (abs < 86_400_000) {
      const hours = Math.max(1, Math.round(abs / 3_600_000));
      return `${hours}h ${suffix}`;
    }
    if (abs < 30 * 86_400_000) {
      const days = Math.max(1, Math.round(abs / 86_400_000));
      return `${days}d ${suffix}`;
    }
    return formatTimestamp(ms);
  }

  function estimateBytes(text) {
    try {
      return new TextEncoder().encode(text).length;
    } catch {
      return new Blob([text]).size;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function slugifyFilename(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function dateStamp() {
    const d = new Date();
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}${mo}${day}-${h}${mi}`;
  }

  function arraysEqual(a, b) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function flashButton(button) {
    if (!button) return;
    button.classList.add("flash-ok");
    window.setTimeout(() => button.classList.remove("flash-ok"), 700);
  }
})();
