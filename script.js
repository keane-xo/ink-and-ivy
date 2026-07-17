const books = [
  {
    title: "the hunger games",
    author: "suzanne collins",
    genre: "dystopian",
    status: "available",
    cover: "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg"
  },
  {
    title: "the inheritance games",
    author: "jennifer lynn barnes",
    genre: "mystery",
    status: "borrowed",
    cover: "https://covers.openlibrary.org/b/isbn/9781368052405-L.jpg"
  },
  {
    title: "little women",
    author: "louisa may alcott",
    genre: "classic",
    status: "available",
    cover: "https://covers.openlibrary.org/b/isbn/9780147514011-L.jpg"
  },
  {
    title: "six of crows",
    author: "leigh bardugo",
    genre: "fantasy",
    status: "available",
    cover: "https://covers.openlibrary.org/b/isbn/9781250076960-L.jpg"
  },
  {
    title: "the summer i turned pretty",
    author: "jenny han",
    genre: "romance",
    status: "borrowed",
    cover: "https://covers.openlibrary.org/b/isbn/9781416968290-L.jpg"
  },
  {
    title: "a good girl's guide to murder",
    author: "holly jackson",
    genre: "mystery",
    status: "available",
    cover: "https://covers.openlibrary.org/b/isbn/9781984896360-L.jpg"
  },
  {
    title: "the book thief",
    author: "markus zusak",
    genre: "historical fiction",
    status: "available",
    cover: "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg"
  },
  {
    title: "the cruel prince",
    author: "holly black",
    genre: "fantasy",
    status: "borrowed",
    cover: "https://covers.openlibrary.org/b/isbn/9780316310277-L.jpg"
  }
];

const bookGrid = document.querySelector("#book-grid");
const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const statusFilter = document.querySelector("#status-filter");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
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
        <img
          src="${book.cover}"
          alt="cover of ${book.title} by ${book.author}"
          loading="lazy"
          onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
        >
        <div class="cover-fallback" hidden>
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

    card.querySelector(".book-action").addEventListener("click", () => {
      showToast(`the ${buttonText} feature will be connected next.`);
    });

    bookGrid.appendChild(card);
  });
}

searchInput.addEventListener("input", renderBooks);
genreFilter.addEventListener("change", renderBooks);
statusFilter.addEventListener("change", renderBooks);

document.querySelectorAll("[data-coming-soon]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(`${button.dataset.comingSoon} will be connected next.`);
  });
});

const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector("#main-nav");

menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

document.querySelector("#request-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#form-message").textContent =
    "your request form works visually. we will save requests to firebase next.";
  event.currentTarget.reset();
});

addGenreOptions();
renderBooks();
