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
} from "./badge-engine.js?v=2";

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

function dotFor(element, key) {
  let dot = element.querySelector(`.ii-notification-dot[data-dot="${key}"]`);
  if (!dot) {
    dot = document.createElement("span");
    dot.className = "ii-notification-dot";
    dot.dataset.dot = key;
    dot.setAttribute("aria-hidden", "true");
    element.appendChild(dot);
  }
  return dot;
}

function toggleDots(selector, key, visible) {
  document.querySelectorAll(selector).forEach((element) => {
    const dot = dotFor(element, key);
    dot.hidden = !visible;
  });
}

function renderNotificationDots(notifications) {
  const unread = notifications.filter((item) => item.read !== true);
  const hasCommunity = unread.some((item) => item.category === "community");
  const hasFriendPicks = unread.some((item) => item.category === "friend-picks");
  const hasBadges = unread.some((item) => item.category === "badges");
  const hasMore = hasFriendPicks || hasBadges;

  toggleDots(
    'header nav a[href^="community.html"], header .community-nav a[href^="community.html"]',
    "community",
    hasCommunity
  );
  toggleDots(
    'header nav a[href^="recommendations.html"], header .community-nav a[href^="recommendations.html"]',
    "friend-picks",
    hasFriendPicks
  );
  toggleDots(
    'header nav a[href^="challenges.html"], header .community-nav a[href^="challenges.html"]',
    "badges",
    hasBadges
  );
  toggleDots(
    "header .more-menu > summary",
    "more",
    hasMore
  );

  markCurrentCategoryRead(unread);
}

function currentPageCategory() {
  const page =
    window.location.pathname.split("/").pop().toLowerCase() || "index.html";

  if (page === "community.html") return "community";
  if (page === "recommendations.html") return "friend-picks";
  if (page === "challenges.html") return "badges";
  return "";
}

async function markCurrentCategoryRead(unread) {
  if (!currentUser) return;

  const category = currentPageCategory();
  if (!category) return;

  const matches = unread.filter(
    (item) =>
      item.category === category &&
      !markingRead.has(item.id)
  );

  if (!matches.length) return;

  matches.forEach((item) => markingRead.add(item.id));

  window.setTimeout(async () => {
    for (const item of matches) {
      try {
        await updateDoc(doc(db, "notifications", item.id), {
          read: true,
          readAt: serverTimestamp()
        });
      } catch (error) {
        console.error("notification could not be marked read", error);
      } finally {
        markingRead.delete(item.id);
      }
    }
  }, 900);
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
    renderNotificationDots([]);
    return;
  }

  startNotificationListener(user);
  maybeSyncBadges(false);
});

window.InkIvyNotifications = {
  syncBadges: () => maybeSyncBadges(true)
};
