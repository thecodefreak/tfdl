(() => {
  const refs = {
    canvas: document.getElementById("canvas"),
    canvasWrap: document.getElementById("canvasWrap"),
    canvasEmpty: document.getElementById("canvasEmpty"),
    fileInput: document.getElementById("fileInput"),
    downloadBtn: document.getElementById("downloadBtn"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    clearOverlaysBtn: document.getElementById("clearOverlaysBtn"),
    flattenBtn: document.getElementById("flattenBtn"),
    deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
    duplicateSelectedBtn: document.getElementById("duplicateSelectedBtn"),
    applyResizeBtn: document.getElementById("applyResizeBtn"),
    resizeWidth: document.getElementById("resizeWidth"),
    resizeHeight: document.getElementById("resizeHeight"),
    imageStatus: document.getElementById("imageStatus"),
    modeHint: document.getElementById("modeHint"),
    selectionLabel: document.getElementById("selectionLabel"),
    historyInfo: document.getElementById("historyInfo"),
    canvasSizeChip: document.getElementById("canvasSizeChip"),
    actionCountChip: document.getElementById("actionCountChip"),
    selectionChip: document.getElementById("selectionChip"),
    pointerHint: document.getElementById("pointerHint"),
    highlightColor: document.getElementById("highlightColor"),
    highlightAlpha: document.getElementById("highlightAlpha"),
    highlightSize: document.getElementById("highlightSize"),
    highlightAlphaOut: document.getElementById("highlightAlphaOut"),
    highlightSizeOut: document.getElementById("highlightSizeOut"),
    redactStyle: document.getElementById("redactStyle"),
    pixelSize: document.getElementById("pixelSize"),
    pixelSizeOut: document.getElementById("pixelSizeOut"),
    blurAmount: document.getElementById("blurAmount"),
    blurAmountOut: document.getElementById("blurAmountOut"),
    modeButtons: Array.from(document.querySelectorAll(".segment[data-mode]")),
    highlightGroup: document.getElementById("highlight-title")?.closest(".control-group"),
    redactGroup: document.getElementById("redact-title")?.closest(".control-group")
  };

  const ctx = refs.canvas.getContext("2d", { willReadFrequently: true });
  const HANDLE_SIZE = 12;
  const MIN_RECT_SIZE = 8;

  const offscreen = document.createElement("canvas");
  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  const blurCanvas = document.createElement("canvas");
  const blurCtx = blurCanvas.getContext("2d");

  const state = {
    mode: "highlight",
    baseImage: null,
    baseDataURL: "",
    width: 960,
    height: 540,
    actions: [],
    selectedActionId: null,
    history: [],
    historyIndex: -1,
    interaction: null,
    pointerDown: false
  };

  initialize();

  function initialize() {
    refs.canvas.width = state.width;
    refs.canvas.height = state.height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, state.width, state.height);

    bindInputs();
    bindCanvas();
    bindGlobalShortcuts();
    syncOutputs();
    refreshUI();
    render();
  }

  function bindInputs() {
    refs.fileInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await loadImageFromFile(file);
      event.target.value = "";
    });

    refs.downloadBtn.addEventListener("click", downloadPNG);
    refs.undoBtn.addEventListener("click", () => void undo());
    refs.redoBtn.addEventListener("click", () => void redo());
    refs.clearOverlaysBtn.addEventListener("click", clearOverlays);
    refs.flattenBtn.addEventListener("click", () => void flattenIntoBase());
    refs.deleteSelectedBtn.addEventListener("click", deleteSelectedRect);
    refs.duplicateSelectedBtn.addEventListener("click", duplicateSelectedRect);
    refs.applyResizeBtn.addEventListener("click", () => void resizeCanvasFromInputs());

    refs.highlightAlpha.addEventListener("input", syncOutputs);
    refs.highlightSize.addEventListener("input", syncOutputs);
    refs.pixelSize.addEventListener("input", syncOutputs);
    refs.blurAmount.addEventListener("input", syncOutputs);

    refs.redactStyle.addEventListener("change", () => {
      updateSelectedRectSettingsFromControls(true);
    });

    refs.pixelSize.addEventListener("change", () => {
      updateSelectedRectSettingsFromControls(true);
    });

    refs.blurAmount.addEventListener("change", () => {
      updateSelectedRectSettingsFromControls(true);
    });

    refs.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.dataset.mode || "highlight");
      });
    });

    [refs.resizeWidth, refs.resizeHeight].forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void resizeCanvasFromInputs();
        }
      });
    });

    window.addEventListener("paste", async (event) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        await loadImageFromBlob(blob);
        event.preventDefault();
        break;
      }
    });
  }

  function bindCanvas() {
    refs.canvas.addEventListener("pointerdown", onPointerDown);
    refs.canvas.addEventListener("pointermove", onPointerMove);
    refs.canvas.addEventListener("pointerup", onPointerUp);
    refs.canvas.addEventListener("pointercancel", onPointerUp);
    refs.canvas.addEventListener("pointerleave", onPointerLeave);

    refs.canvasWrap.addEventListener("dragover", (event) => {
      event.preventDefault();
      refs.canvasWrap.classList.add("dragover");
    });

    refs.canvasWrap.addEventListener("dragleave", (event) => {
      if (event.target === refs.canvasWrap) {
        refs.canvasWrap.classList.remove("dragover");
      }
    });

    refs.canvasWrap.addEventListener("drop", async (event) => {
      event.preventDefault();
      refs.canvasWrap.classList.remove("dragover");
      const file = Array.from(event.dataTransfer?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) {
        await loadImageFromFile(file);
      }
    });
  }

  function bindGlobalShortcuts() {
    window.addEventListener("keydown", (event) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          void redo();
        } else {
          void undo();
        }
        return;
      }

      if (isTyping) return;
      if (event.key === "h" || event.key === "H") {
        event.preventDefault();
        setMode("highlight");
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        setMode("redact");
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (state.mode === "redact" && state.selectedActionId) {
          event.preventDefault();
          deleteSelectedRect();
        }
      }
    });
  }

  async function loadImageFromFile(file) {
    const dataURL = await fileToDataURL(file);
    await loadBaseImage(dataURL);
    state.actions = [];
    state.selectedActionId = null;
    pushHistory();
    render();
    refreshUI();
  }

  async function loadImageFromBlob(blob) {
    const dataURL = await blobToDataURL(blob);
    await loadBaseImage(dataURL);
    state.actions = [];
    state.selectedActionId = null;
    pushHistory();
    render();
    refreshUI();
  }

  async function loadBaseImage(dataURL) {
    const img = await loadImageElement(dataURL);
    state.baseImage = img;
    state.baseDataURL = dataURL;
    state.width = img.naturalWidth || img.width;
    state.height = img.naturalHeight || img.height;
    refs.canvas.width = state.width;
    refs.canvas.height = state.height;
    refs.resizeWidth.value = String(state.width);
    refs.resizeHeight.value = String(state.height);
  }

  function setMode(mode) {
    if (mode !== "highlight" && mode !== "redact") return;
    state.mode = mode;
    if (mode === "highlight") {
      state.selectedActionId = null;
    }
    state.interaction = null;
    refreshUI();
    render();
  }

  function onPointerDown(event) {
    if (!ensureImageLoaded()) return;
    if (event.button !== 0) return;
    const p = getCanvasPoint(event);
    state.pointerDown = true;

    if (state.mode === "highlight") {
      refs.canvas.setPointerCapture?.(event.pointerId);
      state.interaction = {
        type: "draw-highlight",
        pointerId: event.pointerId,
        stroke: {
          id: createId("hl"),
          type: "highlight",
          color: refs.highlightColor.value,
          alpha: clamp(parseFloat(refs.highlightAlpha.value), 0.05, 1),
          size: clamp(parseInt(refs.highlightSize.value, 10), 1, 400),
          points: [p]
        }
      };
      render();
      event.preventDefault();
      return;
    }

    const hit = pickRedactAction(p.x, p.y);
    refs.canvas.setPointerCapture?.(event.pointerId);

    if (hit) {
      state.selectedActionId = hit.action.id;
      if (hit.part === "handle") {
        state.interaction = {
          type: "resize-rect",
          pointerId: event.pointerId,
          actionId: hit.action.id,
          start: p,
          initial: cloneAction(hit.action)
        };
      } else {
        state.interaction = {
          type: "move-rect",
          pointerId: event.pointerId,
          actionId: hit.action.id,
          start: p,
          initial: cloneAction(hit.action)
        };
      }
    } else {
      const draft = {
        id: createId("rd"),
        type: "redact",
        style: refs.redactStyle.value,
        x: p.x,
        y: p.y,
        w: 1,
        h: 1,
        pixelSize: parseInt(refs.pixelSize.value, 10),
        blurAmount: parseInt(refs.blurAmount.value, 10)
      };
      state.interaction = {
        type: "create-rect",
        pointerId: event.pointerId,
        start: p,
        draft
      };
      state.selectedActionId = draft.id;
    }

    refreshUI();
    render();
    event.preventDefault();
  }

  function onPointerMove(event) {
    const interaction = state.interaction;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const p = getCanvasPoint(event);

    if (interaction.type === "draw-highlight") {
      addInterpolatedPoint(interaction.stroke.points, p);
      render();
      event.preventDefault();
      return;
    }

    if (interaction.type === "create-rect") {
      const rect = normalizedRect(interaction.start, p);
      interaction.draft.x = rect.x;
      interaction.draft.y = rect.y;
      interaction.draft.w = rect.w;
      interaction.draft.h = rect.h;
      render();
      event.preventDefault();
      return;
    }

    const action = state.actions.find((a) => a.id === interaction.actionId && a.type === "redact");
    if (!action) return;

    if (interaction.type === "move-rect") {
      const dx = p.x - interaction.start.x;
      const dy = p.y - interaction.start.y;
      action.x = clamp(interaction.initial.x + dx, 0, Math.max(0, state.width - action.w));
      action.y = clamp(interaction.initial.y + dy, 0, Math.max(0, state.height - action.h));
      render();
      event.preventDefault();
      return;
    }

    if (interaction.type === "resize-rect") {
      action.w = clamp(interaction.initial.w + (p.x - interaction.start.x), MIN_RECT_SIZE, state.width - action.x);
      action.h = clamp(interaction.initial.h + (p.y - interaction.start.y), MIN_RECT_SIZE, state.height - action.y);
      render();
      event.preventDefault();
    }
  }

  function onPointerUp(event) {
    finishInteraction(event.pointerId);
  }

  function onPointerLeave(event) {
    const interaction = state.interaction;
    if (!interaction) return;
    if (interaction.type === "draw-highlight" && interaction.pointerId === event.pointerId && !refs.canvas.hasPointerCapture?.(event.pointerId)) {
      finishInteraction(event.pointerId);
    }
  }

  function finishInteraction(pointerId) {
    const interaction = state.interaction;
    if (!interaction || interaction.pointerId !== pointerId) return;
    refs.canvas.releasePointerCapture?.(pointerId);

    if (interaction.type === "draw-highlight") {
      const stroke = interaction.stroke;
      if (stroke.points.length > 1) {
        state.actions.push(stroke);
        state.selectedActionId = null;
        pushHistory();
      }
    }

    if (interaction.type === "create-rect") {
      const rect = interaction.draft;
      if (rect.w >= MIN_RECT_SIZE && rect.h >= MIN_RECT_SIZE) {
        state.actions.push(rect);
        state.selectedActionId = rect.id;
        pushHistory();
      } else {
        state.selectedActionId = null;
      }
    }

    if (interaction.type === "move-rect" || interaction.type === "resize-rect") {
      const current = state.actions.find((a) => a.id === interaction.actionId);
      if (current && !sameRect(current, interaction.initial)) {
        pushHistory();
      }
    }

    state.interaction = null;
    state.pointerDown = false;
    refreshUI();
    render();
  }

  function ensureImageLoaded() {
    return Boolean(state.baseImage);
  }

  function render() {
    if (!state.baseImage) {
      refs.canvas.width = state.width;
      refs.canvas.height = state.height;
      ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, refs.canvas.width, refs.canvas.height);
      refs.canvasEmpty.classList.remove("is-hidden");
      refs.canvas.style.cursor = "crosshair";
      updateMetaBadges();
      return;
    }

    refs.canvasEmpty.classList.add("is-hidden");
    refs.canvas.width = state.width;
    refs.canvas.height = state.height;
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.drawImage(state.baseImage, 0, 0, state.width, state.height);

    for (const action of state.actions) {
      drawAction(action);
    }

    if (state.interaction?.type === "draw-highlight") {
      drawHighlight(state.interaction.stroke);
    }

    if (state.interaction?.type === "create-rect") {
      drawRedactAction(state.interaction.draft);
      drawRectOverlay(state.interaction.draft, { preview: true });
    }

    const selected = getSelectedRedactAction();
    if (selected && state.mode === "redact") {
      drawRectOverlay(selected, { preview: false });
      refs.canvas.style.cursor = "crosshair";
    } else {
      refs.canvas.style.cursor = state.mode === "redact" ? "crosshair" : "crosshair";
    }

    updateMetaBadges();
  }

  function drawAction(action) {
    if (action.type === "highlight") {
      drawHighlight(action);
      return;
    }
    if (action.type === "redact") {
      drawRedactAction(action);
    }
  }

  function drawHighlight(action) {
    if (!action.points?.length) return;
    if (action.points.length === 1) {
      ctx.save();
      ctx.globalAlpha = action.alpha;
      ctx.fillStyle = action.color;
      ctx.beginPath();
      ctx.arc(action.points[0].x, action.points[0].y, action.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = clamp(action.alpha, 0.01, 1);
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(action.points[0].x, action.points[0].y);
    for (let i = 1; i < action.points.length; i += 1) {
      ctx.lineTo(action.points[i].x, action.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawRedactAction(action) {
    const x = Math.round(action.x);
    const y = Math.round(action.y);
    const w = Math.round(action.w);
    const h = Math.round(action.h);
    if (w <= 0 || h <= 0) return;

    if (action.style === "black") {
      ctx.save();
      ctx.fillStyle = "rgba(8, 10, 12, 0.98)";
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      return;
    }

    if (action.style === "blur") {
      blurArea(x, y, w, h, action.blurAmount || 10);
      return;
    }

    pixelateArea(x, y, w, h, action.pixelSize || 12);
  }

  function blurArea(x, y, w, h, amount) {
    if (w <= 0 || h <= 0) return;
    const blur = clamp(Math.round(amount || 8), 1, 40);
    const pad = Math.min(Math.ceil(blur * 2), 64);
    const sx = clamp(Math.floor(x - pad), 0, state.width);
    const sy = clamp(Math.floor(y - pad), 0, state.height);
    const ex = clamp(Math.ceil(x + w + pad), 0, state.width);
    const ey = clamp(Math.ceil(y + h + pad), 0, state.height);
    const sw = ex - sx;
    const sh = ey - sy;
    if (sw <= 0 || sh <= 0) return;

    offscreen.width = sw;
    offscreen.height = sh;
    blurCanvas.width = sw;
    blurCanvas.height = sh;

    offCtx.clearRect(0, 0, sw, sh);
    offCtx.drawImage(refs.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    blurCtx.save();
    blurCtx.clearRect(0, 0, sw, sh);
    blurCtx.filter = `blur(${blur}px)`;
    blurCtx.drawImage(offscreen, 0, 0);
    blurCtx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(blurCanvas, sx, sy);
    ctx.restore();
  }

  function pixelateArea(x, y, w, h, pixelSize) {
    const pxSize = clamp(Math.round(pixelSize || 12), 2, 64);
    const sx = clamp(Math.floor(x), 0, state.width);
    const sy = clamp(Math.floor(y), 0, state.height);
    const ex = clamp(Math.ceil(x + w), 0, state.width);
    const ey = clamp(Math.ceil(y + h), 0, state.height);
    const sw = ex - sx;
    const sh = ey - sy;
    if (sw <= 0 || sh <= 0) return;

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    for (let py = 0; py < sh; py += pxSize) {
      for (let px = 0; px < sw; px += pxSize) {
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        const blockW = Math.min(pxSize, sw - px);
        const blockH = Math.min(pxSize, sh - py);

        for (let yy = 0; yy < blockH; yy += 1) {
          for (let xx = 0; xx < blockW; xx += 1) {
            const idx = ((py + yy) * sw + (px + xx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count += 1;
          }
        }

        if (!count) continue;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let yy = 0; yy < blockH; yy += 1) {
          for (let xx = 0; xx < blockW; xx += 1) {
            const idx = ((py + yy) * sw + (px + xx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }

  function drawRectOverlay(rect, options = {}) {
    ctx.save();
    ctx.strokeStyle = options.preview ? "rgba(110, 203, 255, 0.95)" : "rgba(132, 243, 203, 0.95)";
    ctx.fillStyle = options.preview ? "rgba(110, 203, 255, 0.12)" : "rgba(132, 243, 203, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.setLineDash([]);

    const handleX = rect.x + rect.w - HANDLE_SIZE / 2;
    const handleY = rect.y + rect.h - HANDLE_SIZE / 2;
    ctx.fillStyle = options.preview ? "rgba(110, 203, 255, 0.95)" : "rgba(132, 243, 203, 0.95)";
    ctx.strokeStyle = "rgba(9, 12, 16, 0.9)";
    ctx.lineWidth = 1;
    ctx.fillRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE);
    ctx.restore();
  }

  function pickRedactAction(x, y) {
    for (let i = state.actions.length - 1; i >= 0; i -= 1) {
      const action = state.actions[i];
      if (action.type !== "redact") continue;
      if (!pointInRect(x, y, action)) continue;
      const onHandle = pointOnHandle(x, y, action);
      return { action, part: onHandle ? "handle" : "body" };
    }
    return null;
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function pointOnHandle(x, y, rect) {
    const hx = rect.x + rect.w;
    const hy = rect.y + rect.h;
    return Math.abs(x - hx) <= HANDLE_SIZE && Math.abs(y - hy) <= HANDLE_SIZE;
  }

  function getSelectedRedactAction() {
    if (!state.selectedActionId) return null;
    const action = state.actions.find((a) => a.id === state.selectedActionId && a.type === "redact");
    return action || null;
  }

  function deleteSelectedRect() {
    const selected = getSelectedRedactAction();
    if (!selected) return;
    state.actions = state.actions.filter((a) => a.id !== selected.id);
    state.selectedActionId = null;
    pushHistory();
    refreshUI();
    render();
  }

  function duplicateSelectedRect() {
    const selected = getSelectedRedactAction();
    if (!selected) return;
    const next = {
      ...cloneAction(selected),
      id: createId("rd"),
      x: clamp(selected.x + 16, 0, Math.max(0, state.width - selected.w)),
      y: clamp(selected.y + 16, 0, Math.max(0, state.height - selected.h))
    };
    state.actions.push(next);
    state.selectedActionId = next.id;
    pushHistory();
    refreshUI();
    render();
  }

  function clearOverlays() {
    if (!state.actions.length) return;
    state.actions = [];
    state.selectedActionId = null;
    pushHistory();
    refreshUI();
    render();
  }

  async function flattenIntoBase() {
    if (!state.baseImage) return;
    render();
    const dataURL = refs.canvas.toDataURL("image/png");
    await loadBaseImage(dataURL);
    state.actions = [];
    state.selectedActionId = null;
    pushHistory();
    refreshUI();
    render();
  }

  async function resizeCanvasFromInputs() {
    if (!state.baseImage) return;
    const nextW = parseInt(refs.resizeWidth.value, 10);
    const nextH = parseInt(refs.resizeHeight.value, 10);
    if (!Number.isFinite(nextW) || !Number.isFinite(nextH) || nextW <= 0 || nextH <= 0) {
      alert("Enter valid width/height values.");
      return;
    }

    render();
    const temp = document.createElement("canvas");
    temp.width = nextW;
    temp.height = nextH;
    const tempCtx = temp.getContext("2d");
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.drawImage(refs.canvas, 0, 0, nextW, nextH);

    await loadBaseImage(temp.toDataURL("image/png"));
    state.actions = [];
    state.selectedActionId = null;
    pushHistory();
    refreshUI();
    render();
  }

  function downloadPNG() {
    if (!state.baseImage) {
      alert("Upload or paste an image first.");
      return;
    }
    render();
    const link = document.createElement("a");
    link.download = "image-markup.png";
    link.href = refs.canvas.toDataURL("image/png");
    link.click();
  }

  async function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex -= 1;
    await restoreSnapshot(state.history[state.historyIndex]);
    refreshUI();
    render();
  }

  async function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex += 1;
    await restoreSnapshot(state.history[state.historyIndex]);
    refreshUI();
    render();
  }

  function pushHistory() {
    const snapshot = snapshotState();
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    state.historyIndex = state.history.length - 1;
    refreshUI();
  }

  function snapshotState() {
    return {
      baseDataURL: state.baseDataURL,
      width: state.width,
      height: state.height,
      actions: state.actions.map(cloneAction),
      selectedActionId: state.selectedActionId
    };
  }

  async function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    await loadBaseImage(snapshot.baseDataURL);
    state.actions = snapshot.actions.map(cloneAction);
    state.selectedActionId = snapshot.selectedActionId;
    state.interaction = null;
  }

  function updateSelectedRectSettingsFromControls(commitHistory) {
    const selected = getSelectedRedactAction();
    if (!selected) return;
    const before = cloneAction(selected);
    selected.style = refs.redactStyle.value;
    selected.pixelSize = parseInt(refs.pixelSize.value, 10);
    selected.blurAmount = parseInt(refs.blurAmount.value, 10);
    const changed =
      selected.style !== before.style ||
      selected.pixelSize !== before.pixelSize ||
      selected.blurAmount !== before.blurAmount;
    if (changed && commitHistory) {
      pushHistory();
    }
    refreshUI();
    render();
  }

  function refreshUI() {
    syncOutputs();

    const hasImage = Boolean(state.baseImage);
    const hasActions = state.actions.length > 0;
    const selectedRect = getSelectedRedactAction();

    refs.modeButtons.forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });

    refs.modeHint.textContent = state.mode === "highlight" ? "Highlight" : "Redact";
    refs.pointerHint.textContent =
      state.mode === "highlight"
        ? "Drag to draw translucent highlight strokes."
        : "Drag to create a box. Drag a box to move it. Use bottom-right handle to resize.";

    refs.highlightGroup?.classList.toggle("is-disabled", state.mode !== "highlight");
    refs.redactGroup?.classList.toggle("is-disabled", state.mode !== "redact");

    refs.imageStatus.textContent = hasImage
      ? `Loaded image • ${state.width}×${state.height} • ${state.actions.length} overlay action${state.actions.length === 1 ? "" : "s"}`
      : "No image loaded. Upload, paste, or drop one.";

    refs.undoBtn.disabled = state.historyIndex <= 0;
    refs.redoBtn.disabled = state.historyIndex >= state.history.length - 1 || state.historyIndex === -1;
    refs.downloadBtn.disabled = !hasImage;
    refs.clearOverlaysBtn.disabled = !hasActions;
    refs.flattenBtn.disabled = !hasImage;
    refs.applyResizeBtn.disabled = !hasImage;
    refs.deleteSelectedBtn.disabled = !selectedRect;
    refs.duplicateSelectedBtn.disabled = !selectedRect;

    refs.selectionLabel.textContent = selectedRect
      ? `${selectedRect.style} ${Math.round(selectedRect.w)}×${Math.round(selectedRect.h)}`
      : "none";

    if (selectedRect) {
      refs.redactStyle.value = selectedRect.style;
      refs.pixelSize.value = String(selectedRect.pixelSize || parseInt(refs.pixelSize.value, 10));
      refs.blurAmount.value = String(selectedRect.blurAmount || parseInt(refs.blurAmount.value, 10));
      syncOutputs();
    }

    refs.historyInfo.textContent = `${Math.max(state.historyIndex + 1, 0)}/${state.history.length}`;
  }

  function updateMetaBadges() {
    refs.canvasSizeChip.textContent = `canvas: ${state.width}x${state.height}`;
    refs.actionCountChip.textContent = `actions: ${state.actions.length}`;

    const selected = getSelectedRedactAction();
    if (selected) {
      refs.selectionChip.textContent = `selected: ${selected.style} ${Math.round(selected.x)},${Math.round(selected.y)} ${Math.round(selected.w)}x${Math.round(selected.h)}`;
    } else {
      refs.selectionChip.textContent = "selected: none";
    }
  }

  function syncOutputs() {
    refs.highlightAlphaOut.textContent = Number(refs.highlightAlpha.value).toFixed(2);
    refs.highlightSizeOut.textContent = refs.highlightSize.value;
    refs.pixelSizeOut.textContent = refs.pixelSize.value;
    refs.blurAmountOut.textContent = refs.blurAmount.value;
  }

  function getCanvasPoint(event) {
    const rect = refs.canvas.getBoundingClientRect();
    const scaleX = refs.canvas.width / rect.width;
    const scaleY = refs.canvas.height / rect.height;
    return {
      x: clamp((event.clientX - rect.left) * scaleX, 0, refs.canvas.width),
      y: clamp((event.clientY - rect.top) * scaleY, 0, refs.canvas.height)
    };
  }

  function addInterpolatedPoint(points, nextPoint) {
    const last = points[points.length - 1];
    if (!last) {
      points.push(nextPoint);
      return;
    }
    const dx = nextPoint.x - last.x;
    const dy = nextPoint.y - last.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const spacing = 4;
    if (distance <= spacing) {
      points.push(nextPoint);
      return;
    }
    const steps = Math.ceil(distance / spacing);
    for (let i = 1; i < steps; i += 1) {
      points.push({ x: last.x + (dx * i) / steps, y: last.y + (dy * i) / steps });
    }
    points.push(nextPoint);
  }

  function normalizedRect(start, end) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    return {
      x: clamp(x, 0, state.width),
      y: clamp(y, 0, state.height),
      w: clamp(w, 0, state.width - x),
      h: clamp(h, 0, state.height - y)
    };
  }

  function sameRect(a, b) {
    return (
      Math.round(a.x) === Math.round(b.x) &&
      Math.round(a.y) === Math.round(b.y) &&
      Math.round(a.w) === Math.round(b.w) &&
      Math.round(a.h) === Math.round(b.h)
    );
  }

  function cloneAction(action) {
    if (action.type === "highlight") {
      return {
        ...action,
        points: action.points.map((p) => ({ x: p.x, y: p.y }))
      };
    }
    return { ...action };
  }

  function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read blob"));
      reader.readAsDataURL(blob);
    });
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }
})();
