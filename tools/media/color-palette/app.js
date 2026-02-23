(() => {
  const STORAGE_KEY = "tool-color-palette-builder-state-v1";

  const DEFAULTS = {
    baseHex: "#4DA3FF",
    harmonyMode: "analogous",
    swatchCount: 6,
    hueSpread: 60,
    saturationBias: 72,
    lightnessBias: 58,
    preserveLocks: true,
    exportFormat: "css",
    exportPrefix: "palette"
  };

  const refs = {
    baseColorInput: document.getElementById("baseColorInput"),
    baseHexInput: document.getElementById("baseHexInput"),
    baseSwatchChip: document.getElementById("baseSwatchChip"),
    harmonyMode: document.getElementById("harmonyMode"),
    swatchCount: document.getElementById("swatchCount"),
    swatchCountOut: document.getElementById("swatchCountOut"),
    hueSpread: document.getElementById("hueSpread"),
    hueSpreadOut: document.getElementById("hueSpreadOut"),
    saturationBias: document.getElementById("saturationBias"),
    saturationBiasOut: document.getElementById("saturationBiasOut"),
    lightnessBias: document.getElementById("lightnessBias"),
    lightnessBiasOut: document.getElementById("lightnessBiasOut"),
    preserveLocksToggle: document.getElementById("preserveLocksToggle"),
    generatorSummary: document.getElementById("generatorSummary"),
    regenerateBtn: document.getElementById("regenerateBtn"),
    randomizeBtn: document.getElementById("randomizeBtn"),
    unlockAllBtn: document.getElementById("unlockAllBtn"),
    copyPaletteBtn: document.getElementById("copyPaletteBtn"),
    selectedIndexBadge: document.getElementById("selectedIndexBadge"),
    selectedPreview: document.getElementById("selectedPreview"),
    selectedHex: document.getElementById("selectedHex"),
    selectedRgb: document.getElementById("selectedRgb"),
    selectedHsl: document.getElementById("selectedHsl"),
    contrastWhite: document.getElementById("contrastWhite"),
    contrastBlack: document.getElementById("contrastBlack"),
    copySelectedBtn: document.getElementById("copySelectedBtn"),
    copySelectedRgbBtn: document.getElementById("copySelectedRgbBtn"),
    lockCountLabel: document.getElementById("lockCountLabel"),
    paletteMetaLabel: document.getElementById("paletteMetaLabel"),
    swatchGrid: document.getElementById("swatchGrid"),
    previewSurface: document.getElementById("previewSurface"),
    gradientPreview: document.getElementById("gradientPreview"),
    miniScale: document.getElementById("miniScale"),
    previewThemeHint: document.getElementById("previewThemeHint"),
    exportFormatSelect: document.getElementById("exportFormatSelect"),
    exportPrefixInput: document.getElementById("exportPrefixInput"),
    copyExportBtn: document.getElementById("copyExportBtn"),
    downloadExportBtn: document.getElementById("downloadExportBtn"),
    exportOutput: document.getElementById("exportOutput"),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage")
  };

  const state = {
    settings: { ...DEFAULTS },
    palette: [],
    locks: [],
    selectedIndex: 0
  };

  initialize();

  function initialize() {
    restoreState();
    bindEvents();
    applyStateToControls();

    if (!state.palette.length) {
      regeneratePalette({ preserveLocks: false, reason: "Generated initial palette." });
    } else {
      ensureArrayLengths();
      renderAll();
      setStatus("idle", "Restored saved palette.");
    }
  }

  function bindEvents() {
    refs.baseColorInput.addEventListener("input", () => {
      setBaseColor(refs.baseColorInput.value, { regenerate: true, reason: "Updated base color." });
    });

    refs.baseHexInput.addEventListener("change", commitBaseHexInput);
    refs.baseHexInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitBaseHexInput();
      }
    });

    refs.harmonyMode.addEventListener("change", () => {
      state.settings.harmonyMode = refs.harmonyMode.value;
      regeneratePalette({ preserveLocks: true, reason: `Harmony: ${state.settings.harmonyMode}.` });
    });

    bindRange(refs.swatchCount, () => {
      state.settings.swatchCount = clampInt(refs.swatchCount.value, 3, 12, DEFAULTS.swatchCount);
      ensureArrayLengths();
      regeneratePalette({ preserveLocks: true, reason: `Swatches: ${state.settings.swatchCount}.` });
    });

    bindRange(refs.hueSpread, () => {
      state.settings.hueSpread = clampInt(refs.hueSpread.value, 15, 180, DEFAULTS.hueSpread);
      regeneratePalette({ preserveLocks: true, reason: `Hue spread: ${state.settings.hueSpread}°.` });
    });

    bindRange(refs.saturationBias, () => {
      state.settings.saturationBias = clampInt(refs.saturationBias.value, 5, 100, DEFAULTS.saturationBias);
      regeneratePalette({ preserveLocks: true, reason: `Saturation bias: ${state.settings.saturationBias}.` });
    });

    bindRange(refs.lightnessBias, () => {
      state.settings.lightnessBias = clampInt(refs.lightnessBias.value, 5, 95, DEFAULTS.lightnessBias);
      regeneratePalette({ preserveLocks: true, reason: `Lightness bias: ${state.settings.lightnessBias}.` });
    });

    refs.preserveLocksToggle.addEventListener("change", () => {
      state.settings.preserveLocks = refs.preserveLocksToggle.checked;
      persistState();
      renderMeta();
      setStatus("idle", `Preserve locks ${state.settings.preserveLocks ? "enabled" : "disabled"}.`);
    });

    refs.regenerateBtn.addEventListener("click", () => {
      regeneratePalette({ preserveLocks: true, reason: "Palette regenerated." });
    });

    refs.randomizeBtn.addEventListener("click", () => {
      randomizeBaseAndRegenerate();
    });

    refs.unlockAllBtn.addEventListener("click", () => {
      state.locks = state.locks.map(() => false);
      persistState();
      renderAll();
      setStatus("idle", "Unlocked all swatches.");
    });

    refs.copyPaletteBtn.addEventListener("click", async () => {
      const payload = state.palette.join("\n");
      await copyWithFeedback(payload, refs.copyPaletteBtn, "Palette copied.");
    });

    refs.copySelectedBtn.addEventListener("click", async () => {
      const color = getSelectedColor();
      await copyWithFeedback(color, refs.copySelectedBtn, "Selected HEX copied.");
    });

    refs.copySelectedRgbBtn.addEventListener("click", async () => {
      const rgb = hexToRgb(getSelectedColor());
      const text = rgbToCss(rgb);
      await copyWithFeedback(text, refs.copySelectedRgbBtn, "Selected RGB copied.");
    });

    refs.swatchGrid.addEventListener("click", onSwatchGridClick);
    refs.swatchGrid.addEventListener("change", onSwatchGridChange);

    refs.exportFormatSelect.addEventListener("change", () => {
      state.settings.exportFormat = refs.exportFormatSelect.value;
      persistState();
      renderExport();
      setStatus("idle", `Export format: ${state.settings.exportFormat}.`);
    });

    refs.exportPrefixInput.addEventListener("input", () => {
      state.settings.exportPrefix = refs.exportPrefixInput.value;
      persistState();
      renderExport();
    });

    refs.copyExportBtn.addEventListener("click", async () => {
      await copyWithFeedback(refs.exportOutput.value, refs.copyExportBtn, "Export copied.");
    });

    refs.downloadExportBtn.addEventListener("click", downloadExport);

    window.addEventListener("keydown", onGlobalKeydown);
  }

  function bindRange(input, onCommit) {
    input.addEventListener("input", () => {
      syncControlOutputs();
      onCommit();
    });
  }

  function onGlobalKeydown(event) {
    const active = document.activeElement;
    const isTyping =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      active?.isContentEditable;

    if (isTyping) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      regeneratePalette({ preserveLocks: true, reason: "Palette regenerated." });
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "r") {
      event.preventDefault();
      randomizeBaseAndRegenerate();
    }
    if (key === "u") {
      event.preventDefault();
      state.locks = state.locks.map(() => false);
      persistState();
      renderAll();
      setStatus("idle", "Unlocked all swatches.");
    }
  }

  function commitBaseHexInput() {
    const normalized = normalizeHex(refs.baseHexInput.value);
    if (!normalized) {
      refs.baseHexInput.value = state.settings.baseHex;
      setStatus("warn", "Invalid HEX. Use #RRGGBB or #RGB.");
      return;
    }
    setBaseColor(normalized, { regenerate: true, reason: "Updated base color." });
  }

  function setBaseColor(hex, options = {}) {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    state.settings.baseHex = normalized;

    const baseHsl = rgbToHsl(hexToRgb(normalized));
    state.settings.saturationBias = clampInt(Math.round(baseHsl.s), 5, 100, state.settings.saturationBias);
    state.settings.lightnessBias = clampInt(Math.round(baseHsl.l), 5, 95, state.settings.lightnessBias);

    applyStateToControls();

    if (options.regenerate) {
      regeneratePalette({ preserveLocks: true, reason: options.reason || "Updated base color." });
    } else {
      persistState();
      renderAll();
    }
  }

  function randomizeBaseAndRegenerate() {
    const hue = Math.floor(Math.random() * 360);
    const sat = randomInt(55, 90);
    const light = randomInt(42, 68);
    const baseHex = hslToHex({ h: hue, s: sat, l: light });
    state.settings.baseHex = baseHex;
    state.settings.saturationBias = sat;
    state.settings.lightnessBias = light;
    applyStateToControls();
    regeneratePalette({ preserveLocks: true, reason: "Randomized base color." });
  }

  function regeneratePalette(options = {}) {
    const preserveLocks = options.preserveLocks && state.settings.preserveLocks;
    const generated = generatePaletteFromSettings();

    ensureArrayLengths();
    const next = generated.slice(0, state.settings.swatchCount);
    while (next.length < state.settings.swatchCount) next.push(next[next.length - 1] || state.settings.baseHex);

    if (preserveLocks) {
      for (let i = 0; i < next.length; i += 1) {
        if (state.locks[i] && normalizeHex(state.palette[i])) {
          next[i] = normalizeHex(state.palette[i]);
        }
      }
    }

    state.palette = next.map((c) => normalizeHex(c) || state.settings.baseHex);
    if (state.selectedIndex >= state.palette.length) state.selectedIndex = 0;

    persistState();
    renderAll();
    setStatus("ok", options.reason || "Palette regenerated.");
  }

  function generatePaletteFromSettings() {
    const base = rgbToHsl(hexToRgb(state.settings.baseHex));
    const count = state.settings.swatchCount;
    const mode = state.settings.harmonyMode;
    const spread = state.settings.hueSpread;
    const out = [];

    for (let i = 0; i < count; i += 1) {
      if (i === 0) {
        out.push(state.settings.baseHex);
        continue;
      }

      const t = count <= 1 ? 0 : i / (count - 1);
      const centered = count <= 1 ? 0 : (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const hueOffset = computeHueOffset(mode, i, count, spread);
      const jitter = mode === "monochrome" ? 0 : Math.sin(i * 1.73) * 4;
      const hue = wrapHue(base.h + hueOffset + jitter);

      let sat;
      let light;

      if (mode === "monochrome") {
        sat = clamp(state.settings.saturationBias + Math.cos(i * 1.2) * 6, 8, 100);
        light = clamp(state.settings.lightnessBias + centered * 28 + Math.sin(i * 0.9) * 4, 6, 95);
      } else {
        sat = clamp(state.settings.saturationBias + Math.cos((t + 0.12) * Math.PI * 2) * 10 - Math.floor(i / 3) * 2, 8, 100);
        light = clamp(state.settings.lightnessBias + centered * 18 + Math.sin((t + 0.25) * Math.PI * 2) * 5, 6, 95);
      }

      out.push(hslToHex({ h: hue, s: sat, l: light }));
    }

    return out;
  }

  function computeHueOffset(mode, index, count, spread) {
    if (mode === "monochrome") return 0;
    if (mode === "analogous") {
      if (count <= 1) return 0;
      return lerp(-spread, spread, index / (count - 1));
    }

    const anchors = getHarmonyAnchors(mode, spread);
    const pos = index - 1;
    const anchor = anchors[pos % anchors.length] || 0;
    const cycle = Math.floor(pos / anchors.length);
    const jitter = cycle ? (cycle * 8) * (pos % 2 === 0 ? 1 : -1) : 0;
    return anchor + jitter;
  }

  function getHarmonyAnchors(mode, spread) {
    switch (mode) {
      case "complementary":
        return [0, 180, spread / 4, 180 - spread / 4];
      case "triad":
        return [0, 120, 240];
      case "split":
        return [0, 180 - spread / 2, 180 + spread / 2];
      case "tetrad":
        return [0, 90, 180, 270];
      default:
        return [0];
    }
  }

  function onSwatchGridClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".swatch-card[data-index]");
    if (!card) return;
    const index = Number(card.dataset.index);
    if (!Number.isInteger(index)) return;

    const actionEl = target.closest("[data-action]");
    if (actionEl instanceof HTMLElement) {
      const action = actionEl.dataset.action;
      handleSwatchAction(index, action, actionEl);
      return;
    }

    state.selectedIndex = clampInt(index, 0, state.palette.length - 1, 0);
    persistState();
    renderSelected();
    renderSwatches();
  }

  function onSwatchGridChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".swatch-card[data-index]");
    if (!card) return;
    const index = Number(card.dataset.index);
    if (!Number.isInteger(index)) return;

    if (target.matches("input[data-role='hex']")) {
      const normalized = normalizeHex(target.value);
      if (!normalized) {
        renderSwatches();
        setStatus("warn", "Invalid HEX for swatch. Reverted.");
        return;
      }
      updateSwatchColor(index, normalized, { reason: `Updated swatch #${index + 1}.` });
      return;
    }

    if (target.matches("input[data-role='picker']")) {
      updateSwatchColor(index, target.value, { reason: `Updated swatch #${index + 1}.` });
    }
  }

  function handleSwatchAction(index, action, triggerEl) {
    if (!action) return;
    if (action === "lock") {
      state.locks[index] = !state.locks[index];
      persistState();
      renderSwatches();
      renderMeta();
      setStatus("idle", `${state.locks[index] ? "Locked" : "Unlocked"} swatch #${index + 1}.`);
      return;
    }

    if (action === "select") {
      state.selectedIndex = index;
      persistState();
      renderSelected();
      renderSwatches();
      return;
    }

    if (action === "copy") {
      void copyWithFeedback(state.palette[index], triggerEl, `Copied swatch #${index + 1}.`);
      return;
    }

    if (action === "base") {
      setBaseColor(state.palette[index], { regenerate: true, reason: `Using swatch #${index + 1} as base.` });
    }
  }

  function updateSwatchColor(index, hex, options = {}) {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    state.palette[index] = normalized;
    state.selectedIndex = index;
    if (index === 0) {
      state.settings.baseHex = normalized;
      const hsl = rgbToHsl(hexToRgb(normalized));
      state.settings.saturationBias = clampInt(Math.round(hsl.s), 5, 100, state.settings.saturationBias);
      state.settings.lightnessBias = clampInt(Math.round(hsl.l), 5, 95, state.settings.lightnessBias);
      applyStateToControls();
    }
    persistState();
    renderAll();
    if (options.reason) {
      setStatus("idle", options.reason);
    }
  }

  function renderAll() {
    ensureArrayLengths();
    syncControlOutputs();
    renderMeta();
    renderSwatches();
    renderSelected();
    renderPreview();
    renderExport();
  }

  function renderMeta() {
    refs.baseSwatchChip.textContent = state.settings.baseHex;
    refs.baseSwatchChip.style.color = bestTextOn(state.settings.baseHex) === "#FFFFFF" ? "#ffffff" : "#111111";
    refs.baseSwatchChip.style.background = state.settings.baseHex;
    refs.baseSwatchChip.style.borderColor = "rgba(255,255,255,0.08)";

    const lockCount = state.locks.filter(Boolean).length;
    refs.lockCountLabel.textContent = `${lockCount} locked`;
    refs.paletteMetaLabel.textContent = `${state.palette.length} colors`;
    refs.generatorSummary.textContent = `${state.settings.harmonyMode} • ${state.settings.swatchCount}`;
  }

  function renderSwatches() {
    refs.swatchGrid.innerHTML = state.palette
      .map((hex, index) => renderSwatchCard(index, hex, Boolean(state.locks[index]), index === state.selectedIndex))
      .join("");
  }

  function renderSwatchCard(index, hex, locked, selected) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb);
    const whiteContrast = contrastRatio(hex, "#FFFFFF");
    const blackContrast = contrastRatio(hex, "#000000");
    const textColor = bestTextOn(hex);

    return `
      <article class="swatch-card${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}" data-index="${index}">
        <button class="swatch-color" type="button" data-action="select" style="background:${hex}; color:${textColor}"></button>
        <div class="swatch-body">
          <div class="swatch-top">
            <span class="swatch-index mono">#${index + 1}</span>
            <div class="swatch-actions">
              <button type="button" class="swatch-mini-btn ${locked ? "locked" : ""}" data-action="lock">${locked ? "Lock" : "Unlock"}</button>
              <button type="button" class="swatch-mini-btn" data-action="copy">Copy</button>
              <button type="button" class="swatch-mini-btn" data-action="base">Base</button>
            </div>
          </div>
          <div class="swatch-inputs">
            <input data-role="picker" type="color" value="${hex.toLowerCase()}" aria-label="Swatch ${index + 1} picker" />
            <input data-role="hex" type="text" spellcheck="false" value="${hex}" aria-label="Swatch ${index + 1} hex" />
          </div>
          <div class="swatch-meta mono">rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) • hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%)</div>
          <div class="swatch-contrast mono">
            <span class="contrast-chip">W ${whiteContrast.toFixed(2)}:1</span>
            <span class="contrast-chip">B ${blackContrast.toFixed(2)}:1</span>
          </div>
        </div>
      </article>`;
  }

  function renderSelected() {
    const color = getSelectedColor();
    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb);
    refs.selectedIndexBadge.textContent = `#${state.selectedIndex + 1}`;
    refs.selectedPreview.style.background = color;
    refs.selectedHex.textContent = color;
    refs.selectedRgb.textContent = rgbToCss(rgb);
    refs.selectedHsl.textContent = `hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%)`;
    refs.contrastWhite.textContent = `${contrastRatio(color, "#FFFFFF").toFixed(2)}:1`;
    refs.contrastBlack.textContent = `${contrastRatio(color, "#000000").toFixed(2)}:1`;
  }

  function renderPreview() {
    const tokens = buildSemanticTokens(state.palette);
    refs.previewThemeHint.textContent = `${tokens.contrastLabel} • accent ${tokens.accent}`;

    refs.previewSurface.innerHTML = `
      <div class="preview-columns">
        ${renderPreviewCard({
          title: "Light UI",
          bg: tokens.light.bg,
          surface: tokens.light.surface,
          text: tokens.light.text,
          muted: tokens.light.muted,
          border: tokens.light.border,
          accent: tokens.accent,
          accent2: tokens.accent2,
          accent3: tokens.accent3,
          tone: "light"
        })}
        ${renderPreviewCard({
          title: "Dark UI",
          bg: tokens.dark.bg,
          surface: tokens.dark.surface,
          text: tokens.dark.text,
          muted: tokens.dark.muted,
          border: tokens.dark.border,
          accent: tokens.accent,
          accent2: tokens.accent2,
          accent3: tokens.accent3,
          tone: "dark"
        })}
      </div>
      <div class="token-grid">
        ${Object.entries(tokens.semantic)
          .slice(0, 5)
          .map(
            ([name, value]) => `<div class="token-item"><div class="swatch" style="background:${value}"></div><div class="meta"><span>${escapeHtml(
              name
            )}</span><code>${escapeHtml(value)}</code></div></div>`
          )
          .join("")}
      </div>`;

    refs.gradientPreview.style.background = `linear-gradient(135deg, ${state.palette.join(", ")})`;
    refs.miniScale.innerHTML = Array.from({ length: 12 }, (_, i) => `<span style="background:${state.palette[i % state.palette.length]}"></span>`).join("");
  }

  function renderPreviewCard(config) {
    const textOnAccent = bestTextOn(config.accent);
    const textOnAccent2 = bestTextOn(config.accent2);
    const textOnAccent3 = bestTextOn(config.accent3);
    return `
      <div class="preview-card" style="background:${config.surface}; color:${config.text}; border-color:${config.border}; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02)">
        <h4>${escapeHtml(config.title)}</h4>
        <p style="color:${config.muted}">Buttons, chips, and surfaces previewed using semantic tokens derived from the palette.</p>
        <div class="preview-btn-row">
          <span class="preview-btn" style="background:${config.accent}; color:${textOnAccent}; border-color:rgba(0,0,0,0.12)">Primary</span>
          <span class="preview-btn" style="background:${config.accent2}; color:${textOnAccent2}; border-color:rgba(0,0,0,0.12)">Secondary</span>
          <span class="preview-btn" style="background:${config.accent3}; color:${textOnAccent3}; border-color:rgba(0,0,0,0.12)">Accent</span>
        </div>
        <div class="preview-chip-row">
          <span class="preview-chip" style="background:${mixHex(config.surface, config.bg, config.tone === "dark" ? 0.32 : 0.12)}; color:${config.text}; border-color:${config.border}">token</span>
          <span class="preview-chip" style="background:${mixHex(config.surface, config.accent, 0.14)}; color:${bestTextOn(mixHex(config.surface, config.accent, 0.14))}; border-color:${config.border}">state</span>
          <span class="preview-chip" style="background:${mixHex(config.surface, config.accent2, 0.16)}; color:${bestTextOn(mixHex(config.surface, config.accent2, 0.16))}; border-color:${config.border}">chip</span>
        </div>
        <div style="display:grid; gap:0.35rem;">
          <div style="height:8px; border-radius:999px; background:${mixHex(config.surface, config.accent, 0.25)}"></div>
          <div style="height:8px; width:78%; border-radius:999px; background:${mixHex(config.surface, config.accent2, 0.25)}"></div>
          <div style="height:8px; width:52%; border-radius:999px; background:${mixHex(config.surface, config.accent3, 0.25)}"></div>
        </div>
      </div>`;
  }

  function renderExport() {
    const prefix = sanitizePrefix(state.settings.exportPrefix || "palette");
    const tokens = buildSemanticTokens(state.palette);
    const semantic = tokens.semantic;
    const format = state.settings.exportFormat;
    let output = "";

    if (format === "css") {
      output = buildCssExport(prefix, state.palette, semantic);
    } else if (format === "scss") {
      output = buildScssExport(prefix, state.palette, semantic);
    } else {
      output = buildJsonExport(prefix, state.palette, semantic);
    }

    refs.exportOutput.value = output;
  }

  function buildCssExport(prefix, palette, semantic) {
    const lines = [":root {"];
    palette.forEach((color, idx) => {
      lines.push(`  --${prefix}-${idx + 1}: ${color};`);
    });
    Object.entries(semantic).forEach(([key, value]) => {
      lines.push(`  --${prefix}-${key}: ${value};`);
    });
    lines.push("}");
    return lines.join("\n");
  }

  function buildScssExport(prefix, palette, semantic) {
    const lines = [`$${prefix}-palette: (`];
    palette.forEach((color, idx) => {
      lines.push(`  ${idx + 1}: ${color},`);
    });
    Object.entries(semantic).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value},`);
    });
    lines.push(");");
    return lines.join("\n");
  }

  function buildJsonExport(prefix, palette, semantic) {
    return JSON.stringify(
      {
        prefix,
        palette,
        semantic
      },
      null,
      2
    );
  }

  function buildSemanticTokens(palette) {
    const unique = palette.length ? palette : [DEFAULTS.baseHex];
    const luminanceSorted = [...unique].sort((a, b) => relativeLuminance(hexToRgb(a)) - relativeLuminance(hexToRgb(b)));
    const darkest = luminanceSorted[0];
    const secondDark = luminanceSorted[1] || darkest;
    const thirdDark = luminanceSorted[2] || secondDark;
    const lightest = luminanceSorted[luminanceSorted.length - 1];
    const secondLight = luminanceSorted[luminanceSorted.length - 2] || lightest;
    const thirdLight = luminanceSorted[luminanceSorted.length - 3] || secondLight;

    const accent = unique[0];
    const accent2 = unique[1] || accent;
    const accent3 = unique[2] || accent2;

    const lightBg = mixHex(lightest, "#FFFFFF", 0.78);
    const lightSurface = mixHex(secondLight, "#FFFFFF", 0.88);
    const lightText = contrastRatio(darkest, lightSurface) >= 4.5 ? darkest : "#111111";
    const lightMuted = mixHex(lightText, lightSurface, 0.45);
    const lightBorder = mixHex(lightText, lightSurface, 0.82);

    const darkBg = mixHex(darkest, "#050608", 0.82);
    const darkSurface = mixHex(secondDark, "#0b0f13", 0.68);
    const darkText = contrastRatio(lightest, darkSurface) >= 4.5 ? lightest : "#F3F6FA";
    const darkMuted = mixHex(darkText, darkSurface, 0.5);
    const darkBorder = mixHex(darkText, darkSurface, 0.85);

    return {
      accent,
      accent2,
      accent3,
      light: {
        bg: lightBg,
        surface: lightSurface,
        text: lightText,
        muted: lightMuted,
        border: lightBorder
      },
      dark: {
        bg: darkBg,
        surface: darkSurface,
        text: darkText,
        muted: darkMuted,
        border: darkBorder
      },
      contrastLabel: `max ${Math.max(contrastRatio(accent, "#FFFFFF"), contrastRatio(accent, "#000000")).toFixed(2)}:1`,
      semantic: {
        bg_light: lightBg,
        surface_light: lightSurface,
        text_light: lightText,
        bg_dark: darkBg,
        surface_dark: darkSurface,
        text_dark: darkText,
        accent,
        accent_2: accent2,
        accent_3: accent3
      }
    };
  }

  function downloadExport() {
    const format = state.settings.exportFormat;
    const ext = format === "json" ? "json" : format === "scss" ? "scss" : "css";
    const prefix = sanitizePrefix(state.settings.exportPrefix || "palette");
    const blob = new Blob([refs.exportOutput.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    flashButton(refs.downloadExportBtn);
    setStatus("ok", `Downloaded ${prefix}.${ext}.`);
  }

  async function copyWithFeedback(text, button, statusMessage) {
    try {
      await copyText(text);
      flashButton(button);
      setStatus("ok", statusMessage);
    } catch {
      setStatus("error", "Copy failed.");
    }
  }

  function setStatus(kind, message) {
    refs.statusBadge.className = `status-badge ${kind}`;
    refs.statusBadge.textContent = kind;
    refs.statusMessage.textContent = message;
  }

  function applyStateToControls() {
    refs.baseColorInput.value = state.settings.baseHex.toLowerCase();
    refs.baseHexInput.value = state.settings.baseHex;
    refs.harmonyMode.value = state.settings.harmonyMode;
    refs.swatchCount.value = String(state.settings.swatchCount);
    refs.hueSpread.value = String(state.settings.hueSpread);
    refs.saturationBias.value = String(state.settings.saturationBias);
    refs.lightnessBias.value = String(state.settings.lightnessBias);
    refs.preserveLocksToggle.checked = state.settings.preserveLocks;
    refs.exportFormatSelect.value = state.settings.exportFormat;
    refs.exportPrefixInput.value = state.settings.exportPrefix;
    syncControlOutputs();
  }

  function syncControlOutputs() {
    refs.swatchCountOut.textContent = refs.swatchCount.value;
    refs.hueSpreadOut.textContent = `${refs.hueSpread.value}°`;
    refs.saturationBiasOut.textContent = refs.saturationBias.value;
    refs.lightnessBiasOut.textContent = refs.lightnessBias.value;
  }

  function ensureArrayLengths() {
    const count = state.settings.swatchCount;
    if (!Array.isArray(state.palette)) state.palette = [];
    if (!Array.isArray(state.locks)) state.locks = [];
    state.palette = state.palette.slice(0, count);
    state.locks = state.locks.slice(0, count);
    while (state.palette.length < count) state.palette.push(state.settings.baseHex);
    while (state.locks.length < count) state.locks.push(false);
    state.selectedIndex = clampInt(state.selectedIndex, 0, count - 1, 0);
  }

  function getSelectedColor() {
    return state.palette[state.selectedIndex] || state.settings.baseHex;
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const s = parsed.settings || {};
      const baseHex = normalizeHex(s.baseHex) || DEFAULTS.baseHex;
      state.settings = {
        baseHex,
        harmonyMode: typeof s.harmonyMode === "string" ? s.harmonyMode : DEFAULTS.harmonyMode,
        swatchCount: clampInt(s.swatchCount, 3, 12, DEFAULTS.swatchCount),
        hueSpread: clampInt(s.hueSpread, 15, 180, DEFAULTS.hueSpread),
        saturationBias: clampInt(s.saturationBias, 5, 100, DEFAULTS.saturationBias),
        lightnessBias: clampInt(s.lightnessBias, 5, 95, DEFAULTS.lightnessBias),
        preserveLocks: s.preserveLocks !== false,
        exportFormat: ["css", "scss", "json"].includes(s.exportFormat) ? s.exportFormat : DEFAULTS.exportFormat,
        exportPrefix: typeof s.exportPrefix === "string" && s.exportPrefix.length ? s.exportPrefix : DEFAULTS.exportPrefix
      };

      state.palette = Array.isArray(parsed.palette)
        ? parsed.palette.map((c) => normalizeHex(c)).filter(Boolean)
        : [];
      state.locks = Array.isArray(parsed.locks) ? parsed.locks.map(Boolean) : [];
      state.selectedIndex = clampInt(parsed.selectedIndex, 0, 100, 0);
      ensureArrayLengths();
    } catch {
      // ignore restore failure
    }
  }

  function persistState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: state.settings,
          palette: state.palette,
          locks: state.locks,
          selectedIndex: state.selectedIndex
        })
      );
    } catch {
      // ignore localStorage failure
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
    if (!(button instanceof HTMLElement)) return;
    const previous = button.textContent;
    button.classList.add("flash-ok");
    button.textContent = "Done";
    window.setTimeout(() => {
      button.classList.remove("flash-ok");
      button.textContent = previous;
    }, 700);
  }

  function normalizeHex(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    return `#${full.toUpperCase()}`;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex);
    const int = parseInt(normalized.slice(1), 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function rgbToCss(rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  function rgbToHsl(rgb) {
    let { r, g, b } = rgb;
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r:
          h = ((g - b) / delta) % 6;
          break;
        case g:
          h = (b - r) / delta + 2;
          break;
        default:
          h = (r - g) / delta + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return { h, s: s * 100, l: l * 100 };
  }

  function hslToHex(hsl) {
    return rgbToHex(hslToRgb(hsl));
  }

  function hslToRgb(hsl) {
    const h = wrapHue(hsl.h) / 360;
    const s = clamp(hsl.s, 0, 100) / 100;
    const l = clamp(hsl.l, 0, 100) / 100;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hueToChannel(p, q, h + 1 / 3);
    const g = hueToChannel(p, q, h);
    const b = hueToChannel(p, q, h - 1 / 3);
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function hueToChannel(p, q, t) {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  }

  function rgbToHex(rgb) {
    const toHex = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0").toUpperCase();
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  function relativeLuminance(rgb) {
    const transform = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const r = transform(rgb.r);
    const g = transform(rgb.g);
    const b = transform(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(aHex, bHex) {
    const l1 = relativeLuminance(hexToRgb(aHex));
    const l2 = relativeLuminance(hexToRgb(bHex));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function bestTextOn(bgHex) {
    return contrastRatio(bgHex, "#000000") >= contrastRatio(bgHex, "#FFFFFF") ? "#000000" : "#FFFFFF";
  }

  function mixHex(aHex, bHex, amount) {
    const a = hexToRgb(aHex);
    const b = hexToRgb(bHex);
    const t = clamp(amount, 0, 1);
    return rgbToHex({
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
    });
  }

  function sanitizePrefix(value) {
    const raw = String(value || "palette").trim().toLowerCase();
    const cleaned = raw.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return cleaned || "palette";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampInt(value, min, max, fallback) {
    const n = typeof value === "number" ? value : parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.round(clamp(n, min, max));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function wrapHue(h) {
    const value = Number(h) || 0;
    return ((value % 360) + 360) % 360;
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
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
