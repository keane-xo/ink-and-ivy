import {
  getApp,
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  BADGES,
  BADGE_TIERS,
  syncAutomaticBadges
} from "./badge-engine.js?v=3";

const firebaseConfig = {
  apiKey: "AIzaSyC1dOxo61Z0U9mReJnw7s5Z3x0HFrrfB2k",
  authDomain: "ink-and-ivy-d0ff3.firebaseapp.com",
  projectId: "ink-and-ivy-d0ff3",
  storageBucket: "ink-and-ivy-d0ff3.firebasestorage.app",
  messagingSenderId: "444464034610",
  appId: "1:444464034610:web:de9c2c3a33737ae6849d2b"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BADGE_SYNC_INTERVAL = 10 * 60 * 1000;
let currentUser = null;
let unsubscribeNotifications = null;
let syncingBadges = false;
let achievementQueue = [];
let bannerShowing = false;
const markingRead = new Set();
let locallyRead = new Map();
let localReadStorageKey = "";

function installStyles() {
  if (document.querySelector("#inkivy-notification-styles")) return;

  const style = document.createElement("style");
  style.id = "inkivy-notification-styles";
  style.textContent = `
    .ii-notification-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-left: 6px;
      vertical-align: middle;
      background: #d76f8d;
      border: 1px solid rgba(92, 52, 62, .18);
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(255, 247, 239, .82);
    }

    .more-menu > summary .ii-notification-dot {
      margin-left: 5px;
      transform: translateY(-1px);
    }

    .ii-achievement-banner {
      position: fixed;
      top: 14px;
      left: 50%;
      z-index: 9999;
      width: min(560px, calc(100vw - 28px));
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
      padding: 15px 17px;
      color: #4d352b;
      background: #fffaf2;
      border: 1px solid #e6c6cf;
      border-radius: 18px;
      box-shadow: 0 18px 48px rgba(71, 45, 36, .18);
      transform: translate(-50%, -135%);
      opacity: 0;
      transition: transform .36s ease, opacity .28s ease;
      pointer-events: none;
    }

    .ii-achievement-banner.show {
      transform: translate(-50%, 0);
      opacity: 1;
      pointer-events: auto;
    }

    .ii-achievement-icon {
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      background: #f7dbe3;
      border: 1px solid #e4bcc8;
      border-radius: 14px;
      font-size: 1.55rem;
    }

    .ii-achievement-copy {
      min-width: 0;
    }

    .ii-achievement-copy small {
      display: block;
      margin-bottom: 3px;
      color: #8b6470;
      font: 700 .68rem/1.2 Arial, sans-serif;
      letter-spacing: .09em;
      text-transform: uppercase;
    }

    .ii-achievement-copy strong {
      display: block;
      color: #4d352b;
      font-size: 1.12rem;
      font-weight: normal;
    }

    .ii-achievement-copy span {
      display: block;
      margin-top: 3px;
      color: #756057;
      font-size: .88rem;
      line-height: 1.35;
    }

    .ii-achievement-close {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      padding: 0;
      color: #8a6b60;
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.1rem;
    }

    .ii-achievement-close:hover {
      background: #f6e8e4;
    }
  `;
  document.head.appendChild(style);
}

function ensureBanner() {
  let banner = document.querySelector("#ii-achievement-banner");
  if (banner) return banner;

  banner = document.createElement("aside");
  banner.id = "ii-achievement-banner";
  banner.className = "ii-achievement-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `
    <span class="ii-achievement-icon" aria-hidden="true">🌿</span>
    <div class="ii-achievement-copy">
      <small>badge unlocked</small>
      <strong>reading milestone</strong>
      <span></span>
    </div>
    <button class="ii-achievement-close" type="button" aria-label="dismiss notification">×</button>
  `;

  banner
    .querySelector(".ii-achievement-close")
    .addEventListener("click", hideCurrentBanner);

  document.body.appendChild(banner);
  return banner;
}

function hideCurrentBanner() {
  const banner = document.querySelector("#ii-achievement-banner");
  if (!banner) return;

  banner.classList.remove("show");
  window.setTimeout(() => {
    bannerShowing = false;
    showNextAchievement();
  }, 330);
}

function showNextAchievement() {
  if (bannerShowing || !achievementQueue.length) return;

  const achievement = achievementQueue.shift();
  const banner = ensureBanner();
  const icon = banner.querySelector(".ii-achievement-icon");
  const kicker = banner.querySelector(".ii-achievement-copy small");
  const title = banner.querySelector(".ii-achievement-copy strong");
  const body = banner.querySelector(".ii-achievement-copy span");

  icon.textContent = achievement.icon || "🌿";
  kicker.textContent = achievement.kicker || "badge unlocked";
  title.textContent = achievement.title || "reading milestone";
  body.textContent = achievement.body || "";

  bannerShowing = true;
  window.requestAnimationFrame(() => banner.classList.add("show"));
  window.setTimeout(hideCurrentBanner, 5000);
}

function queueAchievement(achievement) {
  achievementQueue.push(achievement);
  showNextAchievement();
}

function queueBadgeSyncResults(result) {
  (result?.newlyEarnedBadges || []).forEach((id) => {
    const [badgeId, tierId] = String(id).split(":");
    const badge = BADGES[badgeId];
    const tier = BADGE_TIERS.find((item) => item.id === tierId);
    if (!badge || !tier) return;

    queueAchievement({
      icon: badge.emoji,
      kicker: "badge unlocked",
      title: `${badge.name} — ${tier.name}`,
      body: `${tier.emoji} you reached the ${tier.name} level.`
    });
  });

  (result?.newlyUnlockedTitles || []).forEach((title) => {
    const tier = BADGE_TIERS.find((item) => item.title === title);

    queueAchievement({
      icon: tier?.emoji || "✨",
      kicker: "collection complete",
      title: `new title: ${title}`,
      body: `you completed every ${tier?.name || ""} badge.`
    });
  });
}

function loadLocalReadCache(userId) {
  localReadStorageKey = `inkivy-notification-read:${userId}`;
  locallyRead = new Map();

  try {
    const parsed = JSON.parse(localStorage.getItem(localReadStorageKey) || "{}");
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    Object.entries(parsed).forEach(([id, timestamp]) => {
      const value = Number(timestamp || 0);
      if (value >= cutoff) locallyRead.set(id, value);
    });

    persistLocalReadCache();
  } catch (error) {
    console.warn("notification read cache could not be loaded", error);
  }
}

function persistLocalReadCache() {
  if (!localReadStorageKey) return;

  try {
    const entries = [...locallyRead.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 300);

    locallyRead = new Map(entries);
    localStorage.setItem(
      localReadStorageKey,
      JSON.stringify(Object.fromEntries(entries))
    );
  } catch (error) {
    console.warn("notification read cache could not be saved", error);
  }
}

function rememberLocallyRead(items) {
  const now = Date.now();
  items.forEach((item) => locallyRead.set(item.id, now));
  persistLocalReadCache();
}

function setDots(selector, key, visible) {
  document.querySelectorAll(selector).forEach((element) => {
    const existing = element.querySelector(
      `.ii-notification-dot[data-dot="${key}"]`
    );

    if (!visible) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const dot = document.createElement("span");
    dot.className = "ii-notification-dot";
    dot.dataset.dot = key;
    dot.setAttribute("aria-hidden", "true");
    element.appendChild(dot);
  });
}

function currentPageCategory() {
  const page =
    window.location.pathname.split("/").pop().toLowerCase() || "index.html";

  if (page === "community.html") return "community";
  if (page === "recommendations.html") return "friend-picks";
  if (page === "challenges.html") return "badges";
  return "";
}

function trulyUnread(notifications) {
  return notifications.filter(
    (item) =>
      item &&
      item.id &&
      item.read === false &&
      !locallyRead.has(item.id) &&
      ["community", "friend-picks", "badges"].includes(item.category)
  );
}

function renderNotificationDots(notifications) {
  const serverUnread = trulyUnread(notifications);
  const category = currentPageCategory();

  // Merely arriving on the destination counts as checking that category.
  // Hide those dots immediately, before waiting for Firestore to finish.
  const currentCategoryItems = category
    ? serverUnread.filter((item) => item.category === category)
    : [];

  if (currentCategoryItems.length) {
    rememberLocallyRead(currentCategoryItems);
    markNotificationsRead(currentCategoryItems);
  }

  const unread = serverUnread.filter(
    (item) => !currentCategoryItems.some((current) => current.id === item.id)
  );

  const hasCommunity = unread.some((item) => item.category === "community");
  const hasFriendPicks = unread.some((item) => item.category === "friend-picks");
  const hasBadges = unread.some((item) => item.category === "badges");
  const hasMore = hasFriendPicks || hasBadges;

  setDots(
    'header nav a[href^="community.html"], header .community-nav a[href^="community.html"]',
    "community",
    hasCommunity
  );
  setDots(
    'header nav a[href^="recommendations.html"], header .community-nav a[href^="recommendations.html"]',
    "friend-picks",
    hasFriendPicks
  );
  setDots(
    'header nav a[href^="challenges.html"], header .community-nav a[href^="challenges.html"]',
    "badges",
    hasBadges
  );
  setDots(
    "header .more-menu > summary",
    "more",
    hasMore
  );
}

async function markNotificationsRead(items) {
  if (!currentUser || !items.length) return;

  const matches = items.filter(
    (item) => item?.id && !markingRead.has(item.id)
  );

  if (!matches.length) return;
  matches.forEach((item) => markingRead.add(item.id));

  await Promise.all(
    matches.map(async (item) => {
      try {
        await updateDoc(doc(db, "notifications", item.id), {
          read: true,
          readAt: serverTimestamp()
        });
      } catch (error) {
        // The local cache intentionally keeps the dot cleared even if a slow
        // network delays the Firestore acknowledgement. The next successful
        // visit will attempt the write again from another browser/session.
        console.error("notification could not be marked read", error);
      } finally {
        markingRead.delete(item.id);
      }
    })
  );
}

function stopNotificationListener() {
  unsubscribeNotifications?.();
  unsubscribeNotifications = null;
}

function startNotificationListener(user) {
  stopNotificationListener();

  unsubscribeNotifications = onSnapshot(
    query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    ),
    (snapshot) => {
      const notifications = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      renderNotificationDots(notifications);
    },
    (error) => {
      console.error("notifications could not be loaded", error);
    }
  );
}

async function maybeSyncBadges(force = false) {
  if (!currentUser || syncingBadges) return null;

  const page =
    window.location.pathname.split("/").pop().toLowerCase() || "index.html";
  if (!force && page === "challenges.html") {
    return null;
  }

  const storageKey = `inkivy-badge-sync:${currentUser.uid}`;
  const lastSync = Number(sessionStorage.getItem(storageKey) || 0);

  if (!force && Date.now() - lastSync < BADGE_SYNC_INTERVAL) {
    return null;
  }

  syncingBadges = true;

  try {
    const result = await syncAutomaticBadges(db, currentUser.uid);
    sessionStorage.setItem(storageKey, String(Date.now()));
    queueBadgeSyncResults(result);
    return result;
  } catch (error) {
    console.error("automatic badges could not be synced", error);
    return null;
  } finally {
    syncingBadges = false;
  }
}

window.addEventListener("inkivy:activity-changed", () => {
  maybeSyncBadges(true);
});

window.addEventListener("inkivy:badge-sync-result", (event) => {
  if (event.detail) {
    if (currentUser) {
      sessionStorage.setItem(
        `inkivy-badge-sync:${currentUser.uid}`,
        String(Date.now())
      );
    }
    queueBadgeSyncResults(event.detail);
    window.__inkIvyPendingBadgeResult = null;
  }
});

installStyles();

if (window.__inkIvyPendingBadgeResult) {
  queueBadgeSyncResults(window.__inkIvyPendingBadgeResult);
  window.__inkIvyPendingBadgeResult = null;
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  stopNotificationListener();

  if (!user) {
    locallyRead = new Map();
    localReadStorageKey = "";
    renderNotificationDots([]);
    return;
  }

  loadLocalReadCache(user.uid);
  startNotificationListener(user);
  maybeSyncBadges(false);
});

window.InkIvyNotifications = {
  syncBadges: () => maybeSyncBadges(true)
};
