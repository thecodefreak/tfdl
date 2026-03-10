(() => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.TFDLToast) return;

  const DEFAULT_DURATION_BY_TONE = {
    success: 4000,
    info: 4000,
    warning: 5000,
    error: 6500
  };

  const ICONS = {
    success:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>',
    info:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><path d="M12 7h.01"></path></svg>',
    warning:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.7 19h18.6L12 3Z"></path><path d="M12 9v4"></path><path d="M12 16h.01"></path></svg>',
    error:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6"></path><path d="m15 9-6 6"></path></svg>'
  };

  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg>';

  let viewport = null;

  function normalizeTone(value) {
    if (value === "success") return "success";
    if (value === "warning" || value === "warn") return "warning";
    if (value === "error" || value === "danger") return "error";
    return "info";
  }

  function ensureViewport() {
    if (viewport?.isConnected) return viewport;

    viewport = document.querySelector(".ds-toast-stack[data-owner='tfdl']");
    if (viewport) return viewport;

    viewport = document.createElement("div");
    viewport.className = "ds-toast-stack";
    viewport.dataset.owner = "tfdl";
    viewport.setAttribute("aria-live", "polite");
    viewport.setAttribute("aria-relevant", "additions");
    viewport.setAttribute("aria-atomic", "false");

    const mount = document.body || document.documentElement;
    mount.appendChild(viewport);
    return viewport;
  }

  function removeToast(node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.state === "closing") return;

    node.dataset.state = "closing";
    node.classList.remove("is-visible");
    node.classList.add("is-leaving");

    if (node._toastTimer) {
      window.clearTimeout(node._toastTimer);
      node._toastTimer = 0;
    }

    const finalize = () => {
      if (!node.isConnected) return;
      node.remove();
    };

    node.addEventListener("transitionend", finalize, { once: true });
    window.setTimeout(finalize, 260);
  }

  function buildToast(options) {
    const toast = document.createElement("section");
    const tone = normalizeTone(options.tone);
    toast.className = "ds-toast";
    toast.dataset.tone = tone;
    toast.dataset.state = "open";
    toast.setAttribute("role", tone === "error" ? "alert" : "status");
    toast.setAttribute("aria-live", tone === "error" ? "assertive" : "polite");
    toast.setAttribute("aria-atomic", "true");

    const iconWrap = document.createElement("div");
    iconWrap.className = "ds-toast__icon";
    iconWrap.innerHTML = ICONS[tone];

    const body = document.createElement("div");
    body.className = "ds-toast__body";

    if (options.title) {
      const title = document.createElement("div");
      title.className = "ds-toast__title";
      title.textContent = options.title;
      body.appendChild(title);
    }

    const message = document.createElement("div");
    message.className = "ds-toast__message";
    message.textContent = options.message;
    body.appendChild(message);

    const closeBtn = document.createElement("button");
    closeBtn.className = "ds-toast__close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss notification");
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.addEventListener("click", () => removeToast(toast));

    toast.append(iconWrap, body, closeBtn);
    return toast;
  }

  function show(options) {
    const settings = options && typeof options === "object" ? options : {};
    const message = String(settings.message || "").trim();
    if (!message) return null;

    const toast = buildToast({
      message,
      tone: settings.tone,
      title: settings.title ? String(settings.title).trim() : ""
    });

    if (settings.dismissible === false) {
      toast.querySelector(".ds-toast__close")?.remove();
    }

    ensureViewport().appendChild(toast);
    window.requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    const normalizedTone = normalizeTone(settings.tone);
    const duration = Number.isFinite(settings.durationMs)
      ? Math.max(0, Number(settings.durationMs))
      : DEFAULT_DURATION_BY_TONE[normalizedTone];

    if (duration > 0) {
      toast._toastTimer = window.setTimeout(() => removeToast(toast), duration);
    }

    return {
      element: toast,
      close: () => removeToast(toast)
    };
  }

  function success(message, options = {}) {
    return show({ ...options, message, tone: "success" });
  }

  function info(message, options = {}) {
    return show({ ...options, message, tone: "info" });
  }

  function warning(message, options = {}) {
    return show({ ...options, message, tone: "warning" });
  }

  function error(message, options = {}) {
    return show({ ...options, message, tone: "error" });
  }

  window.TFDLToast = {
    show,
    success,
    info,
    warning,
    error
  };
})();
