import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

export const BADGE_TIERS = [
  {
    id: "sprout",
    name: "sprout",
    emoji: "🌱",
    multiplier: 1,
    title: "Storykeeper"
  },
  {
    id: "bloom",
    name: "bloom",
    emoji: "🌸",
    multiplier: 2,
    title: "Ink Society"
  },
  {
    id: "evergreen",
    name: "evergreen",
    emoji: "🌿",
    multiplier: 4,
    title: "Keeper of the Stacks"
  }
];

export const BADGES = {
  "page-turner": {
    emoji: "📖",
    name: "page turner",
    description: "finish books and keep the pages turning",
    baseTarget: 3,
    unit: "books finished"
  },
  "genre-explorer": {
    emoji: "🧭",
    name: "genre explorer",
    description: "read your way across different genres",
    baseTarget: 3,
    unit: "genres explored"
  },
  "friends-choice": {
    emoji: "💌",
    name: "friend's choice",
    description: "finish books that friends picked especially for you",
    baseTarget: 1,
    unit: "friend picks finished"
  },
  "reviewers-quill": {
    emoji: "🪶",
    name: "reviewer's quill",
    description: "leave thoughtful reviews for books you have read",
    baseTarget: 5,
    unit: "reviews shared"
  },
  "journal-keeper": {
    emoji: "✍️",
    name: "journal keeper",
    description: "fill the pages of your private reading journal",
    baseTarget: 5,
    unit: "journal pages"
  },
  "tome-traveler": {
    emoji: "🏰",
    name: "tome traveler",
    description: "finish long reads with more than 400 pages",
    baseTarget: 1,
    unit: "long books finished"
  },
  "seasonal-reader": {
    emoji: "🍂",
    name: "seasonal reader",
    description: "make one season especially full of books",
    baseTarget: 4,
    unit: "books in one season"
  }
};

export function badgeTierId(badgeId, tierId) {
  return `${badgeId}:${tierId}`;
}

export function targetForTier(badge, tier) {
  return Number(badge.baseTarget || 0) * Number(tier.multiplier || 1);
}

export function unlockedTitlesFromEarned(earnedBadges = []) {
  const earned = new Set(earnedBadges || []);

  return BADGE_TIERS
    .filter((tier) =>
      Object.keys(BADGES).every((badgeId) =>
        earned.has(badgeTierId(badgeId, tier.id))
      )
    )
    .map((tier) => tier.title);
}

export function highestEarnedTier(earnedBadges = [], badgeId) {
  const earned = new Set(earnedBadges || []);
  return [...BADGE_TIERS]
    .reverse()
    .find((tier) => earned.has(badgeTierId(badgeId, tier.id))) || null;
}

export function completedBadgesForTier(earnedBadges = [], tierId) {
  const earned = new Set(earnedBadges || []);
  return Object.keys(BADGES).filter((badgeId) =>
    earned.has(badgeTierId(badgeId, tierId))
  ).length;
}

function timestampDate(value) {
  return value?.toDate ? value.toDate() : null;
}

function seasonKey(date) {
  if (!date) return "";
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) return `${year}-spring`;
  if (month >= 5 && month <= 7) return `${year}-summer`;
  if (month >= 8 && month <= 10) return `${year}-autumn`;

  const winterYear = month === 11 ? year : year - 1;
  return `${winterYear}-winter`;
}

function sameStringArray(a, b) {
  const left = [...(a || [])].sort();
  const right = [...(b || [])].sort();
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function highestUnlockedTitle(titles) {
  return [...BADGE_TIERS]
    .reverse()
    .map((tier) => tier.title)
    .find((title) => titles.includes(title)) || "";
}

async function writeAchievementNotification(
  db,
  userId,
  notificationId,
  data
) {
  const reference = doc(db, "notifications", notificationId);
  const existing = await getDoc(reference);

  // Achievement notifications use deterministic IDs. If one already exists,
  // it has already been announced at least once. Never reset it to unread.
  if (existing.exists()) return;

  await setDoc(reference, {
    recipientId: userId,
    actorId: userId,
    actorName: "",
    type: data.type,
    category: "badges",
    title: data.title,
    body: data.body,
    link: "challenges.html",
    read: false,
    createdAt: serverTimestamp()
  });
}

export async function calculateAutomaticBadgeProgress(db, userId) {
  const [
    booksSnapshot,
    checkoutSnapshot,
    recommendationsSnapshot,
    journalSnapshot,
    profileSnapshot
  ] = await Promise.all([
    getDocs(collection(db, "books")),
    getDocs(
      query(
        collection(db, "checkoutRequests"),
        where("userId", "==", userId)
      )
    ),
    getDocs(
      query(
        collection(db, "recommendations"),
        where("recipientId", "==", userId)
      )
    ),
    getDocs(collection(db, "profiles", userId, "journalEntries")),
    getDoc(doc(db, "profiles", userId))
  ]);

  const books = booksSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data()
  }));
  const bookById = new Map(books.map((book) => [book.id, book]));

  const completedCheckouts = checkoutSnapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .filter(
      (item) =>
        item.requestType === "checkout" &&
        item.status === "completed"
    );

  const completedBookIds = new Set(
    completedCheckouts.map((item) => item.bookId).filter(Boolean)
  );

  const completedGenres = new Set(
    completedCheckouts
      .map((item) => bookById.get(item.bookId)?.genre)
      .filter(Boolean)
      .map((genre) => String(genre).trim().toLowerCase())
  );

  const recommendedBookIds = new Set(
    recommendationsSnapshot.docs
      .map((entry) => entry.data().bookId)
      .filter(Boolean)
  );

  const friendPickFinishedCount = [...completedBookIds].filter((bookId) =>
    recommendedBookIds.has(bookId)
  ).length;

  const longBookFinishedCount = completedCheckouts.filter((item) => {
    const pages = Number(bookById.get(item.bookId)?.pageCount || 0);
    return pages > 400;
  }).length;

  const seasonCounts = new Map();
  completedCheckouts.forEach((item) => {
    const key = seasonKey(timestampDate(item.completedAt));
    if (!key) return;
    seasonCounts.set(key, (seasonCounts.get(key) || 0) + 1);
  });
  const mostBooksInASeason = Math.max(0, ...seasonCounts.values());

  const reviewDocuments = await Promise.all(
    books.map((book) =>
      getDoc(doc(db, "books", book.id, "reviews", userId))
    )
  );
  const reviewCount = reviewDocuments.filter((entry) => entry.exists()).length;

  const progress = {
    "page-turner": completedCheckouts.length,
    "genre-explorer": completedGenres.size,
    "friends-choice": friendPickFinishedCount,
    "reviewers-quill": reviewCount,
    "journal-keeper": journalSnapshot.size,
    "tome-traveler": longBookFinishedCount,
    "seasonal-reader": mostBooksInASeason
  };

  const earnedBadges = [];

  Object.entries(BADGES).forEach(([badgeId, badge]) => {
    BADGE_TIERS.forEach((tier) => {
      if (
        Number(progress[badgeId] || 0) >=
        targetForTier(badge, tier)
      ) {
        earnedBadges.push(badgeTierId(badgeId, tier.id));
      }
    });
  });

  const currentProfile = profileSnapshot.exists()
    ? profileSnapshot.data()
    : null;

  return {
    progress,
    earnedBadges,
    currentEarnedBadges: currentProfile?.earnedBadges || [],
    currentSelectedTitle: currentProfile?.selectedTitle || ""
  };
}

export async function syncAutomaticBadges(db, userId) {
  const result = await calculateAutomaticBadgeProgress(db, userId);

  const existingTierSet = new Set(
    (result.currentEarnedBadges || []).filter((id) => String(id).includes(":"))
  );

  // Preserve every badge earned under the original one-level system as
  // that badge's Sprout level during migration.
  const preservedTierSet = new Set(existingTierSet);
  (result.currentEarnedBadges || []).forEach((id) => {
    if (BADGES[id]) {
      preservedTierSet.add(badgeTierId(id, "sprout"));
    }
  });

  const newlyEarnedBadges = result.earnedBadges.filter(
    (id) => !preservedTierSet.has(id)
  );

  // Badge levels are permanent once unlocked. Current activity can keep
  // progressing toward the next tier, but an earned tier is never taken away.
  const earnedBadges = [
    ...new Set([
      ...preservedTierSet,
      ...result.earnedBadges
    ])
  ];

  // Titles did not exist in the old system, so only actual tier-era badge
  // records count as a previously unlocked title.
  const currentUnlockedTitles = unlockedTitlesFromEarned(
    [...existingTierSet]
  );
  const unlockedTitles = unlockedTitlesFromEarned(earnedBadges);
  const newlyUnlockedTitles = unlockedTitles.filter(
    (title) => !currentUnlockedTitles.includes(title)
  );

  let selectedTitle = result.currentSelectedTitle || "";
  if (selectedTitle && !unlockedTitles.includes(selectedTitle)) {
    selectedTitle = "";
  }
  if (!selectedTitle && unlockedTitles.length) {
    selectedTitle = highestUnlockedTitle(unlockedTitles);
  }

  const needsBadgeUpdate = !sameStringArray(
    earnedBadges,
    result.currentEarnedBadges
  );
  const needsTitleUpdate = selectedTitle !== result.currentSelectedTitle;

  if (needsBadgeUpdate || needsTitleUpdate) {
    await updateDoc(doc(db, "profiles", userId), {
      earnedBadges,
      selectedTitle
    });
  }

  for (const id of newlyEarnedBadges) {
    const [badgeId, tierId] = id.split(":");
    const badge = BADGES[badgeId];
    const tier = BADGE_TIERS.find((item) => item.id === tierId);
    if (!badge || !tier) continue;

    const target = targetForTier(badge, tier);

    try {
      await writeAchievementNotification(
        db,
        userId,
        `badge_${userId}_${badgeId}_${tierId}`,
        {
          type: "badge",
          title: `${badge.name} — ${tier.name}`,
          body: `${tier.emoji} ${target} ${badge.unit}. badge unlocked!`
        }
      );
    } catch (error) {
      console.error("badge notification could not be saved", error);
    }
  }

  for (const title of newlyUnlockedTitles) {
    const tier = BADGE_TIERS.find((item) => item.title === title);
    if (!tier) continue;

    try {
      await writeAchievementNotification(
        db,
        userId,
        `title_${userId}_${tier.id}`,
        {
          type: "title",
          title: `${title} unlocked`,
          body: `${tier.emoji} you completed every ${tier.name} badge.`
        }
      );
    } catch (error) {
      console.error("title notification could not be saved", error);
    }
  }

  return {
    ...result,
    earnedBadges,
    unlockedTitles,
    selectedTitle,
    newlyEarnedBadges,
    newlyUnlockedTitles
  };
}
