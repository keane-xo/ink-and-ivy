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

const DEFAULT_SETTINGS = {
  title: "my reading journal",
  subtitle: "thoughts between the pages",
  coverColor: "#6f8068",
  accentColor: "#f0d9a8",
  pattern: "ivy",
  emblem: "🌿"
};

const loginView = document.querySelector("#journal-login-view");
const journalView = document.querySelector("#journal-view");
const signoutButton = document.querySelector("#journal-signout-button");
const coverStage = document.querySelector("#cover-stage");
const openJournalView = document.querySelector("#open-journal-view");
const journalCover = document.querySelector("#journal-cover");
const coverEmblem = document.querySelector("#cover-emblem");
const coverTitle = document.querySelector("#cover-title");
const coverSubtitle = document.querySelector("#cover-subtitle");
const coverOwner = document.querySelector("#cover-owner");
const toolbarJournalTitle = document.querySelector("#toolbar-journal-title");
const openJournalButton = document.querySelector("#open-journal-button");
const closeJournalButton = document.querySelector("#close-journal-button");
const customizeCoverButton = document.querySelector("#customize-cover-button");
const customizeCoverInsideButton = document.querySelector("#customize-cover-inside-button");
const newEntryButton = document.querySelector("#new-entry-button");
const blankPageNewEntry = document.querySelector("#blank-page-new-entry");
const entryCount = document.querySelector("#entry-count");
const entryList = document.querySelector("#entry-list");
const entryListEmpty = document.querySelector("#entry-list-empty");
const typeFilter = document.querySelector("#journal-type-filter");
const bookFilter = document.querySelector("#journal-book-filter");
const journalSearch = document.querySelector("#journal-search");
const blankPage = document.querySelector("#blank-page");
const entryReadingView = document.querySelector("#entry-reading-view");
const entryDisplay = document.querySelector("#entry-display");
const displayEntryDate = document.querySelector("#display-entry-date");
const displayEntryTitle = document.querySelector("#display-entry-title");
const displayEntryBook = document.querySelector("#display-entry-book");
const displayEntryBody = document.querySelector("#display-entry-body");
const displayEntryMeta = document.querySelector("#display-entry-meta");
const editEntryButton = document.querySelector("#edit-entry-button");
const deleteEntryButton = document.querySelector("#delete-entry-button");
const shareEntryButton = document.querySelector("#share-entry-button");
const rightPageNumber = document.querySelector("#right-page-number");

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
const entryWordCount = document.querySelector("#entry-word-count");

const coverModal = document.querySelector("#cover-modal");
const coverPreview = document.querySelector("#cover-preview");
const previewCoverEmblem = document.querySelector("#preview-cover-emblem");
const previewCoverTitle = document.querySelector("#preview-cover-title");
const previewCoverSubtitle = document.querySelector("#preview-cover-subtitle");
const previewCoverOwner = document.querySelector("#preview-cover-owner");
const coverSettingsForm = document.querySelector("#cover-settings-form");
const coverTitleInput = document.querySelector("#cover-title-input");
const coverSubtitleInput = document.querySelector("#cover-subtitle-input");
const coverEmblemInput = document.querySelector("#cover-emblem-input");
const saveCoverButton = document.querySelector("#save-cover-button");
const coverFormMessage = document.querySelector("#cover-form-message");
const toast = document.querySelector("#journal-toast");

let currentUser = null;
let currentProfile = null;
let books = [];
let entries = [];
let selectedEntryId = "";
let unsubscribeEntries = null;
let settingsExist = false;
let journalSettings = { ...DEFAULT_SETTINGS };
let draftSettings = { ...DEFAULT_SETTINGS };

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

function formatDate(timestamp, short = false) {
  if (!timestamp?.toDate) return "just now";
  const options = short
    ? { month: "short", day: "numeric" }
    : {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      };

  return timestamp.toDate().toLocaleString([], options).toLowerCase();
}

function profileSnapshot() {
  return {
    displayName: currentProfile?.displayName || "reader",
    avatarEmoji: currentProfile?.avatarEmoji || "📚",
    avatarColor: currentProfile?.avatarColor || "#e8b8c5",
    avatarUrl: currentProfile?.avatarUrl || ""
  };
}

function ownerLabel() {
  const displayName = currentProfile?.displayName?.trim();
  return displayName
    ? `${displayName}'s private journal`
    : "a private ink and ivy journal";
}

function applyCoverAppearance(element, settings) {
  element.style.setProperty("--cover-color", settings.coverColor);
  element.style.setProperty("--cover-accent", settings.accentColor);
  element.dataset.pattern = settings.pattern;
}

function renderCover() {
  applyCoverAppearance(journalCover, journalSettings);
  coverEmblem.textContent = journalSettings.emblem;
  coverTitle.textContent = journalSettings.title;
  coverSubtitle.textContent = journalSettings.subtitle;
  coverOwner.textContent = ownerLabel();
  toolbarJournalTitle.textContent = journalSettings.title;
}

function renderCoverPreview() {
  applyCoverAppearance(coverPreview, draftSettings);
  previewCoverEmblem.textContent = draftSettings.emblem;
  previewCoverTitle.textContent = draftSettings.title || "my reading journal";
  previewCoverSubtitle.textContent =
    draftSettings.subtitle || "thoughts between the pages";
  previewCoverOwner.textContent = ownerLabel();

  document.querySelectorAll("[data-cover-color]").forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.coverColor === draftSettings.coverColor
    );
  });

  document.querySelectorAll("[data-accent-color]").forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.accentColor === draftSettings.accentColor
    );
  });

  document.querySelectorAll("[data-cover-pattern]").forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.coverPattern === draftSettings.pattern
    );
  });
}

function openCoverCustomizer() {
  draftSettings = { ...journalSettings };
  coverTitleInput.value = draftSettings.title;
  coverSubtitleInput.value = draftSettings.subtitle;
  coverEmblemInput.value = draftSettings.emblem;
  coverFormMessage.textContent = "";
  renderCoverPreview();
  coverModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeCoverCustomizer() {
  coverModal.hidden = true;
  document.body.classList.remove("modal-open");
  coverFormMessage.textContent = "";
}

customizeCoverButton.addEventListener("click", openCoverCustomizer);
customizeCoverInsideButton.addEventListener("click", openCoverCustomizer);

document.querySelectorAll("[data-close-cover-modal]").forEach((element) => {
  element.addEventListener("click", closeCoverCustomizer);
});

document.querySelectorAll("[data-cover-color]").forEach((button) => {
  button.addEventListener("click", () => {
    draftSettings.coverColor = button.dataset.coverColor;
    renderCoverPreview();
  });
});

document.querySelectorAll("[data-accent-color]").forEach((button) => {
  button.addEventListener("click", () => {
    draftSettings.accentColor = button.dataset.accentColor;
    renderCoverPreview();
  });
});

document.querySelectorAll("[data-cover-pattern]").forEach((button) => {
  button.addEventListener("click", () => {
    draftSettings.pattern = button.dataset.coverPattern;
    renderCoverPreview();
  });
});

coverTitleInput.addEventListener("input", () => {
  draftSettings.title =
    coverTitleInput.value.trimStart().slice(0, 40) || "my reading journal";
  renderCoverPreview();
});

coverSubtitleInput.addEventListener("input", () => {
  draftSettings.subtitle =
    coverSubtitleInput.value.trimStart().slice(0, 80) ||
    "thoughts between the pages";
  renderCoverPreview();
});

coverEmblemInput.addEventListener("change", () => {
  draftSettings.emblem = coverEmblemInput.value;
  renderCoverPreview();
});

coverSettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  saveCoverButton.disabled = true;
  saveCoverButton.textContent = "saving...";
  coverFormMessage.textContent = "";

  try {
    const data = {
      userId: currentUser.uid,
      title: (coverTitleInput.value.trim() || "my reading journal").slice(0, 40),
      subtitle: (
        coverSubtitleInput.value.trim() || "thoughts between the pages"
      ).slice(0, 80),
      coverColor: draftSettings.coverColor,
      accentColor: draftSettings.accentColor,
      pattern: draftSettings.pattern,
      emblem: draftSettings.emblem,
      updatedAt: serverTimestamp()
    };

    if (!settingsExist) data.createdAt = serverTimestamp();

    await setDoc(
      doc(db, "profiles", currentUser.uid, "journalSettings", "preferences"),
      data,
      { merge: true }
    );

    settingsExist = true;
    journalSettings = { ...draftSettings, title: data.title, subtitle: data.subtitle };
    renderCover();
    closeCoverCustomizer();
    showToast("your journal cover was saved.");
  } catch (error) {
    console.error(error);
    coverFormMessage.textContent =
      `the cover could not be saved (${error?.code || "unknown error"}).`;
  } finally {
    saveCoverButton.disabled = false;
    saveCoverButton.textContent = "save cover";
  }
});

function openJournal() {
  coverStage.hidden = true;
  openJournalView.hidden = false;
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeJournal() {
  openJournalView.hidden = true;
  coverStage.hidden = false;
  showReadingView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

openJournalButton.addEventListener("click", openJournal);
closeJournalButton.addEventListener("click", closeJournal);

function populateBooks() {
  const selectedEntryBook = entryBook.value;
  const selectedFilterBook = bookFilter.value;

  entryBook.innerHTML = '<option value="">choose a book</option>';
  bookFilter.innerHTML = '<option value="all">all books</option>';

  books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = `${book.title} — ${book.author || "unknown author"}`;
    entryBook.appendChild(option);

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

function visibleEntries() {
  const selectedType = typeFilter.value;
  const selectedBook = bookFilter.value;
  const search = journalSearch.value.trim().toLowerCase();

  return entries.filter((entry) => {
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
}

function activeEntry() {
  return entries.find((entry) => entry.id === selectedEntryId) || null;
}

function renderEntryList() {
  const visible = visibleEntries();
  entryList.innerHTML = "";
  entryListEmpty.hidden = visible.length !== 0;
  entryCount.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  if (!visible.length) {
    entryListEmpty.textContent = entries.length
      ? "no journal entries match those filters."
      : "your journal is waiting for its first entry.";
  }

  visible.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "entry-list-button";
    button.classList.toggle("active", entry.id === selectedEntryId);
    button.innerHTML = `
      <span>
        <strong>${escapeHtml(
          entry.title ||
          `${entry.entryType || "journal entry"} · ${entry.bookTitle || "book"}`
        )}</strong>
        <small>${escapeHtml(entry.bookTitle || "book")} · ${escapeHtml(entry.entryType || "thoughts")}</small>
      </span>
      <time>${formatDate(entry.updatedAt || entry.createdAt, true)}</time>
    `;

    button.addEventListener("click", () => {
      selectedEntryId = entry.id;
      showReadingView();
      renderEntryList();
      renderActivePage();
    });

    entryList.appendChild(button);
  });
}

function showReadingView() {
  entryForm.hidden = true;
  entryReadingView.hidden = false;
  entryFormMessage.textContent = "";
}

function showEditor() {
  entryReadingView.hidden = true;
  entryForm.hidden = false;
  window.setTimeout(() => entryBody.focus(), 50);
}

function resetEntryForm() {
  entryForm.reset();
  editingEntryId.value = "";
  entryFormTitle.textContent = "new journal entry";
  saveEntryButton.textContent = "save privately";
  entryFormMessage.textContent = "";
  updateWordCount();
}

function startNewEntry() {
  resetEntryForm();
  rightPageNumber.textContent = entries.length + 1;
  showEditor();
}

newEntryButton.addEventListener("click", startNewEntry);
blankPageNewEntry.addEventListener("click", startNewEntry);

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
  updateWordCount();
  showEditor();
}

cancelEntryEdit.addEventListener("click", () => {
  resetEntryForm();
  showReadingView();
  renderActivePage();
});

function updateWordCount() {
  const text = entryBody.value.trim();
  const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
  entryWordCount.textContent = `${count} ${count === 1 ? "word" : "words"}`;
}

entryBody.addEventListener("input", updateWordCount);

function renderActivePage() {
  if (!openJournalView || openJournalView.hidden) return;

  const entry = activeEntry();
  const index = entry
    ? Math.max(0, entries.findIndex((item) => item.id === entry.id))
    : 0;

  rightPageNumber.textContent = entry ? index + 1 : entries.length + 1;

  if (!entry) {
    blankPage.hidden = false;
    entryDisplay.hidden = true;
    return;
  }

  blankPage.hidden = true;
  entryDisplay.hidden = false;

  displayEntryDate.textContent = formatDate(entry.updatedAt || entry.createdAt);
  displayEntryTitle.textContent =
    entry.title || `${entry.entryType || "journal entry"}`;
  displayEntryBook.textContent = `${entry.bookTitle || "book"}${
    entry.progress ? ` · ${entry.progress}` : ""
  }`;
  displayEntryBody.textContent = entry.body || "";

  const rating = Number(entry.rating || 0);
  displayEntryMeta.innerHTML = `
    <span class="pill">${escapeHtml(entry.entryType || "thoughts")}</span>
    ${rating ? `<span class="pill">${"★".repeat(rating)}</span>` : ""}
    ${entry.spoiler ? '<span class="pill">spoilers</span>' : ""}
    ${entry.sharedAt ? '<span class="pill">shared</span>' : ""}
  `;

  shareEntryButton.textContent = entry.sharedPostId
    ? "share again"
    : "share to community";
}

function renderAll() {
  renderEntryList();
  renderActivePage();
}

[typeFilter, bookFilter, journalSearch].forEach((element) => {
  element.addEventListener("input", renderEntryList);
  element.addEventListener("change", renderEntryList);
});

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const selectedBook = books.find((book) => book.id === entryBook.value);
  const body = entryBody.value.trim();

  if (!selectedBook) {
    entryFormMessage.textContent = "choose a book for this page.";
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
      selectedEntryId = editingEntryId.value;
      showToast("your journal page was updated.");
    } else {
      const reference = await addDoc(
        collection(db, "profiles", currentUser.uid, "journalEntries"),
        {
          ...data,
          sharedPostId: "",
          createdAt: serverTimestamp()
        }
      );
      selectedEntryId = reference.id;
      showToast("your journal page was saved privately.");
    }

    resetEntryForm();
    showReadingView();
  } catch (error) {
    console.error(error);
    entryFormMessage.textContent =
      `the page could not be saved (${error?.code || "unknown error"}).`;
  } finally {
    saveEntryButton.disabled = false;
    saveEntryButton.textContent = "save privately";
  }
});

editEntryButton.addEventListener("click", () => {
  const entry = activeEntry();
  if (entry) beginEdit(entry);
});

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

deleteEntryButton.addEventListener("click", (event) => {
  const entry = activeEntry();
  if (!entry) return;

  twoClickDelete(event.currentTarget, async () => {
    try {
      await deleteDoc(
        doc(db, "profiles", currentUser.uid, "journalEntries", entry.id)
      );
      selectedEntryId = "";
      showToast("your journal page was deleted.");
    } catch (error) {
      console.error(error);
      showToast("the page could not be deleted.");
    }
  });
});

function statusForPost(entry) {
  if (entry.entryType === "progress") return "currently reading";
  if (entry.entryType === "final review") return "review";
  return "book thoughts";
}

shareEntryButton.addEventListener("click", async () => {
  const entry = activeEntry();
  if (!entry || !currentUser || !currentProfile) return;

  shareEntryButton.disabled = true;
  shareEntryButton.textContent = "sharing...";

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

    showToast("your journal page was shared to the community.");
  } catch (error) {
    console.error(error);
    showToast("the page could not be shared.");
  } finally {
    shareEntryButton.disabled = false;
    shareEntryButton.textContent = entry.sharedPostId
      ? "share again"
      : "share to community";
  }
});

async function loadJournalData(user) {
  const [profileDocument, booksSnapshot, settingsDocument] = await Promise.all([
    getDoc(doc(db, "profiles", user.uid)),
    getDocs(collection(db, "books")),
    getDoc(doc(db, "profiles", user.uid, "journalSettings", "preferences"))
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

  settingsExist = settingsDocument.exists();
  journalSettings = settingsExist
    ? { ...DEFAULT_SETTINGS, ...settingsDocument.data() }
    : { ...DEFAULT_SETTINGS };

  populateBooks();
  renderCover();

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

      if (
        selectedEntryId &&
        !entries.some((entry) => entry.id === selectedEntryId)
      ) {
        selectedEntryId = "";
      }

      if (!selectedEntryId && entries.length) {
        selectedEntryId = entries[0].id;
      }

      renderAll();
    },
    (error) => {
      console.error(error);
      entryListEmpty.hidden = false;
      entryListEmpty.textContent = "your journal could not be loaded.";
    }
  );
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !coverModal.hidden) {
    closeCoverCustomizer();
  }
});

signoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  journalView.hidden = !user;
  signoutButton.hidden = !user;

  unsubscribeEntries?.();
  unsubscribeEntries = null;
  entries = [];
  selectedEntryId = "";

  if (user) {
    try {
      await loadJournalData(user);
    } catch (error) {
      console.error(error);
      showToast("your journal could not be opened.");
    }
  }
});
