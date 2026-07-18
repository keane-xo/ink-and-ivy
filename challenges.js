import {
  getApp,
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  BADGES,
  syncAutomaticBadges
} from "./badge-engine.js";

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
const VOTING_DAYS = 7;
const TIME_ZONE = "America/Chicago";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

const loginView = document.querySelector("#challenges-login-view");
const challengesView = document.querySelector("#challenges-view");
const signoutButton = document.querySelector("#challenges-signout-button");
const cycleSummaryLabel = document.querySelector("#cycle-summary-label");
const cycleCountdown = document.querySelector("#cycle-countdown");
const cycleDateRange = document.querySelector("#cycle-date-range");
const currentStreak = document.querySelector("#current-streak");
const cycleBestStreak = document.querySelector("#cycle-best-streak");
const cycleActiveDays = document.querySelector("#cycle-active-days");
const globalLongestStreak = document.querySelector("#global-longest-streak");
const leaderboardList = document.querySelector("#leaderboard-list");
const leaderboardEmpty = document.querySelector("#leaderboard-empty");
const ballotTitle = document.querySelector("#ballot-title");
const ballotStatus = document.querySelector("#ballot-status");
const ballotMessage = document.querySelector("#ballot-message");
const ballotOptions = document.querySelector("#ballot-options");
const ballotFormMessage = document.querySelector("#ballot-form-message");
const adminBallotSetup = document.querySelector("#admin-ballot-setup");
const finalistOne = document.querySelector("#finalist-one");
const finalistTwo = document.querySelector("#finalist-two");
const finalistThree = document.querySelector("#finalist-three");
const saveFinalistsButton = document.querySelector("#save-finalists-button");
const adminFinalistMessage = document.querySelector("#admin-finalist-message");
const previousResultsPanel = document.querySelector("#previous-results-panel");
const previousCycleRange = document.querySelector("#previous-cycle-range");
const streakWinnerName = document.querySelector("#streak-winner-name");
const guaranteedBookTitle = document.querySelector("#guaranteed-book-title");
const streakWinnerDetail = document.querySelector("#streak-winner-detail");
const voteWinnerOne = document.querySelector("#vote-winner-one");
const voteWinnerTwo = document.querySelector("#vote-winner-two");
const winnerChoiceBox = document.querySelector("#winner-choice-box");
const winnerSuggestionSelect = document.querySelector("#winner-suggestion-select");
const saveWinnerChoiceButton = document.querySelector("#save-winner-choice-button");
const winnerChoiceMessage = document.querySelector("#winner-choice-message");
const publicProfileLink = document.querySelector("#challenge-public-profile-link");
const badgeGrid = document.querySelector("#automatic-badge-grid");
const badgeSyncMessage = document.querySelector("#badge-sync-message");
const toast = document.querySelector("#challenges-toast");

let currentUser = null;
let currentProfile = null;
let todayDay = 0;
let currentCycle = null;
let previousCycle = null;
let currentCycleDocument = null;
let previousCycleDocument = null;
let currentVote = null;
let pendingSuggestions = [];
let winnerSuggestions = [];
let previousWinnerSelection = null;
let unsubscribeStreak = null;
let unsubscribeMember = null;
let unsubscribeLeaderboard = null;
let unsubscribeCurrentCycle = null;
let unsubscribePreviousCycle = null;
let unsubscribeCurrentVote = null;
let unsubscribeWinnerSelection = null;
let myGlobalStreak = {};
let myCycleMember = {};
let leaderboard = [];
let automaticProgress = {};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function centralParts(date = new Date()) {
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

function dateFromDay(day) {
  return new Date(day * 86400000 + 12 * 60 * 60 * 1000);
}

function dateKeyFromDay(day) {
  const date = dateFromDay(day);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function displayDate(day, includeYear = true) {
  return dateFromDay(day).toLocaleDateString([], {
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {})
  }).toLowerCase();
}

function cycleForIndex(index) {
  if (index < 0) return null;
  const startDay = START_DAY + index * CYCLE_DAYS;
  return {
    id: `cycle-${index + 1}`,
    index,
    startDay,
    endDay: startDay + CYCLE_DAYS - 1,
    votingOpenDay: startDay + CYCLE_DAYS - VOTING_DAYS
  };
}

function cycleForToday(day) {
  if (day < START_DAY) return null;
  return cycleForIndex(
    Math.floor((day - START_DAY) / CYCLE_DAYS)
  );
}

function timestampValue(value) {
  return value?.seconds || Number.MAX_SAFE_INTEGER;
}

function avatarMarkup(person) {
  if (person?.avatarUrl) {
    return `<img src="${escapeHtml(person.avatarUrl)}" alt="">`;
  }
  return escapeHtml(person?.avatarEmoji || "📚");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cycleRange(cycle) {
  if (!cycle) return "";
  return `${displayDate(cycle.startDay, false)} – ${displayDate(cycle.endDay)}`;
}

function updateCycleSummary() {
  if (!currentCycle) {
    const days = START_DAY - todayDay;
    cycleSummaryLabel.textContent = "streaks begin in";
    cycleCountdown.textContent = `${days} ${days === 1 ? "day" : "days"}`;
    cycleDateRange.textContent =
      `${displayDate(START_DAY, false)} – ${displayDate(START_DAY + CYCLE_DAYS - 1)}`;
    return;
  }

  const daysRemaining = currentCycle.endDay - todayDay + 1;
  cycleSummaryLabel.textContent = `cycle ${currentCycle.index + 1}`;
  cycleCountdown.textContent =
    `${daysRemaining} ${daysRemaining === 1 ? "day left" : "days left"}`;
  cycleDateRange.textContent = cycleRange(currentCycle);
}

function renderMyStreak() {
  currentStreak.textContent = Number(myGlobalStreak.currentStreak || 0);
  globalLongestStreak.textContent =
    Number(myGlobalStreak.longestStreak || 0);
  cycleBestStreak.textContent = Number(myCycleMember.bestStreak || 0);
  cycleActiveDays.textContent = Number(myCycleMember.activeDays || 0);
}

function renderLeaderboard() {
  leaderboardList.innerHTML = "";

  const eligible = leaderboard
    .filter((item) => item.eligibleForPrize !== false && item.userId !== ADMIN_UID)
    .sort((a, b) => {
      const streakDifference =
        Number(b.bestStreak || 0) - Number(a.bestStreak || 0);
      if (streakDifference) return streakDifference;

      const reachedDifference =
        timestampValue(a.bestReachedAt) - timestampValue(b.bestReachedAt);
      if (reachedDifference) return reachedDifference;

      return String(a.displayName || "").localeCompare(
        String(b.displayName || "")
      );
    });

  leaderboardEmpty.hidden = eligible.length !== 0;

  if (!eligible.length) {
    leaderboardEmpty.textContent = currentCycle
      ? "no eligible reader has started a streak in this cycle yet."
      : "streaks begin on august 13.";
  }

  eligible.slice(0, 12).forEach((reader, index) => {
    const row = document.createElement("article");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="avatar" style="--avatar-color:${escapeHtml(reader.avatarColor || "#e8b8c5")}">
        ${avatarMarkup(reader)}
      </span>
      <span class="leaderboard-reader">
        <strong>${escapeHtml(reader.displayName || "reader")}</strong>
        <small>${Number(reader.activeDays || 0)} active days</small>
      </span>
      <span class="leaderboard-score">🔥 ${Number(reader.bestStreak || 0)}</span>
    `;
    leaderboardList.appendChild(row);
  });
}

function finalistObjects(documentData) {
  return Array.isArray(documentData?.finalists)
    ? documentData.finalists
    : [];
}

function voteIsOpen() {
  return (
    currentCycle &&
    todayDay >= currentCycle.votingOpenDay &&
    todayDay <= currentCycle.endDay
  );
}

async function castVote(finalist) {
  if (!currentUser || !currentCycle) return;

  ballotFormMessage.textContent = "saving your vote...";

  try {
    await setDoc(
      doc(
        db,
        "readingCycles",
        currentCycle.id,
        "votes",
        currentUser.uid
      ),
      {
        userId: currentUser.uid,
        selectedSuggestionId: finalist.suggestionId,
        selectedTitle: finalist.title,
        updatedAt: serverTimestamp(),
        createdAt: currentVote?.createdAt || serverTimestamp()
      },
      { merge: true }
    );
    ballotFormMessage.textContent =
      `your vote for ${finalist.title} was saved. you may change it until the cycle ends.`;
  } catch (error) {
    console.error(error);
    ballotFormMessage.textContent =
      "your vote could not be saved.";
  }
}

function renderBallot() {
  ballotOptions.innerHTML = "";
  ballotFormMessage.textContent = "";

  if (!currentCycle) {
    ballotTitle.textContent = "the first community vote";
    ballotStatus.textContent = "begins october 8";
    ballotMessage.textContent =
      "the first ballot opens during the final seven days of the first cycle.";
    adminBallotSetup.hidden = true;
    return;
  }

  ballotTitle.textContent = `cycle ${currentCycle.index + 1} ballot`;
  const finalists = finalistObjects(currentCycleDocument);

  if (todayDay < currentCycle.votingOpenDay) {
    ballotStatus.textContent = "upcoming";
    ballotMessage.textContent =
      `voting opens ${displayDate(currentCycle.votingOpenDay)} and closes at the end of ${displayDate(currentCycle.endDay)}.`;
  } else if (todayDay <= currentCycle.endDay) {
    ballotStatus.textContent = "voting open";
    ballotMessage.textContent =
      "choose one finalist. your vote may be changed until the cycle ends.";
  } else {
    ballotStatus.textContent = "closed";
    ballotMessage.textContent =
      "this ballot has closed. final results appear after the librarian's next visit.";
  }

  if (!finalists.length) {
    ballotOptions.innerHTML =
      '<p class="empty-state">the three ballot finalists have not been published yet.</p>';
  } else {
    finalists.forEach((finalist, index) => {
      const selected =
        currentVote?.selectedSuggestionId === finalist.suggestionId;
      const card = document.createElement("article");
      card.className = `ballot-option ${selected ? "selected" : ""}`;
      card.innerHTML = `
        <span>finalist ${index + 1}</span>
        <h3>${escapeHtml(finalist.title)}</h3>
        <p>by ${escapeHtml(finalist.author || "unknown author")}</p>
        <button
          class="${selected ? "secondary-button" : "primary-button"}"
          type="button"
          ${voteIsOpen() ? "" : "disabled"}
        >
          ${selected ? "your vote" : "vote for this book"}
        </button>
      `;
      card.querySelector("button").addEventListener(
        "click",
        () => castVote(finalist)
      );
      ballotOptions.appendChild(card);
    });
  }

  const adminCanEdit =
    currentUser?.uid === ADMIN_UID &&
    todayDay < currentCycle.votingOpenDay;

  adminBallotSetup.hidden = !adminCanEdit;
  if (adminCanEdit) populateFinalistSelectors();
}

function suggestionLabel(suggestion) {
  return `${suggestion.title} — ${suggestion.author || "unknown author"} · ${suggestion.name || "reader"}`;
}

function populateSelect(select, selectedId = "") {
  select.innerHTML = '<option value="">choose a suggestion</option>';
  pendingSuggestions.forEach((suggestion) => {
    const option = document.createElement("option");
    option.value = suggestion.id;
    option.textContent = suggestionLabel(suggestion);
    select.appendChild(option);
  });
  select.value = selectedId;
}

function populateFinalistSelectors() {
  const finalists = finalistObjects(currentCycleDocument);
  populateSelect(finalistOne, finalists[0]?.suggestionId || "");
  populateSelect(finalistTwo, finalists[1]?.suggestionId || "");
  populateSelect(finalistThree, finalists[2]?.suggestionId || "");
}

saveFinalistsButton.addEventListener("click", async () => {
  if (!currentCycle || currentUser?.uid !== ADMIN_UID) return;

  const ids = [
    finalistOne.value,
    finalistTwo.value,
    finalistThree.value
  ];

  if (ids.some((id) => !id) || new Set(ids).size !== 3) {
    adminFinalistMessage.textContent =
      "choose three different title suggestions.";
    return;
  }

  const selected = ids.map((id) =>
    pendingSuggestions.find((suggestion) => suggestion.id === id)
  );

  if (selected.some((item) => !item)) {
    adminFinalistMessage.textContent =
      "one of those suggestions could not be found.";
    return;
  }

  saveFinalistsButton.disabled = true;
  saveFinalistsButton.textContent = "publishing...";
  adminFinalistMessage.textContent = "";

  try {
    await setDoc(
      doc(db, "readingCycles", currentCycle.id),
      {
        cycleId: currentCycle.id,
        cycleNumber: currentCycle.index + 1,
        startDate: dateKeyFromDay(currentCycle.startDay),
        endDate: dateKeyFromDay(currentCycle.endDay),
        votingOpenDate: dateKeyFromDay(currentCycle.votingOpenDay),
        finalistIds: ids,
        finalists: selected.map((suggestion) => ({
          suggestionId: suggestion.id,
          title: suggestion.title,
          author: suggestion.author || "",
          submittedById: suggestion.userId,
          submittedByName: suggestion.name || "reader"
        })),
        updatedAt: serverTimestamp(),
        createdAt: currentCycleDocument?.createdAt || serverTimestamp()
      },
      { merge: true }
    );
    adminFinalistMessage.textContent =
      "the three ballot finalists were published.";
  } catch (error) {
    console.error(error);
    adminFinalistMessage.textContent =
      "the finalists could not be published.";
  } finally {
    saveFinalistsButton.disabled = false;
    saveFinalistsButton.textContent = "publish finalists";
  }
});

function sortWinnerCandidates(members) {
  return members
    .filter(
      (member) =>
        member.eligibleForPrize !== false &&
        member.userId !== ADMIN_UID
    )
    .sort((a, b) => {
      const streakDifference =
        Number(b.bestStreak || 0) - Number(a.bestStreak || 0);
      if (streakDifference) return streakDifference;

      const reachedDifference =
        timestampValue(a.bestReachedAt) - timestampValue(b.bestReachedAt);
      if (reachedDifference) return reachedDifference;

      return String(a.displayName || "").localeCompare(
        String(b.displayName || "")
      );
    });
}

async function finalizeCycleIfNeeded(cycle) {
  if (
    !cycle ||
    currentUser?.uid !== ADMIN_UID ||
    todayDay <= cycle.endDay
  ) {
    return;
  }

  const cycleReference = doc(db, "readingCycles", cycle.id);
  const cycleSnapshot = await getDoc(cycleReference);
  const cycleData = cycleSnapshot.exists() ? cycleSnapshot.data() : {};

  if (cycleData.finalizedAt) return;

  const [membersSnapshot, votesSnapshot] = await Promise.all([
    getDocs(collection(db, "readingCycles", cycle.id, "members")),
    getDocs(collection(db, "readingCycles", cycle.id, "votes"))
  ]);

  const candidates = sortWinnerCandidates(
    membersSnapshot.docs.map((entry) => entry.data())
  );
  const winner = candidates[0] || null;
  const finalists = finalistObjects(cycleData);

  const counts = new Map(
    finalists.map((item) => [item.suggestionId, 0])
  );
  votesSnapshot.docs.forEach((entry) => {
    const selectedId = entry.data().selectedSuggestionId;
    if (counts.has(selectedId)) {
      counts.set(selectedId, counts.get(selectedId) + 1);
    }
  });

  const votedWinners = finalists
    .map((item, index) => ({
      ...item,
      votes: counts.get(item.suggestionId) || 0,
      finalistOrder: index
    }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        a.finalistOrder - b.finalistOrder
    )
    .slice(0, 2);

  await setDoc(
    cycleReference,
    {
      cycleId: cycle.id,
      cycleNumber: cycle.index + 1,
      startDate: dateKeyFromDay(cycle.startDay),
      endDate: dateKeyFromDay(cycle.endDay),
      votingOpenDate: dateKeyFromDay(cycle.votingOpenDay),
      winnerId: winner?.userId || "",
      winnerName: winner?.displayName || "",
      winnerBestStreak: Number(winner?.bestStreak || 0),
      winnerReachedAt: winner?.bestReachedAt || null,
      votedWinnerIds: votedWinners.map((item) => item.suggestionId),
      votedWinners,
      finalizedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: cycleData.createdAt || serverTimestamp()
    },
    { merge: true }
  );

  showToast(`cycle ${cycle.index + 1} results were finalized automatically.`);
}

async function finalizeAllEndedCycles() {
  if (currentUser?.uid !== ADMIN_UID || todayDay <= START_DAY) return;

  const lastEndedIndex = Math.floor(
    (todayDay - START_DAY - 1) / CYCLE_DAYS
  );

  for (let index = 0; index <= lastEndedIndex; index += 1) {
    await finalizeCycleIfNeeded(cycleForIndex(index));
  }
}

function eligibleWinnerSuggestions() {
  const votedWinnerIds = new Set(
    Array.isArray(previousCycleDocument?.votedWinnerIds)
      ? previousCycleDocument.votedWinnerIds
      : []
  );

  return winnerSuggestions.filter(
    (suggestion) => !votedWinnerIds.has(suggestion.id)
  );
}

function populateWinnerSuggestions() {
  winnerSuggestionSelect.innerHTML =
    '<option value="">choose one of your suggestions</option>';

  eligibleWinnerSuggestions().forEach((suggestion) => {
    const option = document.createElement("option");
    option.value = suggestion.id;
    option.textContent =
      `${suggestion.title} — ${suggestion.author || "unknown author"}`;
    winnerSuggestionSelect.appendChild(option);
  });
}

saveWinnerChoiceButton.addEventListener("click", async () => {
  if (!previousCycle || !currentUser) return;

  const suggestion = eligibleWinnerSuggestions().find(
    (item) => item.id === winnerSuggestionSelect.value
  );

  if (!suggestion) {
    winnerChoiceMessage.textContent =
      "choose one of your pending title suggestions.";
    return;
  }

  saveWinnerChoiceButton.disabled = true;
  saveWinnerChoiceButton.textContent = "saving...";
  winnerChoiceMessage.textContent = "";

  try {
    await setDoc(
      doc(
        db,
        "readingCycles",
        previousCycle.id,
        "winnerSelections",
        currentUser.uid
      ),
      {
        userId: currentUser.uid,
        suggestionId: suggestion.id,
        title: suggestion.title,
        author: suggestion.author || "",
        selectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    winnerChoiceMessage.textContent =
      `${suggestion.title} is your guaranteed selection.`;
  } catch (error) {
    console.error(error);
    winnerChoiceMessage.textContent =
      "your guaranteed selection could not be saved.";
  } finally {
    saveWinnerChoiceButton.disabled = false;
    saveWinnerChoiceButton.textContent = "choose this book";
  }
});

function renderPreviousResults() {
  if (!previousCycle) {
    previousResultsPanel.hidden = true;
    return;
  }

  previousResultsPanel.hidden = false;
  previousCycleRange.textContent = cycleRange(previousCycle);

  const finalized = Boolean(previousCycleDocument?.finalizedAt);
  if (!finalized) {
    streakWinnerName.textContent = "results pending";
    guaranteedBookTitle.textContent =
      "the librarian's next visit will finalize the cycle";
    streakWinnerDetail.textContent = "";
    voteWinnerOne.textContent = "results pending";
    voteWinnerTwo.textContent = "results pending";
    winnerChoiceBox.hidden = true;
    return;
  }

  streakWinnerName.textContent =
    previousCycleDocument.winnerName || "no eligible winner";
  streakWinnerDetail.textContent =
    previousCycleDocument.winnerId
      ? `highest streak reached: ${Number(previousCycleDocument.winnerBestStreak || 0)} days`
      : "";

  guaranteedBookTitle.textContent =
    previousWinnerSelection?.title || "winner has not chosen a book yet";

  const voted = Array.isArray(previousCycleDocument.votedWinners)
    ? previousCycleDocument.votedWinners
    : [];
  voteWinnerOne.textContent = voted[0]?.title || "no ballot result";
  voteWinnerTwo.textContent = voted[1]?.title || "no ballot result";

  const isWinner =
    previousCycleDocument.winnerId === currentUser?.uid;
  winnerChoiceBox.hidden = !isWinner || Boolean(previousWinnerSelection);

  if (isWinner && !previousWinnerSelection) {
    populateWinnerSuggestions();
    if (!eligibleWinnerSuggestions().length) {
      winnerChoiceMessage.innerHTML =
        'you need a pending suggestion that was not already selected by the community vote. <a href="index.html#request">submit one here</a>, then return to choose it.';
      saveWinnerChoiceButton.disabled = true;
    } else {
      winnerChoiceMessage.textContent = "";
      saveWinnerChoiceButton.disabled = false;
    }
  }
}

function renderBadges() {
  badgeGrid.innerHTML = "";

  Object.entries(BADGES).forEach(([id, badge]) => {
    const value = Number(automaticProgress[id] || 0);
    const displayValue = Math.min(value, badge.target);
    const earned = value >= badge.target;
    const percent = Math.min(100, Math.round((value / badge.target) * 100));

    const card = document.createElement("article");
    card.className = `automatic-badge-card ${earned ? "earned" : ""}`;
    card.innerHTML = `
      <div class="badge-card-top">
        <span aria-hidden="true">${badge.emoji}</span>
        <span class="badge-state">${earned ? "badge earned" : "automatic"}</span>
      </div>
      <h3>${badge.name}</h3>
      <p>${badge.description}</p>
      <div class="progress-label">
        <span>${displayValue} of ${badge.target}</span>
        <span>${badge.unit}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="--progress:${percent}%"></div>
      </div>
    `;
    badgeGrid.appendChild(card);
  });
}

async function loadAutomaticBadges() {
  badgeSyncMessage.textContent = "checking your reading activity...";

  try {
    const result = await syncAutomaticBadges(db, currentUser.uid);
    automaticProgress = result.progress;
    renderBadges();
    badgeSyncMessage.textContent =
      "your badges and progress are current.";
  } catch (error) {
    console.error(error);
    badgeSyncMessage.textContent =
      "some automatic badge progress could not be checked.";
  }
}

async function loadSuggestions() {
  if (!currentUser) return;

  if (currentUser.uid === ADMIN_UID) {
    const snapshot = await getDocs(collection(db, "bookSuggestions"));
    pendingSuggestions = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .filter((item) => item.status === "pending");
  }

  const ownSnapshot = await getDocs(
    query(
      collection(db, "bookSuggestions"),
      where("userId", "==", currentUser.uid)
    )
  );
  winnerSuggestions = ownSnapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .filter((item) => item.status === "pending");

  renderBallot();
  renderPreviousResults();
}

function stopListeners() {
  [
    unsubscribeStreak,
    unsubscribeMember,
    unsubscribeLeaderboard,
    unsubscribeCurrentCycle,
    unsubscribePreviousCycle,
    unsubscribeCurrentVote,
    unsubscribeWinnerSelection
  ].forEach((unsubscribe) => unsubscribe?.());

  unsubscribeStreak =
    unsubscribeMember =
    unsubscribeLeaderboard =
    unsubscribeCurrentCycle =
    unsubscribePreviousCycle =
    unsubscribeCurrentVote =
    unsubscribeWinnerSelection =
      null;
}

function startListeners(user) {
  unsubscribeStreak = onSnapshot(
    doc(db, "readerStreaks", user.uid),
    (snapshot) => {
      myGlobalStreak = snapshot.exists() ? snapshot.data() : {};
      renderMyStreak();
    }
  );

  if (currentCycle) {
    unsubscribeMember = onSnapshot(
      doc(
        db,
        "readingCycles",
        currentCycle.id,
        "members",
        user.uid
      ),
      (snapshot) => {
        myCycleMember = snapshot.exists() ? snapshot.data() : {};
        renderMyStreak();
      }
    );

    unsubscribeLeaderboard = onSnapshot(
      collection(
        db,
        "readingCycles",
        currentCycle.id,
        "members"
      ),
      (snapshot) => {
        leaderboard = snapshot.docs.map((entry) => entry.data());
        renderLeaderboard();
      }
    );

    unsubscribeCurrentCycle = onSnapshot(
      doc(db, "readingCycles", currentCycle.id),
      (snapshot) => {
        currentCycleDocument = snapshot.exists()
          ? snapshot.data()
          : null;
        renderBallot();
      }
    );

    unsubscribeCurrentVote = onSnapshot(
      doc(
        db,
        "readingCycles",
        currentCycle.id,
        "votes",
        user.uid
      ),
      (snapshot) => {
        currentVote = snapshot.exists() ? snapshot.data() : null;
        renderBallot();
      }
    );
  } else {
    leaderboard = [];
    renderLeaderboard();
    renderBallot();
  }

  if (previousCycle) {
    unsubscribePreviousCycle = onSnapshot(
      doc(db, "readingCycles", previousCycle.id),
      (snapshot) => {
        previousCycleDocument = snapshot.exists()
          ? snapshot.data()
          : null;
        renderPreviousResults();
      }
    );

    unsubscribeWinnerSelection = onSnapshot(
      doc(
        db,
        "readingCycles",
        previousCycle.id,
        "winnerSelections",
        user.uid
      ),
      (snapshot) => {
        previousWinnerSelection = snapshot.exists()
          ? snapshot.data()
          : null;
        renderPreviousResults();
      }
    );
  }
}

signoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  challengesView.hidden = !user;
  signoutButton.hidden = !user;

  stopListeners();
  currentProfile = null;
  myGlobalStreak = {};
  myCycleMember = {};
  leaderboard = [];
  currentCycleDocument = null;
  previousCycleDocument = null;
  currentVote = null;
  previousWinnerSelection = null;
  pendingSuggestions = [];
  winnerSuggestions = [];

  if (!user) return;

  try {
    const profileSnapshot = await getDoc(doc(db, "profiles", user.uid));
    if (!profileSnapshot.exists()) {
      window.location.href = "reader.html";
      return;
    }

    currentProfile = profileSnapshot.data();
    publicProfileLink.href =
      `profile.html?uid=${encodeURIComponent(user.uid)}`;
    publicProfileLink.hidden = false;

    todayDay = dayNumber(centralParts());
    currentCycle = cycleForToday(todayDay);
    previousCycle = currentCycle
      ? cycleForIndex(currentCycle.index - 1)
      : null;

    updateCycleSummary();
    renderMyStreak();
    renderLeaderboard();
    renderBallot();
    renderPreviousResults();
    renderBadges();

    startListeners(user);
    await Promise.all([
      loadSuggestions(),
      loadAutomaticBadges()
    ]);

    await finalizeAllEndedCycles();
  } catch (error) {
    console.error(error);
    showToast("streaks, voting, and badges could not be opened.");
  }
});
