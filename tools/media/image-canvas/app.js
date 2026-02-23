(() => {
  const SETTINGS_STORAGE_KEY = "tool-image-canvas-settings-v1";
  const MAX_PREVIEW_PROXY_LONGEST = 2048;
  const MAX_CANVAS_SIDE = 12000;
  const MIN_CANVAS_SIDE = 1;
  const DEFAULTS = {
    canvasWidth: 1080,
    canvasHeight: 1080,
    presetId: "ig-square",
    fitMode: "cover",
    zoom: 1,
    anchorX: 0.5,
    anchorY: 0.5,
    smoothing: true,
    backgroundColor: "#0F141B",
    transparentBackground: false,
    checker: true,
    guides: true,
    exportFormat: "png",
    exportQuality: 0.92
  };

  const PRESETS = [
    { id: "custom", label: "Custom", width: null, height: null, group: "Custom" },
    { id: "ig-square", label: "Instagram Square", width: 1080, height: 1080, group: "Social" },
    { id: "ig-portrait", label: "Instagram Portrait", width: 1080, height: 1350, group: "Social" },
    { id: "story", label: "Story / Reel / Shorts", width: 1080, height: 1920, group: "Social" },
    { id: "og-card", label: "Open Graph Card", width: 1200, height: 630, group: "Social" },
    { id: "x-post", label: "X / Twitter Wide", width: 1600, height: 900, group: "Social" },
    { id: "yt-thumb", label: "YouTube Thumbnail", width: 1280, height: 720, group: "Video" },
    { id: "hd", label: "HD (720p)", width: 1280, height: 720, group: "Video" },
    { id: "fhd", label: "Full HD (1080p)", width: 1920, height: 1080, group: "Video" },
    { id: "square-512", label: "Square 512", width: 512, height: 512, group: "General" },
    { id: "square-1024", label: "Square 1024", width: 1024, height: 1024, group: "General" },
    { id: "banner-wide", label: "Wide Banner", width: 1500, height: 500, group: "General" },
    { id: "a4-portrait", label: "A4 Portrait (300dpi)", width: 2480, height: 3508, group: "Print" },
    { id: "a4-landscape", label: "A4 Landscape (300dpi)", width: 3508, height: 2480, group: "Print" },
    { id: "letter-portrait", label: "US Letter Portrait (300dpi)", width: 2550, height: 3300, group: "Print" },
    { id: "letter-landscape", label: "US Letter Landscape (300dpi)", width: 3300, height: 2550, group: "Print" }
  ];

  const QUICK_PRESET_IDS = [
    "ig-square",
    "ig-portrait",
    "story",
    "og-card",
    "yt-thumb",
    "fhd",
    "a4-portrait",
    "a4-landscape"
  ];

  const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

  const refs = {
    chooseImageBtn: document.getElementById("chooseImageBtn"),
    pasteImageBtn: document.getElementById("pasteImageBtn"),
    clearImageBtn: document.getElementById("clearImageBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    downloadPngBtn: document.getElementById("downloadPngBtn"),
    imageFileInput: document.getElementById("imageFileInput"),

    sourceStatusLabel: document.getElementById("sourceStatusLabel"),
    imageNameLabel: document.getElementById("imageNameLabel"),
    imageSizeLabel: document.getElementById("imageSizeLabel"),
    proxySizeLabel: document.getElementById("proxySizeLabel"),

    presetSelect: document.getElementById("presetSelect"),
    canvasWidthInput: document.getElementById("canvasWidthInput"),
    canvasHeightInput: document.getElementById("canvasHeightInput"),
    applyCanvasSizeBtn: document.getElementById("applyCanvasSizeBtn"),
    swapCanvasBtn: document.getElementById("swapCanvasBtn"),
    useSourceSizeBtn: document.getElementById("useSourceSizeBtn"),
    quickPresetGrid: document.getElementById("quickPresetGrid"),
    canvasAspectLabel: document.getElementById("canvasAspectLabel"),

    fitModeSelect: document.getElementById("fitModeSelect"),
    zoomRange: document.getElementById("zoomRange"),
    zoomOutLabel: document.getElementById("zoomOutLabel"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    resetFramingBtn: document.getElementById("resetFramingBtn"),
    anchorGrid: document.getElementById("anchorGrid"),
    anchorXRange: document.getElementById("anchorXRange"),
    anchorXOut: document.getElementById("anchorXOut"),
    anchorYRange: document.getElementById("anchorYRange"),
    anchorYOut: document.getElementById("anchorYOut"),
    smoothingToggle: document.getElementById("smoothingToggle"),
    framingMetaLabel: document.getElementById("framingMetaLabel"),

    previewStageCard: document.getElementById("previewStageCard"),
    previewStage: document.getElementById("previewStage"),
    previewCanvas: document.getElementById("previewCanvas"),
    emptyStageOverlay: document.getElementById("emptyStageOverlay"),
    stageDropOverlay: document.getElementById("stageDropOverlay"),
    canvasSizeBadge: document.getElementById("canvasSizeBadge"),
    displaySizeBadge: document.getElementById("displaySizeBadge"),
    placementBadge: document.getElementById("placementBadge"),
    drawRectLabel: document.getElementById("drawRectLabel"),
    coverageLabel: document.getElementById("coverageLabel"),
    checkerToggle: document.getElementById("checkerToggle"),
    guidesToggle: document.getElementById("guidesToggle"),

    backgroundColorInput: document.getElementById("backgroundColorInput"),
    backgroundHexInput: document.getElementById("backgroundHexInput"),
    transparentBgToggle: document.getElementById("transparentBgToggle"),
    backgroundModeLabel: document.getElementById("backgroundModeLabel"),

    exportFormatSelect: document.getElementById("exportFormatSelect"),
    qualityRange: document.getElementById("qualityRange"),
    qualityOut: document.getElementById("qualityOut"),
    exportMetaLabel: document.getElementById("exportMetaLabel"),
    exportSizeLabel: document.getElementById("exportSizeLabel"),
    resetAllBtn: document.getElementById("resetAllBtn"),

    performanceChip: document.getElementById("performanceChip"),
    statusBadge: document.getElementById("statusBadge"),
    statusMessage: document.getElementById("statusMessage")
  };

  const state = {
    canvasWidth: DEFAULTS.canvasWidth,
    canvasHeight: DEFAULTS.canvasHeight,
    presetId: DEFAULTS.presetId,
    fitMode: DEFAULTS.fitMode,
    zoom: DEFAULTS.zoom,
    anchorX: DEFAULTS.anchorX,
    anchorY: DEFAULTS.anchorY,
    smoothing: DEFAULTS.smoothing,
    backgroundColor: DEFAULTS.backgroundColor,
    transparentBackground: DEFAULTS.transparentBackground,
    checker: DEFAULTS.checker,
    guides: DEFAULTS.guides,
    exportFormat: DEFAULTS.exportFormat,
    exportQuality: DEFAULTS.exportQuality,
    source: null,
    previewScale: 1,
    renderQueued: false,
    persistTimer: 0,
    drag: {
      active: false,
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      startAnchorX: 0.5,
      startAnchorY: 0.5
    },
    dropDepth: 0,
    resizeObserver: null,
    lastPlacement: null
  };

  initialize();

  function initialize() {
    populatePresetSelect();
    populateQuickPresets();
    restoreSettings();
    syncControlsFromState();
    bindEvents();
    setupResizeObserver();
    updateAllUi();
    queueRender();
    setStatus("idle", "Ready.");
  }

  function populatePresetSelect() {
    refs.presetSelect.innerHTML = "";
    const groups = new Map();

    for (const preset of PRESETS) {
      if (preset.id === "custom") continue;
      if (!groups.has(preset.group)) groups.set(preset.group, []);
      groups.get(preset.group).push(preset);
    }

    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    refs.presetSelect.appendChild(customOption);

    for (const [groupName, items] of groups.entries()) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = groupName;
      for (const preset of items) {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = `${preset.label} (${preset.width}×${preset.height})`;
        optgroup.appendChild(option);
      }
      refs.presetSelect.appendChild(optgroup);
    }
  }

  function populateQuickPresets() {
    refs.quickPresetGrid.innerHTML = "";
    for (const id of QUICK_PRESET_IDS) {
      const preset = PRESET_BY_ID.get(id);
      if (!preset) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.presetId = preset.id;
      button.innerHTML = `<strong>${escapeHtml(preset.label)}</strong><br><span>${preset.width}×${preset.height}</span>`;
      refs.quickPresetGrid.appendChild(button);
    }
  }

  function restoreSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      state.canvasWidth = clampCanvasSide(parsed.canvasWidth, DEFAULTS.canvasWidth);
      state.canvasHeight = clampCanvasSide(parsed.canvasHeight, DEFAULTS.canvasHeight);
      state.presetId = normalizePresetId(parsed.presetId, state.canvasWidth, state.canvasHeight);
      state.fitMode = normalizeFitMode(parsed.fitMode);
      state.zoom = clampNumber(parsed.zoom, 0.1, 4, DEFAULTS.zoom);
      state.anchorX = clampNumber(parsed.anchorX, 0, 1, DEFAULTS.anchorX);
      state.anchorY = clampNumber(parsed.anchorY, 0, 1, DEFAULTS.anchorY);
      state.smoothing = parsed.smoothing !== false;
      state.backgroundColor = normalizeHexColor(parsed.backgroundColor) || DEFAULTS.backgroundColor;
      state.transparentBackground = Boolean(parsed.transparentBackground);
      state.checker = parsed.checker !== false;
      state.guides = parsed.guides !== false;
      state.exportFormat = normalizeExportFormat(parsed.exportFormat);
      state.exportQuality = clampNumber(parsed.exportQuality, 0.1, 1, DEFAULTS.exportQuality);
    } catch (error) {
      console.error(error);
      setStatus("error", "Failed to restore previous settings.");
    }
  }

  function bindEvents() {
    refs.chooseImageBtn.addEventListener("click", () => refs.imageFileInput.click());
    refs.imageFileInput.addEventListener("change", onFileInputChange);
    refs.pasteImageBtn.addEventListener("click", onPasteImageButtonClick);
    refs.clearImageBtn.addEventListener("click", clearImage);

    refs.downloadBtn.addEventListener("click", downloadCurrentCanvas);
    refs.downloadPngBtn.addEventListener("click", downloadCurrentCanvas);

    refs.applyCanvasSizeBtn.addEventListener("click", applyCanvasSizeFromInputs);
    refs.swapCanvasBtn.addEventListener("click", swapCanvasSize);
    refs.useSourceSizeBtn.addEventListener("click", useSourceSize);
    refs.presetSelect.addEventListener("change", onPresetSelectChanged);

    bindCanvasSizeInput(refs.canvasWidthInput);
    bindCanvasSizeInput(refs.canvasHeightInput);

    refs.quickPresetGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-preset-id]");
      if (!button) return;
      applyPreset(button.dataset.presetId);
      flashButton(button);
    });

    refs.fitModeSelect.addEventListener("change", () => {
      state.fitMode = normalizeFitMode(refs.fitModeSelect.value);
      if (state.fitMode === "stretch") {
        state.anchorX = 0.5;
        state.anchorY = 0.5;
      }
      touchState({ render: true, persist: true });
      setStatus("idle", `Fit mode: ${state.fitMode}.`);
    });

    refs.zoomRange.addEventListener("input", () => {
      state.zoom = clampNumber(Number(refs.zoomRange.value) / 100, 0.1, 4, 1);
      touchState({ render: true, persist: true, syncFraming: true });
    });

    refs.zoomOutBtn.addEventListener("click", () => nudgeZoom(-0.05));
    refs.zoomInBtn.addEventListener("click", () => nudgeZoom(0.05));
    refs.resetFramingBtn.addEventListener("click", resetFraming);

    refs.anchorGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-align]");
      if (!button || state.fitMode === "stretch") return;
      const [xText, yText] = String(button.dataset.align || "").split(",");
      state.anchorX = clampNumber(Number(xText), 0, 1, 0.5);
      state.anchorY = clampNumber(Number(yText), 0, 1, 0.5);
      touchState({ render: true, persist: true, syncFraming: true });
    });

    refs.anchorXRange.addEventListener("input", () => {
      if (state.fitMode === "stretch") return;
      state.anchorX = clampNumber(Number(refs.anchorXRange.value) / 100, 0, 1, 0.5);
      touchState({ render: true, persist: true, syncFraming: true });
    });

    refs.anchorYRange.addEventListener("input", () => {
      if (state.fitMode === "stretch") return;
      state.anchorY = clampNumber(Number(refs.anchorYRange.value) / 100, 0, 1, 0.5);
      touchState({ render: true, persist: true, syncFraming: true });
    });

    refs.smoothingToggle.addEventListener("change", () => {
      state.smoothing = refs.smoothingToggle.checked;
      touchState({ render: true, persist: true });
    });

    refs.checkerToggle.addEventListener("change", () => {
      state.checker = refs.checkerToggle.checked;
      touchState({ render: true, persist: true });
    });

    refs.guidesToggle.addEventListener("change", () => {
      state.guides = refs.guidesToggle.checked;
      touchState({ render: true, persist: true });
    });

    refs.backgroundColorInput.addEventListener("input", () => {
      const color = normalizeHexColor(refs.backgroundColorInput.value);
      if (!color) return;
      state.backgroundColor = color;
      refs.backgroundHexInput.value = color;
      touchState({ render: true, persist: true, syncBackground: true });
    });

    refs.backgroundHexInput.addEventListener("change", () => {
      const color = normalizeHexColor(refs.backgroundHexInput.value);
      if (!color) {
        refs.backgroundHexInput.value = state.backgroundColor;
        setStatus("warn", "Invalid color. Use #RRGGBB.");
        return;
      }
      state.backgroundColor = color;
      refs.backgroundColorInput.value = color;
      refs.backgroundHexInput.value = color;
      touchState({ render: true, persist: true, syncBackground: true });
    });

    refs.transparentBgToggle.addEventListener("change", () => {
      state.transparentBackground = refs.transparentBgToggle.checked;
      touchState({ render: true, persist: true, syncBackground: true });
    });

    refs.exportFormatSelect.addEventListener("change", () => {
      state.exportFormat = normalizeExportFormat(refs.exportFormatSelect.value);
      touchState({ render: false, persist: true, syncExport: true });
      setStatus("idle", `Export format: ${state.exportFormat.toUpperCase()}.`);
    });

    refs.qualityRange.addEventListener("input", () => {
      state.exportQuality = clampNumber(Number(refs.qualityRange.value) / 100, 0.1, 1, DEFAULTS.exportQuality);
      touchState({ render: false, persist: true, syncExport: true });
    });

    refs.resetAllBtn.addEventListener("click", resetSettingsToDefaults);

    refs.previewStage.addEventListener("pointerdown", onPreviewPointerDown);
    refs.previewStage.addEventListener("pointermove", onPreviewPointerMove);
    refs.previewStage.addEventListener("pointerup", onPreviewPointerUp);
    refs.previewStage.addEventListener("pointercancel", onPreviewPointerUp);
    refs.previewStage.addEventListener("wheel", onPreviewWheel, { passive: false });
    refs.previewStage.addEventListener("keydown", onPreviewStageKeydown);

    bindDropZoneEvents();
    bindClipboardPasteEvent();

    window.addEventListener("beforeunload", flushPersistSettings);
  }

  function bindCanvasSizeInput(input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyCanvasSizeFromInputs();
      }
    });
    input.addEventListener("change", () => {
      applyCanvasSizeFromInputs({ silentStatus: true });
    });
  }

  function setupResizeObserver() {
    if (typeof ResizeObserver === "function") {
      state.resizeObserver = new ResizeObserver(() => queueRender());
      state.resizeObserver.observe(refs.previewStage);
      return;
    }
    window.addEventListener("resize", queueRender);
  }

  function onFileInputChange(event) {
    const file = event.target.files?.[0];
    refs.imageFileInput.value = "";
    if (!file) return;
    loadImageFromFile(file);
  }

  async function onPasteImageButtonClick() {
    if (!navigator.clipboard?.read) {
      setStatus("warn", "Clipboard image read API not available. Use Ctrl/Cmd+V on the page.");
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const extension = mimeToExtension(imageType) || "png";
        await loadImageFromBlob(blob, `clipboard-image.${extension}`);
        flashButton(refs.pasteImageBtn);
        return;
      }
      setStatus("warn", "Clipboard does not contain an image.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error", `Paste failed: ${message}`);
    }
  }

  function bindClipboardPasteEvent() {
    window.addEventListener("paste", (event) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const imageItem = Array.from(clipboard.items || []).find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;

      const blob = imageItem.getAsFile();
      if (!blob) return;
      event.preventDefault();
      loadImageFromBlob(blob, `pasted-image.${mimeToExtension(blob.type) || "png"}`);
    });
  }

  function bindDropZoneEvents() {
    const onDragOver = (event) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      refs.previewStage.classList.add("is-drop-target");
      state.dropDepth = Math.max(1, state.dropDepth);
    };

    const onDragEnter = (event) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      state.dropDepth += 1;
      refs.previewStage.classList.add("is-drop-target");
    };

    const onDragLeave = (event) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      state.dropDepth = Math.max(0, state.dropDepth - 1);
      if (state.dropDepth === 0) refs.previewStage.classList.remove("is-drop-target");
    };

    const onDrop = (event) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      state.dropDepth = 0;
      refs.previewStage.classList.remove("is-drop-target");
      const file = getFirstImageFileFromDragEvent(event);
      if (!file) {
        setStatus("warn", "Dropped files did not include an image.");
        return;
      }
      loadImageFromFile(file);
    };

    refs.previewStage.addEventListener("dragenter", onDragEnter);
    refs.previewStage.addEventListener("dragover", onDragOver);
    refs.previewStage.addEventListener("dragleave", onDragLeave);
    refs.previewStage.addEventListener("drop", onDrop);

    window.addEventListener("dragover", (event) => {
      if (dragEventHasFiles(event)) event.preventDefault();
    });
    window.addEventListener("drop", (event) => {
      if (dragEventHasFiles(event)) event.preventDefault();
    });
  }

  async function loadImageFromFile(file) {
    if (!file.type.startsWith("image/")) {
      setStatus("warn", "Selected file is not an image.");
      return;
    }
    await loadImageFromBlob(file, file.name || "image");
  }

  async function loadImageFromBlob(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await loadImageElement(objectUrl);
      const proxy = buildPreviewProxy(image);

      releaseSourceObjectUrl();
      state.source = {
        image,
        previewNode: proxy.node,
        proxyWidth: proxy.width,
        proxyHeight: proxy.height,
        usingProxy: proxy.usingProxy,
        name: fileName || "image",
        type: blob.type || "image/png",
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        objectUrl
      };

      state.zoom = 1;
      state.anchorX = 0.5;
      state.anchorY = 0.5;

      syncControlsFromState();
      updateAllUi();
      queueRender();
      schedulePersistSettings();
      setStatus("ok", `Loaded ${state.source.width}×${state.source.height} image.`);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error", `Image load failed: ${message}`);
    }
  }

  function clearImage() {
    if (!state.source) return;
    releaseSourceObjectUrl();
    state.source = null;
    state.zoom = 1;
    state.anchorX = 0.5;
    state.anchorY = 0.5;
    state.lastPlacement = null;
    syncControlsFromState();
    updateAllUi();
    queueRender();
    schedulePersistSettings();
    setStatus("idle", "Image cleared.");
  }

  function releaseSourceObjectUrl() {
    if (state.source?.objectUrl) {
      try {
        URL.revokeObjectURL(state.source.objectUrl);
      } catch {
        // Ignore revoke errors.
      }
    }
  }

  function loadImageElement(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to decode image"));
      image.decoding = "async";
      image.src = url;
    });
  }

  function buildPreviewProxy(image) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const longest = Math.max(width, height);

    if (!longest || longest <= MAX_PREVIEW_PROXY_LONGEST) {
      return { node: image, width, height, usingProxy: false };
    }

    const scale = MAX_PREVIEW_PROXY_LONGEST / longest;
    const proxyWidth = Math.max(1, Math.round(width * scale));
    const proxyHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = proxyWidth;
    canvas.height = proxyHeight;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, proxyWidth, proxyHeight);
    }
    return { node: canvas, width: proxyWidth, height: proxyHeight, usingProxy: true };
  }

  function onPresetSelectChanged() {
    applyPreset(refs.presetSelect.value);
  }

  function applyPreset(presetId) {
    const preset = PRESET_BY_ID.get(presetId);
    if (!preset || preset.id === "custom") {
      state.presetId = "custom";
      syncControlsFromState();
      updateAllUi();
      schedulePersistSettings();
      return;
    }

    state.canvasWidth = clampCanvasSide(preset.width, DEFAULTS.canvasWidth);
    state.canvasHeight = clampCanvasSide(preset.height, DEFAULTS.canvasHeight);
    state.presetId = preset.id;
    syncControlsFromState();
    updateAllUi();
    queueRender();
    schedulePersistSettings();
    setStatus("idle", `Canvas preset: ${preset.label} (${preset.width}×${preset.height}).`);
  }

  function applyCanvasSizeFromInputs(options = {}) {
    const { silentStatus = false } = options;
    const parsedWidth = clampCanvasSide(Number(refs.canvasWidthInput.value), state.canvasWidth);
    const parsedHeight = clampCanvasSide(Number(refs.canvasHeightInput.value), state.canvasHeight);

    const changed = parsedWidth !== state.canvasWidth || parsedHeight !== state.canvasHeight;
    state.canvasWidth = parsedWidth;
    state.canvasHeight = parsedHeight;
    state.presetId = detectPresetId(parsedWidth, parsedHeight);

    syncControlsFromState();
    updateAllUi();
    queueRender();
    schedulePersistSettings();

    if (changed && !silentStatus) {
      setStatus("idle", `Canvas size set to ${parsedWidth}×${parsedHeight}.`);
    }
  }

  function swapCanvasSize() {
    const nextWidth = state.canvasHeight;
    const nextHeight = state.canvasWidth;
    state.canvasWidth = nextWidth;
    state.canvasHeight = nextHeight;
    state.presetId = detectPresetId(nextWidth, nextHeight);
    syncControlsFromState();
    updateAllUi();
    queueRender();
    schedulePersistSettings();
    setStatus("idle", `Canvas swapped to ${nextWidth}×${nextHeight}.`);
    flashButton(refs.swapCanvasBtn);
  }

  function useSourceSize() {
    if (!state.source) {
      setStatus("warn", "Load an image first.");
      return;
    }

    state.canvasWidth = clampCanvasSide(state.source.width, DEFAULTS.canvasWidth);
    state.canvasHeight = clampCanvasSide(state.source.height, DEFAULTS.canvasHeight);
    state.presetId = detectPresetId(state.canvasWidth, state.canvasHeight);
    syncControlsFromState();
    updateAllUi();
    queueRender();
    schedulePersistSettings();
    setStatus("ok", `Canvas matched source size (${state.canvasWidth}×${state.canvasHeight}).`);
    flashButton(refs.useSourceSizeBtn);
  }

  function resetFraming() {
    state.zoom = 1;
    state.anchorX = 0.5;
    state.anchorY = 0.5;
    touchState({ render: true, persist: true, syncFraming: true });
    setStatus("idle", "Framing reset.");
    flashButton(refs.resetFramingBtn);
  }

  function resetSettingsToDefaults() {
    state.canvasWidth = DEFAULTS.canvasWidth;
    state.canvasHeight = DEFAULTS.canvasHeight;
    state.presetId = DEFAULTS.presetId;
    state.fitMode = DEFAULTS.fitMode;
    state.zoom = DEFAULTS.zoom;
    state.anchorX = DEFAULTS.anchorX;
    state.anchorY = DEFAULTS.anchorY;
    state.smoothing = DEFAULTS.smoothing;
    state.backgroundColor = DEFAULTS.backgroundColor;
    state.transparentBackground = DEFAULTS.transparentBackground;
    state.checker = DEFAULTS.checker;
    state.guides = DEFAULTS.guides;
    state.exportFormat = DEFAULTS.exportFormat;
    state.exportQuality = DEFAULTS.exportQuality;
    syncControlsFromState();
    updateAllUi();
    queueRender();
    schedulePersistSettings();
    setStatus("ok", "Settings reset to defaults.");
    flashButton(refs.resetAllBtn);
  }

  function touchState({ render = false, persist = false, syncFraming = false, syncBackground = false, syncExport = false } = {}) {
    if (syncFraming) syncFramingControls();
    if (syncBackground) syncBackgroundControls();
    if (syncExport) syncExportControls();
    updateAllUi({ skipSync: true });
    if (render) queueRender();
    if (persist) schedulePersistSettings();
  }

  function syncControlsFromState() {
    refs.presetSelect.value = state.presetId;
    refs.canvasWidthInput.value = String(state.canvasWidth);
    refs.canvasHeightInput.value = String(state.canvasHeight);
    refs.fitModeSelect.value = state.fitMode;
    syncFramingControls();
    refs.smoothingToggle.checked = state.smoothing;
    syncBackgroundControls();
    refs.checkerToggle.checked = state.checker;
    refs.guidesToggle.checked = state.guides;
    syncExportControls();
  }

  function syncFramingControls() {
    refs.zoomRange.value = String(Math.round(state.zoom * 100));
    refs.zoomOutLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    refs.anchorXRange.value = String(Math.round(state.anchorX * 100));
    refs.anchorYRange.value = String(Math.round(state.anchorY * 100));
    refs.anchorXOut.textContent = `${Math.round(state.anchorX * 100)}%`;
    refs.anchorYOut.textContent = `${Math.round(state.anchorY * 100)}%`;

    const stretch = state.fitMode === "stretch";
    refs.zoomRange.disabled = false;
    refs.anchorXRange.disabled = stretch;
    refs.anchorYRange.disabled = stretch;

    for (const button of refs.anchorGrid.querySelectorAll("button[data-align]")) {
      const [xText, yText] = String(button.dataset.align || "").split(",");
      const x = Number(xText);
      const y = Number(yText);
      const active = Math.abs(state.anchorX - x) < 0.01 && Math.abs(state.anchorY - y) < 0.01;
      button.classList.toggle("is-active", !stretch && active);
      button.disabled = stretch;
    }
  }

  function syncBackgroundControls() {
    refs.backgroundColorInput.value = state.backgroundColor;
    refs.backgroundHexInput.value = state.backgroundColor;
    refs.transparentBgToggle.checked = state.transparentBackground;
  }

  function syncExportControls() {
    refs.exportFormatSelect.value = state.exportFormat;
    refs.qualityRange.value = String(Math.round(state.exportQuality * 100));
    refs.qualityOut.textContent = `${Math.round(state.exportQuality * 100)}%`;
    const qualityDisabled = state.exportFormat === "png";
    refs.qualityRange.disabled = qualityDisabled;
    refs.qualityOut.style.opacity = qualityDisabled ? "0.55" : "1";
  }

  function updateAllUi(options = {}) {
    const { skipSync = false } = options;
    if (!skipSync) {
      syncControlsFromState();
    }
    updateSourceUi();
    updateCanvasUi();
    updateFramingUi();
    updateBackgroundUi();
    updateExportUi();
    updateActionStates();
  }

  function updateSourceUi() {
    const hasSource = Boolean(state.source);
    refs.sourceStatusLabel.textContent = hasSource ? "loaded" : "no image";
    refs.imageNameLabel.textContent = hasSource ? state.source.name : "--";
    refs.imageSizeLabel.textContent = hasSource ? `${state.source.width}×${state.source.height}` : "--";
    if (hasSource) {
      refs.proxySizeLabel.textContent = state.source.usingProxy
        ? `${state.source.proxyWidth}×${state.source.proxyHeight}`
        : "original";
    } else {
      refs.proxySizeLabel.textContent = "--";
    }
    refs.performanceChip.textContent = hasSource && state.source.usingProxy
      ? `Preview proxy: ${state.source.proxyWidth}×${state.source.proxyHeight} (max ${MAX_PREVIEW_PROXY_LONGEST}px)`
      : `Preview proxy max: ${MAX_PREVIEW_PROXY_LONGEST}px`;
  }

  function updateCanvasUi() {
    refs.canvasAspectLabel.textContent = formatAspect(state.canvasWidth, state.canvasHeight);
    refs.canvasSizeBadge.textContent = `canvas ${state.canvasWidth}×${state.canvasHeight}`;
    refs.exportSizeLabel.textContent = `${state.canvasWidth}×${state.canvasHeight}`;

    const displayW = Math.max(1, Math.round(state.canvasWidth * state.previewScale));
    const displayH = Math.max(1, Math.round(state.canvasHeight * state.previewScale));
    refs.displaySizeBadge.textContent = `preview ${displayW}×${displayH}`;

    for (const button of refs.quickPresetGrid.querySelectorAll("button[data-preset-id]")) {
      button.classList.toggle("is-active", button.dataset.presetId === state.presetId);
    }
  }

  function updateFramingUi() {
    const zoomPercent = Math.round(state.zoom * 100);
    const mode = state.fitMode;
    const anchor = `${Math.round(state.anchorX * 100)}/${Math.round(state.anchorY * 100)}`;
    refs.framingMetaLabel.textContent = `${mode} • ${zoomPercent}% • ${anchor}`;

    const placement = computePlacement();
    state.lastPlacement = placement;

    if (!placement || !state.source) {
      refs.placementBadge.textContent = "no image";
      refs.drawRectLabel.textContent = "--";
      refs.coverageLabel.textContent = "--";
      return;
    }

    refs.placementBadge.textContent = `${mode} • ${zoomPercent}%`;
    refs.drawRectLabel.textContent = `${formatCoord(placement.drawX)}, ${formatCoord(placement.drawY)} • ${formatCoord(placement.drawWidth)}×${formatCoord(placement.drawHeight)}`;

    const cropX = Math.max(0, placement.drawWidth - state.canvasWidth);
    const cropY = Math.max(0, placement.drawHeight - state.canvasHeight);
    const padX = Math.max(0, state.canvasWidth - placement.drawWidth);
    const padY = Math.max(0, state.canvasHeight - placement.drawHeight);

    const parts = [];
    if (cropX || cropY) parts.push(`crop ${Math.round(cropX)}×${Math.round(cropY)}`);
    if (padX || padY) parts.push(`pad ${Math.round(padX)}×${Math.round(padY)}`);
    if (!parts.length) parts.push("exact fit");
    refs.coverageLabel.textContent = parts.join(" • ");
  }

  function updateBackgroundUi() {
    let modeLabel = state.transparentBackground ? "transparent" : "solid";
    if (state.transparentBackground && state.exportFormat === "jpeg") {
      modeLabel = "transparent*";
    }
    refs.backgroundModeLabel.textContent = modeLabel;
  }

  function updateExportUi() {
    refs.exportMetaLabel.textContent = `${state.exportFormat} • ${state.canvasWidth}×${state.canvasHeight}`;
  }

  function updateActionStates() {
    refs.clearImageBtn.disabled = !state.source;
    refs.useSourceSizeBtn.disabled = !state.source;
    const noImage = !state.source;
    refs.emptyStageOverlay.hidden = !noImage;
    refs.previewCanvas.classList.toggle("no-image", noImage);
  }

  function queueRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    window.requestAnimationFrame(() => {
      state.renderQueued = false;
      renderPreview();
    });
  }

  function renderPreview() {
    const canvas = refs.previewCanvas;
    const stageRect = refs.previewStage.getBoundingClientRect();
    const maxWidth = Math.max(120, stageRect.width - 28);
    const maxHeight = Math.max(120, stageRect.height - 28);
    const scale = Math.min(maxWidth / state.canvasWidth, maxHeight / state.canvasHeight);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    state.previewScale = safeScale;

    const cssWidth = Math.max(1, Math.round(state.canvasWidth * safeScale));
    const cssHeight = Math.max(1, Math.round(state.canvasHeight * safeScale));
    const dpr = clampNumber(window.devicePixelRatio || 1, 1, 2, 1);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    updateCanvasUi();

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sx = canvas.width / state.canvasWidth;
    const sy = canvas.height / state.canvasHeight;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);

    drawCanvasSurface(ctx, {
      width: state.canvasWidth,
      height: state.canvasHeight,
      sourceNode: state.source?.previewNode || null,
      sourceWidth: state.source?.width || 0,
      sourceHeight: state.source?.height || 0,
      showChecker: state.transparentBackground && state.checker,
      showGuides: state.guides,
      includeTransparent: state.transparentBackground
    });
  }

  function drawCanvasSurface(ctx, options) {
    const {
      width,
      height,
      sourceNode,
      sourceWidth,
      sourceHeight,
      showChecker,
      showGuides,
      includeTransparent
    } = options;

    if (!includeTransparent) {
      ctx.fillStyle = state.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else if (showChecker) {
      drawCheckerboard(ctx, width, height);
    }

    const placement = computePlacement(width, height, sourceWidth, sourceHeight);
    state.lastPlacement = placement;

    if (sourceNode && placement) {
      ctx.imageSmoothingEnabled = state.smoothing;
      ctx.imageSmoothingQuality = state.smoothing ? "high" : "low";
      ctx.drawImage(sourceNode, placement.drawX, placement.drawY, placement.drawWidth, placement.drawHeight);
    }

    if (showGuides) {
      drawGuides(ctx, width, height);
    }

    updateFramingUi();
  }

  function computePlacement(
    canvasWidth = state.canvasWidth,
    canvasHeight = state.canvasHeight,
    sourceWidth = state.source?.width || 0,
    sourceHeight = state.source?.height || 0
  ) {
    if (!sourceWidth || !sourceHeight) return null;

    if (state.fitMode === "stretch") {
      return {
        drawX: 0,
        drawY: 0,
        drawWidth: canvasWidth,
        drawHeight: canvasHeight,
        spareX: 0,
        spareY: 0
      };
    }

    const baseScale = state.fitMode === "contain"
      ? Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight)
      : Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);

    const finalScale = baseScale * state.zoom;
    const drawWidth = sourceWidth * finalScale;
    const drawHeight = sourceHeight * finalScale;
    const spareX = canvasWidth - drawWidth;
    const spareY = canvasHeight - drawHeight;
    const drawX = spareX * state.anchorX;
    const drawY = spareY * state.anchorY;

    return { drawX, drawY, drawWidth, drawHeight, spareX, spareY };
  }

  function drawCheckerboard(ctx, width, height) {
    const tile = Math.max(16, Math.round(Math.max(width, height) / 40));
    ctx.fillStyle = "#10151c";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#171e27";
    for (let y = 0; y < height; y += tile) {
      for (let x = 0; x < width; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) {
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }
  }

  function drawGuides(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = Math.max(1 / (state.previewScale || 1), 1);
    ctx.setLineDash([8, 8]);

    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(110,203,255,0.16)";
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(width / 3, 0);
    ctx.lineTo(width / 3, height);
    ctx.moveTo((2 * width) / 3, 0);
    ctx.lineTo((2 * width) / 3, height);
    ctx.moveTo(0, height / 3);
    ctx.lineTo(width, height / 3);
    ctx.moveTo(0, (2 * height) / 3);
    ctx.lineTo(width, (2 * height) / 3);
    ctx.stroke();

    ctx.restore();
  }

  function onPreviewPointerDown(event) {
    if (event.button !== 0) return;
    if (!state.source || state.fitMode === "stretch") return;

    refs.previewStage.focus();
    refs.previewStage.setPointerCapture(event.pointerId);
    state.drag.active = true;
    state.drag.pointerId = event.pointerId;
    state.drag.startClientX = event.clientX;
    state.drag.startClientY = event.clientY;
    state.drag.startAnchorX = state.anchorX;
    state.drag.startAnchorY = state.anchorY;
    refs.previewCanvas.classList.add("is-dragging");
    event.preventDefault();
  }

  function onPreviewPointerMove(event) {
    if (!state.drag.active || event.pointerId !== state.drag.pointerId) return;
    const placement = computePlacement();
    if (!placement) return;

    const rect = refs.previewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaClientX = event.clientX - state.drag.startClientX;
    const deltaClientY = event.clientY - state.drag.startClientY;
    const deltaCanvasX = deltaClientX * (state.canvasWidth / rect.width);
    const deltaCanvasY = deltaClientY * (state.canvasHeight / rect.height);

    if (placement.spareX !== 0) {
      state.anchorX = clampNumber(state.drag.startAnchorX + (deltaCanvasX / placement.spareX), 0, 1, state.anchorX);
    }
    if (placement.spareY !== 0) {
      state.anchorY = clampNumber(state.drag.startAnchorY + (deltaCanvasY / placement.spareY), 0, 1, state.anchorY);
    }

    syncFramingControls();
    updateFramingUi();
    queueRender();
  }

  function onPreviewPointerUp(event) {
    if (!state.drag.active) return;
    if (event.pointerId !== state.drag.pointerId) return;
    state.drag.active = false;
    state.drag.pointerId = null;
    refs.previewCanvas.classList.remove("is-dragging");
    schedulePersistSettings();
    refs.previewStage.classList.remove("is-drop-target");
  }

  function onPreviewWheel(event) {
    if (!state.source || state.fitMode === "stretch") return;
    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? 1.06 : 1 / 1.06;
    const nextZoom = clampNumber(state.zoom * factor, 0.1, 4, state.zoom);
    if (Math.abs(nextZoom - state.zoom) < 0.0001) return;

    const rect = refs.previewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      state.zoom = nextZoom;
      touchState({ render: true, persist: true, syncFraming: true });
      return;
    }

    const point = clientPointToCanvasCoords(event.clientX, event.clientY, rect);
    zoomAroundCanvasPoint(nextZoom, point.x, point.y);
    schedulePersistSettings();
  }

  function onPreviewStageKeydown(event) {
    if (!state.source) return;

    const key = event.key;
    if (key === "+" || key === "=") {
      event.preventDefault();
      nudgeZoom(0.05);
      return;
    }
    if (key === "-" || key === "_") {
      event.preventDefault();
      nudgeZoom(-0.05);
      return;
    }
    if (key === "0") {
      event.preventDefault();
      resetFraming();
      return;
    }

    if (state.fitMode === "stretch") return;

    const step = event.shiftKey ? 0.1 : 0.03;
    let changed = false;
    if (key === "ArrowLeft") {
      state.anchorX = clampNumber(state.anchorX - step, 0, 1, state.anchorX);
      changed = true;
    } else if (key === "ArrowRight") {
      state.anchorX = clampNumber(state.anchorX + step, 0, 1, state.anchorX);
      changed = true;
    } else if (key === "ArrowUp") {
      state.anchorY = clampNumber(state.anchorY - step, 0, 1, state.anchorY);
      changed = true;
    } else if (key === "ArrowDown") {
      state.anchorY = clampNumber(state.anchorY + step, 0, 1, state.anchorY);
      changed = true;
    }

    if (changed) {
      event.preventDefault();
      touchState({ render: true, persist: true, syncFraming: true });
    }
  }

  function clientPointToCanvasCoords(clientX, clientY, rect = refs.previewCanvas.getBoundingClientRect()) {
    const x = clampNumber((clientX - rect.left) * (state.canvasWidth / rect.width), 0, state.canvasWidth, 0);
    const y = clampNumber((clientY - rect.top) * (state.canvasHeight / rect.height), 0, state.canvasHeight, 0);
    return { x, y };
  }

  function zoomAroundCanvasPoint(nextZoom, canvasX, canvasY) {
    const previousPlacement = computePlacement();
    state.zoom = nextZoom;

    if (!previousPlacement || state.fitMode === "stretch") {
      touchState({ render: true, persist: true, syncFraming: true });
      return;
    }

    const prevDrawW = previousPlacement.drawWidth;
    const prevDrawH = previousPlacement.drawHeight;
    if (!prevDrawW || !prevDrawH) {
      touchState({ render: true, persist: true, syncFraming: true });
      return;
    }

    const u = (canvasX - previousPlacement.drawX) / prevDrawW;
    const v = (canvasY - previousPlacement.drawY) / prevDrawH;

    const nextPlacement = computePlacement();
    if (!nextPlacement) {
      touchState({ render: true, persist: true, syncFraming: true });
      return;
    }

    if (nextPlacement.spareX !== 0) {
      const desiredX = canvasX - (u * nextPlacement.drawWidth);
      state.anchorX = clampNumber(desiredX / nextPlacement.spareX, 0, 1, state.anchorX);
    }
    if (nextPlacement.spareY !== 0) {
      const desiredY = canvasY - (v * nextPlacement.drawHeight);
      state.anchorY = clampNumber(desiredY / nextPlacement.spareY, 0, 1, state.anchorY);
    }

    touchState({ render: true, persist: false, syncFraming: true });
  }

  function nudgeZoom(delta) {
    const next = clampNumber(Math.round((state.zoom + delta) * 100) / 100, 0.1, 4, state.zoom);
    if (next === state.zoom) return;
    state.zoom = next;
    touchState({ render: true, persist: true, syncFraming: true });
  }

  async function downloadCurrentCanvas() {
    const outCanvas = document.createElement("canvas");
    outCanvas.width = state.canvasWidth;
    outCanvas.height = state.canvasHeight;
    const ctx = outCanvas.getContext("2d", { alpha: true });
    if (!ctx) {
      setStatus("error", "Canvas export context unavailable.");
      return;
    }

    try {
      drawCanvasSurface(ctx, {
        width: state.canvasWidth,
        height: state.canvasHeight,
        sourceNode: state.source?.image || null,
        sourceWidth: state.source?.width || 0,
        sourceHeight: state.source?.height || 0,
        showChecker: false,
        showGuides: false,
        includeTransparent: state.transparentBackground && state.exportFormat !== "jpeg"
      });

      const { blob, extension } = await canvasToBlobWithFormat(outCanvas, state.exportFormat, state.exportQuality);
      const baseName = slugifyFilename(stripExtension(state.source?.name || "canvas-image")) || "canvas-image";
      const fileName = `${baseName}-${state.canvasWidth}x${state.canvasHeight}.${extension}`;
      downloadBlob(blob, fileName);
      setStatus("ok", `Downloaded ${fileName}.`);
      flashButton(refs.downloadBtn);
      flashButton(refs.downloadPngBtn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("error", `Export failed: ${message}`);
    }
  }

  function canvasToBlobWithFormat(canvas, format, quality) {
    const mimeType = exportFormatToMime(format);
    const extension = mimeToExtension(mimeType) || format;
    return new Promise((resolve, reject) => {
      if (!canvas.toBlob) {
        try {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const blob = dataUrlToBlob(dataUrl);
          resolve({ blob, extension });
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Browser returned an empty export blob"));
            return;
          }
          resolve({ blob, extension });
        },
        mimeType,
        format === "png" ? undefined : quality
      );
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, payload] = dataUrl.split(",");
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const bytes = atob(payload);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
      array[i] = bytes.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportFormatToMime(format) {
    if (format === "jpeg") return "image/jpeg";
    if (format === "webp") return "image/webp";
    return "image/png";
  }

  function mimeToExtension(mime) {
    if (!mime) return "";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    const slash = mime.lastIndexOf("/");
    return slash >= 0 ? mime.slice(slash + 1) : mime;
  }

  function stripExtension(name) {
    const index = name.lastIndexOf(".");
    return index > 0 ? name.slice(0, index) : name;
  }

  function dragEventHasFiles(event) {
    const types = event.dataTransfer?.types;
    return !!types && Array.from(types).includes("Files");
  }

  function getFirstImageFileFromDragEvent(event) {
    const files = Array.from(event.dataTransfer?.files || []);
    return files.find((file) => file.type.startsWith("image/")) || null;
  }

  function schedulePersistSettings() {
    if (state.persistTimer) window.clearTimeout(state.persistTimer);
    state.persistTimer = window.setTimeout(() => {
      state.persistTimer = 0;
      flushPersistSettings();
    }, 180);
  }

  function flushPersistSettings() {
    if (state.persistTimer) {
      window.clearTimeout(state.persistTimer);
      state.persistTimer = 0;
    }
    try {
      const payload = {
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        presetId: state.presetId,
        fitMode: state.fitMode,
        zoom: state.zoom,
        anchorX: state.anchorX,
        anchorY: state.anchorY,
        smoothing: state.smoothing,
        backgroundColor: state.backgroundColor,
        transparentBackground: state.transparentBackground,
        checker: state.checker,
        guides: state.guides,
        exportFormat: state.exportFormat,
        exportQuality: state.exportQuality
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error(error);
    }
  }

  function setStatus(kind, message) {
    refs.statusBadge.classList.remove("ok", "warn", "error", "saving", "idle");
    if (kind && kind !== "idle") refs.statusBadge.classList.add(kind);
    refs.statusBadge.textContent = kind || "idle";
    refs.statusMessage.textContent = message;
  }

  function normalizePresetId(value, width, height) {
    if (typeof value === "string" && PRESET_BY_ID.has(value) && value !== "custom") {
      const preset = PRESET_BY_ID.get(value);
      if (preset && preset.width === width && preset.height === height) {
        return value;
      }
    }
    return detectPresetId(width, height);
  }

  function detectPresetId(width, height) {
    for (const preset of PRESETS) {
      if (!preset.width || !preset.height) continue;
      if (preset.width === width && preset.height === height) return preset.id;
    }
    return "custom";
  }

  function normalizeFitMode(value) {
    return value === "contain" || value === "stretch" ? value : "cover";
  }

  function normalizeExportFormat(value) {
    return value === "jpeg" || value === "webp" ? value : "png";
  }

  function clampCanvasSide(value, fallback) {
    return Math.round(clampNumber(Number(value), MIN_CANVAS_SIDE, MAX_CANVAS_SIDE, fallback));
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  function normalizeHexColor(value) {
    const raw = String(value || "").trim();
    const match3 = raw.match(/^#?([0-9a-fA-F]{3})$/);
    if (match3) {
      const [r, g, b] = match3[1].split("");
      return `#${(r + r + g + g + b + b).toUpperCase()}`;
    }
    const match6 = raw.match(/^#?([0-9a-fA-F]{6})$/);
    if (match6) return `#${match6[1].toUpperCase()}`;
    return "";
  }

  function formatAspect(width, height) {
    const gcdValue = gcd(width, height) || 1;
    const a = Math.round(width / gcdValue);
    const b = Math.round(height / gcdValue);
    return `${a}:${b}`;
  }

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  }

  function formatCoord(value) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function slugifyFilename(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function flashButton(button) {
    if (!button) return;
    button.classList.add("flash-ok");
    window.setTimeout(() => button.classList.remove("flash-ok"), 700);
  }
})();
