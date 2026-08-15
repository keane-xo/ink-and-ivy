(() => {
  const LIBRARIAN_UID = "66iUUKyOu7Rvu2I6Hwtdel82b";
  const LIBRARIAN_NAME = "kisseskeane".toLowerCase();
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
        color: #fff9f7;
        background: #b64050;
        border: 1px solid #8d2d3b;
        border-radius: 999px;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.12),
          0 2px 8px rgba(110,32,45,.14);
        font-family: Arial, sans-serif;
        font-size: .60rem;
        font-weight: 800;
        letter-spacing: .055em;
        line-height: 1;
        text-transform: lowercase;
        vertical-align: middle;
        white-space: nowrap;
      }

      .ii-librarian-name-host {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
      }

      h1.ii-librarian-name-host,
      h2.ii-librarian-name-host,
      h3.ii-librarian-name-host {
        gap: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function directBadge(host) {
    return Array.from(host.children || []).find(
      child => child.classList?.contains(BADGE_CLASS)
    );
  }

  function visibleTextWithoutBadge(element) {
    if (!(element instanceof Element)) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll(`.${BADGE_CLASS}`).forEach(node => node.remove());
    return (clone.textContent || "").trim().toLowerCase();
  }

  function makeBadge() {
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.textContent = "librarian";
    badge.setAttribute("aria-label", "librarian");
    badge.title = "ink and ivy librarian";
    return badge;
  }

  function decorateHost(host) {
    if (!(host instanceof Element)) return;

    const readerId = (host.dataset.readerId || "").trim();
    const exactNameMatch = visibleTextWithoutBadge(host) === LIBRARIAN_NAME;
    const isLibrarian = readerId === LIBRARIAN_UID || exactNameMatch;

    if (!isLibrarian) return;
    if (directBadge(host)) return;

    host.classList.add("ii-librarian-name-host");
    host.appendChild(makeBadge());
  }

  function bestHostForName(element) {
    return (
      element.closest(
        "[data-reader-id], .reader-name-line, .comment-author, " +
        ".reader-card-name, .public-name-row, .profile-name-preview-row"
      ) || element
    );
  }

  function decorateByUsername(root = document) {
    const candidates = root.querySelectorAll?.(
      "strong, h1, h2, h3, a, span, button, p"
    ) || [];

    candidates.forEach(element => {
      if (element.classList.contains(BADGE_CLASS)) return;
      if (visibleTextWithoutBadge(element) !== LIBRARIAN_NAME) return;

      const host = bestHostForName(element);
      if (!directBadge(host)) {
        host.classList.add("ii-librarian-name-host");
        host.appendChild(makeBadge());
      }
    });
  }

  function decorate(root = document) {
    installStyles();

    if (root instanceof Element && root.matches("[data-reader-id]")) {
      decorateHost(root);
    }

    root.querySelectorAll?.("[data-reader-id]").forEach(decorateHost);
    decorateByUsername(root);
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes") {
        decorateHost(mutation.target);
        decorateByUsername(document);
        return;
      }

      mutation.addedNodes.forEach(node => {
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
    displayName: LIBRARIAN_NAME,
    decorate
  };
})();
