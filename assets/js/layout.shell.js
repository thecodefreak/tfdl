(() => {
  function attr(el, name, fallback = "") {
    const value = el.getAttribute(name);
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  function appendTextElement(parent, tagName, text, attrs = null) {
    if (!text) return null;
    const node = document.createElement(tagName);
    node.textContent = text;
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === "") continue;
        node.setAttribute(key, value);
      }
    }
    parent.appendChild(node);
    return node;
  }

  function upgradeToolShell(host) {
    if (!(host instanceof HTMLElement)) return;
    if (host.dataset.layoutShellUpgraded === "true") return;
    host.dataset.layoutShellUpgraded = "true";

    const eyebrow = attr(host, "eyebrow", "Tool");
    const heading = attr(host, "heading", "Untitled Tool");
    const lede = attr(host, "lede", "");
    const backHref = attr(host, "back-href", "../../../index.html");
    const backLabel = attr(host, "back-label", "Back to launcher");
    const backClass = attr(host, "back-class", "back-link ui-btn ui-btn--ghost");
    const pageLabel = attr(host, "aria-label", `${heading} page`);

    const main = document.createElement("main");
    main.className = "tool-shell";
    main.setAttribute("aria-label", pageLabel);

    if (host.id) main.id = host.id;
    for (const cls of host.classList) {
      main.classList.add(cls);
    }

    const header = document.createElement("header");
    const copyWrap = document.createElement("div");
    appendTextElement(copyWrap, "p", eyebrow, { class: "eyebrow" });
    appendTextElement(copyWrap, "h1", heading);
    appendTextElement(copyWrap, "p", lede);
    header.appendChild(copyWrap);

    if (backHref) {
      const back = document.createElement("a");
      back.className = backClass;
      back.href = backHref;
      back.textContent = backLabel;
      header.appendChild(back);
    }

    const content = document.createDocumentFragment();
    while (host.firstChild) {
      content.appendChild(host.firstChild);
    }

    main.appendChild(header);
    main.appendChild(content);
    host.replaceWith(main);
  }

  if (typeof window === "undefined" || !("customElements" in window)) {
    return;
  }

  class WtToolShellElement extends HTMLElement {
    connectedCallback() {
      upgradeToolShell(this);
    }
  }

  if (!window.customElements.get("wt-tool-shell")) {
    window.customElements.define("wt-tool-shell", WtToolShellElement);
  }
})();
