import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
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

let books = [];
let selectedBook = null;
let currentUser = null;
let currentProfile = null;
let selectedRating = 0;
let reviewsUnsubscribe = null;
let currentUserReview = null;

const MAX_CHECKOUTS = 3;
const MAX_REQUESTS_PER_WINDOW = 2;
const REQUEST_WINDOW_DAYS = 63;
const REQUEST_WINDOW_MS = REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const ACTIVE_CHECKOUT_STATUSES = new Set(["pending", "approved"]);

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

const readerAccountLink = document.querySelector("#reader-account-link");
const readerNavAvatar = document.querySelector("#reader-nav-avatar");
const readerNavLabel = document.querySelector("#reader-nav-label");

const ratingSummary = document.querySelector("#book-rating-summary");
const averageStars = document.querySelector("#book-average-stars");
const reviewsList = document.querySelector("#book-reviews-list");
const reviewsEmpty = document.querySelector("#book-reviews-empty");
const reviewLoginPrompt = document.querySelector("#review-login-prompt");
const reviewForm = document.querySelector("#review-form");
const reviewFormAvatar = document.querySelector("#review-form-avatar");
const reviewFormName = document.querySelector("#review-form-name");
const reviewComment = document.querySelector("#review-comment");
const reviewStarButtons = [...document.querySelectorAll("#review-star-buttons button")];
const reviewFormMessage = document.querySelector("#review-form-message");
const saveReviewButton = document.querySelector("#save-review-button");
const deleteReviewButton = document.querySelector("#delete-review-button");

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

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "just now";
  return timestamp.toDate().toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toLowerCase();
}

function formatPolicyDate(date) {
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).toLowerCase();
}

function checkoutRequestDate(item) {
  if (!item.createdAt?.toDate) return null;
  const date = item.createdAt.toDate();
  return Number.isNaN(date.getTime()) ? null : date;
}

function recentCheckoutRequests(items) {
  const cutoff = Date.now() - REQUEST_WINDOW_MS;

  return items
    .filter((item) => {
      if (item.requestType !== "checkout") return false;
      const date = checkoutRequestDate(item);
      return date && date.getTime() >= cutoff;
    })
    .sort((a, b) => checkoutRequestDate(a) - checkoutRequestDate(b));
}

function nextCheckoutRequestDate(items) {
  const recent = recentCheckoutRequests(items);
  if (recent.length < MAX_REQUESTS_PER_WINDOW) return null;

  const oldestCountedRequest = checkoutRequestDate(recent[0]);
  return new Date(oldestCountedRequest.getTime() + REQUEST_WINDOW_MS);
}

function avatarMarkup(profile) {
  const emoji = escapeHtml(profile?.avatarEmoji || "📚");
  const imageUrl = String(profile?.avatarUrl || "").trim();

  if (imageUrl) {
    return `<img src="${escapeHtml(imageUrl)}" alt="">`;
  }

  return emoji;
}

function applyAvatar(element, profile) {
  element.style.setProperty("--avatar-color", profile?.avatarColor || "#e8b8c5");
  element.innerHTML = avatarMarkup(profile);
}

function updateReaderNavigation() {
  if (currentUser && currentProfile) {
    readerNavLabel.textContent = currentProfile.displayName || "my profile";
    readerNavAvatar.hidden = false;
    applyAvatar(readerNavAvatar, currentProfile);
  } else {
    readerNavLabel.textContent = "reader login";
    readerNavAvatar.hidden = true;
    readerNavAvatar.innerHTML = "";
  }
}

async function loadCurrentProfile(user) {
  if (!user) {
    currentProfile = null;
    updateReaderNavigation();
    updateReviewFormState();
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "profiles", user.uid));
    currentProfile = snapshot.exists()
      ? snapshot.data()
      : {
          displayName: user.email?.split("@")[0] || "reader",
          avatarEmoji: "📚",
          avatarColor: "#e8b8c5",
          avatarUrl: "",
          bio: ""
        };
  } catch (error) {
    console.error(error);
    currentProfile = null;
  }

  updateReaderNavigation();
  updateReviewFormState();
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  await loadCurrentProfile(user);
  if (selectedBook) subscribeToReviews(selectedBook);
});


async function getReaderBorrowingRequests() {
  if (!currentUser) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "checkoutRequests"),
      where("userId", "==", currentUser.uid)
    )
  );

  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data()
  }));
}

function usesCheckoutSlot(item) {
  return (
    item.requestType === "checkout" &&
    ACTIVE_CHECKOUT_STATUSES.has(item.status)
  );
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

function setSelectedRating(rating) {
  selectedRating = rating;
  reviewStarButtons.forEach((button) => {
    const value = Number(button.dataset.rating);
    button.textContent = value <= rating ? "★" : "☆";
    button.classList.toggle("selected", value <= rating);
    button.setAttribute("aria-checked", String(value === rating));
  });
}

reviewStarButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedRating(Number(button.dataset.rating)));
  button.addEventListener("mouseenter", () => {
    const preview = Number(button.dataset.rating);
    reviewStarButtons.forEach((item) => {
      item.textContent = Number(item.dataset.rating) <= preview ? "★" : "☆";
    });
  });
});

document.querySelector("#review-star-buttons").addEventListener("mouseleave", () => {
  setSelectedRating(selectedRating);
});

function updateReviewFormState() {
  const canReview = Boolean(currentUser && currentProfile);
  reviewLoginPrompt.hidden = canReview;
  reviewForm.hidden = !canReview;

  if (!canReview) return;

  reviewFormName.textContent = currentProfile.displayName || "reader";
  applyAvatar(reviewFormAvatar, currentProfile);

  if (currentUserReview) {
    setSelectedRating(Number(currentUserReview.rating || 0));
    reviewComment.value = currentUserReview.comment || "";
    saveReviewButton.textContent = "save changes";
    deleteReviewButton.hidden = false;
  } else {
    setSelectedRating(0);
    reviewComment.value = "";
    saveReviewButton.textContent = "post review";
    deleteReviewButton.hidden = true;
  }
}

function renderReviews(reviews) {
  reviewsList.innerHTML = "";
  reviewsEmpty.hidden = reviews.length !== 0;

  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const average = reviews.length ? total / reviews.length : 0;
  const rounded = Math.round(average);

  averageStars.textContent =
    "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
  ratingSummary.textContent = reviews.length
    ? `${average.toFixed(1)} out of 5 · ${reviews.length} ${reviews.length === 1 ? "rating" : "ratings"}`
    : "no ratings yet";

  currentUserReview = currentUser
    ? reviews.find((review) => review.userId === currentUser.uid) || null
    : null;

  reviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "review-card";

    const profile = {
      avatarEmoji: review.avatarEmoji,
      avatarColor: review.avatarColor,
      avatarUrl: review.avatarUrl
    };

    card.innerHTML = `
      <span class="comment-avatar" style="--avatar-color: ${escapeHtml(profile.avatarColor || "#e8b8c5")}">
        ${avatarMarkup(profile)}
      </span>
      <div>
        <div class="review-card-heading">
          <strong>${escapeHtml(review.displayName || "reader")}</strong>
          <span class="review-stars" aria-label="${Number(review.rating || 0)} out of 5 stars">
            ${"★".repeat(Number(review.rating || 0))}${"☆".repeat(Math.max(0, 5 - Number(review.rating || 0)))}
          </span>
        </div>
        ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : ""}
        <span class="review-date">${formatDate(review.updatedAt || review.createdAt)}</span>
      </div>
    `;

    reviewsList.appendChild(card);
  });

  updateReviewFormState();
}

function subscribeToReviews(book) {
  if (reviewsUnsubscribe) {
    reviewsUnsubscribe();
    reviewsUnsubscribe = null;
  }

  reviewsList.innerHTML = "";
  reviewsEmpty.hidden = false;
  currentUserReview = null;
  updateReviewFormState();

  const reviewsQuery = query(
    collection(db, "books", book.id, "reviews"),
    orderBy("updatedAt", "desc")
  );

  reviewsUnsubscribe = onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const reviews = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      renderReviews(reviews);
    },
    (error) => {
      console.error(error);
      ratingSummary.textContent = "reviews could not be loaded";
    }
  );
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

  subscribeToReviews(book);
  detailsModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeBookDetails() {
  detailsModal.hidden = true;
  document.body.classList.remove("modal-open");

  if (reviewsUnsubscribe) {
    reviewsUnsubscribe();
    reviewsUnsubscribe = null;
  }
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
  const signedIn = Boolean(currentUser && currentProfile);

  requestModalTitle.textContent =
    requestType === "checkout" ? "request this book" : "join the waitlist";

  if (!signedIn) {
    requestModalCopy.textContent =
      `sign in to your reader account before requesting ${book.title}.`;
    confirmRequestButton.textContent = "sign in to continue";
  } else {
    requestModalCopy.textContent =
      requestType === "checkout"
        ? `request ${book.title}. approved checkouts are due in 14 days, and each reader may submit two checkout requests in any nine-week period.`
        : `join the waitlist for ${book.title}.`;
    confirmRequestButton.textContent =
      requestType === "checkout" ? "send request" : "join waitlist";
  }

  borrowingRequestForm.reset();
  readerNameInput.disabled = !signedIn;
  readerNameInput.value = signedIn ? currentProfile.displayName || "" : "";
  borrowingFormMessage.textContent = "";
  requestModal.hidden = false;
  document.body.classList.add("modal-open");

  if (signedIn) {
    window.setTimeout(() => readerNameInput.focus(), 50);
  }
}

function closeBorrowingModal() {
  requestModal.hidden = true;
  document.body.classList.remove("modal-open");
  borrowingFormMessage.textContent = "";
  readerNameInput.disabled = false;
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

  if (!currentUser || !currentProfile) {
    window.location.href = "reader.html?return=index.html";
    return;
  }

  const cleanName =
    readerNameInput.value.trim() ||
    currentProfile.displayName ||
    "reader";
  const requestType =
    selectedBook.status === "available" ? "checkout" : "waitlist";

  if (!cleanName) {
    borrowingFormMessage.textContent = "please enter your name.";
    readerNameInput.focus();
    return;
  }

  const originalText = confirmRequestButton.textContent;
  confirmRequestButton.disabled = true;
  confirmRequestButton.textContent = "checking...";
  borrowingFormMessage.textContent = "";

  try {
    const existingRequests = await getReaderBorrowingRequests();

    const duplicate = existingRequests.find(
      (item) =>
        item.bookId === selectedBook.id &&
        item.requestType === requestType &&
        ACTIVE_CHECKOUT_STATUSES.has(item.status)
    );

    if (duplicate) {
      borrowingFormMessage.textContent =
        requestType === "checkout"
          ? "you already have an open request or loan for this book."
          : "you are already on this book's waitlist.";
      return;
    }

    if (requestType === "checkout") {
      const usedSlots = existingRequests.filter(usesCheckoutSlot).length;

      if (usedSlots >= MAX_CHECKOUTS) {
        borrowingFormMessage.textContent =
          "you already have three checkout requests or active loans. complete one before requesting another.";
        return;
      }

      const recentRequests = recentCheckoutRequests(existingRequests);

      if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        const nextDate = nextCheckoutRequestDate(existingRequests);
        borrowingFormMessage.textContent =
          `you have already used your two checkout requests for this nine-week period. you can request another book on ${formatPolicyDate(nextDate)}.`;
        return;
      }
    }

    confirmRequestButton.textContent = "sending...";

    await addDoc(collection(db, "checkoutRequests"), {
      userId: currentUser.uid,
      bookId: selectedBook.id,
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

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !currentProfile || !selectedBook) return;

  if (!selectedRating) {
    reviewFormMessage.textContent = "choose a star rating first.";
    return;
  }

  const comment = reviewComment.value.trim();
  saveReviewButton.disabled = true;
  saveReviewButton.textContent = "saving...";
  reviewFormMessage.textContent = "";

  try {
    const reviewRef = doc(
      db,
      "books",
      selectedBook.id,
      "reviews",
      currentUser.uid
    );

    await setDoc(
      reviewRef,
      {
        userId: currentUser.uid,
        bookId: selectedBook.id,
        bookTitle: selectedBook.title,
        displayName: currentProfile.displayName,
        avatarEmoji: currentProfile.avatarEmoji || "📚",
        avatarColor: currentProfile.avatarColor || "#e8b8c5",
        avatarUrl: currentProfile.avatarUrl || "",
        rating: selectedRating,
        comment,
        createdAt: currentUserReview?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    showToast(currentUserReview ? "your review was updated." : "your review was posted.");
  } catch (error) {
    console.error(error);
    reviewFormMessage.textContent = "your review could not be saved.";
  } finally {
    saveReviewButton.disabled = false;
    saveReviewButton.textContent = currentUserReview ? "save changes" : "post review";
  }
});

deleteReviewButton.addEventListener("click", async () => {
  if (!currentUser || !selectedBook || !currentUserReview) return;
  if (!window.confirm("delete your review?")) return;

  try {
    await deleteDoc(
      doc(db, "books", selectedBook.id, "reviews", currentUser.uid)
    );
    showToast("your review was deleted.");
  } catch (error) {
    console.error(error);
    reviewFormMessage.textContent = "your review could not be deleted.";
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
