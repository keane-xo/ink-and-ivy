import {
  getApp,
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
setPersistence(auth, browserLocalPersistence).catch(() => {});

let currentUser = null;
let notifications = [];
let recommendations = [];
let unsubscribeNotifications = null;
let unsubscribeRecommendations = null;
let autoReadTimer = null;
const bannerQueue = [];
let bannerShowing = false;

function injectStyles() {
  if (document.querySelector("#inkivy-notification-styles")) return;
  const style = document.createElement("style");
  style.id = "inkivy-notification-styles";
  style.textContent = `
    .inkivy-dot-host{position:relative!important}
    .inkivy-notification-dot{width:8px;height:8px;display:inline-block;flex:0 0 auto;margin-left:6px;background:#e85d7d;border:2px solid #fff8ef;border-radius:50%;box-sizing:content-box;vertical-align:middle;box-shadow:0 1px 4px rgba(74,51,40,.18)}
    .more-menu summary .inkivy-notification-dot{margin-left:2px;margin-right:1px}
    .reader-title-chip{display:inline-flex;align-items:center;padding:4px 8px;background:#f7dbe2;border:1px solid #e9b2c0;border-radius:999px;color:#7b3f52;font-family:Arial,sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.03em;line-height:1.1;white-space:nowrap;vertical-align:middle}
    .inkivy-achievement-banner{position:fixed;top:14px;left:50%;z-index:9999;width:min(92vw,560px);display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:14px 16px;background:#fff9f0;border:1px solid #e5b7c3;border-radius:18px;box-shadow:0 18px 46px rgba(74,51,40,.22);transform:translate(-50%,-150%);opacity:0;transition:transform .28s ease,opacity .28s ease;color:#5f463a}
    .inkivy-achievement-banner.show{transform:translate(-50%,0);opacity:1}
    .inkivy-achievement-icon{width:44px;height:44px;display:grid;place-items:center;background:#f7dbe2;border-radius:14px;font-size:1.6rem}
    .inkivy-achievement-copy{min-width:0}
    .inkivy-achievement-copy small{display:block;margin-bottom:3px;color:#a24f68;font-family:Arial,sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
    .inkivy-achievement-copy strong{display:block;color:#6a493d;font-size:1.08rem;font-weight:600}
    .inkivy-achievement-copy span{display:block;margin-top:2px;color:#826d60;font-size:.82rem;line-height:1.35}
    .inkivy-achievement-close{padding:5px;background:transparent;border:0;color:#8d7467;cursor:pointer;font-size:1.1rem}
    @media(max-width:560px){.inkivy-achievement-banner{top:8px;grid-template-columns:auto 1fr;padding:12px}.inkivy-achievement-close{position:absolute;right:8px;top:7px}.inkivy-achievement-copy{padding-right:18px}}
  `;
  document.head.appendChild(style);
}

function cleanDocId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function createNotification({
  id,
  recipientId,
  type,
  category = "community",
  actorId = "",
  actorName = "",
  message = "",
  postId = "",
  targetUrl = "community.html"
}) {
  if (!recipientId) return;

  const reference = doc(
    db,
    "notifications",
    cleanDocId(id || `${type}-${recipientId}-${Date.now()}`)
  );

  try {
    await setDoc(reference, {
      recipientId,
      type,
      category,
      actorId,
      actorName,
      message,
      postId,
      targetUrl,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn("notification could not be saved", error);
  }
}

export async function removeNotification(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, "notifications", cleanDocId(id)));
  } catch (error) {
    console.warn("notification could not be removed", error);
  }
}

function addDot(element) {
  if (!element || element.querySelector(":scope > .inkivy-notification-dot")) return;
  element.classList.add("inkivy-dot-host");
  const dot = document.createElement("span");
  dot.className = "inkivy-notification-dot";
  dot.setAttribute("aria-label", "new notification");
  element.appendChild(dot);
}

function removeDot(element) {
  element?.querySelector(":scope > .inkivy-notification-dot")?.remove();
}

function linkTargetsPage(link, page) {
  const href = link?.getAttribute?.("href") || "";
  if (!href || href.startsWith("#")) return false;
  try {
    const url = new URL(href, window.location.href);
    return url.pathname.split("/").pop() === page;
  } catch {
    return false;
  }
}

function linksForPage(page) {
  return [...document.querySelectorAll("a[href]")].filter((link) =>
    linkTargetsPage(link, page)
  );
}

function updateDots() {
  const unread = notifications.filter((item) => item.read !== true);
  const communityUnread = unread.some((item) => item.category === "community");
  const badgeUnread = unread.some((item) => item.category === "badges");
  const friendUnread = recommendations.some((item) => item.status === "unread");

  const communityLinks = linksForPage("community.html");
  const friendLinks = linksForPage("recommendations.html");
  const badgeLinks = linksForPage("challenges.html");
  const moreSummaries = [...document.querySelectorAll(".more-menu > summary")];
  const feedTabs = [...document.querySelectorAll('[data-community-tab="feed"]')];

  [...communityLinks, ...feedTabs].forEach((element) =>
    communityUnread ? addDot(element) : removeDot(element)
  );
  friendLinks.forEach((element) =>
    friendUnread ? addDot(element) : removeDot(element)
  );
  badgeLinks.forEach((element) =>
    badgeUnread ? addDot(element) : removeDot(element)
  );
  moreSummaries.forEach((element) => {
    const panel = element.parentElement?.querySelector(".more-menu-panel");
    const hasUnreadChild = Boolean(
      (friendUnread && [...(panel?.querySelectorAll("a[href]") || [])].some((link) => linkTargetsPage(link, "recommendations.html"))) ||
      (badgeUnread && [...(panel?.querySelectorAll("a[href]") || [])].some((link) => linkTargetsPage(link, "challenges.html")))
    );
    hasUnreadChild ? addDot(element) : removeDot(element);
  });
}

async function markCategoryRead(category) {
  const matches = notifications.filter(
    (item) => item.category === category && item.read !== true
  );
  if (!matches.length) return;

  try {
    await Promise.all(
      matches.map((item) =>
        updateDoc(doc(db, "notifications", item.id), {
          read: true,
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      )
    );
  } catch (error) {
    console.warn("notifications could not be marked read", error);
  }
}

function scheduleCurrentPageRead() {
  window.clearTimeout(autoReadTimer);
  const page = window.location.pathname.split("/").pop() || "index.html";

  if (page === "community.html") {
    autoReadTimer = window.setTimeout(() => markCategoryRead("community"), 1600);
  }
  if (page === "challenges.html") {
    autoReadTimer = window.setTimeout(() => markCategoryRead("badges"), 1600);
  }
}


function announceUnreadAchievements(items) {
  items
    .filter((item) => item.read !== true && (item.type === "badge" || item.type === "title"))
    .sort((a, b) => Number(a.createdAt?.seconds || 0) - Number(b.createdAt?.seconds || 0))
    .forEach((item) => {
      if (item.type === "badge" && item.badgeId) {
        const key = `inkIvyAnnounced:badge:${item.badgeId}`;
        if (sessionStorage.getItem(key) === "yes") return;
        sessionStorage.setItem(key, "yes");
        showAchievementBanner({
          icon: item.badgeEmoji || "🏅",
          eyebrow: "badge unlocked",
          title: item.badgeName || item.message || "new badge",
          message: item.badgeDescription
            ? `${item.badgeTier || ""} · ${item.badgeDescription}`
            : "your badge cabinet has been updated."
        });
      }

      if (item.type === "title" && item.readerTitle) {
        const key = `inkIvyAnnounced:title:${item.readerTitle}`;
        if (sessionStorage.getItem(key) === "yes") return;
        sessionStorage.setItem(key, "yes");
        showAchievementBanner({
          icon: "✨",
          eyebrow: "collection complete",
          title: item.readerTitle,
          message: "you completed an entire badge level and unlocked a new reader title."
        });
      }
    });
}

function stopListeners() {
  unsubscribeNotifications?.();
  unsubscribeRecommendations?.();
  unsubscribeNotifications = null;
  unsubscribeRecommendations = null;
  notifications = [];
  recommendations = [];
  updateDots();
}

function startListeners(user) {
  stopListeners();

  unsubscribeNotifications = onSnapshot(
    query(collection(db, "notifications"), where("recipientId", "==", user.uid)),
    (snapshot) => {
      notifications = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      announceUnreadAchievements(notifications);
      updateDots();
      scheduleCurrentPageRead();
    },
    (error) => console.warn("notification dots could not be loaded", error)
  );

  unsubscribeRecommendations = onSnapshot(
    query(collection(db, "recommendations"), where("recipientId", "==", user.uid)),
    (snapshot) => {
      recommendations = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      updateDots();
    },
    (error) => console.warn("friend-pick notification dots could not be loaded", error)
  );
}

function renderNextBanner() {
  if (bannerShowing || !bannerQueue.length) return;
  bannerShowing = true;
  const detail = bannerQueue.shift();

  let banner = document.querySelector("#inkivy-achievement-banner");
  if (!banner) {
    banner = document.createElement("aside");
    banner.id = "inkivy-achievement-banner";
    banner.className = "inkivy-achievement-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <span class="inkivy-achievement-icon" aria-hidden="true">${detail.icon || "🌿"}</span>
    <span class="inkivy-achievement-copy">
      <small>${detail.eyebrow || "ink and ivy achievement"}</small>
      <strong>${detail.title || "achievement unlocked"}</strong>
      <span>${detail.message || ""}</span>
    </span>
    <button class="inkivy-achievement-close" type="button" aria-label="close">×</button>
  `;

  let hideTimer = null;
  const finish = () => {
    window.clearTimeout(hideTimer);
    banner.classList.remove("show");
    window.setTimeout(() => {
      bannerShowing = false;
      renderNextBanner();
    }, 320);
  };

  banner.querySelector("button")?.addEventListener("click", finish, { once: true });
  requestAnimationFrame(() => banner.classList.add("show"));
  hideTimer = window.setTimeout(finish, 4800);
}

export function showAchievementBanner(detail) {
  bannerQueue.push(detail);
  renderNextBanner();
}

export function announceBadgeResult(result) {
  (result?.newlyEarnedBadges || []).forEach((badge) => {
    const key = `inkIvyAnnounced:badge:${badge.id}`;
    if (sessionStorage.getItem(key) === "yes") return;
    sessionStorage.setItem(key, "yes");
    showAchievementBanner({
      icon: badge.emoji,
      eyebrow: "badge unlocked",
      title: badge.name,
      message: `${badge.tierLabel} · ${badge.description}`
    });
  });

  (result?.newlyUnlockedTitles || []).forEach((title) => {
    const key = `inkIvyAnnounced:title:${title}`;
    if (sessionStorage.getItem(key) === "yes") return;
    sessionStorage.setItem(key, "yes");
    showAchievementBanner({
      icon: "✨",
      eyebrow: "collection complete",
      title,
      message: "you completed every badge in this level. your new reader title is unlocked."
    });
  });
}

injectStyles();

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  if (linkTargetsPage(link, "community.html")) markCategoryRead("community");
  if (linkTargetsPage(link, "challenges.html")) markCategoryRead("badges");
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) startListeners(user);
  else stopListeners();
});
