import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1dOxo61Z0U9mReJnw7s5Z3x0HFrrfB2k",
  authDomain: "ink-and-ivy-d0ff3.firebaseapp.com",
  projectId: "ink-and-ivy-d0ff3",
  storageBucket: "ink-and-ivy-d0ff3.firebasestorage.app",
  messagingSenderId: "444464034610",
  appId: "1:444464034610:web:de9c2c3a33737ae6849d2b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

const BADGES = {
  "page-turner": {
    emoji: "📖",
    name: "page turner",
    description: "finished three books"
  },
  "genre-explorer": {
    emoji: "🧭",
    name: "genre explorer",
    description: "read across three different genres"
  },
  "friends-choice": {
    emoji: "💌",
    name: "friend's choice",
    description: "finished a book recommended by a friend"
  },
  "reviewers-quill": {
    emoji: "🪶",
    name: "reviewer's quill",
    description: "shared five book reviews"
  },
  "journal-keeper": {
    emoji: "✍️",
    name: "journal keeper",
    description: "filled five reading-journal pages"
  },
  "tome-traveler": {
    emoji: "🏰",
    name: "tome traveler",
    description: "finished a book longer than 400 pages"
  },
  "seasonal-reader": {
    emoji: "🍂",
    name: "seasonal reader",
    description: "finished four books in one season"
  },
  "brave-browser": {
    emoji: "🌙",
    name: "brave browser",
    description: "read beyond a usual comfort genre"
  }
};

const CHALLENGES = [
  {
    id: "page-turner",
    emoji: "📖",
    name: "page turner",
    description: "finish three books of any kind.",
    target: 3,
    step: "book finished"
  },
  {
    id: "genre-explorer",
    emoji: "🧭",
    name: "genre explorer",
    description: "finish books from three different genres.",
    target: 3,
    step: "new genre explored"
  },
  {
    id: "friends-choice",
    emoji: "💌",
    name: "friend's choice",
    description: "finish one book that a friend recommended to you.",
    target: 1,
    step: "recommended book finished"
  },
  {
    id: "reviewers-quill",
    emoji: "🪶",
    name: "reviewer's quill",
    description: "write and share five thoughtful book reviews.",
    target: 5,
    step: "review written"
  },
  {
    id: "journal-keeper",
    emoji: "✍️",
    name: "journal keeper",
    description: "fill five pages in your private reading journal.",
    target: 5,
    step: "journal page written"
  },
  {
    id: "tome-traveler",
    emoji: "🏰",
    name: "tome traveler",
    description: "finish one book that is more than 400 pages long.",
    target: 1,
    step: "long book finished"
  },
  {
    id: "seasonal-reader",
    emoji: "🍂",
    name: "seasonal reader",
    description: "finish four books during the same season.",
    target: 4,
    step: "seasonal book finished"
  },
  {
    id: "brave-browser",
    emoji: "🌙",
    name: "brave browser",
    description: "finish one book outside your usual comfort genre.",
    target: 1,
    step: "new kind of book finished"
  }
];

const loginView = document.querySelector("#challenges-login-view");
const challengesView = document.querySelector("#challenges-view");
const signoutButton = document.querySelector("#challenges-signout-button");
const earnedBadgeTotal = document.querySelector("#earned-badge-total");
const badgeGrid = document.querySelector("#badge-cabinet-grid");
const badgeEmpty = document.querySelector("#badge-cabinet-empty");
const publicProfileLink = document.querySelector("#challenge-public-profile-link");
const challengeFilter = document.querySelector("#challenge-filter");
const challengeGrid = document.querySelector("#challenge-grid");
const challengeEmpty = document.querySelector("#challenge-empty");
const toast = document.querySelector("#challenges-toast");

let currentUser = null;
let currentProfile = null;
let progressById = new Map();
let unsubscribeProfile = null;
let unsubscribeProgress = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function progressFor(challenge) {
  return progressById.get(challenge.id) || null;
}

function badgeIds() {
  return Array.isArray(currentProfile?.earnedBadges)
    ? currentProfile.earnedBadges
    : [];
}

function renderBadges() {
  const earned = badgeIds().filter((id) => BADGES[id]);
  earnedBadgeTotal.textContent = earned.length;
  badgeGrid.innerHTML = "";
  badgeEmpty.hidden = earned.length !== 0;

  earned.forEach((id) => {
    const badge = BADGES[id];
    const card = document.createElement("article");
    card.className = "badge-card";
    card.innerHTML = `
      <span class="badge-emoji" aria-hidden="true">${badge.emoji}</span>
      <strong>${badge.name}</strong>
      <small>${badge.description}</small>
    `;
    badgeGrid.appendChild(card);
  });
}

function challengeState(challenge) {
  const progress = progressFor(challenge);
  if (!progress) return "available";
  return progress.status === "completed" ? "completed" : "active";
}

async function joinChallenge(challenge) {
  if (!currentUser) return;

  try {
    await setDoc(
      doc(
        db,
        "profiles",
        currentUser.uid,
        "readingChallenges",
        challenge.id
      ),
      {
        userId: currentUser.uid,
        challengeId: challenge.id,
        progress: 0,
        target: challenge.target,
        status: "active",
        joinedAt: serverTimestamp(),
        completedAt: null,
        updatedAt: serverTimestamp()
      }
    );
    showToast(`${challenge.name} was added to your reading garden.`);
  } catch (error) {
    console.error(error);
    showToast("the challenge could not be joined.");
  }
}

async function logProgress(challenge, amount) {
  if (!currentUser) return;
  const record = progressFor(challenge);
  if (!record || record.status === "completed") return;

  const nextProgress = Math.max(
    0,
    Math.min(challenge.target, Number(record.progress || 0) + amount)
  );
  const completed = nextProgress >= challenge.target;

  try {
    await updateDoc(
      doc(
        db,
        "profiles",
        currentUser.uid,
        "readingChallenges",
        challenge.id
      ),
      {
        progress: nextProgress,
        status: completed ? "completed" : "active",
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      }
    );

    if (completed) {
      await updateDoc(doc(db, "profiles", currentUser.uid), {
        earnedBadges: arrayUnion(challenge.id),
        updatedAt: serverTimestamp()
      });
      showToast(`badge unlocked: ${challenge.name}!`);
    }
  } catch (error) {
    console.error(error);
    showToast("your challenge progress could not be saved.");
  }
}

async function leaveChallenge(challenge) {
  if (!currentUser) return;

  try {
    await deleteDoc(
      doc(
        db,
        "profiles",
        currentUser.uid,
        "readingChallenges",
        challenge.id
      )
    );
    showToast(`${challenge.name} was removed from your active challenges.`);
  } catch (error) {
    console.error(error);
    showToast("the challenge could not be removed.");
  }
}

function renderChallenges() {
  const selectedFilter = challengeFilter.value;
  const visible = CHALLENGES.filter((challenge) => {
    const state = challengeState(challenge);
    return selectedFilter === "all" || state === selectedFilter;
  });

  challengeGrid.innerHTML = "";
  challengeEmpty.hidden = visible.length !== 0;

  visible.forEach((challenge) => {
    const record = progressFor(challenge);
    const state = challengeState(challenge);
    const progress = Math.min(
      challenge.target,
      Number(record?.progress || 0)
    );
    const percent = Math.round((progress / challenge.target) * 100);

    const card = document.createElement("article");
    card.className = `challenge-card ${state}`;

    let actions = "";
    if (state === "available") {
      actions = `
        <div class="challenge-actions">
          <button class="primary-button" type="button" data-join>
            join challenge
          </button>
        </div>
      `;
    } else if (state === "active") {
      actions = `
        <div class="challenge-actions">
          <button class="primary-button" type="button" data-add-progress>
            ${challenge.target === 1 ? "complete challenge" : "log one step"}
          </button>
          ${progress > 0 ? '<button class="secondary-button" type="button" data-remove-progress>undo one</button>' : ""}
          <button class="secondary-button" type="button" data-leave>
            leave challenge
          </button>
        </div>
      `;
    } else {
      actions = `
        <p class="challenge-complete-note">
          badge collected and displayed on your reader page.
        </p>
      `;
    }

    card.innerHTML = `
      <div class="challenge-card-top">
        <span class="challenge-icon" aria-hidden="true">${challenge.emoji}</span>
        <span class="challenge-status">${
          state === "available"
            ? "available"
            : state === "completed"
              ? "completed"
              : "in progress"
        }</span>
      </div>

      <h3>${challenge.name}</h3>
      <p>${challenge.description}</p>

      <div class="progress-label">
        <span>${progress} of ${challenge.target}</span>
        <span>${challenge.step}</span>
      </div>
      <div class="progress-track" aria-label="${percent} percent complete">
        <div class="progress-fill" style="--progress:${percent}%"></div>
      </div>

      ${actions}
    `;

    card.querySelector("[data-join]")?.addEventListener(
      "click",
      () => joinChallenge(challenge)
    );
    card.querySelector("[data-add-progress]")?.addEventListener(
      "click",
      () => logProgress(challenge, 1)
    );
    card.querySelector("[data-remove-progress]")?.addEventListener(
      "click",
      () => logProgress(challenge, -1)
    );
    card.querySelector("[data-leave]")?.addEventListener(
      "click",
      () => leaveChallenge(challenge)
    );

    challengeGrid.appendChild(card);
  });
}

function renderAll() {
  renderBadges();
  renderChallenges();
}

challengeFilter.addEventListener("change", renderChallenges);
signoutButton.addEventListener("click", () => signOut(auth));

function stopListeners() {
  unsubscribeProfile?.();
  unsubscribeProgress?.();
  unsubscribeProfile = null;
  unsubscribeProgress = null;
}

async function startForUser(user) {
  const profileDocument = await getDoc(doc(db, "profiles", user.uid));
  if (!profileDocument.exists()) {
    window.location.href = "reader.html";
    return;
  }

  publicProfileLink.href =
    `profile.html?uid=${encodeURIComponent(user.uid)}`;
  publicProfileLink.hidden = false;

  unsubscribeProfile = onSnapshot(
    doc(db, "profiles", user.uid),
    (snapshot) => {
      currentProfile = snapshot.exists() ? snapshot.data() : null;
      renderBadges();
    },
    (error) => {
      console.error(error);
      showToast("your badge cabinet could not be loaded.");
    }
  );

  unsubscribeProgress = onSnapshot(
    collection(
      db,
      "profiles",
      user.uid,
      "readingChallenges"
    ),
    (snapshot) => {
      progressById = new Map(
        snapshot.docs.map((entry) => [
          entry.id,
          { id: entry.id, ...entry.data() }
        ])
      );
      renderChallenges();
    },
    (error) => {
      console.error(error);
      challengeEmpty.hidden = false;
      challengeEmpty.textContent =
        "your reading challenges could not be loaded.";
    }
  );
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  challengesView.hidden = !user;
  signoutButton.hidden = !user;

  stopListeners();
  currentProfile = null;
  progressById = new Map();

  if (user) {
    try {
      await startForUser(user);
    } catch (error) {
      console.error(error);
      showToast("challenges and badges could not be opened.");
    }
  }
});
