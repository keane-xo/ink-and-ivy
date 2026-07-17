import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query
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

const loginView = document.querySelector("#profile-login-view");
const profileView = document.querySelector("#public-profile-view");
const avatar = document.querySelector("#public-avatar");
const name = document.querySelector("#public-name");
const bio = document.querySelector("#public-bio");
const editOwnLink = document.querySelector("#edit-own-profile-link");
const postsContainer = document.querySelector("#profile-posts");
const postsEmpty = document.querySelector("#profile-posts-empty");

const profileId = new URLSearchParams(window.location.search).get("uid");
let books = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function avatarMarkup(profile) {
  return profile.avatarUrl
    ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="">`
    : escapeHtml(profile.avatarEmoji || "📚");
}

function renderBookList(elementId, emptyId, ids) {
  const element = document.querySelector(elementId);
  const empty = document.querySelector(emptyId);
  const selected = books.filter((book) => (ids || []).includes(book.id));
  element.innerHTML = "";
  empty.hidden = selected.length !== 0;

  selected.forEach((book) => {
    const span = document.createElement("span");
    span.className = "book-chip";
    span.textContent = book.title;
    element.appendChild(span);
  });
}

function postContent(post) {
  return `
    ${post.title ? `<h3>${escapeHtml(post.title)}</h3>` : ""}
    <p>${escapeHtml(post.body)}</p>
    ${post.imageUrl ? `<img class="post-photo" src="${escapeHtml(post.imageUrl)}" alt="photo shared with this book post">` : ""}
    <div class="post-meta">
      <span class="pill">${escapeHtml(post.readingStatus || "book thoughts")}</span>
      ${post.bookTitle ? `<span class="pill">📖 ${escapeHtml(post.bookTitle)}</span>` : ""}
    </div>
  `;
}

function renderPosts(allPosts) {
  const posts = allPosts.filter((post) => post.userId === profileId);
  postsContainer.innerHTML = "";
  postsEmpty.hidden = posts.length !== 0;

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "profile-post";

    if (post.spoiler) {
      article.innerHTML = `
        <div class="spoiler-box">
          <strong>spoilers hidden</strong>
          <p>click only when you are ready to see this post.</p>
          <button type="button">reveal post</button>
        </div>
      `;
      article.querySelector("button").addEventListener("click", () => {
        article.innerHTML = postContent(post);
      });
    } else {
      article.innerHTML = postContent(post);
    }

    postsContainer.appendChild(article);
  });
}

async function loadPage(user) {
  if (!profileId) {
    name.textContent = "reader not found";
    return;
  }

  const [profileSnapshot, booksSnapshot] = await Promise.all([
    getDoc(doc(db, "profiles", profileId)),
    getDocs(collection(db, "books"))
  ]);

  if (!profileSnapshot.exists()) {
    name.textContent = "reader not found";
    bio.textContent = "this profile does not exist.";
    return;
  }

  const profile = profileSnapshot.data();
  books = booksSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));

  avatar.style.setProperty("--avatar-color", profile.avatarColor || "#e8b8c5");
  avatar.innerHTML = avatarMarkup(profile);
  name.textContent = profile.displayName || "reader";
  bio.textContent = profile.bio || "an ink and ivy reader";

  renderBookList("#favorite-books", "#favorite-empty", profile.favoriteBookIds);
  renderBookList("#tbr-books", "#tbr-empty", profile.tbrBookIds);
  renderBookList("#reading-books", "#reading-empty", profile.currentlyReadingBookIds);

  editOwnLink.hidden = user.uid !== profileId;

  onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100)),
    (snapshot) => renderPosts(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
  );
}

onAuthStateChanged(auth, async (user) => {
  loginView.hidden = Boolean(user);
  profileView.hidden = !user;

  if (user) {
    try {
      await loadPage(user);
    } catch (error) {
      console.error(error);
      name.textContent = "this page could not be loaded";
    }
  }
});
