import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

export const BADGE_TIERS = {
  sprout: {
    id: "sprout",
    label: "sprout",
    multiplier: 1,
    title: "Storykeeper",
    order: 0
  },
  bloom: {
    id: "bloom",
    label: "bloom",
    multiplier: 2,
    title: "Ink Society",
    order: 1
  },
  evergreen: {
    id: "evergreen",
    label: "evergreen",
    multiplier: 4,
    title: "Keeper of the Stacks",
    order: 2
  }
};

export const BADGES = {
  "page-turner": {
    emoji: "📖",
    names: {
      sprout: "page turner",
      bloom: "shelf sweeper",
      evergreen: "library legend"
    },
    baseTarget: 3,
    unit: "books finished",
    description(target) {
      return `finished ${target} books`;
    }
  },
  "genre-explorer": {
    emoji: "🧭",
    names: {
      sprout: "genre explorer",
      bloom: "story wanderer",
      evergreen: "literary cartographer"
    },
    baseTarget: 3,
    unit: "genres explored",
    description(target) {
      return `read across ${target} different genres`;
    }
  },
  "friends-choice": {
    emoji: "💌",
    names: {
      sprout: "friend's choice",
      bloom: "trusted pick",
      evergreen: "circle favorite"
    },
    baseTarget: 1,
    unit: "friend picks finished",
    description(target) {
      return `finished ${target} ${target === 1 ? "book" : "books"} recommended by a friend`;
    }
  },
  "reviewers-quill": {
    emoji: "🪶",
    names: {
      sprout: "reviewer's quill",
      bloom: "critic's quill",
      evergreen: "golden quill"
    },
    baseTarget: 5,
    unit: "reviews shared",
    description(target) {
      return `shared ${target} book reviews`;
    }
  },
  "journal-keeper": {
    emoji: "✍️",
    names: {
      sprout: "journal keeper",
      bloom: "journal devotee",
      evergreen: "archive keeper"
    },
    baseTarget: 5,
    unit: "journal pages",
    description(target) {
      return `filled ${target} reading-journal pages`;
    }
  },
  "tome-traveler": {
    emoji: "🏰",
    names: {
      sprout: "tome traveler",
      bloom: "epic voyager",
      evergreen: "tome conqueror"
    },
    baseTarget: 1,
    unit: "long books finished",
    description(target) {
      return `finished ${target} ${target === 1 ? "book" : "books"} longer than 400 pages`;
    }
  },
  "seasonal-reader": {
    emoji: "🍂",
    names: {
      sprout: "seasonal reader",
      bloom: "season collector",
      evergreen: "season sage"
    },
    baseTarget: 4,
    unit: "books in one season",
    description(target) {
      return `finished ${target} books in one season`;
    }
  }
};

export function badgeId(baseId, tierId) {
  return `${baseId}:${tierId}`;
}

export function getBadgeDefinition(baseId, tierId) {
  const badge = BADGES[baseId];
  const tier = BADGE_TIERS[tierId];
  if (!badge || !tier) return null;

  const target = badge.baseTarget * tier.multiplier;
  return {
    id: badgeId(baseId, tierId),
    baseId,
    tierId,
    tierLabel: tier.label,
    tierTitle: tier.title,
    emoji: badge.emoji,
    name: badge.names[tierId],
    target,
    unit: badge.unit,
    description: badge.description(target)
  };
}

export function getTierBadges(tierId) {
  return Object.keys(BADGES)
    .map((baseId) => getBadgeDefinition(baseId, tierId))
    .filter(Boolean);
}

export function normalizeEarnedBadgeIds(ids = []) {
  const normalized = [];

  ids.forEach((id) => {
    if (BADGES[id]) {
      normalized.push(badgeId(id, "sprout"));
      return;
    }

    const [baseId, tierId] = String(id).split(":");
    if (BADGES[baseId] && BADGE_TIERS[tierId]) {
      normalized.push(badgeId(baseId, tierId));
    }
  });

  return [...new Set(normalized)];
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

function completedTierIds(earnedIds) {
  const earned = new Set(earnedIds);
  return Object.keys(BADGE_TIERS).filter((tierId) =>
    getTierBadges(tierId).every((badge) => earned.has(badge.id))
  );
}

function titleOrder(title) {
  return Object.values(BADGE_TIERS).find((tier) => tier.title === title)?.order ?? -1;
}

function notificationDocId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

async function writeBadgeNotifications(db, userId, badgeDefinitions, titles) {
  const writes = [];

  badgeDefinitions.forEach((badge) => {
    const reference = doc(
      db,
      "notifications",
      notificationDocId(`badge-${userId}-${badge.id}`)
    );

    writes.push(
      setDoc(reference, {
        recipientId: userId,
        type: "badge",
        category: "badges",
        title: "badge unlocked",
        message: `${badge.name} · ${badge.tierLabel}`,
        badgeId: badge.id,
        badgeName: badge.name,
        badgeTier: badge.tierLabel,
        badgeEmoji: badge.emoji,
        badgeDescription: badge.description,
        targetUrl: "challenges.html",
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  titles.forEach((title) => {
    const tier = Object.values(BADGE_TIERS).find((item) => item.title === title);
    if (!tier) return;

    const reference = doc(
      db,
      "notifications",
      notificationDocId(`title-${userId}-${tier.id}`)
    );

    writes.push(
      setDoc(reference, {
        recipientId: userId,
        type: "title",
        category: "badges",
        title: "collection complete",
        message: `new title unlocked: ${title}`,
        tierId: tier.id,
        readerTitle: title,
        targetUrl: "challenges.html",
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  if (!writes.length) return;

  try {
    await Promise.all(writes);
  } catch (error) {
    console.warn("badge notifications could not be saved", error);
  }
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

  const friendPickFinishedCount = completedCheckouts.filter((item) =>
    recommendedBookIds.has(item.bookId)
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

  const currentProfile = profileSnapshot.exists()
    ? profileSnapshot.data()
    : {};
  const rawCurrentEarnedBadges = Array.isArray(currentProfile.earnedBadges)
    ? currentProfile.earnedBadges
    : [];
  const currentEarnedBadges = normalizeEarnedBadgeIds(
    rawCurrentEarnedBadges
  );
  const currentEarnedSet = new Set(currentEarnedBadges);

  const qualifyingBadgeIds = [];
  Object.keys(BADGE_TIERS).forEach((tierId) => {
    getTierBadges(tierId).forEach((badge) => {
      if (Number(progress[badge.baseId] || 0) >= badge.target) {
        qualifyingBadgeIds.push(badge.id);
      }
    });
  });

  // Badges are achievements: once earned, they stay in the cabinet.
  const earnedBadges = [...new Set([
    ...currentEarnedBadges,
    ...qualifyingBadgeIds
  ])];

  const newlyEarnedBadges = earnedBadges
    .filter((id) => !currentEarnedSet.has(id))
    .map((id) => {
      const [baseId, tierId] = id.split(":");
      return getBadgeDefinition(baseId, tierId);
    })
    .filter(Boolean);

  const completedTiers = completedTierIds(earnedBadges);
  const completedTitles = completedTiers.map((tierId) => BADGE_TIERS[tierId].title);
  const currentUnlockedTitles = (currentProfile.unlockedTitles || [])
    .filter((title) => Object.values(BADGE_TIERS).some((tier) => tier.title === title));
  const unlockedTitles = [...new Set([
    ...currentUnlockedTitles,
    ...completedTitles
  ])].sort((a, b) => titleOrder(a) - titleOrder(b));
  const newlyUnlockedTitles = unlockedTitles.filter(
    (title) => !currentUnlockedTitles.includes(title)
  );

  let readerTitle = currentProfile.readerTitle || "";
  if (newlyUnlockedTitles.length) {
    readerTitle = [...newlyUnlockedTitles].sort(
      (a, b) => titleOrder(b) - titleOrder(a)
    )[0];
  } else if (readerTitle && !unlockedTitles.includes(readerTitle)) {
    readerTitle = "";
  } else if (!readerTitle && unlockedTitles.length) {
    readerTitle = unlockedTitles[unlockedTitles.length - 1];
  }

  return {
    progress,
    earnedBadges,
    currentEarnedBadges,
    rawCurrentEarnedBadges,
    newlyEarnedBadges,
    completedTiers,
    unlockedTitles,
    currentUnlockedTitles,
    newlyUnlockedTitles,
    readerTitle,
    currentReaderTitle: currentProfile.readerTitle || ""
  };
}

export async function syncAutomaticBadges(db, userId) {
  const result = await calculateAutomaticBadgeProgress(db, userId);

  const badgeChanged =
    !sameStringArray(result.earnedBadges, result.currentEarnedBadges) ||
    !sameStringArray(result.currentEarnedBadges, result.rawCurrentEarnedBadges);
  const titlesChanged = !sameStringArray(
    result.unlockedTitles,
    result.currentUnlockedTitles
  );
  const readerTitleChanged = result.readerTitle !== result.currentReaderTitle;

  if (badgeChanged || titlesChanged || readerTitleChanged) {
    await setDoc(
      doc(db, "profiles", userId),
      {
        earnedBadges: result.earnedBadges,
        unlockedTitles: result.unlockedTitles,
        readerTitle: result.readerTitle,
        badgeProgress: result.progress,
        badgesUpdatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  await writeBadgeNotifications(
    db,
    userId,
    result.newlyEarnedBadges,
    result.newlyUnlockedTitles
  );

  return result;
}
