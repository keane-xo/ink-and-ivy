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
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { syncAutomaticBadges } from "./badge-engine.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1dOxo61Z0U9mReJnw7s5Z3x0HFrrfB2k",
  authDomain: "ink-and-ivy-d0ff3.firebaseapp.com",
  projectId: "ink-and-ivy-d0ff3",
  storageBucket: "ink-and-ivy-d0ff3.firebasestorage.app",
  messagingSenderId: "444464034610",
  appId: "1:444464034610:web:de9c2c3a33737ae6849d2b"
};

const ADMIN_UID = "66iUUKyOu7Rvu2I6Hwtdel82b122";
const START_DAY = Math.floor(Date.UTC(2026, 7, 13) / 86400000);
const CYCLE_DAYS = 63;
const TIME_ZONE = "America/Chicago";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

function centralDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  };
}

function dayNumber(parts) {
  return Math.floor(
    Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000
  );
}

function dateKey(parts) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("-");
}

function cycleForDay(todayDay) {
  if (todayDay < START_DAY) return null;
  const index = Math.floor((todayDay - START_DAY) / CYCLE_DAYS);

  return {
    id: `cycle-${index + 1}`,
    index,
    startDay: START_DAY + index * CYCLE_DAYS,
    endDay: START_DAY + index * CYCLE_DAYS + CYCLE_DAYS - 1
  };
}

async function recordDailyVisit(user) {
  const parts = centralDateParts();
  const todayDay = dayNumber(parts);
  const cycle = cycleForDay(todayDay);

  if (!cycle) return;

  const todayKey = dateKey(parts);
  const localKey = `inkIvyStreak:${user.uid}:${todayKey}`;

  if (localStorage.getItem(localKey) === "done") return;

  const profileReference = doc(db, "profiles", user.uid);
  const streakReference = doc(db, "readerStreaks", user.uid);
  const memberReference = doc(
    db,
    "readingCycles",
    cycle.id,
    "members",
    user.uid
  );

  await runTransaction(db, async (transaction) => {
    const [profileSnapshot, streakSnapshot, memberSnapshot] =
      await Promise.all([
        transaction.get(profileReference),
        transaction.get(streakReference),
        transaction.get(memberReference)
      ]);

    if (!profileSnapshot.exists()) return;

    const profile = profileSnapshot.data();
    const streak = streakSnapshot.exists() ? streakSnapshot.data() : {};
    const member = memberSnapshot.exists() ? memberSnapshot.data() : {};

    const alreadyRecorded =
      Number(streak.lastVisitDay) === todayDay &&
      Number(member.lastVisitDay) === todayDay;

    if (alreadyRecorded) return;

    const globalContinued =
      Number(streak.lastVisitDay) === todayDay - 1;
    const currentStreak = globalContinued
      ? Number(streak.currentStreak || 0) + 1
      : 1;
    const longestStreak = Math.max(
      Number(streak.longestStreak || 0),
      currentStreak
    );

    const cycleContinued =
      Number(member.lastVisitDay) === todayDay - 1;
    const cycleCurrentStreak = cycleContinued
      ? Number(member.currentStreak || 0) + 1
      : 1;
    const oldBest = Number(member.bestStreak || 0);
    const newBest = Math.max(oldBest, cycleCurrentStreak);
    const reachedNewBest = newBest > oldBest;

    const identity = {
      displayName: profile.displayName || "reader",
      avatarEmoji: profile.avatarEmoji || "📚",
      avatarColor: profile.avatarColor || "#e8b8c5",
      avatarUrl: profile.avatarUrl || ""
    };

    transaction.set(
      streakReference,
      {
        userId: user.uid,
        ...identity,
        currentStreak,
        longestStreak,
        lastVisitDate: todayKey,
        lastVisitDay: todayDay,
        totalActiveDays: Number(streak.totalActiveDays || 0) + 1,
        eligibleForPrize: user.uid !== ADMIN_UID,
        updatedAt: serverTimestamp(),
        createdAt: streakSnapshot.exists()
          ? streak.createdAt || serverTimestamp()
          : serverTimestamp()
      },
      { merge: true }
    );

    transaction.set(
      memberReference,
      {
        userId: user.uid,
        cycleId: cycle.id,
        ...identity,
        currentStreak: cycleCurrentStreak,
        bestStreak: newBest,
        bestReachedAt: reachedNewBest
          ? serverTimestamp()
          : member.bestReachedAt || serverTimestamp(),
        lastVisitDate: todayKey,
        lastVisitDay: todayDay,
        activeDays: Number(member.activeDays || 0) + 1,
        eligibleForPrize: user.uid !== ADMIN_UID,
        updatedAt: serverTimestamp(),
        createdAt: memberSnapshot.exists()
          ? member.createdAt || serverTimestamp()
          : serverTimestamp()
      },
      { merge: true }
    );
  });

  localStorage.setItem(localKey, "done");

  const badgeKey = `inkIvyBadges:${user.uid}:${todayKey}`;
  if (localStorage.getItem(badgeKey) !== "done") {
    try {
      await syncAutomaticBadges(db, user.uid);
      localStorage.setItem(badgeKey, "done");
    } catch (error) {
      console.warn("automatic badge sync skipped", error);
    }
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  recordDailyVisit(user).catch((error) => {
    console.warn("daily streak check-in skipped", error);
  });
});
