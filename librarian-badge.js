(() => {
  const LIBRARIAN_UID = "66iUUKyOu7Rvu2I6Hwtdel82b";
  const LIBRARIAN_NAME = "kisseskeane";
  const BADGE_CLASS = "ii-librarian-role-badge";
  const STYLE_ID = "ii-librarian-role-style";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ii-librarian-role-badge {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 0 0 0 8px !important;
        padding: 5px 10px !important;
        color: #8e3442 !important;
        background: rgba(190, 83, 103, 0.09) !important;
        border: 1px solid rgba(142, 52, 66, 0.72) !important;
        border-radius: 999px !important;
        box-shadow: none !important;
        font-family: Arial, sans-serif !important;
        font-size: 0.66rem !important;
        font-style: normal !important;
        font-weight: 600 !important;
        letter-spacing: 0.055em !important;
        line-height: 1 !important;
        text-transform: lowercase !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
        position: static !important;
        transform: none !important;
      }

      .ii-librarian-name-host {
        display: inline-flex !important;
        align-items: center !important;
        flex-wrap: wrap !important;
      }
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function ownVisibleText(element) {
    if (!(element instanceof Element)) return "";

    return normalize(
      Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent || "")
        .join(" ")
    );
  }

  function directBadges(host) {
    return Array.from(host.children || []).filter(
      child => child.classList?.contains(BADGE_CLASS)
    );
  }

  function makeBadge() {
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.textContent = "librarian";
    badge.setAttribute("aria-label", "librarian");
    badge.title = "ink and ivy librarian";
    return badge;
  }

  function ensureOneBadge(host) {
    if (!(host instanceof Element)) return;

    host.classList.add("ii-librarian-name-host");

    let badges = directBadges(host);
    if (!badges.length) {
      host.appendChild(makeBadge());
      badges = directBadges(host);
    }

    badges.slice(1).forEach(badge => badge.remove());
  }

  function decorateExactUsername(root = document) {
    const selectors = [
      "strong",
      "h1",
      "h2",
      "h3",
      "a",
      "span",
      "button",
      "p"
    ].join(",");

    const candidates = [];

    if (root instanceof Element && root.matches(selectors)) {
      candidates.push(root);
    }

    root.querySelectorAll?.(selectors).forEach(element => candidates.push(element));

    candidates.forEach(element => {
      if (element.classList.contains(BADGE_CLASS)) return;

      // The key fix: match the element's OWN text node, not the text of a
      // large parent container. That prevents duplicate badges in menus/cards.
      if (ownVisibleText(element) !== LIBRARIAN_NAME) return;

      ensureOneBadge(element);
    });
  }

  function decorateAdminUid(root = document) {
    const candidates = [];

    if (root instanceof Element && root.matches("[data-reader-id]")) {
      candidates.push(root);
    }

    root.querySelectorAll?.("[data-reader-id]").forEach(element => candidates.push(element));

    candidates.forEach(element => {
      if ((element.dataset.readerId || "").trim() !== LIBRARIAN_UID) return;

      // If this container already contains an exact username element, that
      // exact element gets the badge instead. This keeps the pill beside the
      // name rather than beside the entire card/menu row.
      const namedChild = Array.from(
        element.querySelectorAll("strong,h1,h2,h3,a,span,button,p")
      ).find(child => ownVisibleText(child) === LIBRARIAN_NAME);

      if (namedChild) {
        ensureOneBadge(namedChild);
        return;
      }

      // Only fall back to the UID container if it itself is the name element.
      if (ownVisibleText(element) === LIBRARIAN_NAME) {
        ensureOneBadge(element);
      }
    });
  }

  function removeStrayDuplicates() {
    // Remove badges whose parent is not an exact username element. This cleans
    // up copies left in larger dropdown/card containers by older script versions.
    document.querySelectorAll(`.${BADGE_CLASS}`).forEach(badge => {
      const host = badge.parentElement;
      if (!host) {
        badge.remove();
        return;
      }

      if (ownVisibleText(host) !== LIBRARIAN_NAME) {
        badge.remove();
      }
    });

    // One badge max beside each exact username.
    document.querySelectorAll(".ii-librarian-name-host").forEach(host => {
      directBadges(host).slice(1).forEach(badge => badge.remove());
    });
  }

  function decorate(root = document) {
    installStyles();
    decorateExactUsername(root);
    decorateAdminUid(root);
    removeStrayDuplicates();
  }

  let scheduled = false;
  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorate(document);
    });
  }

  const observer = new MutationObserver(scheduleDecorate);

  function start() {
    decorate(document);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
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
    refresh: () => decorate(document)
  };
})();
