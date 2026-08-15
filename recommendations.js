import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

const loginView = document.querySelector("#recommendations-login-view");
const recommendationsView = document.querySelector("#recommendations-view");
const signoutButton = document.querySelector("#recommendations-signout-button");
const unreadCount = document.querySelector("#unread-recommendation-count");
const receivedPanel = document.querySelector("#received-panel");
const sentPanel = document.querySelector("#sent-panel");
const composePanel = document.querySelector("#compose-panel");
const receivedList = document.querySelector("#received-recommendations");
const sentList = document.querySelector("#sent-recommendations");
const receivedEmpty = document.querySelector("#received-empty");
const sentEmpty = document.querySelector("#sent-empty");
const statusFilter = document.querySelector("#received-status-filter");
const sentComposeButton = document.querySelector("#sent-compose-button");
const form = document.querySelector("#recommendation-form");
const friendSelect = document.querySelector("#recommendation-friend");
const bookSelect = document.querySelector("#recommendation-book");
const noteInput = document.querySelector("#recommendation-note");
const sendButton = document.querySelector("#send-recommendation-button");
const formMessage = document.querySelector("#recommendation-form-message");
const toast = document.querySelector("#recommendations-toast");

let currentUser = null;
let currentProfile = null;
let profiles = [];
let books = [];
let received = [];
let sent = [];
let unsubscribeProfiles = null;
let unsubscribeBooks = null;
let unsubscribeReceived = null;
let unsubscribeSent = null;
let initialSelectionApplied = false;

const params = new URLSearchParams(window.location.search);
const requestedFriendId = params.get("to") || "";
const requestedBookId =
  params.get("book") ||
  sessionStorage.getItem("inkIvyRecommendationBookId") ||
  "";

sessionStorage.removeItem("inkIvyRecommendationBookId");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "just now";
  return timestamp.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toLowerCase();
}

function avatarMarkup(person) {
  if (person?.avatarUrl) {
    return `<img src="${escapeHtml(person.avatarUrl)}" alt="">`;
  }
  return escapeHtml(person?.avatarEmoji || "📚");
}

function timestampValue(timestamp) {
  return timestamp?.seconds || 0;
}

function setTab(name) {
  document.querySelectorAll("[data-recommendation-tab]").forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.recommendationTab === name
    );
  });

  receivedPanel.hidden = name !== "received";
  sentPanel.hidden = name !== "sent";
  composePanel.hidden = name !== "compose";
}

document.querySelectorAll("[data-recommendation-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    setTab(tab.dataset.recommendationTab);
  });
});

sentComposeButton.addEventListener("click", () => setTab("compose"));

function populateFriendSelect() {
  const current = friendSelect.value;
  friendSelect.innerHTML = '<option value="">choose a friend</option>';

  profiles
    .filter((profile) => profile.id !== currentUser?.uid)
    .sort((a, b) =>
      String(a.displayName || "").localeCompare(String(b.displayName || ""))
    )
    .forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.displayName || "reader";
      friendSelect.appendChild(option);
    });

  if (profiles.some((profile) => profile.id === current)) {
    friendSelect.value = current;
  }
}

function populateBookSelect() {
  const current = bookSelect.value;
  bookSelect.innerHTML = '<option value="">choose a book</option>';

  books
    .slice()
    .sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    )
    .forEach((book) => {
      const option = document.createElement("option");
      option.value = book.id;
      option.textContent =
        `${book.title} — ${book.author || "unknown author"}`;
      bookSelect.appendChild(option);
    });

  if (books.some((book) => book.id === current)) {
    bookSelect.value = current;
  }
}

function applyInitialSelections() {
  if (initialSelectionApplied) return;

  let appliedSomething = false;

  if (
    requestedFriendId &&
    profiles.some(
      (profile) =>
        profile.id === requestedFriendId &&
        profile.id !== currentUser?.uid
    )
  ) {
    friendSelect.value = requestedFriendId;
    appliedSomething = true;
  }

  if (
    requestedBookId &&
    books.some((book) => book.id === requestedBookId)
  ) {
    bookSelect.value = requestedBookId;
    appliedSomething = true;
  }

  const friendReady =
    !requestedFriendId || friendSelect.value === requestedFriendId;
  const bookReady =
    !requestedBookId || bookSelect.value === requestedBookId;

  if (friendReady && bookReady) {
    initialSelectionApplied = true;
    if (appliedSomething) {
      setTab("compose");
      window.setTimeout(() => noteInput.focus(), 50);
    }
  }
}

function statusLabel(status) {
  if (status === "saved") return "added to tbr";
  if (status === "dismissed") return "dismissed";
  if (status === "read") return "read";
  return "new";
}

function coverMarkup(item) {
  if (item.bookCoverUrl) {
    return `<img src="${escapeHtml(item.bookCoverUrl)}" alt="cover of ${escapeHtml(item.bookTitle)}">`;
  }

  return `<span>📖<br><small>${escapeHtml(item.bookTitle || "book")}</small></span>`;
}

async function changeStatus(item, status) {
  try {
    await updateDoc(doc(db, "recommendations", item.id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    showToast("the recommendation could not be updated.");
  }
}

async function addToTbr(item) {
  if (!currentUser) return;

  try {
    await updateDoc(doc(db, "profiles", currentUser.uid), {
      tbrBookIds: arrayUnion(item.bookId),
      updatedAt: serverTimestamp()
    });

    await changeStatus(item, "saved");
    showToast(`${item.bookTitle} was added to your tbr.`);
  } catch (error) {
    console.error(error);
    showToast("the book could not be added to your tbr.");
  }
}

function twoClickDelete(button, action) {
  if (button.dataset.confirmDelete === "true") {
    action();
    return;
  }

  button.dataset.confirmDelete = "true";
  const original = button.textContent;
  button.textContent = "click again to remove";

  window.setTimeout(() => {
    button.dataset.confirmDelete = "false";
    button.textContent = original;
  }, 4000);
}

function receivedCard(item) {
  const card = document.createElement("article");
  card.className =
    `recommendation-card ${item.status === "unread" ? "unread" : ""}`;

  card.innerHTML = `
    <div class="recommendation-cover">${coverMarkup(item)}</div>
    <div>
      <div class="recommendation-card-top">
        <div class="recommendation-person">
          <span class="avatar" style="--avatar-color:${escapeHtml(item.senderAvatarColor || "#e8b8c5")}">
            ${avatarMarkup({
              avatarUrl: item.senderAvatarUrl,
              avatarEmoji: item.senderAvatarEmoji
            })}
          </span>
          <span>
            <strong>${escapeHtml(item.senderName || "a friend")}</strong>
            <small>picked this for you · ${formatDate(item.createdAt)}</small>
          </span>
        </div>
        <span class="status-pill">${statusLabel(item.status)}</span>
      </div>

      <h3 class="recommendation-book-title">${escapeHtml(item.bookTitle)}</h3>
      <p class="recommendation-author">by ${escapeHtml(item.bookAuthor || "unknown author")}</p>
      <div class="recommendation-note">${escapeHtml(item.note)}</div>

      <div class="recommendation-actions">
        <a class="main-action" href="index.html?book=${encodeURIComponent(item.bookId)}">view book</a>
        <button class="main-action" type="button" data-add-tbr>add to tbr</button>
        ${item.status === "unread" ? '<button type="button" data-mark-read>mark read</button>' : ""}
        ${item.status !== "dismissed" ? '<button type="button" data-dismiss>dismiss</button>' : ""}
        <button class="danger-action" type="button" data-delete>remove</button>
      </div>
    </div>
  `;

  card.querySelector("[data-add-tbr]").addEventListener(
    "click",
    () => addToTbr(item)
  );
  card.querySelector("[data-mark-read]")?.addEventListener(
    "click",
    () => changeStatus(item, "read")
  );
  card.querySelector("[data-dismiss]")?.addEventListener(
    "click",
    () => changeStatus(item, "dismissed")
  );
  card.querySelector("[data-delete]").addEventListener(
    "click",
    (event) => {
      twoClickDelete(event.currentTarget, async () => {
        try {
          await deleteDoc(doc(db, "recommendations", item.id));
          showToast("the recommendation was removed.");
        } catch (error) {
          console.error(error);
          showToast("the recommendation could not be removed.");
        }
      });
    }
  );

  return card;
}

function sentCard(item) {
  const card = document.createElement("article");
  card.className = "recommendation-card";

  card.innerHTML = `
    <div class="recommendation-cover">${coverMarkup(item)}</div>
    <div>
      <div class="recommendation-card-top">
        <div class="recommendation-person">
          <span class="avatar" style="--avatar-color:${escapeHtml(item.recipientAvatarColor || "#e8b8c5")}">
            ${avatarMarkup({
              avatarUrl: item.recipientAvatarUrl,
              avatarEmoji: item.recipientAvatarEmoji
            })}
          </span>
          <span>
            <strong>for ${escapeHtml(item.recipientName || "a friend")}</strong>
            <small>sent ${formatDate(item.createdAt)}</small>
          </span>
        </div>
        <span class="status-pill">${statusLabel(item.status)}</span>
      </div>

      <h3 class="recommendation-book-title">${escapeHtml(item.bookTitle)}</h3>
      <p class="recommendation-author">by ${escapeHtml(item.bookAuthor || "unknown author")}</p>
      <div class="recommendation-note">${escapeHtml(item.note)}</div>

      <div class="recommendation-actions">
        <a class="main-action" href="index.html?book=${encodeURIComponent(item.bookId)}">view book</a>
        <button class="danger-action" type="button" data-delete>remove from sent</button>
      </div>
    </div>
  `;

  card.querySelector("[data-delete]").addEventListener(
    "click",
    (event) => {
      twoClickDelete(event.currentTarget, async () => {
        try {
          await deleteDoc(doc(db, "recommendations", item.id));
          showToast("the sent recommendation was removed.");
        } catch (error) {
          console.error(error);
          showToast("the recommendation could not be removed.");
        }
      });
    }
  );

  return card;
}

function renderReceived() {
  const filter = statusFilter.value;
  const visible = received.filter((item) => {
    if (filter === "all") return true;
    if (filter === "active") return item.status !== "dismissed";
    return item.status === filter;
  });

  receivedList.innerHTML = "";
  receivedEmpty.hidden = visible.length !== 0;
  visible.forEach((item) => receivedList.appendChild(receivedCard(item)));

  unreadCount.textContent =
    received.filter((item) => item.status === "unread").length;
}

function renderSent() {
  sentList.innerHTML = "";
  sentEmpty.hidden = sent.length !== 0;
  sent.forEach((item) => sentList.appendChild(sentCard(item)));
}

statusFilter.addEventListener("change", renderReceived);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !currentProfile) return;

  const recipient = profiles.find(
    (profile) => profile.id === friendSelect.value
  );
  const book = books.find((item) => item.id === bookSelect.value);
  const note = noteInput.value.trim();

  if (!recipient || recipient.id === currentUser.uid) {
    formMessage.textContent = "choose a friend.";
    return;
  }
  if (!book) {
    formMessage.textContent = "choose a book.";
    return;
  }
  if (!note) {
    formMessage.textContent = "write a note for your friend.";
    return;
  }

  sendButton.disabled = true;
  sendButton.textContent = "sending...";
  formMessage.textContent = "";

  try {
    await addDoc(collection(db, "recommendations"), {
      senderId: currentUser.uid,
      senderName: currentProfile.displayName || "reader",
      senderAvatarEmoji: currentProfile.avatarEmoji || "📚",
      senderAvatarColor: currentProfile.avatarColor || "#e8b8c5",
      senderAvatarUrl: currentProfile.avatarUrl || "",
      recipientId: recipient.id,
      recipientName: recipient.displayName || "reader",
      recipientAvatarEmoji: recipient.avatarEmoji || "📚",
      recipientAvatarColor: recipient.avatarColor || "#e8b8c5",
      recipientAvatarUrl: recipient.avatarUrl || "",
      bookId: book.id,
      bookTitle: book.title || "",
      bookAuthor: book.author || "",
      bookCoverUrl: book.coverUrl || "",
      note,
      status: "unread",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const recipientName = recipient.displayName || "your friend";
    form.reset();
    populateFriendSelect();
    populateBookSelect();
    formMessage.textContent = "";
    showToast(`your recommendation was sent to ${recipientName}.`);
    setTab("sent");
  } catch (error) {
    console.error(error);
    formMessage.textContent =
      `the recommendation could not be sent (${error?.code || "unknown error"}).`;
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "send recommendation";
  }
});

function stopListeners() {
  [
    unsubscribeProfiles,
    unsubscribeBooks,
    unsubscribeReceived,
    unsubscribeSent
  ].forEach((unsubscribe) => unsubscribe?.());

  unsubscribeProfiles =
    unsubscribeBooks =
    unsubscribeReceived =
    unsubscribeSent =
      null;
}

async function startForUser(user) {
  const profileDocument = await getDoc(doc(db, "profiles", user.uid));

  if (!profileDocument.exists()) {
    window.location.href = "reader.html";
    return;
  }

  currentProfile = profileDocument.data();

  unsubscribeProfiles = onSnapshot(
    collection(db, "profiles"),
    (snapshot) => {
      profiles = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      populateFriendSelect();
      applyInitialSelections();
    }
  );

  unsubscribeBooks = onSnapshot(
    collection(db, "books"),
    (snapshot) => {
      books = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      populateBookSelect();
      applyInitialSelections();
    }
  );

  unsubscribeReceived = onSnapshot(
    query(
      collection(db, "recommendations"),
      where("recipientId", "==", user.uid)
    ),
    (snapshot) => {
      received = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort(
          (a, b) =>
            timestampValue(b.createdAt) - timestampValue(a.createdAt)
        );
      renderReceived();
    },
    (error) => {
      console.error(error);
      receivedEmpty.hidden = false;
      receivedEmpty.textContent =
        "your recommendations could not be loaded.";
    }
  );

  unsubscribeSent = onSnapshot(
    query(
      collection(db, "recommendations"),
      where("senderId", "==", user.uid)
    ),
    (snapshot) => {
      sent = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort(
          (a, b) =>
            timestampValue(b.createdAt) - timestampValue(a.createdAt)
        );
      renderSent();
    },
    (error) => {
      console.error(error);
      sentEmpty.hidden = false;
      sentEmpty.textContent =
        "your sent recommendations could not be loaded.";
    }
  );
}

signoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  recommendationsView.hidden = !user;
  signoutButton.hidden = !user;

  stopListeners();
  currentProfile = null;
  profiles = [];
  books = [];
  received = [];
  sent = [];
  initialSelectionApplied = false;

  if (user) {
    try {
      await startForUser(user);
    } catch (error) {
      console.error(error);
      showToast("friend picks could not be opened.");
    }
  }
});
