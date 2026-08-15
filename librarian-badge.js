(() => {
  const LIBRARIAN_UID = "66iUUKyOu7Rvu2I6Hwtdel82b";
  const BADGE_CLASS = "ii-librarian-role-badge";
  const STYLE_ID = "ii-librarian-role-style";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ii-librarian-role-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        min-height: 22px;
        margin-left: 7px;
        padding: 3px 8px;
        color: #fff8f5;
        background: #a93f4f;
        border: 1px solid #7f2936;
        border-radius: 999px;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.10),
          0 2px 7px rgba(93,31,42,.12);
        font-family: Arial, sans-serif;
        font-size: .60rem;
        font-weight: 800;
        letter-spacing: .055em;
        line-height: 1;
        text-transform: lowercase;
        vertical-align: middle;
        white-space: nowrap;
      }

      h1 > .ii-librarian-role-badge,
      h2 > .ii-librarian-role-badge,
      h3 > .ii-librarian-role-badge {
        transform: translateY(-2px);
      }

      .ii-librarian-name-host {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function directBadge(host) {
    return Array.from(host.children || []).find(
      (child) => child.classList?.contains(BADGE_CLASS)
    );
  }

  function decorateHost(host) {
    if (!(host instanceof Element)) return;

    const readerId = host.dataset.readerId || "";
    const existing = directBadge(host);

    if (readerId !== LIBRARIAN_UID) {
      existing?.remove();
      return;
    }

    host.classList.add("ii-librarian-name-host");

    if (existing) return;

    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.textContent = "librarian";
    badge.setAttribute("aria-label", "librarian");
    badge.title = "ink and ivy librarian";
    host.appendChild(badge);
  }

  function decorate(root = document) {
    installStyles();

    if (root instanceof Element && root.matches("[data-reader-id]")) {
      decorateHost(root);
    }

    root.querySelectorAll?.("[data-reader-id]").forEach(decorateHost);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        decorateHost(mutation.target);
        return;
      }

      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) decorate(node);
      });
    });
  });

  function start() {
    decorate(document);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-reader-id"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.InkIvyLibrarianBadge = {
    uid: LIBRARIAN_UID,
    decorate
  };
})();
