import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  serverTimestamp
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
const db = getFirestore(app);

let books = [];
let selectedBook = null;

const bookGrid = document.querySelector("#book-grid");
const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const statusFilter = document.querySelector("#status-filter");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");
const requestForm = document.querySelector("#request-form");
const formMessage = document.querySelector("#form-message");

const requestModal = document.querySelector("#request-modal");
const requestModalTitle = document.querySelector("#request-modal-title");
const requestModalCopy = document.querySelector("#request-modal-copy");
const borrowingRequestForm = document.querySelector("#borrowing-request-form");
const borrowingFormMessage = document.querySelector("#borrowing-form-message");
const readerNameInput = document.querySelector("#reader-name");
const confirmRequestButton = document.querySelector("#confirm-request-button");

const detailsModal = document.querySelector("#book-details-modal");
const detailsTitle = document.querySelector("#book-details-title");
const detailsAuthor = document.querySelector("#book-details-author");
const detailsGenre = document.querySelector("#book-details-genre");
const detailsStatus = document.querySelector("#book-details-status");
const detailsSummary = document.querySelector("#book-details-summary");
const detailsNote = document.querySelector("#book-details-note");
const detailsCover = document.querySelector("#book-details-cover");
const detailsCoverFallback = document.querySelector("#book-details-cover-fallback");
const detailsCoverTitle = document.querySelector("#book-details-cover-title");
const detailsRequestButton = document.querySelector("#book-details-request-button");

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
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function rebuildGenreOptions() {
  const currentValue = genreFilter.value;
  const genres = [...new Set(books.map((book) => book.genre).filter(Boolean))].sort();

  genreFilter.innerHTML = '<option value="all">all genres</option>';

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });

  genreFilter.value = genres.includes(currentValue) ? currentValue : "all";
}

function openBookDetails(book) {
  selectedBook = book;

  detailsTitle.textContent = book.title;
  detailsAuthor.textContent = `by ${book.author || "unknown author"}`;
  detailsGenre.textContent = book.genre || "uncategorized";
  detailsSummary.textContent =
    book.summary || "a summary has not been added to this book yet.";
  detailsNote.textContent =
    book.nyaNote || "nya's note has not been added yet.";

  const isAvailable = book.status === "available";
  detailsStatus.textContent = isAvailable ? "🌿 on the shelf" : "📖 out reading";
  detailsStatus.className = `pill status-${book.status || "available"}`;
  detailsRequestButton.textContent =
    isAvailable ? "request checkout" : "join the waitlist";

  detailsCoverTitle.textContent = book.title;

  if (book.coverUrl) {
    detailsCover.hidden = false;
    detailsCoverFallback.hidden = true;
    detailsCover.src = book.coverUrl;
    detailsCover.alt = `cover of ${book.title} by ${book.author || "unknown author"}`;
  } else {
    detailsCover.hidden = true;
    detailsCoverFallback.hidden = false;
    detailsCover.removeAttribute("src");
    detailsCover.alt = "";
  }

  detailsModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeBookDetails() {
  detailsModal.hidden = true;
  document.body.classList.remove("modal-open");
}

detailsCover.addEventListener("error", () => {
  detailsCover.hidden = true;
  detailsCoverFallback.hidden = false;
});

document.querySelectorAll("[data-close-book-details]").forEach((element) => {
  element.addEventListener("click", closeBookDetails);
});

function openBorrowingModal(book) {
  selectedBook = book;
  const requestType = book.status === "available" ? "checkout" : "waitlist";

  requestModalTitle.textContent =
    requestType === "checkout" ? "request this book" : "join the waitlist";
  requestModalCopy.textContent =
    requestType === "checkout"
      ? `enter your name to request ${book.title}.`
      : `enter your name to join the waitlist for ${book.title}.`;
  confirmRequestButton.textContent =
    requestType === "checkout" ? "send request" : "join waitlist";

  borrowingRequestForm.reset();
  borrowingFormMessage.textContent = "";
  requestModal.hidden = false;
  document.body.classList.add("modal-open");

  window.setTimeout(() => readerNameInput.focus(), 50);
}

function closeBorrowingModal() {
  requestModal.hidden = true;
  document.body.classList.remove("modal-open");
  borrowingFormMessage.textContent = "";
}

detailsRequestButton.addEventListener("click", () => {
  if (!selectedBook) return;
  const book = selectedBook;
  closeBookDetails();
  openBorrowingModal(book);
});

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeBorrowingModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (!requestModal.hidden) {
    closeBorrowingModal();
  } else if (!detailsModal.hidden) {
    closeBookDetails();
  }
});

borrowingRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedBook) return;

  const cleanName = readerNameInput.value.trim();
  const requestType =
    selectedBook.status === "available" ? "checkout" : "waitlist";

  if (!cleanName) {
    borrowingFormMessage.textContent = "please enter your name.";
    readerNameInput.focus();
    return;
  }

  const originalText = confirmRequestButton.textContent;
  confirmRequestButton.disabled = true;
  confirmRequestButton.textContent = "sending...";
  borrowingFormMessage.textContent = "";

  try {
    await addDoc(collection(db, "checkoutRequests"), {
      name: cleanName,
      bookTitle: selectedBook.title,
      author: selectedBook.author || "",
      requestType,
      status: "pending",
      createdAt: serverTimestamp()
    });

    const savedTitle = selectedBook.title;
    closeBorrowingModal();

    showToast(
      requestType === "checkout"
        ? `your request for ${savedTitle} was sent.`
        : `you joined the waitlist for ${savedTitle}.`
    );
  } catch (error) {
    console.error(error);
    borrowingFormMessage.textContent =
      "the request could not be sent. please try again.";
  } finally {
    confirmRequestButton.disabled = false;
    confirmRequestButton.textContent = originalText;
  }
});

function renderBooks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedGenre = genreFilter.value;
  const selectedStatus = statusFilter.value;

  const filteredBooks = books.filter((book) => {
    const title = String(book.title || "").toLowerCase();
    const author = String(book.author || "").toLowerCase();
    const matchesSearch =
      title.includes(searchTerm) || author.includes(searchTerm);
    const matchesGenre =
      selectedGenre === "all" || book.genre === selectedGenre;
    const matchesStatus =
      selectedStatus === "all" || book.status === selectedStatus;

    return matchesSearch && matchesGenre && matchesStatus;
  });

  bookGrid.innerHTML = "";
  emptyState.hidden = filteredBooks.length !== 0;
  resultsCount.textContent =
    `${filteredBooks.length} ${filteredBooks.length === 1 ? "book" : "books"} found`;

  filteredBooks.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `view details for ${book.title}`);

    const isAvailable = book.status === "available";
    const statusText = isAvailable ? "🌿 on the shelf" : "📖 out reading";
    const buttonText = isAvailable ? "request checkout" : "join the waitlist";

    card.innerHTML = `
      <div class="book-cover">
        <div>
          <span aria-hidden="true">📖</span>
          <strong>${escapeHtml(book.title)}</strong>
        </div>
      </div>
      <div class="book-info">
        <h3>${escapeHtml(book.title)}</h3>
        <p class="book-author">by ${escapeHtml(book.author || "unknown author")}</p>
        <div class="book-meta">
          <span class="pill">${escapeHtml(book.genre || "uncategorized")}</span>
          <span class="pill status-${escapeHtml(book.status || "available")}">${statusText}</span>
        </div>
        <button class="book-action" type="button">${buttonText}</button>
      </div>
    `;

    card.addEventListener("click", () => openBookDetails(book));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openBookDetails(book);
      }
    });

    const actionButton = card.querySelector(".book-action");
    actionButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openBorrowingModal(book);
    });
    actionButton.addEventListener("keydown", (event) => event.stopPropagation());

    bookGrid.appendChild(card);
  });
}

searchInput.addEventListener("input", renderBooks);
genreFilter.addEventListener("change", renderBooks);
statusFilter.addEventListener("change", renderBooks);

document.querySelectorAll("[data-coming-soon]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(`${button.dataset.comingSoon} will be added later.`);
  });
});

const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector("#main-nav");

menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = requestForm.querySelector('button[type="submit"]');
  const formData = new FormData(requestForm);
  const name = String(formData.get("name") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!name || !title) {
    formMessage.textContent = "please enter your name and the book title.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "sending...";
  formMessage.textContent = "";

  try {
    await addDoc(collection(db, "bookSuggestions"), {
      name,
      title,
      author,
      reason,
      status: "pending",
      createdAt: serverTimestamp()
    });

    formMessage.textContent = "your book suggestion was sent successfully.";
    requestForm.reset();
  } catch (error) {
    console.error(error);
    formMessage.textContent = "your suggestion could not be sent. please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "send request";
  }
});

bookGrid.innerHTML = '<p class="catalog-loading">opening the shelves...</p>';

onSnapshot(
  collection(db, "books"),
  (snapshot) => {
    books = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));

    rebuildGenreOptions();
    renderBooks();
  },
  (error) => {
    console.error(error);
    bookGrid.innerHTML =
      '<p class="catalog-loading">the shelves could not be loaded. please try again soon.</p>';
    resultsCount.textContent = "";
  }
);
