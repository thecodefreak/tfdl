(() => {
  const PINS_KEY = "tools-workspace-pins";
  const RECENTS_KEY = "tools-workspace-recents";
  const VIEW_MODE_KEY = "tools-workspace-view-mode";
  const SIDEBAR_SIDE_KEY = "tools-workspace-sidebar-side";
  const TABLE_COLUMNS_KEY = "tools-workspace-table-columns";
  const MAX_RECENTS = 12;
  const TABLE_COLUMNS = [
    { id: "index", label: "#", icon: "table", defaultVisible: true, essential: true },
    { id: "tool", label: "Tool", icon: "wrench", defaultVisible: true, essential: true, locked: true },
    { id: "alias", label: "Alias", icon: "link", defaultVisible: true, essential: true },
    { id: "category", label: "Category", icon: "grid", defaultVisible: true, essential: true },
    { id: "tags", label: "Tags", icon: "hash", defaultVisible: false, essential: false },
    { id: "actions", label: "Actions", icon: "sliders", defaultVisible: true, essential: true }
  ];
  const TABLE_COLUMN_MAP = new Map(TABLE_COLUMNS.map((column) => [column.id, column]));
  const TABLE_COLUMN_WIDTH_HINTS = {
    index: 56,
    tool: 300,
    alias: 170,
    category: 110,
    tags: 240,
    actions: 260
  };
  const CATEGORY_ICON_MAP = {
    dev: "braces",
    productivity: "clock",
    utilities: "wrench",
    media: "image",
    writing: "pen"
  };
  const registry = window.TOOLS_REGISTRY;

  if (!registry || !Array.isArray(registry.tools)) {
    return;
  }

  const refs = {
    searchInput: document.querySelector("#toolSearch"),
    openSelectedBtn: document.querySelector("#openSelectedBtn"),
    categoryChips: document.querySelector("#categoryChips"),
    pinnedOnlyInput: document.querySelector("#pinnedOnly"),
    recentOnlyInput: document.querySelector("#recentOnly"),
    clearSearchBtn: document.querySelector("#clearSearch"),
    clearRecentBtn: document.querySelector("#clearRecent"),
    tableColumnMenu: document.querySelector("#tableColumnMenu"),
    tableColumnsSummary: document.querySelector("#tableColumnsSummary"),
    tableColumnsSummaryLabel: document.querySelector("#tableColumnsSummaryLabel"),
    tableColumnChecklist: document.querySelector("#tableColumnChecklist"),
    tableColumnsEssentialsBtn: document.querySelector("#tableColumnsEssentialsBtn"),
    tableColumnsAllBtn: document.querySelector("#tableColumnsAllBtn"),
    sidebarLeftBtn: document.querySelector("#sidebarLeftBtn"),
    sidebarRightBtn: document.querySelector("#sidebarRightBtn"),
    sidebarHideBtn: document.querySelector("#sidebarHideBtn"),
    tableViewBtn: document.querySelector("#tableViewBtn"),
    cardViewBtn: document.querySelector("#cardViewBtn"),
    resultsCount: document.querySelector("#resultsCount"),
    statusHint: document.querySelector("#statusHint"),
    todayLabel: document.querySelector("#todayLabel"),
    workspaceGrid: document.querySelector("#workspaceGrid"),
    shortcutsOverlay: document.querySelector("#shortcutsOverlay"),
    shortcutsPanel: document.querySelector("#shortcutsPanel"),
    hideShortcutsBtn: document.querySelector("#hideShortcutsBtn"),
    loadingState: document.querySelector("#loadingState"),
    errorState: document.querySelector("#errorState"),
    retryRenderBtn: document.querySelector("#retryRenderBtn"),
    errorDiagnostics: document.querySelector("#errorDiagnostics"),
    resultsPanel: document.querySelector("#resultsPanel"),
    toolsTable: document.querySelector(".tools-table"),
    tbody: document.querySelector("#toolRows"),
    cardsView: document.querySelector("#toolCards"),
    emptyState: document.querySelector("#emptyState"),
    emptyResetBtn: document.querySelector("#emptyResetBtn"),
    quickLaunchList: document.querySelector("#quickLaunchList"),
    recentList: document.querySelector("#recentList")
  };

  const categories = normalizeCategories(registry.categories || [], registry.tools);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const tools = registry.tools.map((tool) => normalizeTool(tool, categoryMap));
  const toolMap = new Map(tools.map((tool) => [tool.id, tool]));

  let pins = loadStringList(PINS_KEY);
  let recents = loadStringList(RECENTS_KEY);
  let activeCategory = "all";
  let selectedToolId = null;
  let visibleTools = [];
  let viewMode = loadViewMode();
  let sidebarSide = loadSidebarSide();
  let tableColumns = loadTableColumns();
  let shortcutsReturnFocusEl = null;

  setLoadingState(true);
  hideErrorState();
  stampDate();
  window.setInterval(stampDate, 1000);
  applyShortcutsPanelUI(false);
  renderCategoryChips();
  renderTableColumnControls();
  bindEvents();
  seedSelectionFromHash();
  applyViewModeUI();
  applySidebarSideUI();
  requestRender();

  function normalizeCategories(inputCategories, inputTools) {
    const base = Array.isArray(inputCategories) ? [...inputCategories] : [];
    const existing = new Set(base.map((c) => c.id));

    for (const tool of inputTools) {
      if (!tool || typeof tool.category !== "string") continue;
      if (existing.has(tool.category)) continue;
      base.push({ id: tool.category, label: titleCase(tool.category) });
      existing.add(tool.category);
    }

    return base;
  }

  function normalizeTool(tool, categoryLookup) {
    const categoryId = tool.category;
    const categoryLabel = categoryLookup.get(categoryId)?.label || titleCase(categoryId);
    const slug = tool.slug || tool.id;
    const alias = tool.alias || slug;
    const canonicalPath = `tools/${categoryId}/${slug}/`;
    const aliasPath = `t/${alias}/`;
    const tags = Array.isArray(tool.tags) ? tool.tags.filter(Boolean) : [];

    return {
      ...tool,
      slug,
      alias,
      category: categoryId,
      categoryLabel,
      canonicalPath,
      aliasPath,
      tags,
      searchBlob: [
        tool.id,
        tool.name,
        tool.description,
        categoryId,
        categoryLabel,
        slug,
        alias,
        canonicalPath,
        aliasPath,
        ...tags
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    };
  }

  function bindEvents() {
    refs.searchInput?.addEventListener("input", requestRender);
    refs.pinnedOnlyInput?.addEventListener("change", requestRender);
    refs.recentOnlyInput?.addEventListener("change", requestRender);
    refs.openSelectedBtn?.addEventListener("click", () => {
      if (!selectedToolId) {
        window.TFDLToast?.warning("Select a tool first.");
        refs.searchInput?.focus();
        return;
      }
      openToolById(selectedToolId);
    });
    refs.tableColumnChecklist?.addEventListener("change", onTableColumnChecklistChanged);
    refs.tableColumnsEssentialsBtn?.addEventListener("click", () => {
      applyTableColumnPreset("essentials");
      refs.tableColumnMenu?.removeAttribute("open");
    });
    refs.tableColumnsAllBtn?.addEventListener("click", () => {
      applyTableColumnPreset("all");
      refs.tableColumnMenu?.removeAttribute("open");
    });
    refs.sidebarLeftBtn?.addEventListener("click", () => setSidebarSide("left"));
    refs.sidebarRightBtn?.addEventListener("click", () => setSidebarSide("right"));
    refs.sidebarHideBtn?.addEventListener("click", () => setSidebarSide("hidden"));
    refs.tableViewBtn?.addEventListener("click", () => setViewMode("table"));
    refs.cardViewBtn?.addEventListener("click", () => setViewMode("cards"));

    refs.clearSearchBtn?.addEventListener("click", () => {
      if (refs.searchInput) refs.searchInput.value = "";
      requestRender();
      refs.searchInput?.focus();
    });

    refs.clearRecentBtn?.addEventListener("click", () => {
      recents = [];
      persistStringList(RECENTS_KEY, recents);
      requestRender();
    });

    refs.emptyResetBtn?.addEventListener("click", () => {
      resetFilters();
    });

    refs.retryRenderBtn?.addEventListener("click", () => {
      requestRender();
    });

    refs.hideShortcutsBtn?.addEventListener("click", () => {
      applyShortcutsPanelUI(false);
    });
    refs.shortcutsOverlay?.addEventListener("click", () => {
      applyShortcutsPanelUI(false);
    });

    refs.categoryChips?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      activeCategory = button.dataset.filter || "all";
      renderCategoryChips();
      requestRender();
    });

    refs.tbody?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const row = target.closest("tr[data-tool-id]");
      if (row) {
        selectedToolId = row.dataset.toolId;
      }

      const actionButton = target.closest("button[data-action]");
      if (actionButton) {
        event.preventDefault();
        const shouldRender = handleRowAction(actionButton, row?.dataset.toolId || "");
        if (shouldRender) {
          requestRender();
        } else if (row) {
          updateSelectedToolUI();
        }
        return;
      }

      const anchor = target.closest("a[data-open-track='true']");
      if (anchor instanceof HTMLAnchorElement && row?.dataset.toolId) {
        trackOpen(row.dataset.toolId);
        return;
      }

      if (row) {
        updateSelectedToolUI();
      }
    });

    refs.tbody?.addEventListener("dblclick", (event) => {
      const row = event.target instanceof HTMLElement ? event.target.closest("tr[data-tool-id]") : null;
      if (!row?.dataset.toolId) return;
      openToolById(row.dataset.toolId);
    });

    refs.cardsView?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const card = target.closest("article[data-tool-id]");
      if (card) {
        selectedToolId = card.dataset.toolId;
      }

      const actionButton = target.closest("button[data-action]");
      if (actionButton) {
        event.preventDefault();
        const shouldRender = handleRowAction(actionButton, card?.dataset.toolId || "");
        if (shouldRender) {
          requestRender();
        } else if (card) {
          updateSelectedToolUI();
        }
        return;
      }

      const anchor = target.closest("a[data-open-track='true']");
      if (anchor instanceof HTMLAnchorElement && card?.dataset.toolId) {
        trackOpen(card.dataset.toolId);
        return;
      }

      if (card) {
        updateSelectedToolUI();
      }
    });

    refs.cardsView?.addEventListener("dblclick", (event) => {
      const card = event.target instanceof HTMLElement ? event.target.closest("article[data-tool-id]") : null;
      if (!card?.dataset.toolId) return;
      openToolById(card.dataset.toolId);
    });

    document.addEventListener("click", (event) => {
      if (!refs.tableColumnMenu?.hasAttribute("open")) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (refs.tableColumnMenu.contains(target)) return;
      refs.tableColumnMenu.removeAttribute("open");
    });

    window.addEventListener("keydown", onGlobalKeydown);
  }

  function onGlobalKeydown(event) {
    if (isShortcutsToggleKey(event)) {
      event.preventDefault();
      applyShortcutsPanelUI(!isShortcutsPanelOpen());
      return;
    }

    if (isShortcutsPanelOpen() && event.key === "Tab") {
      handleShortcutsFocusTrap(event);
    }

    const active = document.activeElement;
    const isTyping =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.isContentEditable;

    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      refs.searchInput?.focus();
      refs.searchInput?.select();
      return;
    }

    if (isTyping) {
      if (event.key === "Escape") {
        if (active instanceof HTMLElement) active.blur();
      }
      return;
    }

    if (event.key === "Escape" && refs.tableColumnMenu?.hasAttribute("open")) {
      refs.tableColumnMenu.removeAttribute("open");
      return;
    }

    if (event.key === "Escape" && isShortcutsPanelOpen()) {
      applyShortcutsPanelUI(false);
      return;
    }

    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (selectedToolId) openToolById(selectedToolId);
      return;
    }

    if (event.key === "p") {
      event.preventDefault();
      if (selectedToolId) togglePin(selectedToolId);
      requestRender();
      return;
    }

    if (event.key === "v") {
      event.preventDefault();
      setViewMode(viewMode === "table" ? "cards" : "table");
      return;
    }

    if (event.key === "y") {
      event.preventDefault();
      if (!selectedToolId) return;
      const tool = toolMap.get(selectedToolId);
      if (!tool) return;
      if (event.shiftKey) {
        void copyText(tool.canonicalPath)
          .then(() => window.TFDLToast?.success(`Copied ${tool.canonicalPath}`))
          .catch(() => window.TFDLToast?.error("Copy failed. Try again."));
      } else {
        void copyText(tool.aliasPath)
          .then(() => window.TFDLToast?.success(`Copied ${tool.aliasPath}`))
          .catch(() => window.TFDLToast?.error("Copy failed. Try again."));
      }
      return;
    }

    const digitIndex = mapDigitToIndex(event.key);
    if (digitIndex !== null) {
      const tool = visibleTools[digitIndex];
      if (tool) {
        event.preventDefault();
        openToolById(tool.id);
      }
    }
  }

  function mapDigitToIndex(key) {
    if (/^[1-9]$/.test(key)) return Number(key) - 1;
    if (key === "0") return 9;
    return null;
  }

  function isShortcutsToggleKey(event) {
    if (!(event.ctrlKey || event.metaKey)) return false;
    if (event.altKey) return false;
    return event.code === "Slash";
  }

  function isShortcutsPanelOpen() {
    return Boolean(refs.shortcutsPanel && !refs.shortcutsPanel.hidden);
  }

  function applyShortcutsPanelUI(isOpen) {
    if (!refs.shortcutsPanel) return;
    const wasOpen = isShortcutsPanelOpen();
    refs.shortcutsPanel.hidden = !isOpen;
    if (refs.shortcutsOverlay) refs.shortcutsOverlay.hidden = !isOpen;
    document.body.classList.toggle("shortcuts-open", isOpen);
    if (isOpen && !wasOpen) {
      if (document.activeElement instanceof HTMLElement) {
        shortcutsReturnFocusEl = document.activeElement;
      }
      refs.hideShortcutsBtn?.focus({ preventScroll: true });
    }
    if (!isOpen && wasOpen && shortcutsReturnFocusEl instanceof HTMLElement) {
      shortcutsReturnFocusEl.focus({ preventScroll: true });
      shortcutsReturnFocusEl = null;
    }
    renderStatus();
  }

  function handleShortcutsFocusTrap(event) {
    if (!refs.shortcutsPanel) return;
    const focusable = getFocusableElements(refs.shortcutsPanel);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!(active instanceof HTMLElement) || !refs.shortcutsPanel.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  }

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    );
  }

  function renderCategoryChips() {
    if (!refs.categoryChips) return;

    const items = [{ id: "all", label: "All" }, ...categories];
    refs.categoryChips.innerHTML = items
      .map((item) => {
        const isActive = item.id === activeCategory;
        return `<button class="chip${isActive ? " active" : ""}" type="button" data-filter="${escapeHtml(
          item.id
        )}" aria-pressed="${String(isActive)}">${escapeHtml(item.label)}</button>`;
      })
      .join("");
  }

  function renderTableColumnControls() {
    if (!refs.tableColumnChecklist) return;

    refs.tableColumnChecklist.innerHTML = TABLE_COLUMNS.map((column) => {
      const checked = isTableColumnVisible(column.id);
      const disabled = Boolean(column.locked);
      const meta = column.locked ? "locked" : column.essential ? "core" : "optional";

      return `
        <label class="column-check-item${disabled ? " is-locked" : ""}">
          <span class="column-check-main">
            <input type="checkbox" data-column-id="${escapeHtml(column.id)}"${checked ? " checked" : ""}${
        disabled ? " disabled" : ""
      } />
            ${renderIcon(column.icon || "folder", "ui-icon icon-xs")}
            <span>${escapeHtml(column.label)}</span>
          </span>
          <span class="column-check-meta mono">${escapeHtml(meta)}</span>
        </label>`;
    }).join("");

    syncTableColumnControlsUI();
  }

  function syncTableColumnControlsUI() {
    if (refs.tableColumnChecklist) {
      refs.tableColumnChecklist.querySelectorAll("input[data-column-id]").forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        const id = input.getAttribute("data-column-id") || "";
        input.checked = isTableColumnVisible(id);
      });
    }

    if (refs.tableColumnsSummaryLabel) {
      const visibleCount = TABLE_COLUMNS.filter((column) => isTableColumnVisible(column.id)).length;
      refs.tableColumnsSummaryLabel.textContent = `Columns ${visibleCount}/${TABLE_COLUMNS.length}`;
    }
  }

  function onTableColumnChecklistChanged(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== "checkbox") return;
    const columnId = target.getAttribute("data-column-id");
    if (!columnId || !TABLE_COLUMN_MAP.has(columnId)) return;

    const updated = setTableColumnVisibility(columnId, target.checked);
    if (!updated) {
      target.checked = isTableColumnVisible(columnId);
      return;
    }

    persistTableColumns();
    applyTableColumnVisibility();
    renderStatus();
  }

  function applyTableColumnPreset(mode) {
    const next = {};
    for (const column of TABLE_COLUMNS) {
      if (column.locked) {
        next[column.id] = true;
        continue;
      }
      next[column.id] = mode === "all" ? true : Boolean(column.essential);
    }
    tableColumns = next;
    persistTableColumns();
    syncTableColumnControlsUI();
    applyTableColumnVisibility();
    renderStatus();
  }

  function requestRender() {
    try {
      hideErrorState();
      render();
      setLoadingState(false);
    } catch (error) {
      handleRenderError(error);
    }
  }

  function render() {
    visibleTools = getVisibleTools();
    ensureValidSelection();
    renderTable();
    renderCards();
    renderQuickLaunch();
    renderRecentList();
    syncEmptyState();
    renderStatus();
    updateSelectedToolUI();
  }

  function getVisibleTools() {
    const query = (refs.searchInput?.value || "").trim().toLowerCase();
    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
    const pinnedOnly = Boolean(refs.pinnedOnlyInput?.checked);
    const recentOnly = Boolean(refs.recentOnlyInput?.checked);

    return tools
      .filter((tool) => {
        if (activeCategory !== "all" && tool.category !== activeCategory) return false;
        if (pinnedOnly && !pins.includes(tool.id)) return false;
        if (recentOnly && !recents.includes(tool.id)) return false;
        return tokens.every((token) => tokenMatches(tool, token));
      })
      .sort(compareTools);
  }

  function tokenMatches(tool, token) {
    if (token.startsWith("@")) {
      const wanted = token.slice(1);
      return tool.category.includes(wanted) || tool.categoryLabel.toLowerCase().includes(wanted);
    }

    if (token.startsWith("#")) {
      const wanted = token.slice(1);
      return tool.tags.some((tag) => tag.toLowerCase().includes(wanted));
    }

    return tool.searchBlob.includes(token);
  }

  function compareTools(a, b) {
    const aPinned = pins.includes(a.id) ? 1 : 0;
    const bPinned = pins.includes(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    const aRecentIndex = recents.indexOf(a.id);
    const bRecentIndex = recents.indexOf(b.id);
    const aRecentRank = aRecentIndex === -1 ? Number.MAX_SAFE_INTEGER : aRecentIndex;
    const bRecentRank = bRecentIndex === -1 ? Number.MAX_SAFE_INTEGER : bRecentIndex;
    if (aRecentRank !== bRecentRank) return aRecentRank - bRecentRank;

    const catCompare = a.categoryLabel.localeCompare(b.categoryLabel);
    if (catCompare !== 0) return catCompare;

    return a.name.localeCompare(b.name);
  }

  function ensureValidSelection() {
    if (!visibleTools.length) {
      selectedToolId = null;
      return;
    }

    const stillVisible = selectedToolId && visibleTools.some((tool) => tool.id === selectedToolId);
    if (!stillVisible) {
      selectedToolId = visibleTools[0].id;
    }
  }

  function renderTable() {
    if (!refs.tbody) return;

    refs.tbody.innerHTML = visibleTools
      .map((tool, index) => renderRow(tool, index))
      .join("");

    applyTableColumnVisibility();
  }

  function renderCards() {
    if (!refs.cardsView) return;

    refs.cardsView.innerHTML = visibleTools
      .map((tool, index) => renderCard(tool, index))
      .join("");
  }

  function syncEmptyState() {
    if (!refs.emptyState) return;
    const isLoading = Boolean(refs.loadingState && !refs.loadingState.classList.contains("is-hidden"));
    const hasError = Boolean(refs.errorState && !refs.errorState.classList.contains("is-hidden"));
    const showEmpty = !isLoading && !hasError && visibleTools.length === 0;
    refs.emptyState.classList.toggle("is-hidden", !showEmpty);
  }

  function resetFilters() {
    if (refs.searchInput) refs.searchInput.value = "";
    if (refs.pinnedOnlyInput) refs.pinnedOnlyInput.checked = false;
    if (refs.recentOnlyInput) refs.recentOnlyInput.checked = false;
    activeCategory = "all";
    renderCategoryChips();
    requestRender();
    refs.searchInput?.focus();
  }

  function setLoadingState(isLoading) {
    refs.loadingState?.classList.toggle("is-hidden", !isLoading);
    if (refs.resultsPanel) {
      refs.resultsPanel.dataset.loading = String(Boolean(isLoading));
    }
  }

  function hideErrorState() {
    refs.errorState?.classList.add("is-hidden");
    refs.resultsPanel?.removeAttribute("data-has-error");
    if (refs.errorDiagnostics) refs.errorDiagnostics.textContent = "";
  }

  function handleRenderError(error) {
    setLoadingState(false);
    refs.errorState?.classList.remove("is-hidden");
    refs.resultsPanel?.setAttribute("data-has-error", "true");
    if (refs.errorDiagnostics) {
      refs.errorDiagnostics.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    syncEmptyState();
    window.TFDLToast?.error("Render failed. Check diagnostics.");
    // Keep an exception trace in dev tools for debugging.
    console.error(error);
  }

  function renderRow(tool, index) {
    const isPinned = pins.includes(tool.id);
    const isRecent = recents.includes(tool.id);
    const isSelected = selectedToolId === tool.id;
    const shortcutLabel = index < 10 ? (index === 9 ? "0" : String(index + 1)) : null;
    const rowIndexLabel = index + 1;

    return `
      <tr data-tool-id="${escapeHtml(tool.id)}"${isSelected ? ' class="selected"' : ""}>
        <td class="row-index" data-col="index">
          <span class="index-badge${shortcutLabel ? " hotkey" : ""}">${shortcutLabel || rowIndexLabel}</span>
        </td>
        <td class="tool-name-cell" data-col="tool">
          <div class="tool-name-wrap">
            <div class="tool-title-line">
              <a class="tool-link" data-open-track="true" href="${escapeHtml(tool.aliasPath)}">${renderIcon(
                getCategoryIconName(tool.category),
                "ui-icon icon-xs"
              )}<span>${escapeHtml(tool.name)}</span></a>
              ${isPinned ? '<span class="status-pill pinned">PIN</span>' : ""}
              ${isRecent ? '<span class="status-pill recent">RECENT</span>' : ""}
            </div>
            <div class="tool-desc">${escapeHtml(tool.description || "")}</div>
          </div>
        </td>
        <td data-col="alias">
          <a class="alias-link" data-open-track="true" href="${escapeHtml(tool.aliasPath)}"><code>${escapeHtml(
      tool.aliasPath
    )}</code></a>
        </td>
        <td data-col="category">${renderCategoryChip(tool.category)}</td>
        <td data-col="tags">
          <div class="tags-wrap">${tool.tags
            .map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`)
            .join("")}</div>
        </td>
        <td class="actions-cell" data-col="actions">
          <div class="actions-wrap">
            ${renderActionButton({
              toolId: tool.id,
              action: "pin",
              icon: "pin",
              label: isPinned ? "Unpin" : "Pin",
              className: `action-btn ${isPinned ? "pin-active" : ""}`.trim()
            })}
            ${renderActionButton({
              toolId: tool.id,
              action: "copy-alias",
              icon: "copy",
              label: "Alias"
            })}
            ${renderActionButton({
              toolId: tool.id,
              action: "open",
              icon: "open",
              label: "Open"
            })}
          </div>
        </td>
      </tr>`;
  }

  function renderCard(tool, index) {
    const isPinned = pins.includes(tool.id);
    const isRecent = recents.includes(tool.id);
    const isSelected = selectedToolId === tool.id;
    const shortcutLabel = index < 10 ? (index === 9 ? "0" : String(index + 1)) : null;
    const visibleTags = tool.tags.slice(0, 4);
    const hiddenTagCount = Math.max(0, tool.tags.length - visibleTags.length);
    const tagsHtml = [
      ...visibleTags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`),
      hiddenTagCount ? `<span class="tag tag-muted">+${hiddenTagCount}</span>` : ""
    ]
      .filter(Boolean)
      .join("");

    return `
      <article class="tool-card${isSelected ? " selected" : ""}" data-tool-id="${escapeHtml(tool.id)}">
        <div class="tool-card-top">
          <div class="tool-card-headline">
            <span class="index-badge${shortcutLabel ? " hotkey" : ""}">${escapeHtml(shortcutLabel || String(index + 1))}</span>
            <div class="tool-card-title-block">
              <div class="tool-card-title-line">
                <a class="tool-card-title" data-open-track="true" href="${escapeHtml(tool.aliasPath)}">${renderIcon(
                  getCategoryIconName(tool.category),
                  "ui-icon icon-xs"
                )}<span>${escapeHtml(tool.name)}</span></a>
                ${isPinned ? '<span class="status-pill pinned">PIN</span>' : ""}
                ${isRecent ? '<span class="status-pill recent">RECENT</span>' : ""}
              </div>
              <div class="tool-card-desc">${escapeHtml(tool.description || "")}</div>
            </div>
          </div>
          <div class="tool-card-meta">
            <div class="tool-card-line">
              <span class="tool-card-key mono">${renderIcon("link", "ui-icon icon-xs")}<span>alias</span></span>
              <a data-open-track="true" href="${escapeHtml(tool.aliasPath)}"><code>${escapeHtml(tool.aliasPath)}</code></a>
            </div>
          </div>
        </div>
        <div class="tool-card-foot">
          <div class="tool-card-strip">
            ${renderCategoryChip(tool.category)}
            <div class="tags-wrap">${tagsHtml}</div>
          </div>
          <div class="actions-wrap">
            ${renderActionButton({
              toolId: tool.id,
              action: "open",
              icon: "open",
              label: "Open",
              className: "action-btn open-primary"
            })}
            ${renderActionButton({
              toolId: tool.id,
              action: "pin",
              icon: "pin",
              label: isPinned ? "Unpin" : "Pin",
              className: `action-btn ${isPinned ? "pin-active" : ""}`.trim()
            })}
            ${renderActionButton({
              toolId: tool.id,
              action: "copy-alias",
              icon: "copy",
              label: "Alias"
            })}
          </div>
        </div>
      </article>`;
  }

  function renderQuickLaunch() {
    if (!refs.quickLaunchList) return;

    const top = visibleTools.slice(0, 10);
    if (!top.length) {
      refs.quickLaunchList.innerHTML = '<li class="empty-list">No visible tools.</li>';
      return;
    }

    refs.quickLaunchList.innerHTML = top
      .map((tool, index) => {
        const hotkey = index === 9 ? "0" : String(index + 1);
        return `
          <li>
            <button class="quick-item-btn" type="button" data-open-id="${escapeHtml(tool.id)}">
              <div class="quick-line">
                <strong>${renderIcon(getCategoryIconName(tool.category), "ui-icon icon-xs")}<span>${hotkey}. ${escapeHtml(
                  tool.name
                )}</span></strong>
                <span class="path-chip">${escapeHtml(tool.aliasPath)}</span>
              </div>
              <div class="subtle-line">${escapeHtml(tool.canonicalPath)}</div>
            </button>
          </li>`;
      })
      .join("");

    refs.quickLaunchList.querySelectorAll("button[data-open-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const toolId = button.getAttribute("data-open-id");
        if (toolId) openToolById(toolId);
      });
    });
  }

  function renderRecentList() {
    if (!refs.recentList) return;

    const recentTools = recents.map((id) => toolMap.get(id)).filter(Boolean);
    if (!recentTools.length) {
      refs.recentList.innerHTML = '<li class="empty-list">No recent launches yet.</li>';
      return;
    }

    refs.recentList.innerHTML = recentTools
      .map((tool) => {
        return `
          <li>
            <button class="recent-item-btn" type="button" data-open-id="${escapeHtml(tool.id)}">
              <div class="recent-line">
                <strong>${renderIcon(getCategoryIconName(tool.category), "ui-icon icon-xs")}<span>${escapeHtml(
                  tool.name
                )}</span></strong>
                <span class="path-chip">${escapeHtml(tool.aliasPath)}</span>
              </div>
              <div class="subtle-line">${escapeHtml(tool.canonicalPath)} • ${escapeHtml(tool.category)}</div>
            </button>
          </li>`;
      })
      .join("");

    refs.recentList.querySelectorAll("button[data-open-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const toolId = button.getAttribute("data-open-id");
        if (toolId) openToolById(toolId);
      });
    });
  }

  function renderStatus() {
    const pinnedCount = tools.filter((tool) => pins.includes(tool.id)).length;
    const recentCount = recents.filter((id) => toolMap.has(id)).length;
    const totalCount = tools.length;
    const visibleCount = visibleTools.length;
    const categoryLabel = activeCategory === "all" ? "all" : activeCategory;
    const visibleTableColumns = TABLE_COLUMNS.filter((column) => isTableColumnVisible(column.id)).length;

    if (refs.resultsCount) {
      refs.resultsCount.textContent = `${visibleCount}/${totalCount} visible • ${pinnedCount} pinned • ${recentCount} recent • category:${categoryLabel}${
        viewMode === "table" ? ` • cols:${visibleTableColumns}/${TABLE_COLUMNS.length}` : ""
      } • side:${sidebarSide}`;
    }

    if (refs.statusHint) {
      refs.statusHint.textContent = `/ search · Ctrl/Cmd+/ shortcuts · j/k move · Enter open · p pin · v view:${viewMode} · y alias · Y source · 1-0 open visible`;
    }
  }

  function setViewMode(nextMode) {
    const normalized = normalizeViewMode(nextMode);
    if (normalized === viewMode) return;
    viewMode = normalized;
    persistViewMode(viewMode);
    applyViewModeUI();
    updateSelectedToolUI();
    renderStatus();
  }

  function applyViewModeUI() {
    refs.workspaceGrid?.setAttribute("data-view", viewMode);
    refs.resultsPanel?.setAttribute("data-view", viewMode);
    if (refs.tableViewBtn) refs.tableViewBtn.setAttribute("aria-pressed", String(viewMode === "table"));
    if (refs.cardViewBtn) refs.cardViewBtn.setAttribute("aria-pressed", String(viewMode === "cards"));
  }

  function setSidebarSide(nextSide) {
    const normalized = normalizeSidebarSide(nextSide);
    if (normalized === sidebarSide) return;
    sidebarSide = normalized;
    persistSidebarSide(sidebarSide);
    applySidebarSideUI();
    renderStatus();
  }

  function applySidebarSideUI() {
    refs.workspaceGrid?.setAttribute("data-sidebar-side", sidebarSide);
    if (refs.sidebarLeftBtn) refs.sidebarLeftBtn.setAttribute("aria-pressed", String(sidebarSide === "left"));
    if (refs.sidebarRightBtn) refs.sidebarRightBtn.setAttribute("aria-pressed", String(sidebarSide === "right"));
    if (refs.sidebarHideBtn) refs.sidebarHideBtn.setAttribute("aria-pressed", String(sidebarSide === "hidden"));
  }

  function updateSelectedToolUI() {
    const rows = refs.tbody?.querySelectorAll("tr[data-tool-id]") || [];
    rows.forEach((row) => {
      const isSelected = row.getAttribute("data-tool-id") === selectedToolId;
      row.classList.toggle("selected", isSelected);
      if (isSelected && viewMode === "table") {
        row.scrollIntoView({ block: "nearest" });
      }
    });

    const cards = refs.cardsView?.querySelectorAll("article[data-tool-id]") || [];
    cards.forEach((card) => {
      const isSelected = card.getAttribute("data-tool-id") === selectedToolId;
      card.classList.toggle("selected", isSelected);
      if (isSelected && viewMode === "cards") {
        card.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function moveSelection(delta) {
    if (!visibleTools.length) return;
    const currentIndex = visibleTools.findIndex((tool) => tool.id === selectedToolId);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = Math.max(0, Math.min(visibleTools.length - 1, safeIndex + delta));
    selectedToolId = visibleTools[nextIndex].id;
    updateSelectedToolUI();
  }

  function handleRowAction(button, toolId) {
    if (!toolId) return false;
    const action = button.dataset.action;
    if (action === "pin") {
      togglePin(toolId);
      return true;
    }

    if (action === "open") {
      openToolById(toolId);
      return false;
    }

    const tool = toolMap.get(toolId);
    if (!tool) return false;

    if (action === "copy-alias") {
      void copyText(tool.aliasPath)
        .then(() => {
          flashButton(button);
          window.TFDLToast?.success(`Copied ${tool.aliasPath}`);
        })
        .catch(() => {
          window.TFDLToast?.error("Copy failed. Try again.");
        });
      return false;
    }

    if (action === "copy-source") {
      void copyText(tool.canonicalPath)
        .then(() => {
          flashButton(button);
          window.TFDLToast?.success(`Copied ${tool.canonicalPath}`);
        })
        .catch(() => {
          window.TFDLToast?.error("Copy failed. Try again.");
        });
      return false;
    }

    return false;
  }

  function togglePin(toolId) {
    if (pins.includes(toolId)) {
      pins = pins.filter((id) => id !== toolId);
    } else {
      pins = [toolId, ...pins.filter((id) => id !== toolId)];
    }
    persistStringList(PINS_KEY, pins);
  }

  function openToolById(toolId) {
    const tool = toolMap.get(toolId);
    if (!tool) return;
    trackOpen(toolId);
    window.location.href = tool.aliasPath;
  }

  function trackOpen(toolId) {
    recents = [toolId, ...recents.filter((id) => id !== toolId)].slice(0, MAX_RECENTS);
    persistStringList(RECENTS_KEY, recents);
  }

  async function copyText(value) {
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // fall through to legacy copy
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const copied = document.execCommand("copy");
      if (!copied) {
        throw new Error("Copy command was rejected.");
      }
    } finally {
      textarea.remove();
    }
  }

  function flashButton(button) {
    button.classList.add("copy-ok");
    const originalHtml = button.innerHTML;
    button.innerHTML = renderIconLabel("check", "Copied");
    window.setTimeout(() => {
      button.classList.remove("copy-ok");
      button.innerHTML = originalHtml;
    }, 700);
  }

  function stampDate() {
    if (!refs.todayLabel) return;
    const now = new Date();
    const hour = now.getHours();
    const isNight = hour < 6 || hour >= 18;
    const icon = isNight ? "moon" : "sun";
    const label = now.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    refs.todayLabel.classList.toggle("is-night", isNight);
    refs.todayLabel.classList.toggle("is-day", !isNight);
    refs.todayLabel.innerHTML = renderIconLabel(icon, label, "icon-label today-label-inner");
    refs.todayLabel.title = now.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function seedSelectionFromHash() {
    const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    if (!hash) return;

    const direct = tools.find(
      (tool) => tool.id === hash || tool.slug === hash || tool.alias === hash || `${tool.category}/${tool.slug}` === hash
    );

    if (direct) {
      selectedToolId = direct.id;
      return;
    }

    if (refs.searchInput) {
      refs.searchInput.value = hash;
    }
  }

  function normalizeViewMode(value) {
    return value === "cards" ? "cards" : "table";
  }

  function normalizeSidebarSide(value) {
    if (value === "right") return "right";
    if (value === "hidden") return "hidden";
    return "left";
  }

  function loadTableColumns() {
    try {
      const raw = localStorage.getItem(TABLE_COLUMNS_KEY);
      if (!raw) return getDefaultTableColumns();
      const parsed = JSON.parse(raw);
      return normalizeTableColumns(parsed);
    } catch {
      return getDefaultTableColumns();
    }
  }

  function getDefaultTableColumns() {
    const out = {};
    for (const column of TABLE_COLUMNS) {
      out[column.id] = Boolean(column.defaultVisible);
    }
    return out;
  }

  function normalizeTableColumns(value) {
    const defaults = getDefaultTableColumns();
    if (!value || typeof value !== "object") return defaults;

    for (const column of TABLE_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(value, column.id)) {
        defaults[column.id] = Boolean(value[column.id]);
      }
      if (column.locked) {
        defaults[column.id] = true;
      }
    }

    if (!defaults.tool) defaults.tool = true;
    return defaults;
  }

  function persistTableColumns() {
    try {
      localStorage.setItem(TABLE_COLUMNS_KEY, JSON.stringify(tableColumns));
    } catch {
      // localStorage can be unavailable in some environments
    }
  }

  function isTableColumnVisible(columnId) {
    const column = TABLE_COLUMN_MAP.get(columnId);
    if (!column) return true;
    if (column.locked) return true;
    return tableColumns[columnId] !== false;
  }

  function setTableColumnVisibility(columnId, visible) {
    const column = TABLE_COLUMN_MAP.get(columnId);
    if (!column) return false;
    if (column.locked) {
      tableColumns[columnId] = true;
      return false;
    }

    tableColumns[columnId] = Boolean(visible);
    if (!isTableColumnVisible("tool")) tableColumns.tool = true;
    syncTableColumnControlsUI();
    return true;
  }

  function applyTableColumnVisibility() {
    const tableRoot = refs.toolsTable;
    if (!tableRoot) return;

    tableRoot.querySelectorAll("[data-col]").forEach((cell) => {
      const columnId = cell.getAttribute("data-col") || "";
      const hidden = !isTableColumnVisible(columnId);
      cell.classList.toggle("is-col-hidden", hidden);
      if (hidden) {
        cell.setAttribute("aria-hidden", "true");
      } else {
        cell.removeAttribute("aria-hidden");
      }
    });

    const visibleCount = TABLE_COLUMNS.filter((column) => isTableColumnVisible(column.id)).length;
    refs.resultsPanel?.setAttribute("data-table-visible-cols", String(visibleCount));
    refs.resultsPanel?.style.setProperty("--table-min-width", `${computeTableMinWidth()}px`);
    syncTableColumnControlsUI();
  }

  function computeTableMinWidth() {
    let width = 36;
    for (const column of TABLE_COLUMNS) {
      if (!isTableColumnVisible(column.id)) continue;
      width += TABLE_COLUMN_WIDTH_HINTS[column.id] || 120;
    }
    return Math.max(620, Math.round(width));
  }

  function loadViewMode() {
    try {
      const raw = localStorage.getItem(VIEW_MODE_KEY);
      if (raw) return normalizeViewMode(raw);
    } catch {
      // localStorage can be unavailable
    }

    if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 1440px)").matches) {
      return "cards";
    }

    return "table";
  }

  function loadSidebarSide() {
    try {
      const raw = localStorage.getItem(SIDEBAR_SIDE_KEY);
      if (raw) return normalizeSidebarSide(raw);
    } catch {
      // localStorage can be unavailable
    }

    return "left";
  }

  function persistViewMode(mode) {
    try {
      localStorage.setItem(VIEW_MODE_KEY, normalizeViewMode(mode));
    } catch {
      // localStorage can be unavailable in some environments
    }
  }

  function persistSidebarSide(side) {
    try {
      localStorage.setItem(SIDEBAR_SIDE_KEY, normalizeSidebarSide(side));
    } catch {
      // localStorage can be unavailable in some environments
    }
  }

  function loadStringList(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return [...new Set(parsed.filter((item) => typeof item === "string"))];
    } catch {
      return [];
    }
  }

  function persistStringList(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage can be unavailable in some environments
    }
  }

  function titleCase(value) {
    return String(value || "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getCategoryIconName(category) {
    return CATEGORY_ICON_MAP[category] || "folder";
  }

  function renderCategoryChip(category) {
    return `<span class="category-chip">${renderIcon(getCategoryIconName(category), "ui-icon icon-xs")}<span>${escapeHtml(
      category
    )}</span></span>`;
  }

  function renderActionButton({ toolId, action, icon, label, className = "action-btn" }) {
    return `<button class="${escapeHtml(className)}" type="button" data-action="${escapeHtml(
      action
    )}" data-tool-id="${escapeHtml(toolId)}">${renderIconLabel(icon, label)}</button>`;
  }

  function renderIconLabel(iconName, text, className = "icon-label") {
    return `<span class="${escapeHtml(className)}">${renderIcon(iconName)}<span>${escapeHtml(text)}</span></span>`;
  }

  function renderIcon(iconName, className = "ui-icon") {
    const iconId = `i-${String(iconName || "folder").replace(/[^a-z0-9-]/gi, "")}`;
    return `<svg class="${escapeHtml(className)}" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><use href="#${iconId}"></use></svg>`;
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
