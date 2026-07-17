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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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

const loginView = document.querySelector("#journal-login-view");
const journalView = document.querySelector("#journal-view");
const signoutButton = document.querySelector("#journal-signout-button");
const launcherAvatar = document.querySelector("#launcher-avatar");
const openEntryButton = document.querySelector("#open-entry-button");
const entryLauncher = document.querySelector("#entry-launcher");
const entryModal = document.querySelector("#entry-modal");
const entryForm = document.querySelector("#entry-form");
const editingEntryId = document.querySelector("#editing-entry-id");
const entryFormTitle = document.querySelector("#entry-form-title");
const entryBook = document.querySelector("#entry-book");
const entryType = document.querySelector("#entry-type");
const entryTitle = document.querySelector("#entry-title");
const entryBody = document.querySelector("#entry-body");
const entryProgress = document.querySelector("#entry-progress");
const entryRating = document.querySelector("#entry-rating");
const entrySpoiler = document.querySelector("#entry-spoiler");
const saveEntryButton = document.querySelector("#save-entry-button");
const cancelEntryEdit = document.querySelector("#cancel-entry-edit");
const entryFormMessage = document.querySelector("#entry-form-message");
const journalEntries = document.querySelector("#journal-entries");
const journalEmpty = document.querySelector("#journal-empty");
const typeFilter = document.querySelector("#journal-type-filter");
const bookFilter = document.querySelector("#journal-book-filter");
const journalSearch = document.querySelector("#journal-search");
const toast = document.querySelector("#journal-toast");

let currentUser = null;
let currentProfile = null;
let books = [];
let entries = [];
let unsubscribeEntries = null;

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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).toLowerCase();
}

function avatarMarkup(profile) {
  if (profile?.avatarUrl) {
    return `<img src="${escapeHtml(profile.avatarUrl)}" alt="">`;
  }
  return escapeHtml(profile?.avatarEmoji || "📚");
}

function setLauncherAvatar() {
  launcherAvatar.style.setProperty(
    "--avatar-color",
    currentProfile?.avatarColor || "#e8b8c5"
  );
  launcherAvatar.innerHTML = avatarMarkup(currentProfile);
}

function profileSnapshot() {
  return {
    displayName: currentProfile?.displayName || "reader",
    avatarEmoji: currentProfile?.avatarEmoji || "📚",
    avatarColor: currentProfile?.avatarColor || "#e8b8c5",
    avatarUrl: currentProfile?.avatarUrl || ""
  };
}

function populateBooks() {
  const selectedEntryBook = entryBook.value;
  const selectedFilterBook = bookFilter.value;

  entryBook.innerHTML = '<option value="">choose a book</option>';
  bookFilter.innerHTML = '<option value="all">all books</option>';

  books.forEach((book) => {
    const entryOption = document.createElement("option");
    entryOption.value = book.id;
    entryOption.textContent = `${book.title} — ${book.author || "unknown author"}`;
    entryBook.appendChild(entryOption);

    const filterOption = document.createElement("option");
    filterOption.value = book.id;
    filterOption.textContent = book.title;
    bookFilter.appendChild(filterOption);
  });

  entryBook.value = books.some((book) => book.id === selectedEntryBook)
    ? selectedEntryBook
    : "";

  bookFilter.value = books.some((book) => book.id === selectedFilterBook)
    ? selectedFilterBook
    : "all";
}

function resetEntryForm() {
  entryForm.reset();
  editingEntryId.value = "";
  entryFormTitle.textContent = "new journal entry";
  saveEntryButton.textContent = "save privately";
  cancelEntryEdit.hidden = true;
  entryFormMessage.textContent = "";
}

function openEntryModal() {
  entryModal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => entryBook.focus(), 50);
}

function closeEntryModal({ reset = true } = {}) {
  entryModal.hidden = true;
  document.body.classList.remove("modal-open");
  if (reset) resetEntryForm();
}

function startNewEntry() {
  resetEntryForm();
  openEntryModal();
}

openEntryButton.addEventListener("click", startNewEntry);
entryLauncher.addEventListener("click", startNewEntry);

document.querySelectorAll("[data-close-entry-modal]").forEach((element) => {
  element.addEventListener("click", () => closeEntryModal());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !entryModal.hidden) {
    closeEntryModal();
  }
});

cancelEntryEdit.addEventListener("click", () => closeEntryModal());

function beginEdit(entry) {
  editingEntryId.value = entry.id;
  entryBook.value = entry.bookId || "";
  entryType.value = entry.entryType || "thoughts";
  entryTitle.value = entry.title || "";
  entryBody.value = entry.body || "";
  entryProgress.value = entry.progress || "";
  entryRating.value = String(entry.rating || 0);
  entrySpoiler.checked = Boolean(entry.spoiler);
  entryFormTitle.textContent = "edit journal entry";
  saveEntryButton.textContent = "save changes";
  cancelEntryEdit.hidden = false;
  openEntryModal();
}

function twoClickDelete(button, action) {
  if (button.dataset.confirmDelete === "true") {
    action();
    return;
  }

  button.dataset.confirmDelete = "true";
  const original = button.textContent;
  button.textContent = "click again to delete";

  window.setTimeout(() => {
    button.dataset.confirmDelete = "false";
    button.textContent = original;
  }, 4000);
}

function statusForPost(entry) {
  if (entry.entryType === "progress") return "currently reading";
  if (entry.entryType === "final review") return "review";
  if (entry.entryType === "prediction") return "book thoughts";
  if (entry.entryType === "quote") return "book thoughts";
  return "book thoughts";
}

async function shareEntry(entry, button) {
  if (!currentUser || !currentProfile) return;

  button.disabled = true;
  button.textContent = "sharing...";

  try {
    const postReference = await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      ...profileSnapshot(),
      title: entry.title || "",
      body: entry.progress
        ? `${entry.body}\n\nreading progress: ${entry.progress}`
        : entry.body,
      imageUrl: "",
      bookId: entry.bookId || "",
      bookTitle: entry.bookTitle || "",
      readingStatus: statusForPost(entry),
      spoiler: Boolean(entry.spoiler),
      bookRelatedConfirmed: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(
      doc(db, "profiles", currentUser.uid, "journalEntries", entry.id),
      {
        sharedAt: serverTimestamp(),
        sharedPostId: postReference.id,
        updatedAt: serverTimestamp()
      }
    );

    showToast("your journal entry was shared to the community.");
  } catch (error) {
    console.error(error);
    showToast("the entry could not be shared.");
  } finally {
    button.disabled = false;
    button.textContent = entry.sharedPostId
      ? "share again"
      : "share to community";
  }
}

function renderEntries() {
  const selectedType = typeFilter.value;
  const selectedBook = bookFilter.value;
  const search = journalSearch.value.trim().toLowerCase();

  const visible = entries.filter((entry) => {
    const matchesType =
      selectedType === "all" || entry.entryType === selectedType;
    const matchesBook =
      selectedBook === "all" || entry.bookId === selectedBook;
    const searchable = [
      entry.title,
      entry.body,
      entry.bookTitle,
      entry.progress,
      entry.entryType
    ].join(" ").toLowerCase();

    return matchesType && matchesBook && searchable.includes(search);
  });

  journalEntries.innerHTML = "";
  journalEmpty.hidden = visible.length !== 0;

  if (!visible.length) {
    journalEmpty.textContent = entries.length
      ? "no journal entries match those filters."
      : "your journal is waiting for its first entry.";
  }

  visible.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "journal-entry";

    const rating = Number(entry.rating || 0);
    const displayTitle =
      entry.title ||
      `${entry.entryType || "journal entry"} · ${entry.bookTitle || "book"}`;

    article.innerHTML = `
      <div class="entry-top">
        <div>
          <h2>${escapeHtml(displayTitle)}</h2>
          <small>${formatDate(entry.updatedAt || entry.createdAt)}</small>
        </div>

        <div class="entry-actions">
          <button class="entry-action" data-edit-entry type="button">edit</button>
          <button class="entry-action" data-delete-entry type="button">delete</button>
        </div>
      </div>

      <div class="entry-content">
        <p class="entry-body">${escapeHtml(entry.body)}</p>

        <div class="entry-meta">
          <span class="pill">${escapeHtml(entry.entryType || "thoughts")}</span>
          <span class="pill">📖 ${escapeHtml(entry.bookTitle || "book")}</span>
          ${entry.progress ? `<span class="pill">${escapeHtml(entry.progress)}</span>` : ""}
          ${rating ? `<span class="pill">${"★".repeat(rating)}</span>` : ""}
          ${entry.spoiler ? '<span class="pill">spoilers</span>' : ""}
          ${entry.sharedAt ? '<span class="pill entry-shared">shared</span>' : ""}
        </div>
      </div>

      <div class="share-row">
        <p>
          sharing creates a separate community post. your original journal entry
          stays private.
        </p>
        <button class="share-button" data-share-entry type="button">
          ${entry.sharedPostId ? "share again" : "share to community"}
        </button>
      </div>
    `;

    article.querySelector("[data-edit-entry]").addEventListener(
      "click",
      () => beginEdit(entry)
    );

    article.querySelector("[data-delete-entry]").addEventListener(
      "click",
      (event) => {
        twoClickDelete(event.currentTarget, async () => {
          try {
            await deleteDoc(
              doc(
                db,
                "profiles",
                currentUser.uid,
                "journalEntries",
                entry.id
              )
            );
            showToast("your journal entry was deleted.");
          } catch (error) {
            console.error(error);
            showToast("the entry could not be deleted.");
          }
        });
      }
    );

    article.querySelector("[data-share-entry]").addEventListener(
      "click",
      (event) => shareEntry(entry, event.currentTarget)
    );

    journalEntries.appendChild(article);
  });
}

[typeFilter, bookFilter, journalSearch].forEach((element) => {
  element.addEventListener("input", renderEntries);
  element.addEventListener("change", renderEntries);
});

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const selectedBook = books.find((book) => book.id === entryBook.value);
  const body = entryBody.value.trim();

  if (!selectedBook) {
    entryFormMessage.textContent = "choose a book for this entry.";
    return;
  }

  if (!body) {
    entryFormMessage.textContent = "write something before saving.";
    return;
  }

  const data = {
    userId: currentUser.uid,
    bookId: selectedBook.id,
    bookTitle: selectedBook.title || "",
    bookAuthor: selectedBook.author || "",
    entryType: entryType.value,
    title: entryTitle.value.trim(),
    body,
    progress: entryProgress.value.trim(),
    rating: Number(entryRating.value || 0),
    spoiler: entrySpoiler.checked,
    updatedAt: serverTimestamp()
  };

  saveEntryButton.disabled = true;
  saveEntryButton.textContent = editingEntryId.value
    ? "saving..."
    : "saving privately...";
  entryFormMessage.textContent = "";

  try {
    if (editingEntryId.value) {
      await updateDoc(
        doc(
          db,
          "profiles",
          currentUser.uid,
          "journalEntries",
          editingEntryId.value
        ),
        data
      );
      showToast("your journal entry was updated.");
    } else {
      await addDoc(
        collection(db, "profiles", currentUser.uid, "journalEntries"),
        {
          ...data,
          sharedPostId: "",
          createdAt: serverTimestamp()
        }
      );
      showToast("your journal entry was saved privately.");
    }

    closeEntryModal();
  } catch (error) {
    console.error(error);
    entryFormMessage.textContent =
      `the entry could not be saved (${error?.code || "unknown error"}).`;
  } finally {
    saveEntryButton.disabled = false;
    saveEntryButton.textContent = editingEntryId.value
      ? "save changes"
      : "save privately";
  }
});

async function loadReader(user) {
  const [profileDocument, booksSnapshot] = await Promise.all([
    getDoc(doc(db, "profiles", user.uid)),
    getDocs(collection(db, "books"))
  ]);

  if (!profileDocument.exists()) {
    window.location.href = "reader.html";
    return;
  }

  currentProfile = profileDocument.data();
  books = booksSnapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    );

  setLauncherAvatar();
  populateBooks();

  unsubscribeEntries?.();
  unsubscribeEntries = onSnapshot(
    query(
      collection(db, "profiles", user.uid, "journalEntries"),
      orderBy("updatedAt", "desc"),
      limit(150)
    ),
    (snapshot) => {
      entries = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      renderEntries();
    },
    (error) => {
      console.error(error);
      journalEmpty.hidden = false;
      journalEmpty.textContent = "your journal could not be loaded.";
    }
  );
}

signoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  journalView.hidden = !user;
  signoutButton.hidden = !user;

  unsubscribeEntries?.();
  unsubscribeEntries = null;
  entries = [];

  if (user) {
    try {
      await loadReader(user);
    } catch (error) {
      console.error(error);
      journalEmpty.hidden = false;
      journalEmpty.textContent = "your journal could not be opened.";
    }
  }
});
