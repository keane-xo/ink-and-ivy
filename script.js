import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1d0xo61Z0U9mReJnw7s5Z3x0HFrrfB2k",
  authDomain: "ink-and-ivy-d0ff3.firebaseapp.com",
  projectId: "ink-and-ivy-d0ff3",
  storageBucket: "ink-and-ivy-d0ff3.firebasestorage.app",
  messagingSenderId: "444464034610",
  appId: "1:444464034610:web:de9c2c3a33737ae6849d2b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const books = [
  { title: "the hunger games", author: "suzanne collins", genre: "dystopian", status: "available" },
  { title: "the inheritance games", author: "jennifer lynn barnes", genre: "mystery", status: "borrowed" },
  { title: "little women", author: "louisa may alcott", genre: "classic", status: "available" },
  { title: "six of crows", author: "leigh bardugo", genre: "fantasy", status: "available" },
  { title: "the summer i turned pretty", author: "jenny han", genre: "romance", status: "borrowed" },
  { title: "a good girl's guide to murder", author: "holly jackson", genre: "mystery", status: "available" },
  { title: "the book thief", author: "markus zusak", genre: "historical fiction", status: "available" },
  { title: "the cruel prince", author: "holly black", genre: "fantasy", status: "borrowed" }
];

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

let selectedBook = null;
let selectedRequestButton = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function addGenreOptions() {
  const genres = [...new Set(books.map((book) => book.genre))].sort();

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });
}

function openBorrowingModal(book, button) {
  selectedBook = book;
  selectedRequestButton = button;

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
  selectedBook = null;
  selectedRequestButton = null;
  borrowingFormMessage.textContent = "";
}

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeBorrowingModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !requestModal.hidden) {
    closeBorrowingModal();
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
      author: selectedBook.author,
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
    const matchesSearch =
      book.title.includes(searchTerm) || book.author.includes(searchTerm);
    const matchesGenre =
      selectedGenre === "all" || book.genre === selectedGenre;
    const matchesStatus =
      selectedStatus === "all" || book.status === selectedStatus;

    return matchesSearch && matchesGenre && matchesStatus;
  });

  bookGrid.innerHTML = "";
  emptyState.hidden = filteredBooks.length !== 0;
  resultsCount.textContent = `${filteredBooks.length} ${filteredBooks.length === 1 ? "book" : "books"} found`;

  filteredBooks.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";

    const statusText =
      book.status === "available" ? "🌿 on the shelf" : "📖 out reading";
    const buttonText =
      book.status === "available" ? "request checkout" : "join the waitlist";

    card.innerHTML = `
      <div class="book-cover">
        <div>
          <span aria-hidden="true">📖</span>
          <strong>${book.title}</strong>
        </div>
      </div>
      <div class="book-info">
        <h3>${book.title}</h3>
        <p class="book-author">by ${book.author}</p>
        <div class="book-meta">
          <span class="pill">${book.genre}</span>
          <span class="pill status-${book.status}">${statusText}</span>
        </div>
        <button class="book-action" type="button">${buttonText}</button>
      </div>
    `;

    const actionButton = card.querySelector(".book-action");
    actionButton.addEventListener("click", () => openBorrowingModal(book, actionButton));
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

addGenreOptions();
renderBooks();
