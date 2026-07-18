import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

const authView = document.querySelector("#auth-view");
const profileView = document.querySelector("#profile-view");
const signinForm = document.querySelector("#signin-form");
const signupForm = document.querySelector("#signup-form");
const signinMessage = document.querySelector("#signin-message");
const signupMessage = document.querySelector("#signup-message");
const profileForm = document.querySelector("#profile-form");
const profileMessage = document.querySelector("#profile-message");
const profileDisplayName = document.querySelector("#profile-display-name");
const profileAvatarUrl = document.querySelector("#profile-avatar-url");
const profileBio = document.querySelector("#profile-bio");
const profileAvatarPreview = document.querySelector("#profile-avatar-preview");
const profileNamePreview = document.querySelector("#profile-name-preview");
const profileBioPreview = document.querySelector("#profile-bio-preview");
const publicProfileLink = document.querySelector("#public-profile-link");
const readingListSearch = document.querySelector("#reading-list-search");
const readingListBooks = document.querySelector("#reading-list-books");
const readingListEmpty = document.querySelector("#reading-list-empty");
const loanSlotCount = document.querySelector("#loan-slot-count");
const requestWindowCount = document.querySelector("#request-window-count");
const nextRequestDate = document.querySelector("#next-request-date");
const myLoansList = document.querySelector("#my-loans-list");
const myLoansEmpty = document.querySelector("#my-loans-empty");
const toast = document.querySelector("#toast");

let currentUser = null;
let profileExists = false;
let selectedAvatar = "📚";
let selectedColor = "#e8b8c5";
let books = [];
let activeList = "favoriteBookIds";
let favoriteBookIds = new Set();
let tbrBookIds = new Set();
let currentlyReadingBookIds = new Set();
let loansUnsubscribe = null;
let suggestionsUnsubscribe = null;
let latestLoans = [];
let latestSuggestions = [];

const MAX_CHECKOUTS = 3;
const MAX_TITLE_SUGGESTIONS_PER_WINDOW = 2;
const TITLE_SUGGESTION_WINDOW_DAYS = 63;
const TITLE_SUGGESTION_WINDOW_MS =
  TITLE_SUGGESTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const ACTIVE_CHECKOUT_STATUSES = new Set(["pending", "approved"]);

const returnPage = new URLSearchParams(window.location.search).get("return");
const allowedReturnPages = new Set([
  "community.html",
  "index.html",
  "journal.html",
  "recommendations.html",
  "challenges.html"
]);


function formatLoanDate(timestamp) {
  if (!timestamp?.toDate) return "";

  return timestamp.toDate().toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toLowerCase();
}

function formatRequestDate(date) {
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).toLowerCase();
}

function suggestionCreatedDate(item) {
  if (!item.createdAt?.toDate) return null;
  const date = item.createdAt.toDate();
  return Number.isNaN(date.getTime()) ? null : date;
}

function recentTitleSuggestions(items) {
  const cutoff = Date.now() - TITLE_SUGGESTION_WINDOW_MS;

  return items
    .filter((item) => {
      const date = suggestionCreatedDate(item);
      return date && date.getTime() >= cutoff;
    })
    .sort((a, b) => suggestionCreatedDate(a) - suggestionCreatedDate(b));
}

function loanIsOverdue(item) {
  return (
    item.requestType === "checkout" &&
    item.status === "approved" &&
    item.dueAt?.toDate &&
    item.dueAt.toDate().getTime() < Date.now()
  );
}

function renderMyLoans(items, suggestions = []) {
  const activeItems = items
    .filter((item) => ACTIVE_CHECKOUT_STATUSES.has(item.status))
    .sort((a, b) => {
      const aTime = a.dueAt?.seconds || a.createdAt?.seconds || 0;
      const bTime = b.dueAt?.seconds || b.createdAt?.seconds || 0;
      return aTime - bTime;
    });

  const usedSlots = activeItems.filter(
    (item) => item.requestType === "checkout"
  ).length;

  loanSlotCount.textContent = `${usedSlots} / ${MAX_CHECKOUTS}`;

  const recentSuggestions = recentTitleSuggestions(suggestions);
  const displayedSuggestionCount = Math.min(
    recentSuggestions.length,
    MAX_TITLE_SUGGESTIONS_PER_WINDOW
  );
  requestWindowCount.textContent =
    `${displayedSuggestionCount} / ${MAX_TITLE_SUGGESTIONS_PER_WINDOW}`;

  if (recentSuggestions.length >= MAX_TITLE_SUGGESTIONS_PER_WINDOW) {
    const oldestCountedSuggestion = suggestionCreatedDate(
      recentSuggestions[0]
    );
    const availableDate = new Date(
      oldestCountedSuggestion.getTime() + TITLE_SUGGESTION_WINDOW_MS
    );
    nextRequestDate.textContent =
      `your next new-title suggestion becomes available on ${formatRequestDate(availableDate)}. this applies only to books you want added to the library, not checkout requests.`;
  } else {
    const remaining =
      MAX_TITLE_SUGGESTIONS_PER_WINDOW - recentSuggestions.length;
    nextRequestDate.textContent =
      remaining === 1
        ? "you may suggest one more new title for the library right now. this does not limit checkout requests."
        : "you may suggest two new titles for the library right now. this does not limit checkout requests.";
  }

  myLoansList.innerHTML = "";
  myLoansEmpty.hidden = activeItems.length !== 0;

  activeItems.forEach((item) => {
    const overdue = loanIsOverdue(item);
    const card = document.createElement("article");
    card.className = "my-loan-item";
    card.classList.toggle("overdue", overdue);

    let timingCopy = "";
    if (item.requestType === "waitlist") {
      timingCopy =
        item.status === "pending"
          ? "waiting for the book to become available"
          : "waitlist request approved";
    } else if (item.status === "pending") {
      timingCopy = "awaiting approval · this uses one of your three checkout slots";
    } else if (item.dueAt?.toDate) {
      timingCopy = overdue
        ? `overdue · was due ${formatLoanDate(item.dueAt)}`
        : `due ${formatLoanDate(item.dueAt)}`;
    } else {
      timingCopy = "approved · ask the library admin for your due date";
    }

    card.innerHTML = `
      <h3>${escapeHtml(item.bookTitle || "untitled book")}</h3>
      <p>by ${escapeHtml(item.author || "unknown author")}</p>
      <p>${escapeHtml(timingCopy)}</p>
      <span class="my-loan-status">${escapeHtml(
        overdue ? "overdue" : `${item.requestType} · ${item.status}`
      )}</span>
    `;

    myLoansList.appendChild(card);
  });
}

function renderLibraryActivity() {
  renderMyLoans(latestLoans, latestSuggestions);
}

function subscribeToLibraryActivity(user) {
  loansUnsubscribe?.();
  suggestionsUnsubscribe?.();

  loansUnsubscribe = onSnapshot(
    query(
      collection(db, "checkoutRequests"),
      where("userId", "==", user.uid)
    ),
    (snapshot) => {
      latestLoans = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      renderLibraryActivity();
    },
    (error) => {
      console.error(error);
      myLoansEmpty.hidden = false;
      myLoansEmpty.textContent = "your checkout activity could not be loaded.";
    }
  );

  suggestionsUnsubscribe = onSnapshot(
    query(
      collection(db, "bookSuggestions"),
      where("userId", "==", user.uid)
    ),
    (snapshot) => {
      latestSuggestions = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      renderLibraryActivity();
    },
    (error) => {
      console.error(error);
      nextRequestDate.textContent =
        "your new-title suggestion allowance could not be loaded.";
    }
  );
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "that email already has an account.";
  if (code.includes("invalid-email")) return "enter a valid email address.";
  if (code.includes("weak-password")) return "use a password with at least 6 characters.";
  if (code.includes("invalid-credential")) return "the email or password was not accepted.";
  if (code.includes("too-many-requests")) return "too many attempts. wait a moment and try again.";
  return `firebase error: ${code || "unknown-error"}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updatePreview() {
  const name = profileDisplayName.value.trim() || "reader";
  const bio = profileBio.value.trim() || "a little corner for books and thoughts.";
  const avatarUrl = profileAvatarUrl.value.trim();

  profileNamePreview.textContent = name;
  profileBioPreview.textContent = bio;
  profileAvatarPreview.style.setProperty("--avatar-color", selectedColor);

  if (avatarUrl) {
    profileAvatarPreview.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="">`;
    profileAvatarPreview.querySelector("img")?.addEventListener("error", () => {
      profileAvatarPreview.textContent = selectedAvatar;
    }, { once: true });
  } else {
    profileAvatarPreview.textContent = selectedAvatar;
  }

  renderListPreview();
}

function setForList(listName) {
  if (listName === "tbrBookIds") return tbrBookIds;
  if (listName === "currentlyReadingBookIds") return currentlyReadingBookIds;
  return favoriteBookIds;
}

function titleList(ids) {
  return books
    .filter((book) => ids.has(book.id))
    .map((book) => book.title)
    .slice(0, 4);
}

function renderListPreview() {
  let preview = document.querySelector("#profile-list-preview");
  if (!preview) {
    preview = document.createElement("div");
    preview.id = "profile-list-preview";
    preview.className = "profile-list-preview";
    document.querySelector(".profile-preview-card").appendChild(preview);
  }

  const favorites = titleList(favoriteBookIds);
  const tbr = titleList(tbrBookIds);
  const reading = titleList(currentlyReadingBookIds);

  preview.innerHTML = `
    <h3>favorite books</h3>
    <p>${favorites.length ? favorites.map(escapeHtml).join(" · ") : "nothing chosen yet"}</p>
    <h3>tbr</h3>
    <p>${tbr.length ? tbr.map(escapeHtml).join(" · ") : "nothing chosen yet"}</p>
    <h3>currently reading</h3>
    <p>${reading.length ? reading.map(escapeHtml).join(" · ") : "nothing chosen yet"}</p>
  `;
}

function renderReadingListBooks() {
  const search = readingListSearch.value.trim().toLowerCase();
  const currentSet = setForList(activeList);
  const visible = books.filter((book) =>
    String(book.title || "").toLowerCase().includes(search) ||
    String(book.author || "").toLowerCase().includes(search)
  );

  readingListBooks.innerHTML = "";
  readingListEmpty.hidden = visible.length !== 0;

  visible.forEach((book) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reading-list-book";
    button.classList.toggle("selected", currentSet.has(book.id));
    button.innerHTML = `
      <span>
        <strong>${escapeHtml(book.title)}</strong>
        <small>by ${escapeHtml(book.author || "unknown author")}</small>
      </span>
      <span class="reading-list-check">${currentSet.has(book.id) ? "✓" : ""}</span>
    `;

    button.addEventListener("click", () => {
      if (currentSet.has(book.id)) currentSet.delete(book.id);
      else currentSet.add(book.id);
      renderReadingListBooks();
      updatePreview();
    });

    readingListBooks.appendChild(button);
  });
}

document.querySelectorAll("[data-list-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-list-tab]").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    activeList = tab.dataset.listTab;
    renderReadingListBooks();
  });
});

readingListSearch.addEventListener("input", renderReadingListBooks);

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    const showSignin = tab.dataset.authTab === "signin";
    signinForm.hidden = !showSignin;
    signupForm.hidden = showSignin;
    signinMessage.textContent = "";
    signupMessage.textContent = "";
  });
});

signinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = signinForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "signing in...";
  signinMessage.textContent = "";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector("#signin-email").value.trim(),
      document.querySelector("#signin-password").value
    );
  } catch (error) {
    console.error(error);
    signinMessage.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = "sign in";
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = document.querySelector("#signup-name").value.trim();
  const email = document.querySelector("#signup-email").value.trim();
  const password = document.querySelector("#signup-password").value;
  const confirmation = document.querySelector("#signup-confirm-password").value;
  const button = signupForm.querySelector('button[type="submit"]');

  if (password !== confirmation) {
    signupMessage.textContent = "the passwords do not match.";
    return;
  }

  button.disabled = true;
  button.textContent = "creating...";
  signupMessage.textContent = "";

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "profiles", credential.user.uid), {
      displayName,
      avatarEmoji: "📚",
      avatarColor: "#e8b8c5",
      avatarUrl: "",
      bio: "",
      favoriteBookIds: [],
      tbrBookIds: [],
      currentlyReadingBookIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    signupMessage.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = "create account";
  }
});

async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "profiles", user.uid));
  profileExists = snapshot.exists();
  const profile = profileExists
    ? snapshot.data()
    : {
        displayName: user.email?.split("@")[0] || "reader",
        avatarEmoji: "📚",
        avatarColor: "#e8b8c5",
        avatarUrl: "",
        bio: "",
        favoriteBookIds: [],
        tbrBookIds: [],
        currentlyReadingBookIds: []
      };

  selectedAvatar = profile.avatarEmoji || "📚";
  selectedColor = profile.avatarColor || "#e8b8c5";
  favoriteBookIds = new Set(profile.favoriteBookIds || []);
  tbrBookIds = new Set(profile.tbrBookIds || []);
  currentlyReadingBookIds = new Set(profile.currentlyReadingBookIds || []);

  profileDisplayName.value = profile.displayName || "";
  profileAvatarUrl.value = profile.avatarUrl || "";
  profileBio.value = profile.bio || "";

  document.querySelectorAll("[data-avatar]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.avatar === selectedAvatar);
  });
  document.querySelectorAll("[data-color]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.color === selectedColor);
  });

  publicProfileLink.href = `profile.html?uid=${encodeURIComponent(user.uid)}`;
  publicProfileLink.hidden = false;
  updatePreview();
  renderReadingListBooks();
}

document.querySelectorAll("[data-avatar]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedAvatar = button.dataset.avatar;
    document.querySelectorAll("[data-avatar]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    updatePreview();
  });
});

document.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    document.querySelectorAll("[data-color]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    updatePreview();
  });
});

profileDisplayName.addEventListener("input", updatePreview);
profileAvatarUrl.addEventListener("input", updatePreview);
profileBio.addEventListener("input", updatePreview);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const button = document.querySelector("#save-profile-button");
  const displayName = profileDisplayName.value.trim();
  const avatarUrl = profileAvatarUrl.value.trim();
  const bio = profileBio.value.trim();

  if (!displayName) {
    profileMessage.textContent = "enter a display name.";
    return;
  }

  button.disabled = true;
  button.textContent = "saving...";
  profileMessage.textContent = "";

  try {
    const profileData = {
      displayName,
      avatarEmoji: selectedAvatar,
      avatarColor: selectedColor,
      avatarUrl,
      bio,
      favoriteBookIds: [...favoriteBookIds],
      tbrBookIds: [...tbrBookIds],
      currentlyReadingBookIds: [...currentlyReadingBookIds],
      updatedAt: serverTimestamp()
    };
    if (!profileExists) profileData.createdAt = serverTimestamp();

    await setDoc(doc(db, "profiles", currentUser.uid), profileData, { merge: true });
    profileExists = true;
    showToast("your profile was saved.");
  } catch (error) {
    console.error(error);
    profileMessage.textContent =
      `your profile could not be saved (${error?.code || "unknown error"}).`;
  } finally {
    button.disabled = false;
    button.textContent = "save profile";
  }
});

document.querySelector("#reader-signout-button").addEventListener("click", () => signOut(auth));

async function loadBooks() {
  const snapshot = await getDocs(collection(db, "books"));
  books = snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  renderReadingListBooks();
  updatePreview();
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  authView.hidden = Boolean(user);
  profileView.hidden = !user;
  publicProfileLink.hidden = !user;

  loansUnsubscribe?.();
  suggestionsUnsubscribe?.();
  loansUnsubscribe = null;
  suggestionsUnsubscribe = null;
  latestLoans = [];
  latestSuggestions = [];

  if (user) {
    try {
      subscribeToLibraryActivity(user);
      await Promise.all([loadBooks(), loadProfile(user)]);
      if (returnPage && allowedReturnPages.has(returnPage)) {
        window.location.href = returnPage;
      }
    } catch (error) {
      console.error(error);
      profileMessage.textContent = "your profile could not be loaded.";
    }
  } else {
    renderMyLoans([], []);
  }
});
