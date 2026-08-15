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
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        min-height:24px;
        margin-left:8px;
        padding:4px 10px;
        color:#8f3443;
        background:rgba(182,64,80,.10);
        border:1px solid #a94d5c;
        border-radius:999px;
        box-shadow:none;
        font-family:Arial,sans-serif;
        font-size:.67rem;
        font-weight:600;
        letter-spacing:.045em;
        line-height:1;
        text-transform:lowercase;
        vertical-align:middle;
        white-space:nowrap;
      }
      .ii-librarian-name-host {
        display:inline-flex;
        align-items:center;
        flex-wrap:wrap;
      }
      .reader-name-line .ii-librarian-role-badge,
      .comment-author .ii-librarian-role-badge,
      .reader-card-name .ii-librarian-role-badge {
        min-height:22px;
        padding:3px 9px;
        font-size:.64rem;
      }
      header .ii-librarian-role-badge,
      .more-menu .ii-librarian-role-badge {
        min-height:24px;
        padding:4px 10px;
        font-size:.66rem;
      }
    `;
    document.head.appendChild(style);
  }

  function directBadges(host) {
    return Array.from(host.children || []).filter(
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
    badge.setAttribute("aria-label","librarian");
    badge.title = "ink and ivy librarian";
    return badge;
  }

  function ensureSingleBadge(host) {
    if (!(host instanceof Element)) return;
    let badges = directBadges(host);
    if (!badges.length) {
      host.appendChild(makeBadge());
      badges = directBadges(host);
    }
    badges.slice(1).forEach(badge => badge.remove());
  }

  function decorateDataHost(host) {
    if (!(host instanceof Element)) return;
    if ((host.dataset.readerId || "").trim() !== LIBRARIAN_UID) return;
    host.classList.add("ii-librarian-name-host");
    ensureSingleBadge(host);
  }

  function isDeepestExactName(element) {
    if (visibleTextWithoutBadge(element) !== LIBRARIAN_NAME) return false;
    return !Array.from(element.children || []).some(
      child => child instanceof Element &&
        visibleTextWithoutBadge(child) === LIBRARIAN_NAME
    );
  }

  function decorateFallback(root = document) {
    const candidates = root.querySelectorAll?.(
      "strong,h1,h2,h3,a,span,button,p"
    ) || [];

    candidates.forEach(element => {
      if (element.classList.contains(BADGE_CLASS)) return;
      if (element.closest?.("[data-reader-id]")) return;
      if (element.querySelector?.("[data-reader-id]")) return;
      if (!isDeepestExactName(element)) return;

      element.classList.add("ii-librarian-name-host");
      ensureSingleBadge(element);
    });
  }

  function cleanupAll() {
    document.querySelectorAll(`.${BADGE_CLASS}`).forEach(badge => {
      const host = badge.parentElement;
      if (!host) return;
      const duplicates = directBadges(host);
      duplicates.slice(1).forEach(item => item.remove());
    });
  }

  function decorate(root = document) {
    installStyles();
    if (root instanceof Element && root.matches("[data-reader-id]")) {
      decorateDataHost(root);
    }
    root.querySelectorAll?.("[data-reader-id]").forEach(decorateDataHost);
    decorateFallback(root);
    cleanupAll();
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes") {
        decorateDataHost(mutation.target);
        return;
      }
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element && !node.classList.contains(BADGE_CLASS)) {
          decorate(node);
        }
      });
    });
  });

  function start() {
    decorate(document);
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["data-reader-id"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once:true });
  } else {
    start();
  }
})();
