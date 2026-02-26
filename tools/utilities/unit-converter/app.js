(() => {
  const CATEGORIES = [
    {
      id: "length",
      label: "Length",
      baseLabel: "meter",
      defaultFrom: "m",
      defaultTo: "ft",
      units: [
        unitFactor("mm", "Millimeter", "mm", 0.001),
        unitFactor("cm", "Centimeter", "cm", 0.01),
        unitFactor("m", "Meter", "m", 1),
        unitFactor("km", "Kilometer", "km", 1000),
        unitFactor("in", "Inch", "in", 0.0254),
        unitFactor("ft", "Foot", "ft", 0.3048),
        unitFactor("yd", "Yard", "yd", 0.9144),
        unitFactor("mi", "Mile", "mi", 1609.344),
        unitFactor("nmi", "Nautical Mile", "nmi", 1852)
      ]
    },
    {
      id: "mass",
      label: "Mass",
      baseLabel: "kilogram",
      defaultFrom: "kg",
      defaultTo: "lb",
      units: [
        unitFactor("mg", "Milligram", "mg", 0.000001),
        unitFactor("g", "Gram", "g", 0.001),
        unitFactor("kg", "Kilogram", "kg", 1),
        unitFactor("t", "Metric Ton", "t", 1000),
        unitFactor("oz", "Ounce", "oz", 0.028349523125),
        unitFactor("lb", "Pound", "lb", 0.45359237),
        unitFactor("st", "Stone", "st", 6.35029318),
        unitFactor("ton_us", "US Short Ton", "ton", 907.18474),
        unitFactor("ton_uk", "UK Long Ton", "ton", 1016.0469088)
      ]
    },
    {
      id: "temperature",
      label: "Temperature",
      baseLabel: "celsius",
      defaultFrom: "c",
      defaultTo: "f",
      units: [
        unitTransform("c", "Celsius", "deg C", (v) => v, (v) => v),
        unitTransform("f", "Fahrenheit", "deg F", (v) => (v - 32) * (5 / 9), (v) => v * (9 / 5) + 32),
        unitTransform("k", "Kelvin", "K", (v) => v - 273.15, (v) => v + 273.15),
        unitTransform("r", "Rankine", "deg R", (v) => (v - 491.67) * (5 / 9), (v) => v * (9 / 5) + 491.67)
      ]
    },
    {
      id: "area",
      label: "Area",
      baseLabel: "square meter",
      defaultFrom: "m2",
      defaultTo: "ft2",
      units: [
        unitFactor("mm2", "Square Millimeter", "mm^2", 0.000001),
        unitFactor("cm2", "Square Centimeter", "cm^2", 0.0001),
        unitFactor("m2", "Square Meter", "m^2", 1),
        unitFactor("km2", "Square Kilometer", "km^2", 1000000),
        unitFactor("in2", "Square Inch", "in^2", 0.00064516),
        unitFactor("ft2", "Square Foot", "ft^2", 0.09290304),
        unitFactor("yd2", "Square Yard", "yd^2", 0.83612736),
        unitFactor("acre", "Acre", "acre", 4046.8564224),
        unitFactor("ha", "Hectare", "ha", 10000),
        unitFactor("mi2", "Square Mile", "mi^2", 2589988.110336)
      ]
    },
    {
      id: "volume",
      label: "Volume",
      baseLabel: "liter",
      defaultFrom: "l",
      defaultTo: "gal_us",
      units: [
        unitFactor("ml", "Milliliter", "mL", 0.001),
        unitFactor("l", "Liter", "L", 1),
        unitFactor("m3", "Cubic Meter", "m^3", 1000),
        unitFactor("tsp_us", "Teaspoon (US)", "tsp", 0.00492892159375),
        unitFactor("tbsp_us", "Tablespoon (US)", "tbsp", 0.01478676478125),
        unitFactor("floz_us", "Fluid Ounce (US)", "fl oz", 0.0295735295625),
        unitFactor("cup_us", "Cup (US)", "cup", 0.2365882365),
        unitFactor("pint_us", "Pint (US)", "pt", 0.473176473),
        unitFactor("quart_us", "Quart (US)", "qt", 0.946352946),
        unitFactor("gal_us", "Gallon (US)", "gal", 3.785411784)
      ]
    },
    {
      id: "speed",
      label: "Speed",
      baseLabel: "meter/second",
      defaultFrom: "kph",
      defaultTo: "mph",
      units: [
        unitFactor("mps", "Meter / Second", "m/s", 1),
        unitFactor("kph", "Kilometer / Hour", "km/h", 0.2777777777777778),
        unitFactor("mph", "Mile / Hour", "mph", 0.44704),
        unitFactor("knot", "Knot", "kn", 0.5144444444444445),
        unitFactor("fps", "Foot / Second", "ft/s", 0.3048)
      ]
    },
    {
      id: "time",
      label: "Time",
      baseLabel: "second",
      defaultFrom: "min",
      defaultTo: "s",
      units: [
        unitFactor("ms", "Millisecond", "ms", 0.001),
        unitFactor("s", "Second", "s", 1),
        unitFactor("min", "Minute", "min", 60),
        unitFactor("h", "Hour", "h", 3600),
        unitFactor("day", "Day", "day", 86400),
        unitFactor("week", "Week", "week", 604800),
        unitFactor("month_avg", "Month (avg)", "month", 2629800),
        unitFactor("year_avg", "Year (avg)", "year", 31557600)
      ]
    },
    {
      id: "data",
      label: "Data",
      baseLabel: "byte",
      defaultFrom: "mb",
      defaultTo: "mib",
      units: [
        unitFactor("bit", "Bit", "bit", 0.125),
        unitFactor("b", "Byte", "B", 1),
        unitFactor("kb", "Kilobyte (decimal)", "KB", 1e3),
        unitFactor("mb", "Megabyte (decimal)", "MB", 1e6),
        unitFactor("gb", "Gigabyte (decimal)", "GB", 1e9),
        unitFactor("tb", "Terabyte (decimal)", "TB", 1e12),
        unitFactor("kib", "Kibibyte (binary)", "KiB", 1024),
        unitFactor("mib", "Mebibyte (binary)", "MiB", 1024 ** 2),
        unitFactor("gib", "Gibibyte (binary)", "GiB", 1024 ** 3),
        unitFactor("tib", "Tebibyte (binary)", "TiB", 1024 ** 4)
      ]
    }
  ];

  const CATEGORY_MAP = new Map(CATEGORIES.map((cat) => [cat.id, cat]));

  const refs = {
    panel: document.querySelector(".units-panel"),
    categorySelect: document.querySelector("#categorySelect"),
    precisionInput: document.querySelector("#precisionInput"),
    liveConvertToggle: document.querySelector("#liveConvertToggle"),
    scientificToggle: document.querySelector("#scientificToggle"),
    trimZerosToggle: document.querySelector("#trimZerosToggle"),
    valueInput: document.querySelector("#valueInput"),
    fromUnitSelect: document.querySelector("#fromUnitSelect"),
    toUnitSelect: document.querySelector("#toUnitSelect"),
    swapBtn: document.querySelector("#swapBtn"),
    swapCenterBtn: document.querySelector("#swapCenterBtn"),
    convertBtn: document.querySelector("#convertBtn"),
    clearBtn: document.querySelector("#clearBtn"),
    copyResultBtn: document.querySelector("#copyResultBtn"),
    copyTableBtn: document.querySelector("#copyTableBtn"),
    selectResultBtn: document.querySelector("#selectResultBtn"),
    useResultAsInputBtn: document.querySelector("#useResultAsInputBtn"),
    categoryMeta: document.querySelector("#categoryMeta"),
    statusBadge: document.querySelector("#statusBadge"),
    statusMessage: document.querySelector("#statusMessage"),
    detailList: document.querySelector("#detailList"),
    warningList: document.querySelector("#warningList"),
    resultValue: document.querySelector("#resultValue"),
    resultFormula: document.querySelector("#resultFormula"),
    inverseValue: document.querySelector("#inverseValue"),
    baseValue: document.querySelector("#baseValue"),
    activeCategoryLabel: document.querySelector("#activeCategoryLabel"),
    tableMeta: document.querySelector("#tableMeta"),
    unitsTableBody: document.querySelector("#unitsTableBody"),
    tableEmpty: document.querySelector("#tableEmpty")
  };

  if (!(refs.panel instanceof HTMLElement) || !(refs.categorySelect instanceof HTMLSelectElement)) {
    return;
  }

  const state = {
    activeCategoryId: CATEGORIES[0].id,
    debounceId: 0,
    lastModel: null
  };

  init();

  function init() {
    populateCategorySelect();
    bindEvents();
    clampPrecision();
    applyCategory(state.activeCategoryId);
    convertAndRender("init");
  }

  function unitFactor(id, label, symbol, factor) {
    return { id, label, symbol, factor };
  }

  function unitTransform(id, label, symbol, toBase, fromBase) {
    return { id, label, symbol, toBase, fromBase };
  }

  function populateCategorySelect() {
    refs.categorySelect.innerHTML = CATEGORIES
      .map((cat) => `<option value="${escapeAttr(cat.id)}">${escapeHtml(cat.label)}</option>`)
      .join("");
    refs.categorySelect.value = state.activeCategoryId;
  }

  function bindEvents() {
    refs.convertBtn?.addEventListener("click", () => convertAndRender("manual"));
    refs.swapBtn?.addEventListener("click", () => swapUnits());
    refs.swapCenterBtn?.addEventListener("click", () => swapUnits());
    refs.clearBtn?.addEventListener("click", () => clearInput());
    refs.copyResultBtn?.addEventListener("click", (event) => copyPrimaryResult(event.currentTarget));
    refs.copyTableBtn?.addEventListener("click", (event) => copyTable(event.currentTarget));
    refs.selectResultBtn?.addEventListener("click", () => selectPrimaryResult());
    refs.useResultAsInputBtn?.addEventListener("click", () => useResultAsInput());

    refs.panel.addEventListener("input", onControlsChanged);
    refs.panel.addEventListener("change", onControlsChanged);
    refs.panel.addEventListener("click", onQuickValueClick);

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        convertAndRender("hotkey");
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        swapUnits();
      }
    });
  }

  function onControlsChanged(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target === refs.categorySelect) {
      applyCategory(refs.categorySelect.value);
    }

    if (target === refs.precisionInput) {
      clampPrecision();
    }

    if (refs.liveConvertToggle?.checked) {
      scheduleConvert();
    }
  }

  function onQuickValueClick(event) {
    const button = event.target instanceof HTMLElement ? event.target.closest("button[data-quick-value]") : null;
    if (!(button instanceof HTMLButtonElement) || !(refs.valueInput instanceof HTMLInputElement)) return;
    const nextValue = button.dataset.quickValue || "1";
    refs.valueInput.value = nextValue;
    refs.valueInput.focus({ preventScroll: true });
    refs.valueInput.select();
    if (refs.liveConvertToggle?.checked) {
      scheduleConvert();
    }
  }

  function scheduleConvert() {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
    }
    state.debounceId = window.setTimeout(() => {
      state.debounceId = 0;
      convertAndRender("live");
    }, 120);
  }

  function applyCategory(categoryId) {
    const category = CATEGORY_MAP.get(categoryId) || CATEGORIES[0];
    state.activeCategoryId = category.id;
    refs.categorySelect.value = category.id;

    const previousFrom = refs.fromUnitSelect.value;
    const previousTo = refs.toUnitSelect.value;

    refs.fromUnitSelect.innerHTML = category.units.map((unit) => unitOptionMarkup(unit)).join("");
    refs.toUnitSelect.innerHTML = category.units.map((unit) => unitOptionMarkup(unit)).join("");

    refs.fromUnitSelect.value = category.units.some((u) => u.id === previousFrom) ? previousFrom : category.defaultFrom;
    refs.toUnitSelect.value = category.units.some((u) => u.id === previousTo) ? previousTo : category.defaultTo;

    if (refs.fromUnitSelect.value === refs.toUnitSelect.value && category.units.length > 1) {
      refs.toUnitSelect.value = category.units.find((u) => u.id !== refs.fromUnitSelect.value)?.id || refs.toUnitSelect.value;
    }

    if (refs.categoryMeta) refs.categoryMeta.textContent = `base: ${category.baseLabel}`;
    if (refs.activeCategoryLabel) refs.activeCategoryLabel.textContent = category.label;
  }

  function unitOptionMarkup(unit) {
    return `<option value="${escapeAttr(unit.id)}">${escapeHtml(unit.label)} (${escapeHtml(unit.symbol)})</option>`;
  }

  function convertAndRender(source) {
    if (state.debounceId) {
      window.clearTimeout(state.debounceId);
      state.debounceId = 0;
    }

    const category = getActiveCategory();
    const options = readFormatOptions();
    const rawInput = refs.valueInput.value;
    const parsedValue = parseNumericInput(rawInput);

    if (parsedValue == null) {
      state.lastModel = null;
      renderEmpty(category, rawInput);
      setStatus(rawInput.trim() ? "error" : "idle", rawInput.trim() ? "Invalid number. Check the input format." : "Ready.");
      renderWarnings([]);
      renderDetails([]);
      return;
    }

    const fromUnit = findUnit(category, refs.fromUnitSelect.value) || category.units[0];
    const toUnit = findUnit(category, refs.toUnitSelect.value) || category.units[0];

    try {
      const model = buildConversionModel(category, parsedValue, fromUnit, toUnit, options);
      state.lastModel = model;
      renderModel(model, source);
      setStatus(model.warnings.length ? "warn" : "ok", model.statusMessage);
      renderWarnings(model.warnings);
      renderDetails(model.details);
    } catch (error) {
      state.lastModel = null;
      renderEmpty(category, rawInput);
      renderWarnings([]);
      renderDetails([]);
      setStatus("error", error instanceof Error ? error.message : "Unable to convert value.");
    }
  }

  function buildConversionModel(category, inputValue, fromUnit, toUnit, options) {
    const baseValue = toBase(category, fromUnit, inputValue);
    const convertedValue = fromBase(category, toUnit, baseValue);
    const inverseBase = toBase(category, toUnit, 1);
    const inverseValue = fromBase(category, fromUnit, inverseBase);

    const rows = category.units.map((unit) => {
      const rowValue = fromBase(category, unit, baseValue);
      return {
        unit,
        value: rowValue,
        isFrom: unit.id === fromUnit.id,
        isTo: unit.id === toUnit.id
      };
    });

    const warnings = [];
    if (category.id !== "temperature" && inputValue < 0) {
      warnings.push("Negative values are mathematically valid, but may be physically invalid for some measurements.");
    }
    if (category.id === "temperature") {
      const kelvin = fromBase(category, findUnit(category, "k"), baseValue);
      if (kelvin < 0) {
        warnings.push("The converted temperature is below absolute zero.");
      }
    }

    const details = [
      ["Category", category.label],
      ["From", `${fromUnit.label} (${fromUnit.symbol})`],
      ["To", `${toUnit.label} (${toUnit.symbol})`],
      ["Input", formatNumber(inputValue, options)],
      ["Base unit value", `${formatNumber(baseValue, options)} ${category.baseLabel}`],
      ["Table rows", String(rows.length)],
      ["Formatting", `${options.precision} decimals${options.trimZeros ? ", trimmed" : ""}${options.scientific ? ", scientific enabled" : ""}`]
    ];

    return {
      category,
      fromUnit,
      toUnit,
      inputValue,
      baseValue,
      convertedValue,
      inverseValue,
      rows,
      warnings,
      details,
      options,
      statusMessage: `${formatNumber(inputValue, options)} ${fromUnit.symbol} = ${formatNumber(convertedValue, options)} ${toUnit.symbol}`
    };
  }

  function toBase(category, unit, value) {
    if (typeof unit.toBase === "function") return unit.toBase(value);
    if (typeof unit.factor === "number") return value * unit.factor;
    throw new Error(`Unit ${unit.id} is missing conversion data.`);
  }

  function fromBase(category, unit, baseValue) {
    if (typeof unit.fromBase === "function") return unit.fromBase(baseValue);
    if (typeof unit.factor === "number") return baseValue / unit.factor;
    throw new Error(`Unit ${unit.id} is missing conversion data.`);
  }

  function renderModel(model, source) {
    const opts = model.options;
    const primaryText = `${formatNumber(model.convertedValue, opts)} ${model.toUnit.symbol}`;
    refs.resultValue.textContent = primaryText;

    refs.resultFormula.textContent =
      `${formatNumber(model.inputValue, opts)} ${model.fromUnit.symbol} -> ${formatNumber(model.convertedValue, opts)} ${model.toUnit.symbol} (${source === "live" ? "live" : "manual"})`;

    refs.inverseValue.textContent = `1 ${model.toUnit.symbol} = ${formatNumber(model.inverseValue, opts)} ${model.fromUnit.symbol}`;
    refs.baseValue.textContent = `${formatNumber(model.baseValue, opts)} ${model.category.baseLabel}`;
    refs.activeCategoryLabel.textContent = model.category.label;

    renderTable(model.rows, model.options);
  }

  function renderTable(rows, options) {
    if (!Array.isArray(rows) || rows.length === 0) {
      refs.unitsTableBody.innerHTML = "";
      refs.tableEmpty.classList.remove("is-hidden");
      refs.tableMeta.textContent = "0 rows";
      return;
    }

    refs.tableEmpty.classList.add("is-hidden");
    refs.tableMeta.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
    refs.unitsTableBody.innerHTML = rows
      .map((row) => {
        const classes = [
          row.isFrom ? "is-from" : "",
          row.isTo ? "is-to" : ""
        ].filter(Boolean).join(" ");
        return `
          <tr class="${classes}">
            <td>${escapeHtml(row.unit.label)}</td>
            <td>${escapeHtml(row.unit.symbol)}</td>
            <td>${escapeHtml(formatNumber(row.value, options))}</td>
          </tr>`;
      })
      .join("");
  }

  function renderDetails(rows) {
    refs.detailList.innerHTML = Array.isArray(rows)
      ? rows.map(([key, value]) => kvMarkup(key, value)).join("")
      : "";
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

  function renderEmpty(category, rawInput) {
    const inputLabel = rawInput && rawInput.trim() ? `Input: ${rawInput.trim()}` : "Enter a value and choose units.";
    refs.resultValue.textContent = "-";
    refs.resultFormula.textContent = inputLabel;
    refs.inverseValue.textContent = "-";
    refs.baseValue.textContent = "-";
    refs.activeCategoryLabel.textContent = category.label;
    refs.tableMeta.textContent = "0 rows";
    refs.unitsTableBody.innerHTML = "";
    refs.tableEmpty.classList.remove("is-hidden");
  }

  function setStatus(kind, message) {
    const normalized = ["ok", "warn", "error", "idle"].includes(kind) ? kind : "idle";
    refs.statusBadge.className = `units-status-badge ${normalized}`;
    refs.statusBadge.textContent = normalized;
    refs.statusMessage.textContent = message || "";
  }

  function swapUnits() {
    const from = refs.fromUnitSelect.value;
    const to = refs.toUnitSelect.value;
    refs.fromUnitSelect.value = to;
    refs.toUnitSelect.value = from;
    if (refs.liveConvertToggle?.checked) {
      convertAndRender("swap");
    } else {
      setStatus("idle", "Units swapped. Click Convert.");
    }
  }

  function clearInput() {
    refs.valueInput.value = "";
    refs.valueInput.focus({ preventScroll: true });
    convertAndRender("clear");
  }

  function copyPrimaryResult(button) {
    if (!state.lastModel) {
      setStatus("warn", "Nothing to copy yet.");
      return;
    }
    const opts = state.lastModel.options;
    const text = [
      `${formatNumber(state.lastModel.inputValue, opts)} ${state.lastModel.fromUnit.symbol}`,
      "=",
      `${formatNumber(state.lastModel.convertedValue, opts)} ${state.lastModel.toUnit.symbol}`
    ].join(" ");

    copyText(text).then((ok) => {
      if (ok) {
        flashButton(button, "Copied");
        setStatus("ok", "Copied primary conversion result.");
      } else {
        setStatus("warn", "Copy failed in this browser.");
      }
    });
  }

  function copyTable(button) {
    if (!state.lastModel || !Array.isArray(state.lastModel.rows) || !state.lastModel.rows.length) {
      setStatus("warn", "Nothing to copy yet.");
      return;
    }
    const opts = state.lastModel.options;
    const text = [
      `Category\t${state.lastModel.category.label}`,
      `Input\t${formatNumber(state.lastModel.inputValue, opts)} ${state.lastModel.fromUnit.symbol}`,
      "",
      "Unit\tSymbol\tValue",
      ...state.lastModel.rows.map((row) => `${row.unit.label}\t${row.unit.symbol}\t${formatNumber(row.value, opts)}`)
    ].join("\n");

    copyText(text).then((ok) => {
      if (ok) {
        flashButton(button, "Copied");
        setStatus("ok", `Copied ${state.lastModel.rows.length} table rows.`);
      } else {
        setStatus("warn", "Copy failed in this browser.");
      }
    });
  }

  function selectPrimaryResult() {
    if (!state.lastModel) {
      setStatus("warn", "Nothing to select yet.");
      return;
    }
    if (!refs.resultValue || !refs.resultValue.textContent || refs.resultValue.textContent === "-") {
      setStatus("warn", "Nothing to select yet.");
      return;
    }

    try {
      const selection = window.getSelection();
      if (!selection) {
        setStatus("warn", "Selection is not available in this browser.");
        return;
      }

      const range = document.createRange();
      range.selectNodeContents(refs.resultValue);
      selection.removeAllRanges();
      selection.addRange(range);
      setStatus("ok", "Primary result selected.");
    } catch {
      setStatus("warn", "Unable to select the result text.");
    }
  }

  function useResultAsInput() {
    if (!state.lastModel) {
      setStatus("warn", "Nothing to reuse yet.");
      return;
    }
    refs.valueInput.value = String(state.lastModel.convertedValue);
    refs.fromUnitSelect.value = state.lastModel.toUnit.id;
    refs.toUnitSelect.value = state.lastModel.fromUnit.id;
    if (refs.liveConvertToggle?.checked) {
      convertAndRender("reuse");
    } else {
      setStatus("idle", "Reused result as input. Click Convert.");
    }
  }

  function getActiveCategory() {
    return CATEGORY_MAP.get(state.activeCategoryId) || CATEGORIES[0];
  }

  function findUnit(category, unitId) {
    return category.units.find((unit) => unit.id === unitId) || null;
  }

  function clampPrecision() {
    const value = clamp(readInt(refs.precisionInput, 4), 0, 12);
    refs.precisionInput.value = String(value);
  }

  function readFormatOptions() {
    return {
      precision: clamp(readInt(refs.precisionInput, 4), 0, 12),
      scientific: Boolean(refs.scientificToggle?.checked),
      trimZeros: Boolean(refs.trimZerosToggle?.checked)
    };
  }

  function parseNumericInput(text) {
    const cleaned = String(text || "")
      .trim()
      .replace(/,/g, "");
    if (!cleaned) return null;
    const value = Number.parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  function formatNumber(value, options) {
    if (!Number.isFinite(value)) return "NaN";
    const precision = clamp(options?.precision ?? 4, 0, 12);
    const scientific = Boolean(options?.scientific);
    const trimZeros = options?.trimZeros !== false;

    const abs = Math.abs(value);
    if (scientific && abs !== 0 && (abs >= 1e9 || abs < 1e-6)) {
      return value.toExponential(precision);
    }

    let output;
    if (precision === 0) {
      output = Math.round(value).toString();
    } else {
      output = value.toFixed(precision);
      if (trimZeros) {
        output = output.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
      }
    }

    if (Object.is(value, -0)) {
      return "0";
    }
    if (output === "-0") {
      return "0";
    }
    return output;
  }

  function kvMarkup(key, value) {
    return `<div class="units-kv-item"><div class="units-kv-key">${escapeHtml(String(key))}</div><div class="units-kv-value">${escapeHtml(String(value))}</div></div>`;
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

  function readInt(input, fallback) {
    if (!(input instanceof HTMLInputElement)) return fallback;
    const parsed = Number.parseInt(input.value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
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

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
