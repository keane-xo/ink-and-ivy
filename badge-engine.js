import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

export const BADGES = {
  "page-turner": {
    emoji: "📖",
    name: "page turner",
    description: "finished three books",
    target: 3,
    unit: "books finished"
  },
  "genre-explorer": {
    emoji: "🧭",
    name: "genre explorer",
    description: "read across three different genres",
    target: 3,
    unit: "genres explored"
  },
  "friends-choice": {
    emoji: "💌",
    name: "friend's choice",
    description: "finished a book recommended by a friend",
    target: 1,
    unit: "friend pick finished"
  },
  "reviewers-quill": {
    emoji: "🪶",
    name: "reviewer's quill",
    description: "shared five book reviews",
    target: 5,
    unit: "reviews shared"
  },
  "journal-keeper": {
    emoji: "✍️",
    name: "journal keeper",
    description: "filled five reading-journal pages",
    target: 5,
    unit: "journal pages"
  },
  "tome-traveler": {
    emoji: "🏰",
    name: "tome traveler",
    description: "finished a book longer than 400 pages",
    target: 1,
    unit: "long book finished"
  },
  "seasonal-reader": {
    emoji: "🍂",
    name: "seasonal reader",
    description: "finished four books in one season",
    target: 4,
    unit: "books in one season"
  }
};

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
    getDocs(
      collection(db, "profiles", userId, "journalEntries")
    ),
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

  const friendPickFinished = [...completedBookIds].some((bookId) =>
    recommendedBookIds.has(bookId)
  );

  const longBookFinished = completedCheckouts.some((item) => {
    const pages = Number(bookById.get(item.bookId)?.pageCount || 0);
    return pages > 400;
  });

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
    "friends-choice": friendPickFinished ? 1 : 0,
    "reviewers-quill": reviewCount,
    "journal-keeper": journalSnapshot.size,
    "tome-traveler": longBookFinished ? 1 : 0,
    "seasonal-reader": mostBooksInASeason
  };

  const earnedBadges = Object.entries(BADGES)
    .filter(([id, badge]) => Number(progress[id] || 0) >= badge.target)
    .map(([id]) => id);

  const currentProfile = profileSnapshot.exists()
    ? profileSnapshot.data()
    : null;

  return {
    progress,
    earnedBadges,
    currentEarnedBadges: currentProfile?.earnedBadges || []
  };
}

export async function syncAutomaticBadges(db, userId) {
  const result = await calculateAutomaticBadgeProgress(db, userId);

  if (!sameStringArray(result.earnedBadges, result.currentEarnedBadges)) {
    await updateDoc(doc(db, "profiles", userId), {
      earnedBadges: result.earnedBadges
    });
  }

  return result;
}
