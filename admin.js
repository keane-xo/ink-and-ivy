import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1dOxo61Z0U9mReJnw7s5Z3x0HFrrfB2k",
  authDomain: "ink-and-ivy-d0ff3.firebaseapp.com",
  projectId: "ink-and-ivy-d0ff3",
  storageBucket: "ink-and-ivy-d0ff3.firebasestorage.app",
  messagingSenderId: "444464034610",
  appId: "1:444464034610:web:de9c2c3a33737ae6849d2b"
};

const ADMIN_UID = "66iUUKyOu7Rvu2I6Hwtdel82b122";

const starterBooks = [
  {
    title: "the hunger games",
    author: "suzanne collins",
    genre: "dystopian",
    status: "available",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg",
    summary: "in a nation divided into districts, katniss everdeen is forced into a televised fight to the death and becomes the center of a much larger struggle.",
    nyaNote: ""
  },
  {
    title: "the inheritance games",
    author: "jennifer lynn barnes",
    genre: "mystery",
    status: "borrowed",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9781368052405-L.jpg",
    summary: "avery grambs unexpectedly inherits a billionaire's fortune, but claiming it means living in a mansion filled with puzzles, secrets, and suspicious heirs.",
    nyaNote: ""
  },
  {
    title: "little women",
    author: "louisa may alcott",
    genre: "classic",
    status: "available",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780147514011-L.jpg",
    summary: "the four march sisters grow through love, hardship, ambition, and family life while learning what kind of women they hope to become.",
    nyaNote: ""
  },
  {
    title: "six of crows",
    author: "leigh bardugo",
    genre: "fantasy",
    status: "available",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9781250076960-L.jpg",
    summary: "a brilliant criminal gathers six dangerous outsiders for an impossible heist that could change their world and make them rich beyond imagining.",
    nyaNote: ""
  },
  {
    title: "the summer i turned pretty",
    author: "jenny han",
    genre: "romance",
    status: "borrowed",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9781416968290-L.jpg",
    summary: "one summer at the beach changes belly's relationships with two brothers she has known all her life and forces everyone to face how much they have changed.",
    nyaNote: ""
  },
  {
    title: "a good girl's guide to murder",
    author: "holly jackson",
    genre: "mystery",
    status: "available",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9781984896360-L.jpg",
    summary: "pip reopens a closed murder case for a school project and discovers that the town's accepted story may be hiding a dangerous truth.",
    nyaNote: ""
  },
  {
    title: "the book thief",
    author: "markus zusak",
    genre: "historical fiction",
    status: "available",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg",
    summary: "during world war ii, a young girl in germany finds comfort and courage through stolen books, language, and the people who become her family.",
    nyaNote: ""
  },
  {
    title: "the cruel prince",
    author: "holly black",
    genre: "fantasy",
    status: "borrowed",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780316310277-L.jpg",
    summary: "a mortal girl raised in the dangerous world of faerie pursues power while navigating betrayal, court politics, and a prince who despises her.",
    nyaNote: ""
  }
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const loginButton = document.querySelector("#login-button");
const signOutButton = document.querySelector("#sign-out-button");
const refreshButton = document.querySelector("#refresh-button");
const borrowingList = document.querySelector("#borrowing-list");
const suggestionList = document.querySelector("#suggestion-list");
const borrowingEmpty = document.querySelector("#borrowing-empty");
const suggestionEmpty = document.querySelector("#suggestion-empty");
const borrowingFilter = document.querySelector("#borrowing-filter");
const suggestionFilter = document.querySelector("#suggestion-filter");
const toast = document.querySelector("#toast");

const bookForm = document.querySelector("#book-form");
const editingBookId = document.querySelector("#editing-book-id");
const bookFormTitle = document.querySelector("#book-form-title");
const cancelBookEdit = document.querySelector("#cancel-book-edit");
const saveBookButton = document.querySelector("#save-book-button");
const bookFormMessage = document.querySelector("#book-form-message");
const adminBookList = document.querySelector("#admin-book-list");
const booksEmpty = document.querySelector("#books-empty");
const importBooksButton = document.querySelector("#import-books-button");
const adminReviewList = document.querySelector("#admin-review-list");
const adminReviewsEmpty = document.querySelector("#admin-reviews-empty");

let borrowingRequests = [];
let bookSuggestions = [];
let books = [];
let readerReviews = [];

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
  window.setTimeout(() => toast.classList.remove("show"), 2600);
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

function updateCounts() {
  document.querySelector("#pending-checkouts").textContent =
    borrowingRequests.filter(
      (item) => item.requestType === "checkout" && item.status === "pending"
    ).length;

  document.querySelector("#pending-waitlists").textContent =
    borrowingRequests.filter(
      (item) => item.requestType === "waitlist" && item.status === "pending"
    ).length;

  document.querySelector("#pending-suggestions").textContent =
    bookSuggestions.filter((item) => item.status === "pending").length;

  document.querySelector("#book-count").textContent = books.length;
  document.querySelector("#review-count").textContent = readerReviews.length;
}

function renderBorrowing() {
  const filter = borrowingFilter.value;
  const visible = borrowingRequests.filter(
    (item) => filter === "all" || item.status === filter
  );

  borrowingList.innerHTML = "";
  borrowingEmpty.hidden = visible.length !== 0;

  visible.forEach((item) => {
    const card = document.createElement("article");
    card.className = "request-card";

    card.innerHTML = `
      <div>
        <h3>${escapeHtml(item.bookTitle)}</h3>
        <p><strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.requestType)}</p>
        <p class="meta">by ${escapeHtml(item.author || "unknown author")}</p>
        <p class="meta">${formatDate(item.createdAt)}</p>
        <span class="status">${escapeHtml(item.status)}</span>
      </div>
      <div class="request-actions">
        <button class="action-button" data-status="approved" type="button">approve</button>
        <button class="action-button secondary" data-status="completed" type="button">complete</button>
        <button class="action-button danger" data-delete type="button">delete</button>
      </div>
    `;

    card.querySelectorAll("[data-status]").forEach((button) => {
      button.addEventListener("click", async () => {
        await updateDoc(doc(db, "checkoutRequests", item.id), {
          status: button.dataset.status
        });
        showToast(`request marked ${button.dataset.status}.`);
        await loadData();
      });
    });

    card.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!window.confirm("delete this request permanently?")) return;
      await deleteDoc(doc(db, "checkoutRequests", item.id));
      showToast("request deleted.");
      await loadData();
    });

    borrowingList.appendChild(card);
  });
}

function renderSuggestions() {
  const filter = suggestionFilter.value;
  const visible = bookSuggestions.filter(
    (item) => filter === "all" || item.status === filter
  );

  suggestionList.innerHTML = "";
  suggestionEmpty.hidden = visible.length !== 0;

  visible.forEach((item) => {
    const card = document.createElement("article");
    card.className = "request-card";

    card.innerHTML = `
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p><strong>${escapeHtml(item.name)}</strong> suggested this title</p>
        <p class="meta">by ${escapeHtml(item.author || "unknown author")}</p>
        ${item.reason ? `<p>${escapeHtml(item.reason)}</p>` : ""}
        <p class="meta">${formatDate(item.createdAt)}</p>
        <span class="status">${escapeHtml(item.status)}</span>
      </div>
      <div class="request-actions">
        <button class="action-button" data-status="approved" type="button">approve</button>
        <button class="action-button secondary" data-status="declined" type="button">decline</button>
        <button class="action-button danger" data-delete type="button">delete</button>
      </div>
    `;

    card.querySelectorAll("[data-status]").forEach((button) => {
      button.addEventListener("click", async () => {
        await updateDoc(doc(db, "bookSuggestions", item.id), {
          status: button.dataset.status
        });
        showToast(`suggestion marked ${button.dataset.status}.`);
        await loadData();
      });
    });

    card.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!window.confirm("delete this suggestion permanently?")) return;
      await deleteDoc(doc(db, "bookSuggestions", item.id));
      showToast("suggestion deleted.");
      await loadData();
    });

    suggestionList.appendChild(card);
  });
}


function reviewAvatarMarkup(review) {
  if (review.avatarUrl) {
    return `<img src="${escapeHtml(review.avatarUrl)}" alt="">`;
  }

  return escapeHtml(review.avatarEmoji || "📚");
}

function renderAdminReviews() {
  adminReviewList.innerHTML = "";
  adminReviewsEmpty.hidden = readerReviews.length !== 0;

  readerReviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "admin-review-card";

    card.innerHTML = `
      <span class="admin-review-avatar" style="--avatar-color:${escapeHtml(review.avatarColor || "#e8b8c5")}">
        ${reviewAvatarMarkup(review)}
      </span>
      <div>
        <h3>${escapeHtml(review.bookTitle || "unknown book")}</h3>
        <p><strong>${escapeHtml(review.displayName || "reader")}</strong></p>
        <p class="admin-review-stars">${"★".repeat(Number(review.rating || 0))}${"☆".repeat(Math.max(0, 5 - Number(review.rating || 0)))}</p>
        ${review.comment ? `<p class="admin-review-comment">${escapeHtml(review.comment)}</p>` : ""}
        <p class="meta">${formatDate(review.updatedAt || review.createdAt)}</p>
      </div>
      <div class="request-actions">
        <button class="action-button danger" data-delete-review type="button">delete</button>
      </div>
    `;

    card.querySelector("[data-delete-review]").addEventListener("click", async () => {
      if (!window.confirm("delete this reader review?")) return;

      try {
        await deleteDoc(doc(db, "books", review.bookId, "reviews", review.userId));
        showToast("review deleted.");
        await loadData();
      } catch (error) {
        console.error(error);
        showToast("the review could not be deleted.");
      }
    });

    adminReviewList.appendChild(card);
  });
}

function renderBooks() {
  adminBookList.innerHTML = "";
  booksEmpty.hidden = books.length !== 0;
  document.querySelector("#book-list-count").textContent =
    `${books.length} ${books.length === 1 ? "book" : "books"}`;
  importBooksButton.hidden = books.length !== 0;

  books.forEach((book) => {
    const card = document.createElement("article");
    card.className = "admin-book-card";

    card.innerHTML = `
      <div class="admin-book-card-top">
        <div>
          <h3>${escapeHtml(book.title)}</h3>
          <p class="meta">by ${escapeHtml(book.author || "unknown author")}</p>
          <p>
            <span class="status">${escapeHtml(book.genre || "uncategorized")}</span>
            <span class="status">${book.status === "available" ? "on the shelf" : "out reading"}</span>
          </p>
        </div>
      </div>
      <div class="request-actions">
        <button class="action-button" data-edit type="button">edit</button>
        <button class="action-button danger" data-delete type="button">delete</button>
      </div>
    `;

    card.querySelector("[data-edit]").addEventListener("click", () => beginBookEdit(book));
    card.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!window.confirm(`delete ${book.title} from the catalog?`)) return;

      try {
        await deleteDoc(doc(db, "books", book.id));
        showToast(`${book.title} was removed.`);
        resetBookForm();
        await loadData();
      } catch (error) {
        console.error(error);
        showToast("the book could not be deleted.");
      }
    });

    adminBookList.appendChild(card);
  });
}

function beginBookEdit(book) {
  editingBookId.value = book.id;
  document.querySelector("#book-title").value = book.title || "";
  document.querySelector("#book-author").value = book.author || "";
  document.querySelector("#book-genre").value = book.genre || "";
  document.querySelector("#book-status").value = book.status || "available";
  document.querySelector("#book-cover-url").value = book.coverUrl || "";
  document.querySelector("#book-summary").value = book.summary || "";
  document.querySelector("#book-nya-note").value = book.nyaNote || "";

  bookFormTitle.textContent = "edit book";
  saveBookButton.textContent = "save changes";
  cancelBookEdit.hidden = false;
  bookFormMessage.textContent = "";
  bookForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetBookForm() {
  bookForm.reset();
  editingBookId.value = "";
  document.querySelector("#book-status").value = "available";
  bookFormTitle.textContent = "add a book";
  saveBookButton.textContent = "add book";
  cancelBookEdit.hidden = true;
  bookFormMessage.textContent = "";
}

cancelBookEdit.addEventListener("click", resetBookForm);

bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = editingBookId.value;
  const bookData = {
    title: document.querySelector("#book-title").value.trim(),
    author: document.querySelector("#book-author").value.trim(),
    genre: document.querySelector("#book-genre").value.trim().toLowerCase(),
    status: document.querySelector("#book-status").value,
    coverUrl: document.querySelector("#book-cover-url").value.trim(),
    summary: document.querySelector("#book-summary").value.trim(),
    nyaNote: document.querySelector("#book-nya-note").value.trim(),
    updatedAt: serverTimestamp()
  };

  if (!bookData.title || !bookData.author || !bookData.genre || !bookData.summary) {
    bookFormMessage.textContent =
      "please complete the title, author, genre, and summary.";
    return;
  }

  saveBookButton.disabled = true;
  saveBookButton.textContent = id ? "saving..." : "adding...";
  bookFormMessage.textContent = "";

  try {
    if (id) {
      await updateDoc(doc(db, "books", id), bookData);
      showToast(`${bookData.title} was updated.`);
    } else {
      await addDoc(collection(db, "books"), {
        ...bookData,
        createdAt: serverTimestamp()
      });
      showToast(`${bookData.title} was added.`);
    }

    resetBookForm();
    await loadData();
  } catch (error) {
    console.error(error);
    bookFormMessage.textContent = "the book could not be saved.";
  } finally {
    saveBookButton.disabled = false;
    saveBookButton.textContent = editingBookId.value ? "save changes" : "add book";
  }
});

importBooksButton.addEventListener("click", async () => {
  if (books.length !== 0) {
    showToast("the catalog already has books.");
    return;
  }

  importBooksButton.disabled = true;
  importBooksButton.textContent = "importing...";

  try {
    const batch = writeBatch(db);

    starterBooks.forEach((book) => {
      const reference = doc(collection(db, "books"));
      batch.set(reference, {
        ...book,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    showToast("the starter catalog was imported.");
    await loadData();
  } catch (error) {
    console.error(error);
    showToast("the starter books could not be imported.");
  } finally {
    importBooksButton.disabled = false;
    importBooksButton.textContent = "import starter catalog";
  }
});

async function loadData() {
  refreshButton.disabled = true;
  refreshButton.textContent = "loading...";

  try {
    const [borrowingSnapshot, suggestionSnapshot, booksSnapshot] = await Promise.all([
      getDocs(query(collection(db, "checkoutRequests"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "bookSuggestions"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "books"))
    ]);

    borrowingRequests = borrowingSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data()
    }));

    bookSuggestions = suggestionSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data()
    }));

    books = booksSnapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));

    const reviewSnapshots = await Promise.all(
      books.map((book) =>
        getDocs(collection(db, "books", book.id, "reviews"))
      )
    );

    readerReviews = reviewSnapshots
      .flatMap((snapshot) =>
        snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
      )
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });

    updateCounts();
    renderBorrowing();
    renderSuggestions();
    renderBooks();
    renderAdminReviews();
  } catch (error) {
    console.error(error);
    showToast("the dashboard could not load.");
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "refresh";
  }
}

async function openDashboardForUser(user) {
  if (!user) {
    loginView.hidden = false;
    dashboardView.hidden = true;
    signOutButton.hidden = true;
    return false;
  }

  if (user.uid !== ADMIN_UID) {
    loginView.hidden = false;
    dashboardView.hidden = true;
    signOutButton.hidden = true;
    loginMessage.textContent =
      `the login worked, but this account has uid ${user.uid}.`;
    return false;
  }

  loginMessage.textContent = "";
  loginView.hidden = true;
  dashboardView.hidden = false;
  signOutButton.hidden = false;
  await loadData();
  return true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#admin-email").value.trim();
  const password = document.querySelector("#admin-password").value;

  loginButton.disabled = true;
  loginButton.textContent = "signing in...";
  loginMessage.textContent = "";

  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await openDashboardForUser(credential.user);
  } catch (error) {
    console.error(error);
    loginMessage.textContent =
      `firebase error: ${error?.code || "unknown-error"}`;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "sign in";
  }
});

signOutButton.addEventListener("click", () => signOut(auth));
refreshButton.addEventListener("click", loadData);
borrowingFilter.addEventListener("change", renderBorrowing);
suggestionFilter.addEventListener("change", renderSuggestions);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".panel").forEach((panel) => {
      panel.hidden = panel.id !== `${tab.dataset.tab}-panel`;
    });
  });
});

onAuthStateChanged(auth, async (user) => {
  await openDashboardForUser(user);
});
