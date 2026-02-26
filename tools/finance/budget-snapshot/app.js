(() => {
  const STORAGE_KEY = "tfdl:budget-snapshot:v1";

  const CURRENCIES = [
    { code: "USD", label: "US Dollar" },
    { code: "EUR", label: "Euro" },
    { code: "GBP", label: "British Pound" },
    { code: "INR", label: "Indian Rupee" },
    { code: "JPY", label: "Japanese Yen" },
    { code: "CAD", label: "Canadian Dollar" },
    { code: "AUD", label: "Australian Dollar" }
  ];

  const ENTRY_CATEGORIES = {
    expense: [
      "Housing",
      "Utilities",
      "Groceries",
      "Dining",
      "Transport",
      "Fuel",
      "Healthcare",
      "Insurance",
      "Debt",
      "Shopping",
      "Education",
      "Entertainment",
      "Travel",
      "Subscriptions",
      "Childcare",
      "Misc"
    ],
    income: [
      "Salary",
      "Freelance",
      "Bonus",
      "Interest",
      "Dividend",
      "Refund",
      "Gift",
      "Reimbursement",
      "Rental",
      "Other"
    ]
  };

  const SAMPLE_SNAPSHOT = {
    settings: {
      snapshotName: "April Budget Snapshot",
      periodLabel: "April 2026",
      currency: "USD",
      startingBalance: 1250,
      spendingLimit: 3200,
      savingsTarget: 900
    },
    entries: [
      { id: "s1", type: "income", label: "Main Paycheck", category: "Salary", amount: 2800, date: "2026-04-01", note: "Primary job" },
      { id: "s2", type: "income", label: "Freelance Invoice", category: "Freelance", amount: 650, date: "2026-04-08", note: "" },
      { id: "s3", type: "expense", label: "Rent", category: "Housing", amount: 1400, date: "2026-04-02", note: "" },
      { id: "s4", type: "expense", label: "Groceries", category: "Groceries", amount: 210.34, date: "2026-04-05", note: "Weekly + pantry" },
      { id: "s5", type: "expense", label: "Utilities", category: "Utilities", amount: 132.18, date: "2026-04-06", note: "" },
      { id: "s6", type: "expense", label: "Transit Pass", category: "Transport", amount: 89, date: "2026-04-07", note: "" },
      { id: "s7", type: "expense", label: "Dining Out", category: "Dining", amount: 74.5, date: "2026-04-09", note: "" },
      { id: "s8", type: "expense", label: "Streaming + SaaS", category: "Subscriptions", amount: 46.99, date: "2026-04-10", note: "" }
    ]
  };

  const refs = {
    panel: document.querySelector(".budget-panel"),
    recalcBtn: document.querySelector("#recalcBtn"),
    sampleBtn: document.querySelector("#sampleBtn"),
    copySummaryBtn: document.querySelector("#copySummaryBtn"),
    clearEntriesBtn: document.querySelector("#clearEntriesBtn"),
    resetSnapshotBtn: document.querySelector("#resetSnapshotBtn"),

    snapshotNameInput: document.querySelector("#snapshotNameInput"),
    periodLabelInput: document.querySelector("#periodLabelInput"),
    currencySelect: document.querySelector("#currencySelect"),
    liveSummaryToggle: document.querySelector("#liveSummaryToggle"),
    autosaveToggle: document.querySelector("#autosaveToggle"),
    startingBalanceInput: document.querySelector("#startingBalanceInput"),
    spendingLimitInput: document.querySelector("#spendingLimitInput"),
    savingsTargetInput: document.querySelector("#savingsTargetInput"),

    entryTypeExpenseBtn: document.querySelector("#entryTypeExpenseBtn"),
    entryTypeIncomeBtn: document.querySelector("#entryTypeIncomeBtn"),
    entryFormModeHint: document.querySelector("#entryFormModeHint"),
    entryLabelInput: document.querySelector("#entryLabelInput"),
    entryAmountInput: document.querySelector("#entryAmountInput"),
    entryCategorySelect: document.querySelector("#entryCategorySelect"),
    entryDateInput: document.querySelector("#entryDateInput"),
    entryNoteInput: document.querySelector("#entryNoteInput"),
    addEntryBtn: document.querySelector("#addEntryBtn"),
    updateEntryBtn: document.querySelector("#updateEntryBtn"),
    cancelEditBtn: document.querySelector("#cancelEditBtn"),
    resetFormBtn: document.querySelector("#resetFormBtn"),
    toggleEntriesLayoutBtn: document.querySelector("#toggleEntriesLayoutBtn"),

    entriesMeta: document.querySelector("#entriesMeta"),
    entriesTableBody: document.querySelector("#entriesTableBody"),
    entriesEmpty: document.querySelector("#entriesEmpty"),

    statusBadge: document.querySelector("#statusBadge"),
    statusMessage: document.querySelector("#statusMessage"),
    budgetProgressFill: document.querySelector("#budgetProgressFill"),
    budgetProgressLabel: document.querySelector("#budgetProgressLabel"),

    metricIncome: document.querySelector("#metricIncome"),
    metricExpenses: document.querySelector("#metricExpenses"),
    metricNet: document.querySelector("#metricNet"),
    metricEndBalance: document.querySelector("#metricEndBalance"),
    metricBudgetLeft: document.querySelector("#metricBudgetLeft"),
    metricSavingsGap: document.querySelector("#metricSavingsGap"),
    metricSavingsRate: document.querySelector("#metricSavingsRate"),
    metricEntryCount: document.querySelector("#metricEntryCount"),
    metricAvgExpense: document.querySelector("#metricAvgExpense"),
    metricLargestExpense: document.querySelector("#metricLargestExpense"),

    breakdownExpenseBtn: document.querySelector("#breakdownExpenseBtn"),
    breakdownIncomeBtn: document.querySelector("#breakdownIncomeBtn"),
    breakdownMeta: document.querySelector("#breakdownMeta"),
    breakdownList: document.querySelector("#breakdownList"),
    breakdownEmpty: document.querySelector("#breakdownEmpty"),

    detailModeHint: document.querySelector("#detailModeHint"),
    detailList: document.querySelector("#detailList"),
    warningList: document.querySelector("#warningList")
  };

  if (!(refs.panel instanceof HTMLElement) || !(refs.currencySelect instanceof HTMLSelectElement)) {
    return;
  }

  const state = {
    entries: [],
    entryType: "expense",
    editingEntryId: null,
    breakdownMode: "expense",
    entriesLayout: "split",
    debounceId: 0,
    lastSummary: null
  };

  init();

  function init() {
    populateCurrencySelect();
    setDefaultPeriodLabelIfEmpty();
    ensureEntryDateDefault();
    bindEvents();
    setEntryType("expense");
    renderEntriesLayoutMode();
    loadFromStorageIfEnabled();
    renderEntryFormMode();
    renderEntries();
    recalcAndRender("init");
  }

  function bindEvents() {
    refs.recalcBtn?.addEventListener("click", () => recalcAndRender("manual"));
    refs.sampleBtn?.addEventListener("click", () => loadSampleSnapshot());
    refs.copySummaryBtn?.addEventListener("click", (event) => copySummary(event.currentTarget));
    refs.clearEntriesBtn?.addEventListener("click", () => clearEntries());
    refs.resetSnapshotBtn?.addEventListener("click", () => resetSnapshot());

    refs.entryTypeExpenseBtn?.addEventListener("click", () => setEntryType("expense"));
    refs.entryTypeIncomeBtn?.addEventListener("click", () => setEntryType("income"));

    refs.addEntryBtn?.addEventListener("click", () => addEntryFromForm());
    refs.updateEntryBtn?.addEventListener("click", () => updateEntryFromForm());
    refs.cancelEditBtn?.addEventListener("click", () => cancelEdit());
    refs.resetFormBtn?.addEventListener("click", () => resetEntryForm());
    refs.toggleEntriesLayoutBtn?.addEventListener("click", () => toggleEntriesLayoutMode());

    refs.breakdownExpenseBtn?.addEventListener("click", () => setBreakdownMode("expense"));
    refs.breakdownIncomeBtn?.addEventListener("click", () => setBreakdownMode("income"));

    refs.panel.addEventListener("input", onPanelInput);
    refs.panel.addEventListener("change", onPanelInput);
    refs.entriesTableBody?.addEventListener("click", onEntriesTableClick);

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (state.editingEntryId) {
          updateEntryFromForm();
        } else {
          recalcAndRender("hotkey");
        }
      }
      if (event.key === "Escape" && state.editingEntryId) {
        cancelEdit();
      }
    });
  }

  function onPanelInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (
      target === refs.snapshotNameInput ||
      target === refs.periodLabelInput ||
      target === refs.currencySelect ||
      target === refs.startingBalanceInput ||
      target === refs.spendingLimitInput ||
      target === refs.savingsTargetInput
    ) {
      maybeScheduleRecalc();
      persistIfEnabled();
    }

    if (target === refs.autosaveToggle) {
      if (refs.autosaveToggle.checked) {
        persistSnapshot();
        setStatus("ok", "Autosave enabled.");
      } else {
        clearStoredSnapshot();
        setStatus("idle", "Autosave disabled. Existing saved snapshot removed.");
      }
    }

    if (target === refs.liveSummaryToggle) {
      if (refs.liveSummaryToggle.checked) {
        maybeScheduleRecalc();
      } else {
        setStatus("idle", "Live recalculate off. Click Recalculate after changing values.");
      }
    }
  }

  function maybeScheduleRecalc() {
    if (!refs.liveSummaryToggle?.checked) return;
    if (state.debounceId) window.clearTimeout(state.debounceId);
    state.debounceId = window.setTimeout(() => {
      state.debounceId = 0;
      recalcAndRender("live");
    }, 120);
  }

  function populateCurrencySelect() {
    refs.currencySelect.innerHTML = CURRENCIES
      .map((item) => `<option value="${escapeAttr(item.code)}">${escapeHtml(item.code)} (${escapeHtml(item.label)})</option>`)
      .join("");
    if (!refs.currencySelect.value) refs.currencySelect.value = "USD";
  }

  function setDefaultPeriodLabelIfEmpty() {
    if (!(refs.periodLabelInput instanceof HTMLInputElement) || refs.periodLabelInput.value.trim()) return;
    const now = new Date();
    refs.periodLabelInput.value = now.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  function ensureEntryDateDefault() {
    if (!(refs.entryDateInput instanceof HTMLInputElement)) return;
    if (!refs.entryDateInput.value) refs.entryDateInput.value = todayIsoDate();
  }

  function setEntryType(nextType) {
    const normalized = nextType === "income" ? "income" : "expense";
    state.entryType = normalized;
    populateEntryCategorySelect(normalized);
    renderEntryTypeUI();
    if (!state.editingEntryId) {
      autoFillEntryLabelFromCategory();
    }
  }

  function populateEntryCategorySelect(type) {
    const list = ENTRY_CATEGORIES[type] || ENTRY_CATEGORIES.expense;
    const previous = refs.entryCategorySelect.value;
    refs.entryCategorySelect.innerHTML = list.map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join("");
    refs.entryCategorySelect.value = list.includes(previous) ? previous : list[0];
  }

  function renderEntryTypeUI() {
    const isExpense = state.entryType === "expense";
    refs.entryTypeExpenseBtn?.classList.toggle("is-active", isExpense);
    refs.entryTypeIncomeBtn?.classList.toggle("is-active", !isExpense);
    refs.entryTypeExpenseBtn?.setAttribute("aria-pressed", String(isExpense));
    refs.entryTypeIncomeBtn?.setAttribute("aria-pressed", String(!isExpense));
  }

  function renderEntryFormMode() {
    const isEditing = Boolean(state.editingEntryId);
    refs.entryFormModeHint.textContent = isEditing ? "mode: edit" : `mode: add ${state.entryType}`;
    refs.addEntryBtn?.classList.toggle("is-hidden", isEditing);
    refs.updateEntryBtn?.classList.toggle("is-hidden", !isEditing);
    refs.cancelEditBtn?.classList.toggle("is-hidden", !isEditing);
  }

  function toggleEntriesLayoutMode() {
    state.entriesLayout = state.entriesLayout === "wide" ? "split" : "wide";
    renderEntriesLayoutMode();
  }

  function renderEntriesLayoutMode() {
    const isWide = state.entriesLayout === "wide";
    refs.panel.classList.toggle("is-entries-wide", isWide);
    if (refs.toggleEntriesLayoutBtn) {
      refs.toggleEntriesLayoutBtn.textContent = isWide ? "Split View" : "Expand Table";
      refs.toggleEntriesLayoutBtn.setAttribute("aria-pressed", String(isWide));
    }
  }

  function autoFillEntryLabelFromCategory() {
    if (!(refs.entryLabelInput instanceof HTMLInputElement) || !(refs.entryCategorySelect instanceof HTMLSelectElement)) return;
    if (refs.entryLabelInput.value.trim()) return;
    refs.entryLabelInput.value = refs.entryCategorySelect.value || "";
  }

  function addEntryFromForm() {
    const payload = readEntryForm();
    if (!payload.ok) {
      setStatus("warn", payload.message);
      return;
    }

    state.entries.push({
      id: createId(),
      type: payload.entry.type,
      label: payload.entry.label,
      category: payload.entry.category,
      amount: payload.entry.amount,
      date: payload.entry.date,
      note: payload.entry.note
    });

    sortEntriesInPlace();
    renderEntries();
    resetEntryForm({ keepType: true });
    recalcAndRender("entry-add");
    persistIfEnabled();
    setStatus("ok", "Entry added.");
  }

  function updateEntryFromForm() {
    if (!state.editingEntryId) return;
    const payload = readEntryForm();
    if (!payload.ok) {
      setStatus("warn", payload.message);
      return;
    }

    const index = state.entries.findIndex((entry) => entry.id === state.editingEntryId);
    if (index < 0) {
      cancelEdit();
      setStatus("warn", "The entry being edited no longer exists.");
      return;
    }

    state.entries[index] = {
      ...state.entries[index],
      type: payload.entry.type,
      label: payload.entry.label,
      category: payload.entry.category,
      amount: payload.entry.amount,
      date: payload.entry.date,
      note: payload.entry.note
    };

    sortEntriesInPlace();
    state.editingEntryId = null;
    renderEntryFormMode();
    renderEntries();
    resetEntryForm({ keepType: true });
    recalcAndRender("entry-update");
    persistIfEnabled();
    setStatus("ok", "Entry updated.");
  }

  function readEntryForm() {
    const type = state.entryType === "income" ? "income" : "expense";
    const label = String(refs.entryLabelInput?.value || "").trim();
    const category = String(refs.entryCategorySelect?.value || "").trim();
    const amount = parseAmount(refs.entryAmountInput?.value);
    const date = String(refs.entryDateInput?.value || "").trim() || todayIsoDate();
    const note = String(refs.entryNoteInput?.value || "").trim();

    if (!label) return { ok: false, message: "Enter a label for the entry." };
    if (!category) return { ok: false, message: "Choose a category for the entry." };
    if (amount == null || amount <= 0) return { ok: false, message: "Enter a valid amount greater than 0." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Enter a valid date." };

    return {
      ok: true,
      entry: { type, label, category, amount, date, note }
    };
  }

  function resetEntryForm(options = {}) {
    const keepType = Boolean(options.keepType);
    if (!keepType) setEntryType("expense");
    state.editingEntryId = null;
    renderEntryFormMode();
    if (refs.entryLabelInput) refs.entryLabelInput.value = "";
    if (refs.entryAmountInput) refs.entryAmountInput.value = "";
    if (refs.entryNoteInput) refs.entryNoteInput.value = "";
    if (refs.entryDateInput) refs.entryDateInput.value = todayIsoDate();
    if (refs.entryCategorySelect) refs.entryCategorySelect.selectedIndex = 0;
    if (!keepType) autoFillEntryLabelFromCategory();
  }

  function cancelEdit() {
    state.editingEntryId = null;
    resetEntryForm({ keepType: true });
    setStatus("idle", "Edit cancelled.");
  }

  function onEntriesTableClick(event) {
    const button = event.target instanceof HTMLElement ? event.target.closest("button[data-action][data-id]") : null;
    if (!(button instanceof HTMLButtonElement)) return;

    const action = button.dataset.action;
    const id = button.dataset.id || "";
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) {
      setStatus("warn", "Entry not found.");
      return;
    }

    if (action === "edit") {
      startEditingEntry(entry);
      return;
    }

    if (action === "duplicate") {
      state.entries.push({
        ...entry,
        id: createId(),
        label: `${entry.label} (copy)`
      });
      sortEntriesInPlace();
      renderEntries();
      recalcAndRender("entry-duplicate");
      persistIfEnabled();
      setStatus("ok", "Entry duplicated.");
      return;
    }

    if (action === "delete") {
      state.entries = state.entries.filter((item) => item.id !== id);
      if (state.editingEntryId === id) cancelEdit();
      renderEntries();
      recalcAndRender("entry-delete");
      persistIfEnabled();
      setStatus("ok", "Entry removed.");
    }
  }

  function startEditingEntry(entry) {
    state.editingEntryId = entry.id;
    setEntryType(entry.type);
    if (refs.entryLabelInput) refs.entryLabelInput.value = entry.label;
    if (refs.entryAmountInput) refs.entryAmountInput.value = String(entry.amount);
    if (refs.entryCategorySelect) refs.entryCategorySelect.value = entry.category;
    if (refs.entryDateInput) refs.entryDateInput.value = entry.date || todayIsoDate();
    if (refs.entryNoteInput) refs.entryNoteInput.value = entry.note || "";
    renderEntryFormMode();
    refs.entryLabelInput?.focus({ preventScroll: true });
    setStatus("idle", "Editing entry. Update or cancel to continue.");
  }

  function renderEntries() {
    const entries = state.entries;
    refs.entriesMeta.textContent = `${entries.length} item${entries.length === 1 ? "" : "s"}`;
    refs.entriesEmpty?.classList.toggle("is-hidden", entries.length > 0);

    if (!entries.length) {
      refs.entriesTableBody.innerHTML = "";
      return;
    }

    const formatter = getCurrencyFormatter(readCurrencyCode());
    refs.entriesTableBody.innerHTML = entries
      .map((entry) => {
        const amountText = formatter.format(entry.amount);
        return `
          <tr>
            <td data-label="Date" class="mono">${escapeHtml(formatDateLabel(entry.date))}</td>
            <td data-label="Type"><span class="budget-type-pill ${escapeAttr(entry.type)}">${escapeHtml(entry.type)}</span></td>
            <td data-label="Category">${escapeHtml(entry.category)}</td>
            <td data-label="Label">
              <div class="budget-row-label">
                <span>${escapeHtml(entry.label)}</span>
                ${entry.note ? `<span class="budget-row-note">${escapeHtml(entry.note)}</span>` : ""}
              </div>
            </td>
            <td data-label="Amount" class="mono">
              <span class="budget-amount ${escapeAttr(entry.type)}">${entry.type === "expense" ? "-" : "+"}${escapeHtml(amountText)}</span>
            </td>
            <td data-label="Actions">
              <div class="budget-row-actions">
                <button class="ghost-btn ghost-btn-small" type="button" data-action="edit" data-id="${escapeAttr(entry.id)}">Edit</button>
                <button class="ghost-btn ghost-btn-small" type="button" data-action="duplicate" data-id="${escapeAttr(entry.id)}">Copy</button>
                <button class="ghost-btn ghost-btn-small" type="button" data-action="delete" data-id="${escapeAttr(entry.id)}">Delete</button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  }

  function recalcAndRender(source) {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
      state.debounceId = 0;
    }

    const settings = readSnapshotSettings();
    const summary = buildSnapshotSummary(settings, state.entries);
    state.lastSummary = summary;
    renderSummary(summary, source);
    renderBreakdown(summary);
    renderDetails(summary);
    renderWarnings(summary.warnings);
    persistIfEnabled();
  }

  function readSnapshotSettings() {
    return {
      snapshotName: String(refs.snapshotNameInput?.value || "").trim() || "Budget Snapshot",
      periodLabel: String(refs.periodLabelInput?.value || "").trim(),
      currency: readCurrencyCode(),
      startingBalance: parseAmount(refs.startingBalanceInput?.value) ?? 0,
      spendingLimit: Math.max(0, parseAmount(refs.spendingLimitInput?.value) ?? 0),
      savingsTarget: Math.max(0, parseAmount(refs.savingsTargetInput?.value) ?? 0)
    };
  }

  function buildSnapshotSummary(settings, entries) {
    const incomeEntries = entries.filter((entry) => entry.type === "income");
    const expenseEntries = entries.filter((entry) => entry.type === "expense");
    const totalIncome = sumAmounts(incomeEntries);
    const totalExpenses = sumAmounts(expenseEntries);
    const net = totalIncome - totalExpenses;
    const endingBalance = settings.startingBalance + net;
    const budgetLeft = settings.spendingLimit > 0 ? settings.spendingLimit - totalExpenses : null;
    const budgetUsedRatio = settings.spendingLimit > 0 ? totalExpenses / settings.spendingLimit : null;
    const savingsGap = settings.savingsTarget > 0 ? endingBalance - settings.savingsTarget : null;
    const savingsRate = totalIncome > 0 ? net / totalIncome : null;
    const avgExpense = expenseEntries.length ? totalExpenses / expenseEntries.length : null;
    const largestExpense = maxEntryByAmount(expenseEntries);
    const largestIncome = maxEntryByAmount(incomeEntries);

    const breakdown = {
      expense: aggregateByCategory(expenseEntries),
      income: aggregateByCategory(incomeEntries)
    };

    const warnings = [];
    if (!entries.length) warnings.push("No entries yet. Add income and expense items to build the snapshot.");
    if (!incomeEntries.length && expenseEntries.length) warnings.push("There are expenses but no income entries.");
    if (settings.spendingLimit > 0 && totalExpenses > settings.spendingLimit) warnings.push("Spending exceeds the configured limit.");
    if (settings.spendingLimit > 0 && totalExpenses > settings.spendingLimit * 0.9 && totalExpenses <= settings.spendingLimit) warnings.push("Spending is above 90% of the limit.");
    if (endingBalance < 0) warnings.push("Ending balance is negative.");
    if (settings.savingsTarget > 0 && endingBalance < settings.savingsTarget) warnings.push("Savings target is not met.");

    const statusKind = !entries.length ? "idle" : warnings.length ? "warn" : "ok";
    const statusMessage = !entries.length
      ? "Ready. Add entries to build your snapshot."
      : `${formatCount(entries.length)} entries analyzed. Net ${signedCurrency(settings.currency, net)} and ending balance ${currency(settings.currency, endingBalance)}.`;

    return {
      settings,
      entries,
      incomeEntries,
      expenseEntries,
      totalIncome,
      totalExpenses,
      net,
      endingBalance,
      budgetLeft,
      budgetUsedRatio,
      savingsGap,
      savingsRate,
      avgExpense,
      largestExpense,
      largestIncome,
      breakdown,
      warnings,
      statusKind,
      statusMessage
    };
  }

  function renderSummary(summary, source) {
    setStatus(summary.statusKind, summary.statusMessage);
    renderBudgetProgress(summary);

    setMetric(refs.metricIncome, currency(summary.settings.currency, summary.totalIncome));
    setMetric(refs.metricExpenses, currency(summary.settings.currency, summary.totalExpenses));
    setMetric(refs.metricNet, signedCurrency(summary.settings.currency, summary.net), toneForSigned(summary.net));
    setMetric(refs.metricEndBalance, currency(summary.settings.currency, summary.endingBalance), toneForSigned(summary.endingBalance));

    if (summary.budgetLeft == null) {
      setMetric(refs.metricBudgetLeft, "No limit");
    } else {
      setMetric(refs.metricBudgetLeft, signedCurrency(summary.settings.currency, summary.budgetLeft), toneBudgetLeft(summary.budgetLeft));
    }

    if (summary.savingsGap == null) {
      setMetric(refs.metricSavingsGap, "No target");
    } else {
      setMetric(refs.metricSavingsGap, signedCurrency(summary.settings.currency, summary.savingsGap), toneBudgetLeft(summary.savingsGap));
    }

    setMetric(
      refs.metricSavingsRate,
      summary.savingsRate == null ? "n/a" : percent(summary.savingsRate),
      summary.savingsRate == null ? "" : toneSavingsRate(summary.savingsRate)
    );
    setMetric(refs.metricEntryCount, String(summary.entries.length));
    setMetric(refs.metricAvgExpense, summary.avgExpense == null ? "n/a" : currency(summary.settings.currency, summary.avgExpense));
    setMetric(
      refs.metricLargestExpense,
      summary.largestExpense ? currency(summary.settings.currency, summary.largestExpense.amount) : "n/a",
      summary.largestExpense ? "is-bad" : ""
    );

    if (refs.detailModeHint) refs.detailModeHint.textContent = `snapshot (${source})`;
  }

  function renderBudgetProgress(summary) {
    if (!(refs.budgetProgressFill instanceof HTMLElement) || !(refs.budgetProgressLabel instanceof HTMLElement)) return;
    refs.budgetProgressFill.classList.remove("warn", "over");

    if (summary.settings.spendingLimit <= 0) {
      refs.budgetProgressFill.style.width = "0%";
      refs.budgetProgressLabel.textContent = "No spending limit configured.";
      return;
    }

    const ratio = Number.isFinite(summary.budgetUsedRatio) ? summary.budgetUsedRatio : 0;
    const width = Math.max(0, Math.min(100, ratio * 100));
    refs.budgetProgressFill.style.width = `${width}%`;

    if (ratio > 1) {
      refs.budgetProgressFill.classList.add("over");
    } else if (ratio >= 0.9) {
      refs.budgetProgressFill.classList.add("warn");
    }

    refs.budgetProgressLabel.textContent =
      `${currency(summary.settings.currency, summary.totalExpenses)} of ${currency(summary.settings.currency, summary.settings.spendingLimit)} spent (${percent(ratio)})`;
  }

  function renderBreakdown(summary) {
    const mode = state.breakdownMode === "income" ? "income" : "expense";
    const items = summary.breakdown[mode];
    refs.breakdownMeta.textContent = `${items.length} categor${items.length === 1 ? "y" : "ies"}`;
    refs.breakdownEmpty?.classList.toggle("is-hidden", items.length > 0);

    if (!items.length) {
      refs.breakdownList.innerHTML = "";
      if (refs.breakdownEmpty) {
        refs.breakdownEmpty.textContent = mode === "expense"
          ? "Add expense entries to see category breakdowns."
          : "Add income entries to see category breakdowns.";
      }
      return;
    }

    refs.breakdownList.innerHTML = items
      .map((item) => {
        const widthPct = Math.max(8, Math.round(item.share * 100));
        return `
          <li class="budget-breakdown-item">
            <div class="budget-breakdown-main">
              <div class="budget-breakdown-label">${escapeHtml(item.category)}</div>
              <div class="budget-breakdown-meta">
                <div class="budget-breakdown-bar" aria-hidden="true">
                  <div class="budget-breakdown-bar-fill" style="width:${widthPct}%"></div>
                </div>
                <span class="budget-breakdown-share">${percent(item.share)}</span>
              </div>
            </div>
            <span class="code-chip mono">${escapeHtml(currency(summary.settings.currency, item.total))}</span>
          </li>`;
      })
      .join("");
  }

  function renderDetails(summary) {
    const rows = [
      ["Snapshot", summary.settings.snapshotName],
      ["Period", summary.settings.periodLabel || "(not set)"],
      ["Currency", summary.settings.currency],
      ["Starting balance", currency(summary.settings.currency, summary.settings.startingBalance)],
      ["Income entries", formatCount(summary.incomeEntries.length)],
      ["Expense entries", formatCount(summary.expenseEntries.length)],
      ["Largest income", summary.largestIncome ? `${summary.largestIncome.label} (${currency(summary.settings.currency, summary.largestIncome.amount)})` : "n/a"],
      ["Largest expense", summary.largestExpense ? `${summary.largestExpense.label} (${currency(summary.settings.currency, summary.largestExpense.amount)})` : "n/a"],
      ["Top expense category", summary.breakdown.expense[0] ? `${summary.breakdown.expense[0].category} (${currency(summary.settings.currency, summary.breakdown.expense[0].total)})` : "n/a"],
      ["Top income category", summary.breakdown.income[0] ? `${summary.breakdown.income[0].category} (${currency(summary.settings.currency, summary.breakdown.income[0].total)})` : "n/a"],
      ["Budget utilization", summary.budgetUsedRatio == null ? "n/a" : percent(summary.budgetUsedRatio)],
      ["Autosave", refs.autosaveToggle?.checked ? "on" : "off"]
    ];

    refs.detailList.innerHTML = rows.map(([key, value]) => kvMarkup(key, value)).join("");
  }

  function renderWarnings(warnings) {
    if (!Array.isArray(warnings) || warnings.length === 0) {
      refs.warningList.innerHTML = "";
      refs.warningList.classList.add("is-hidden");
      return;
    }
    refs.warningList.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    refs.warningList.classList.remove("is-hidden");
  }

  function setBreakdownMode(mode) {
    state.breakdownMode = mode === "income" ? "income" : "expense";
    const isExpense = state.breakdownMode === "expense";
    refs.breakdownExpenseBtn?.classList.toggle("is-active", isExpense);
    refs.breakdownIncomeBtn?.classList.toggle("is-active", !isExpense);
    refs.breakdownExpenseBtn?.setAttribute("aria-pressed", String(isExpense));
    refs.breakdownIncomeBtn?.setAttribute("aria-pressed", String(!isExpense));
    if (state.lastSummary) renderBreakdown(state.lastSummary);
  }

  function setMetric(node, value, toneClass = "") {
    if (!(node instanceof HTMLElement)) return;
    node.textContent = String(value);
    node.classList.remove("is-good", "is-warn", "is-bad");
    if (toneClass) node.classList.add(toneClass);
  }

  function setStatus(kind, message) {
    const normalized = ["ok", "warn", "error", "idle"].includes(kind) ? kind : "idle";
    refs.statusBadge.className = `budget-status-badge ${normalized}`;
    refs.statusBadge.textContent = normalized;
    refs.statusMessage.textContent = message || "";
  }

  function clearEntries() {
    state.entries = [];
    if (state.editingEntryId) cancelEdit();
    renderEntries();
    recalcAndRender("clear-entries");
    persistIfEnabled();
    setStatus("ok", "All entries cleared.");
  }

  function resetSnapshot() {
    if (refs.snapshotNameInput) refs.snapshotNameInput.value = "Monthly Snapshot";
    if (refs.periodLabelInput) refs.periodLabelInput.value = "";
    setDefaultPeriodLabelIfEmpty();
    if (refs.currencySelect) refs.currencySelect.value = "USD";
    if (refs.startingBalanceInput) refs.startingBalanceInput.value = "0";
    if (refs.spendingLimitInput) refs.spendingLimitInput.value = "3000";
    if (refs.savingsTargetInput) refs.savingsTargetInput.value = "1000";
    if (refs.liveSummaryToggle) refs.liveSummaryToggle.checked = true;
    if (refs.autosaveToggle) refs.autosaveToggle.checked = true;

    state.entries = [];
    state.breakdownMode = "expense";
    setBreakdownMode("expense");
    resetEntryForm();
    renderEntries();
    recalcAndRender("reset");
    persistIfEnabled();
    setStatus("ok", "Snapshot reset.");
  }

  function loadSampleSnapshot() {
    const data = deepClone(SAMPLE_SNAPSHOT);
    applySnapshotData(data);
    renderEntries();
    recalcAndRender("sample");
    persistIfEnabled();
    setStatus("ok", "Sample budget snapshot loaded.");
  }

  function applySnapshotData(data) {
    if (!data || typeof data !== "object") return;
    const settings = data.settings || {};
    if (refs.snapshotNameInput) refs.snapshotNameInput.value = String(settings.snapshotName || "Budget Snapshot");
    if (refs.periodLabelInput) refs.periodLabelInput.value = String(settings.periodLabel || "");
    if (refs.currencySelect) refs.currencySelect.value = isSupportedCurrency(settings.currency) ? settings.currency : "USD";
    if (refs.startingBalanceInput) refs.startingBalanceInput.value = String(Number.isFinite(settings.startingBalance) ? settings.startingBalance : 0);
    if (refs.spendingLimitInput) refs.spendingLimitInput.value = String(Number.isFinite(settings.spendingLimit) ? settings.spendingLimit : 0);
    if (refs.savingsTargetInput) refs.savingsTargetInput.value = String(Number.isFinite(settings.savingsTarget) ? settings.savingsTarget : 0);
    if (refs.liveSummaryToggle) refs.liveSummaryToggle.checked = true;
    if (refs.autosaveToggle) refs.autosaveToggle.checked = true;

    state.entries = Array.isArray(data.entries)
      ? data.entries
          .map(normalizeStoredEntry)
          .filter(Boolean)
      : [];
    sortEntriesInPlace();
    state.editingEntryId = null;
    resetEntryForm();
  }

  function normalizeStoredEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const type = entry.type === "income" ? "income" : entry.type === "expense" ? "expense" : null;
    const label = String(entry.label || "").trim();
    const category = String(entry.category || "").trim();
    const amount = Number(entry.amount);
    const date = String(entry.date || "").trim();
    const note = String(entry.note || "").trim();

    if (!type || !label || !category || !Number.isFinite(amount) || amount <= 0) return null;

    return {
      id: String(entry.id || createId()),
      type,
      label,
      category,
      amount,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIsoDate(),
      note
    };
  }

  function persistIfEnabled() {
    if (!refs.autosaveToggle?.checked) return;
    persistSnapshot();
  }

  function persistSnapshot() {
    try {
      const payload = {
        settings: readSnapshotSettings(),
        entries: state.entries
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures; surface only on explicit actions.
    }
  }

  function clearStoredSnapshot() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage failures.
    }
  }

  function loadFromStorageIfEnabled() {
    if (!refs.autosaveToggle?.checked) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      applySnapshotData(parsed);
    } catch {
      setStatus("warn", "Saved snapshot could not be loaded. Starting fresh.");
    }
  }

  function copySummary(button) {
    const summary = state.lastSummary;
    if (!summary) {
      setStatus("warn", "Nothing to copy yet.");
      return;
    }

    const lines = [
      `Budget Snapshot: ${summary.settings.snapshotName}`,
      `Period: ${summary.settings.periodLabel || "(not set)"}`,
      `Currency: ${summary.settings.currency}`,
      `Starting balance: ${currency(summary.settings.currency, summary.settings.startingBalance)}`,
      `Total income: ${currency(summary.settings.currency, summary.totalIncome)}`,
      `Total expenses: ${currency(summary.settings.currency, summary.totalExpenses)}`,
      `Net: ${signedCurrency(summary.settings.currency, summary.net)}`,
      `Ending balance: ${currency(summary.settings.currency, summary.endingBalance)}`,
      `Spending limit: ${summary.settings.spendingLimit > 0 ? currency(summary.settings.currency, summary.settings.spendingLimit) : "not set"}`,
      `Budget left: ${summary.budgetLeft == null ? "n/a" : signedCurrency(summary.settings.currency, summary.budgetLeft)}`,
      `Savings target: ${summary.settings.savingsTarget > 0 ? currency(summary.settings.currency, summary.settings.savingsTarget) : "not set"}`,
      `Savings gap: ${summary.savingsGap == null ? "n/a" : signedCurrency(summary.settings.currency, summary.savingsGap)}`,
      `Entries: ${summary.entries.length} (${summary.incomeEntries.length} income, ${summary.expenseEntries.length} expense)`,
      `Top expense categories: ${formatTopCategoryLine(summary.breakdown.expense, summary.settings.currency)}`,
      `Top income categories: ${formatTopCategoryLine(summary.breakdown.income, summary.settings.currency)}`
    ];

    if (summary.warnings.length) {
      lines.push("", "Warnings:");
      for (const warning of summary.warnings) {
        lines.push(`- ${warning}`);
      }
    }

    copyText(lines.join("\n")).then((ok) => {
      if (ok) {
        flashButton(button, "Copied");
        setStatus("ok", "Snapshot summary copied.");
      } else {
        setStatus("warn", "Copy failed in this browser.");
      }
    });
  }

  function formatTopCategoryLine(items, currencyCode) {
    if (!items.length) return "n/a";
    return items.slice(0, 5).map((item) => `${item.category} (${currency(currencyCode, item.total)})`).join(", ");
  }

  function aggregateByCategory(entries) {
    const totals = new Map();
    for (const entry of entries) {
      totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount);
    }
    const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(totals.entries())
      .map(([category, total]) => ({
        category,
        total,
        share: grandTotal > 0 ? total / grandTotal : 0
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.category.localeCompare(b.category);
      });
  }

  function sumAmounts(entries) {
    let sum = 0;
    for (const entry of entries) sum += entry.amount;
    return sum;
  }

  function maxEntryByAmount(entries) {
    if (!entries.length) return null;
    return entries.reduce((max, entry) => (entry.amount > max.amount ? entry : max), entries[0]);
  }

  function sortEntriesInPlace() {
    state.entries.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
  }

  function readCurrencyCode() {
    const code = String(refs.currencySelect?.value || "USD").toUpperCase();
    return isSupportedCurrency(code) ? code : "USD";
  }

  function isSupportedCurrency(code) {
    return CURRENCIES.some((currencyItem) => currencyItem.code === code);
  }

  function parseAmount(value) {
    const cleaned = String(value || "")
      .trim()
      .replace(/,/g, "");
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function currency(code, value) {
    if (!Number.isFinite(value)) return "-";
    try {
      return getCurrencyFormatter(code).format(value);
    } catch {
      return `${code} ${value.toFixed(2)}`;
    }
  }

  function signedCurrency(code, value) {
    if (!Number.isFinite(value)) return "-";
    if (value > 0) return `+${currency(code, value)}`;
    if (value < 0) return `-${currency(code, Math.abs(value))}`;
    return currency(code, 0);
  }

  const currencyFormatterCache = new Map();
  function getCurrencyFormatter(code) {
    if (!currencyFormatterCache.has(code)) {
      currencyFormatterCache.set(
        code,
        new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: code,
          maximumFractionDigits: 2
        })
      );
    }
    return currencyFormatterCache.get(code);
  }

  function percent(value) {
    if (!Number.isFinite(value)) return "n/a";
    return `${(value * 100).toFixed(value >= 1 ? 0 : 1).replace(/\.0$/, "")}%`;
  }

  function formatCount(value) {
    return Number(value || 0).toLocaleString();
  }

  function toneForSigned(value) {
    if (!Number.isFinite(value)) return "";
    if (value > 0) return "is-good";
    if (value < 0) return "is-bad";
    return "";
  }

  function toneBudgetLeft(value) {
    if (!Number.isFinite(value)) return "";
    if (value > 0) return "is-good";
    if (value < 0) return "is-bad";
    return "is-warn";
  }

  function toneSavingsRate(value) {
    if (!Number.isFinite(value)) return "";
    if (value >= 0.2) return "is-good";
    if (value >= 0) return "is-warn";
    return "is-bad";
  }

  function kvMarkup(key, value) {
    return `<div class="budget-kv-item"><div class="budget-kv-key">${escapeHtml(String(key))}</div><div class="budget-kv-value">${escapeHtml(String(value))}</div></div>`;
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

  function todayIsoDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateLabel(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "-";
    const [year, month, day] = isoDate.split("-").map((part) => Number(part));
    const dt = new Date(year, month - 1, day);
    if (!Number.isFinite(dt.getTime())) return isoDate;
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
