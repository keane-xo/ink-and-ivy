import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
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
  setDoc
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

const BADGES = {
  "page-turner": {
    emoji: "📖",
    name: "page turner",
    description: "finished three books"
  },
  "genre-explorer": {
    emoji: "🧭",
    name: "genre explorer",
    description: "read across three different genres"
  },
  "friends-choice": {
    emoji: "💌",
    name: "friend's choice",
    description: "finished a book recommended by a friend"
  },
  "reviewers-quill": {
    emoji: "🪶",
    name: "reviewer's quill",
    description: "shared five book reviews"
  },
  "journal-keeper": {
    emoji: "✍️",
    name: "journal keeper",
    description: "filled five reading-journal pages"
  },
  "tome-traveler": {
    emoji: "🏰",
    name: "tome traveler",
    description: "finished a book longer than 400 pages"
  },
  "seasonal-reader": {
    emoji: "🍂",
    name: "seasonal reader",
    description: "finished four books in one season"
  },
  "brave-browser": {
    emoji: "🌙",
    name: "brave browser",
    description: "read beyond a usual comfort genre"
  }
};

function renderPublicBadges(ids) {
  const container = document.querySelector("#public-badges");
  const empty = document.querySelector("#public-badges-empty");
  const validIds = (ids || []).filter((id) => BADGES[id]);

  container.innerHTML = "";
  empty.hidden = validIds.length !== 0;

  validIds.forEach((id) => {
    const badge = BADGES[id];
    const element = document.createElement("article");
    element.className = "public-badge";
    element.innerHTML = `
      <span aria-hidden="true">${badge.emoji}</span>
      <div>
        <strong>${badge.name}</strong>
        <small>${badge.description}</small>
      </div>
    `;
    container.appendChild(element);
  });
}


const loginView = document.querySelector("#profile-login-view");
const profileView = document.querySelector("#public-profile-view");
const avatar = document.querySelector("#public-avatar");
const name = document.querySelector("#public-name");
const bio = document.querySelector("#public-bio");
const editOwnLink = document.querySelector("#edit-own-profile-link");
const recommendToReaderLink = document.querySelector("#recommend-to-reader-link");
const postsContainer = document.querySelector("#profile-posts");
const postsEmpty = document.querySelector("#profile-posts-empty");
const toast = document.querySelector("#profile-toast");

const profileId = new URLSearchParams(window.location.search).get("uid");
let currentUser = null;
let currentProfile = null;
let books = [];
const postListeners = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function avatarMarkup(profile) {
  return profile?.avatarUrl
    ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="">`
    : escapeHtml(profile?.avatarEmoji || "📚");
}

function currentProfileSnapshot() {
  return {
    displayName: currentProfile?.displayName || "reader",
    avatarEmoji: currentProfile?.avatarEmoji || "📚",
    avatarColor: currentProfile?.avatarColor || "#e8b8c5",
    avatarUrl: currentProfile?.avatarUrl || ""
  };
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "just now";
  return timestamp.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).toLowerCase();
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
    <span class="profile-post-date">${formatDate(post.updatedAt || post.createdAt)}</span>
    ${post.title ? `<h3>${escapeHtml(post.title)}</h3>` : ""}
    <p class="post-body">${escapeHtml(post.body)}</p>
    ${post.imageUrl ? `<img class="post-photo" src="${escapeHtml(post.imageUrl)}" alt="photo shared with this book post">` : ""}
    <div class="post-meta">
      <span class="pill">${escapeHtml(post.readingStatus || "book thoughts")}</span>
      ${post.bookTitle ? `<span class="pill">📖 ${escapeHtml(post.bookTitle)}</span>` : ""}
    </div>
  `;
}

function clearPostListeners() {
  postListeners.forEach((unsubscribe) => unsubscribe());
  postListeners.clear();
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

function attachPostInteractions(post, article) {
  const likeButton = article.querySelector("[data-profile-like]");
  const commentsButton = article.querySelector("[data-profile-comments-count]");
  const commentsArea = article.querySelector(".profile-comments-area");
  const commentsList = article.querySelector(".profile-comments-list");
  const commentForm = article.querySelector(".profile-comment-form");

  const likesUnsubscribe = onSnapshot(
    collection(db, "posts", post.id, "likes"),
    (snapshot) => {
      const liked = snapshot.docs.some((entry) => entry.id === currentUser.uid);
      likeButton.classList.toggle("liked", liked);
      likeButton.textContent = `${liked ? "♥" : "♡"} ${snapshot.size}`;
      likeButton.dataset.liked = String(liked);
    }
  );
  postListeners.set(`likes-${post.id}`, likesUnsubscribe);

  likeButton.addEventListener("click", async () => {
    const likeRef = doc(db, "posts", post.id, "likes", currentUser.uid);

    try {
      if (likeButton.dataset.liked === "true") {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(error);
      showToast("the like could not be updated.");
    }
  });

  const commentsUnsubscribe = onSnapshot(
    query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc"),
      limit(100)
    ),
    (snapshot) => {
      commentsButton.textContent = `💬 ${snapshot.size}`;
      commentsList.innerHTML = "";

      snapshot.docs.forEach((entry) => {
        const comment = { id: entry.id, ...entry.data() };
        const element = document.createElement("article");
        element.className = "profile-comment";
        element.innerHTML = `
          <span class="profile-comment-avatar" style="--avatar-color:${escapeHtml(comment.avatarColor || "#e8b8c5")}">
            ${avatarMarkup(comment)}
          </span>
          <div>
            <div class="profile-comment-heading">
              <span>
                <a href="profile.html?uid=${encodeURIComponent(comment.userId)}">
                  <strong>${escapeHtml(comment.displayName || "reader")}</strong>
                </a>
                <small>${formatDate(comment.createdAt)}</small>
              </span>
              ${comment.userId === currentUser.uid
                ? '<button class="profile-comment-delete" type="button">delete</button>'
                : ""}
            </div>
            <p>${escapeHtml(comment.text)}</p>
          </div>
        `;

        element.querySelector(".profile-comment-delete")?.addEventListener("click", (event) => {
          twoClickDelete(event.currentTarget, async () => {
            try {
              await deleteDoc(doc(db, "posts", post.id, "comments", comment.id));
              showToast("your comment was deleted.");
            } catch (error) {
              console.error(error);
              showToast("the comment could not be deleted.");
            }
          });
        });

        commentsList.appendChild(element);
      });
    }
  );
  postListeners.set(`comments-${post.id}`, commentsUnsubscribe);

  commentsButton.addEventListener("click", () => {
    const spoilerStillHidden = Boolean(article.querySelector(".spoiler-box"));

    if (spoilerStillHidden) {
      showToast("reveal the spoiler post before opening its comments.");
      return;
    }

    commentsArea.hidden = false;
    commentForm.querySelector("input").focus();
    commentsArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = commentForm.querySelector("input");
    const text = input.value.trim();
    if (!text) return;

    const button = commentForm.querySelector("button");
    button.disabled = true;

    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        userId: currentUser.uid,
        ...currentProfileSnapshot(),
        text,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      input.value = "";
    } catch (error) {
      console.error(error);
      showToast("the comment could not be posted.");
    } finally {
      button.disabled = false;
    }
  });
}

function renderPosts(allPosts) {
  clearPostListeners();

  const posts = allPosts.filter((post) => post.userId === profileId);
  postsContainer.innerHTML = "";
  postsEmpty.hidden = posts.length !== 0;

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "profile-post";

    article.innerHTML = `
      <div class="profile-post-content">
        ${post.spoiler ? `
          <div class="spoiler-box">
            <strong>spoilers hidden</strong>
            <p>the title, text, photo, and comments are covered.</p>
            <button type="button">reveal post</button>
          </div>
        ` : postContent(post)}
      </div>

      <div class="profile-post-social">
        <div class="profile-social-bar">
          <button class="profile-social-button" data-profile-like type="button">♡ 0</button>
          <button class="profile-social-button" data-profile-comments-count type="button">💬 0</button>
        </div>

        <div class="profile-comments-area" ${post.spoiler ? "hidden" : ""}>
          <div class="profile-comments-list"></div>
          <form class="profile-comment-form">
            <input type="text" maxlength="800" required placeholder="write a comment">
            <button type="submit">post</button>
          </form>
        </div>
      </div>
    `;

    article.querySelector(".spoiler-box button")?.addEventListener("click", () => {
      article.querySelector(".profile-post-content").innerHTML = postContent(post);
      article.querySelector(".profile-comments-area").hidden = false;
    });

    attachPostInteractions(post, article);
    postsContainer.appendChild(article);
  });
}

async function loadPage(user) {
  if (!profileId) {
    name.textContent = "reader not found";
    return;
  }

  const [profileSnapshot, currentProfileSnapshotDoc, booksSnapshot] = await Promise.all([
    getDoc(doc(db, "profiles", profileId)),
    getDoc(doc(db, "profiles", user.uid)),
    getDocs(collection(db, "books"))
  ]);

  if (!profileSnapshot.exists()) {
    name.textContent = "reader not found";
    bio.textContent = "this profile does not exist.";
    return;
  }

  const profile = profileSnapshot.data();
  currentProfile = currentProfileSnapshotDoc.exists()
    ? currentProfileSnapshotDoc.data()
    : {
        displayName: user.email?.split("@")[0] || "reader",
        avatarEmoji: "📚",
        avatarColor: "#e8b8c5",
        avatarUrl: ""
      };

  books = booksSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));

  avatar.style.setProperty("--avatar-color", profile.avatarColor || "#e8b8c5");
  avatar.innerHTML = avatarMarkup(profile);
  name.textContent = profile.displayName || "reader";
  bio.textContent = profile.bio || "an ink and ivy reader";

  renderPublicBadges(profile.earnedBadges || []);

  renderBookList("#favorite-books", "#favorite-empty", profile.favoriteBookIds);
  renderBookList("#tbr-books", "#tbr-empty", profile.tbrBookIds);
  renderBookList("#reading-books", "#reading-empty", profile.currentlyReadingBookIds);

  editOwnLink.hidden = user.uid !== profileId;
  recommendToReaderLink.hidden = user.uid === profileId;
  recommendToReaderLink.href =
    `recommendations.html?to=${encodeURIComponent(profileId)}`;

  onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100)),
    (snapshot) => {
      renderPosts(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    },
    (error) => {
      console.error(error);
      showToast("this reader's posts could not be loaded.");
    }
  );
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  profileView.hidden = !user;

  if (user) {
    try {
      await loadPage(user);
    } catch (error) {
      console.error(error);
      name.textContent = "this page could not be loaded";
    }
  } else {
    clearPostListeners();
  }
});
