import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore
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

const grid = document.querySelector("#blind-date-grid");
const loading = document.querySelector("#blind-date-loading");
const empty = document.querySelector("#blind-date-empty");
const subtitle = document.querySelector("#blind-date-subtitle");
const surpriseButton = document.querySelector("#surprise-me-button");
const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector("#main-nav");

let books = [];
let picks = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readingLength(pageCount) {
  const pages = Number(pageCount || 0);

  if (!pages) return "length is part of the mystery";
  if (pages <= 250) return "a quick escape";
  if (pages <= 375) return "an easy weekend read";
  if (pages <= 500) return "settle in for a while";
  return "a big, immersive read";
}

function statusLabel(status) {
  return status === "available" ? "on the shelf" : "out reading";
}

function findBook(bookId) {
  return books.find((book) => book.id === bookId) || null;
}

function wrappedBookMarkup() {
  return `
    <div class="wrapped-book" aria-hidden="true">
      <span class="paper-flower">❦</span>
      <span class="vertical-ribbon"></span>
      <span class="horizontal-ribbon"></span>
      <span class="wax-seal">🌿</span>
    </div>
  `;
}

function renderClueCard(pick, index) {
  const book = findBook(pick.bookId);
  if (!book) return null;

  const article = document.createElement("article");
  article.className = "date-card";
  article.dataset.bookId = book.id;

  const hints = [pick.clueOne, pick.clueTwo]
    .filter(Boolean)
    .map((hint) => `<li>${escapeHtml(hint)}</li>`)
    .join("");

  article.innerHTML = `
    <span class="date-card-number">date ${String(index + 1).padStart(2, "0")}</span>

    <div class="date-book-wrap">
      ${wrappedBookMarkup()}
    </div>

    <div class="date-clues">
      <h3>a mystery is waiting</h3>

      <div class="date-clue-pills">
        <span>${escapeHtml(book.genre || "mystery genre")}</span>
        ${pick.mood ? `<span>${escapeHtml(pick.mood)}</span>` : ""}
        <span>${escapeHtml(readingLength(book.pageCount))}</span>
      </div>

      ${hints ? `<ul class="date-hints">${hints}</ul>` : ""}

      ${
        pick.perfectFor
          ? `<p class="date-perfect-for"><strong>perfect for:</strong> ${escapeHtml(pick.perfectFor)}</p>`
          : ""
      }

      <button class="button button-primary unwrap-button" type="button">
        unwrap this book
      </button>
    </div>
  `;

  article.querySelector(".unwrap-button").addEventListener("click", () => {
    revealCard(article, pick, book, index);
  });

  return article;
}

function revealCard(article, pick, book, index) {
  article.classList.add("is-revealed");

  const pageCount = Number(book.pageCount || 0);

  article.innerHTML = `
    <span class="date-card-number">date ${String(index + 1).padStart(2, "0")}</span>

    <div class="reveal-cover">
      ${
        book.coverUrl
          ? `<img src="${escapeHtml(book.coverUrl)}" alt="cover of ${escapeHtml(book.title)}">`
          : `<span aria-hidden="true">📖</span>`
      }
    </div>

    <div class="reveal-details">
      <p class="reveal-label">your date is...</p>
      <h3>${escapeHtml(book.title)}</h3>
      <p class="reveal-author">by ${escapeHtml(book.author || "unknown author")}</p>

      <div class="reveal-meta">
        <span>${escapeHtml(book.genre || "uncategorized")}</span>
        ${pageCount > 0 ? `<span>${pageCount} pages</span>` : ""}
        <span>${statusLabel(book.status)}</span>
      </div>

      <div class="reveal-actions">
        <a class="button button-primary" href="index.html?book=${encodeURIComponent(book.id)}">
          meet it on the shelves
        </a>
        <button class="rewrap-button" type="button">rewrap</button>
      </div>
    </div>
  `;

  article.querySelector(".rewrap-button").addEventListener("click", () => {
    const replacement = renderClueCard(pick, index);
    article.replaceWith(replacement);
  });
}

function render() {
  grid.innerHTML = "";

  const validPicks = picks.filter((pick) => findBook(pick.bookId));

  if (!validPicks.length) {
    grid.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.hidden = false;

  validPicks.forEach((pick, index) => {
    const card = renderClueCard(pick, index);
    if (card) grid.appendChild(card);
  });
}

async function loadBlindDates() {
  loading.hidden = false;
  grid.hidden = true;
  empty.hidden = true;

  try {
    const [settingsSnapshot, booksSnapshot] = await Promise.all([
      getDoc(doc(db, "siteSettings", "blindDate")),
      getDocs(collection(db, "books"))
    ]);

    books = booksSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data()
    }));

    const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};

    if (typeof settings.subtitle === "string" && settings.subtitle.trim()) {
      subtitle.textContent = settings.subtitle.trim();
    }

    picks =
      settings.active === false || !Array.isArray(settings.picks)
        ? []
        : settings.picks.slice(0, 6);

    render();
  } catch (error) {
    console.error(error);
    picks = [];
    render();
  } finally {
    loading.hidden = true;
  }
}

surpriseButton.addEventListener("click", () => {
  const cards = Array.from(document.querySelectorAll(".date-card:not(.is-revealed)"));

  if (!cards.length) {
    document.querySelector("#dates").scrollIntoView({ behavior: "smooth" });
    return;
  }

  const card = cards[Math.floor(Math.random() * cards.length)];
  card.scrollIntoView({ behavior: "smooth", block: "center" });

  window.setTimeout(() => {
    card.querySelector(".unwrap-button")?.click();
  }, 500);
});

menuButton?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".more-menu-panel a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector(".more-menu")?.removeAttribute("open");
  });
});

loadBlindDates();
