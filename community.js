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
  getFirestore,
  limit,
  limitToLast,
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

const loginView = document.querySelector("#community-login-view");
const communityView = document.querySelector("#community-view");
const signoutButton = document.querySelector("#community-signout-button");
const myPublicProfileLink = document.querySelector("#my-public-profile-link");
const composerAvatar = document.querySelector("#composer-avatar");
const postForm = document.querySelector("#post-form");
const editingPostId = document.querySelector("#editing-post-id");
const postTitle = document.querySelector("#post-title");
const postBody = document.querySelector("#post-body");
const postImageUrl = document.querySelector("#post-image-url");
const postBook = document.querySelector("#post-book");
const postReadingStatus = document.querySelector("#post-reading-status");
const postSpoiler = document.querySelector("#post-spoiler");
const postBookRelated = document.querySelector("#post-book-related");
const publishPostButton = document.querySelector("#publish-post-button");
const cancelPostEdit = document.querySelector("#cancel-post-edit");
const composerTitle = document.querySelector("#composer-title");
const postFormMessage = document.querySelector("#post-form-message");
const postsList = document.querySelector("#posts-list");
const postsEmpty = document.querySelector("#posts-empty");
const refreshFeedButton = document.querySelector("#refresh-feed-button");
const readersGrid = document.querySelector("#readers-grid");
const readersEmpty = document.querySelector("#readers-empty");
const readerSearch = document.querySelector("#reader-search");
const chatMessages = document.querySelector("#chat-messages");
const chatEmpty = document.querySelector("#chat-empty");
const chatForm = document.querySelector("#chat-form");
const chatText = document.querySelector("#chat-text");
const chatSpoiler = document.querySelector("#chat-spoiler");
const chatFormMessage = document.querySelector("#chat-form-message");
const reportModal = document.querySelector("#report-modal");
const reportForm = document.querySelector("#report-form");
const reportReason = document.querySelector("#report-reason");
const reportDetails = document.querySelector("#report-details");
const reportMessage = document.querySelector("#report-message");
const submitReportButton = document.querySelector("#submit-report-button");
const toast = document.querySelector("#toast");

let currentUser = null;
let currentProfile = null;
let books = [];
let profiles = [];
let posts = [];
let reportTarget = null;
let unsubscribePosts = null;
let unsubscribeProfiles = null;
let unsubscribeBooks = null;
let unsubscribeChat = null;
const childUnsubscribers = new Map();

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
    hour: "numeric",
    minute: "2-digit"
  }).toLowerCase();
}

function avatarMarkup(profile) {
  if (profile?.avatarUrl) return `<img src="${escapeHtml(profile.avatarUrl)}" alt="">`;
  return escapeHtml(profile?.avatarEmoji || "📚");
}

function setAvatar(element, profile) {
  element.style.setProperty("--avatar-color", profile?.avatarColor || "#e8b8c5");
  element.innerHTML = avatarMarkup(profile);
}

function profileSnapshot() {
  return {
    displayName: currentProfile?.displayName || "reader",
    avatarEmoji: currentProfile?.avatarEmoji || "📚",
    avatarColor: currentProfile?.avatarColor || "#e8b8c5",
    avatarUrl: currentProfile?.avatarUrl || ""
  };
}

async function loadCurrentProfile(user) {
  const snapshot = await getDoc(doc(db, "profiles", user.uid));
  currentProfile = snapshot.exists() ? snapshot.data() : null;

  if (!currentProfile) {
    window.location.href = "reader.html";
    return;
  }

  setAvatar(composerAvatar, currentProfile);
  myPublicProfileLink.href = `profile.html?uid=${encodeURIComponent(user.uid)}`;
  myPublicProfileLink.hidden = false;
}

function clearChildListeners() {
  childUnsubscribers.forEach((unsubscribe) => unsubscribe());
  childUnsubscribers.clear();
}

function setPanel(name) {
  document.querySelectorAll(".community-tab").forEach((tab) =>
    tab.classList.toggle("active", tab.dataset.communityTab === name)
  );
  document.querySelector("#feed-panel").hidden = name !== "feed";
  document.querySelector("#readers-panel").hidden = name !== "readers";
  document.querySelector("#chat-panel").hidden = name !== "chat";
}

document.querySelectorAll(".community-tab").forEach((tab) => {
  tab.addEventListener("click", () => setPanel(tab.dataset.communityTab));
});

function populateBookSelect() {
  const current = postBook.value;
  postBook.innerHTML = '<option value="">no book tagged</option>';
  books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = `${book.title} — ${book.author || "unknown author"}`;
    postBook.appendChild(option);
  });
  postBook.value = books.some((book) => book.id === current) ? current : "";
}

function resetPostForm() {
  postForm.reset();
  editingPostId.value = "";
  composerTitle.textContent = "share something";
  publishPostButton.textContent = "publish post";
  cancelPostEdit.hidden = true;
  postFormMessage.textContent = "";
}

cancelPostEdit.addEventListener("click", resetPostForm);

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !currentProfile) return;

  const body = postBody.value.trim();
  if (!body) {
    postFormMessage.textContent = "write something before publishing.";
    return;
  }
  if (!postBookRelated.checked) {
    postFormMessage.textContent = "confirm that the post is book-related.";
    return;
  }

  const taggedBook = books.find((book) => book.id === postBook.value);
  const data = {
    userId: currentUser.uid,
    ...profileSnapshot(),
    title: postTitle.value.trim(),
    body,
    imageUrl: postImageUrl.value.trim(),
    bookId: taggedBook?.id || "",
    bookTitle: taggedBook?.title || "",
    readingStatus: postReadingStatus.value,
    spoiler: postSpoiler.checked,
    bookRelatedConfirmed: true,
    updatedAt: serverTimestamp()
  };

  publishPostButton.disabled = true;
  publishPostButton.textContent = editingPostId.value ? "saving..." : "publishing...";
  postFormMessage.textContent = "";

  try {
    if (editingPostId.value) {
      await updateDoc(doc(db, "posts", editingPostId.value), data);
      showToast("your post was updated.");
    } else {
      await addDoc(collection(db, "posts"), {
        ...data,
        createdAt: serverTimestamp()
      });
      showToast("your post was published.");
    }
    resetPostForm();
  } catch (error) {
    console.error(error);
    postFormMessage.textContent = `the post could not be saved (${error?.code || "unknown error"}).`;
  } finally {
    publishPostButton.disabled = false;
    publishPostButton.textContent = editingPostId.value ? "save changes" : "publish post";
  }
});

function beginPostEdit(post) {
  editingPostId.value = post.id;
  postTitle.value = post.title || "";
  postBody.value = post.body || "";
  postImageUrl.value = post.imageUrl || "";
  postBook.value = post.bookId || "";
  postReadingStatus.value = post.readingStatus || "thoughts";
  postSpoiler.checked = Boolean(post.spoiler);
  postBookRelated.checked = true;
  composerTitle.textContent = "edit your post";
  publishPostButton.textContent = "save changes";
  cancelPostEdit.hidden = false;
  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
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

function openReport(target) {
  reportTarget = target;
  reportForm.reset();
  reportMessage.textContent = "";
  reportModal.hidden = false;
}

function closeReport() {
  reportModal.hidden = true;
  reportTarget = null;
  reportMessage.textContent = "";
}

document.querySelectorAll("[data-close-report]").forEach((element) =>
  element.addEventListener("click", closeReport)
);

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!reportTarget || !currentUser) return;

  submitReportButton.disabled = true;
  submitReportButton.textContent = "sending...";
  reportMessage.textContent = "";

  try {
    await addDoc(collection(db, "reports"), {
      reporterId: currentUser.uid,
      reporterName: currentProfile?.displayName || "reader",
      targetType: reportTarget.targetType,
      targetId: reportTarget.targetId,
      parentId: reportTarget.parentId || "",
      reportedUserId: reportTarget.reportedUserId || "",
      targetPreview: String(reportTarget.targetPreview || "").slice(0, 500),
      reason: reportReason.value,
      details: reportDetails.value.trim(),
      status: "pending",
      createdAt: serverTimestamp()
    });
    closeReport();
    showToast("your report was sent privately.");
  } catch (error) {
    console.error(error);
    reportMessage.textContent = "the report could not be sent.";
  } finally {
    submitReportButton.disabled = false;
    submitReportButton.textContent = "send report";
  }
});

function createContentMarkup(post) {
  return `
    ${post.title ? `<h3>${escapeHtml(post.title)}</h3>` : ""}
    <p class="post-body">${escapeHtml(post.body)}</p>
    ${post.imageUrl ? `<img class="post-photo" src="${escapeHtml(post.imageUrl)}" alt="photo shared with this book post" loading="lazy">` : ""}
    <div class="post-tags">
      <span class="pill">${escapeHtml(post.readingStatus || "book thoughts")}</span>
      ${post.bookTitle ? `<span class="pill">📖 ${escapeHtml(post.bookTitle)}</span>` : ""}
    </div>
  `;
}

function attachComments(post, commentsArea) {
  const commentsList = commentsArea.querySelector(".comments-list");
  const commentsCount = commentsArea.closest(".post-card").querySelector("[data-comments-count]");
  const commentsRef = query(
    collection(db, "posts", post.id, "comments"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
    commentsList.innerHTML = "";
    commentsCount.textContent = `💬 ${snapshot.size}`;

    snapshot.docs.forEach((entry) => {
      const comment = { id: entry.id, ...entry.data() };
      const element = document.createElement("article");
      element.className = "comment";
      element.innerHTML = `
        <span class="avatar avatar-small" style="--avatar-color:${escapeHtml(comment.avatarColor || "#e8b8c5")}">
          ${avatarMarkup(comment)}
        </span>
        <div>
          <div class="comment-heading">
            <a class="comment-author" href="profile.html?uid=${encodeURIComponent(comment.userId)}">
              <strong>${escapeHtml(comment.displayName || "reader")}</strong>
            </a>
            <div class="comment-actions">
              ${comment.userId === currentUser.uid ? '<button class="inline-action" data-delete-comment type="button">delete</button>' : ""}
              <button class="inline-action" data-report-comment type="button">report</button>
            </div>
          </div>
          <p>${escapeHtml(comment.text)}</p>
          <small>${formatDate(comment.createdAt)}</small>
        </div>
      `;

      element.querySelector("[data-report-comment]").addEventListener("click", () =>
        openReport({
          targetType: "comment",
          targetId: comment.id,
          parentId: post.id,
          reportedUserId: comment.userId,
          targetPreview: comment.text
        })
      );

      element.querySelector("[data-delete-comment]")?.addEventListener("click", (event) =>
        twoClickDelete(event.currentTarget, async () => {
          await deleteDoc(doc(db, "posts", post.id, "comments", comment.id));
          showToast("your comment was deleted.");
        })
      );

      commentsList.appendChild(element);
    });
  });

  childUnsubscribers.set(`comments-${post.id}`, unsubscribe);

  const form = commentsArea.querySelector(".comment-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    const button = form.querySelector("button");
    button.disabled = true;

    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        userId: currentUser.uid,
        ...profileSnapshot(),
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

function revealPost(post, card) {
  const shield = card.querySelector(".spoiler-shield");
  if (shield) shield.remove();

  const content = document.createElement("div");
  content.className = "post-content";
  content.innerHTML = createContentMarkup(post);
  card.querySelector(".post-social").before(content);

  const commentsArea = card.querySelector(".comments-area");
  commentsArea.hidden = false;
  attachComments(post, commentsArea);
}

function renderPosts() {
  clearChildListeners();
  postsList.innerHTML = "";
  postsEmpty.hidden = posts.length !== 0;

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    card.innerHTML = `
      <div class="post-top">
        <a class="post-author" href="profile.html?uid=${encodeURIComponent(post.userId)}">
          <span class="avatar avatar-medium" style="--avatar-color:${escapeHtml(post.avatarColor || "#e8b8c5")}">
            ${avatarMarkup(post)}
          </span>
          <span>
            <strong>${escapeHtml(post.displayName || "reader")}</strong>
            <small>${formatDate(post.updatedAt || post.createdAt)}</small>
          </span>
        </a>
        <div class="post-menu">
          ${post.userId === currentUser.uid ? '<button class="post-action" data-edit-post type="button">edit</button><button class="post-action" data-delete-post type="button">delete</button>' : ""}
          <button class="post-action" data-report-post type="button">report</button>
        </div>
      </div>

      ${post.spoiler ? `
        <div class="spoiler-shield">
          <strong>spoilers hidden</strong>
          <p>the title, text, photo, and comments are covered.</p>
          <button class="reveal-button" type="button">reveal post</button>
        </div>
      ` : `<div class="post-content">${createContentMarkup(post)}</div>`}

      <div class="post-social">
        <div class="post-social-bar">
          <button class="social-button" data-like-button type="button">♡ 0</button>
          <button class="social-button" data-comments-count type="button">💬 0</button>
        </div>

        <div class="comments-area" ${post.spoiler ? "hidden" : ""}>
          <div class="comments-list"></div>
          <form class="comment-form">
            <input type="text" maxlength="800" required placeholder="write a comment">
            <button type="submit">post</button>
          </form>
        </div>
      </div>
    `;

    card.querySelector(".reveal-button")?.addEventListener("click", () => revealPost(post, card));

    if (!post.spoiler) attachComments(post, card.querySelector(".comments-area"));

    const likeButton = card.querySelector("[data-like-button]");
    const likesRef = collection(db, "posts", post.id, "likes");
    const likeUnsubscribe = onSnapshot(likesRef, (snapshot) => {
      const liked = snapshot.docs.some((entry) => entry.id === currentUser.uid);
      likeButton.classList.toggle("liked", liked);
      likeButton.textContent = `${liked ? "♥" : "♡"} ${snapshot.size}`;
      likeButton.dataset.liked = String(liked);
    });
    childUnsubscribers.set(`likes-${post.id}`, likeUnsubscribe);

    likeButton.addEventListener("click", async () => {
      const ref = doc(db, "posts", post.id, "likes", currentUser.uid);
      try {
        if (likeButton.dataset.liked === "true") await deleteDoc(ref);
        else await setDoc(ref, { userId: currentUser.uid, createdAt: serverTimestamp() });
      } catch (error) {
        console.error(error);
        showToast("the like could not be updated.");
      }
    });

    card.querySelector("[data-comments-count]").addEventListener("click", () => {
      if (post.spoiler && card.querySelector(".spoiler-shield")) {
        showToast("reveal the spoiler post before opening its comments.");
      } else {
        card.querySelector(".comments-area").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    card.querySelector("[data-edit-post]")?.addEventListener("click", () => beginPostEdit(post));
    card.querySelector("[data-delete-post]")?.addEventListener("click", (event) =>
      twoClickDelete(event.currentTarget, async () => {
        await deleteDoc(doc(db, "posts", post.id));
        showToast("your post was deleted.");
      })
    );
    card.querySelector("[data-report-post]").addEventListener("click", () =>
      openReport({
        targetType: "post",
        targetId: post.id,
        parentId: "",
        reportedUserId: post.userId,
        targetPreview: `${post.title || ""} ${post.body}`
      })
    );

    postsList.appendChild(card);
  });
}

function renderReaders() {
  const search = readerSearch.value.trim().toLowerCase();
  const visible = profiles.filter((profile) =>
    String(profile.displayName || "").toLowerCase().includes(search)
  );

  readersGrid.innerHTML = "";
  readersEmpty.hidden = visible.length !== 0;

  visible.forEach((profile) => {
    const card = document.createElement("a");
    card.className = "reader-card";
    card.href = `profile.html?uid=${encodeURIComponent(profile.id)}`;
    card.innerHTML = `
      <span class="avatar avatar-large" style="--avatar-color:${escapeHtml(profile.avatarColor || "#e8b8c5")}">
        ${avatarMarkup(profile)}
      </span>
      <h3>${escapeHtml(profile.displayName || "reader")}</h3>
      <p>${escapeHtml(profile.bio || "an ink and ivy reader")}</p>
      <div class="reader-card-stats">
        <span class="pill">${(profile.favoriteBookIds || []).length} favorites</span>
        <span class="pill">${(profile.tbrBookIds || []).length} tbr</span>
      </div>
    `;
    readersGrid.appendChild(card);
  });
}

readerSearch.addEventListener("input", renderReaders);

function renderChatMessage(message) {
  const element = document.createElement("article");
  element.className = "chat-message";

  const messageContent = message.spoiler
    ? `<div class="chat-spoiler"><button class="reveal-button" type="button">reveal spoiler message</button></div>`
    : `<p>${escapeHtml(message.text)}</p>`;

  element.innerHTML = `
    <span class="avatar avatar-small" style="--avatar-color:${escapeHtml(message.avatarColor || "#e8b8c5")}">
      ${avatarMarkup(message)}
    </span>
    <div>
      <div class="chat-message-meta">
        <a class="chat-author" href="profile.html?uid=${encodeURIComponent(message.userId)}">
          <strong>${escapeHtml(message.displayName || "reader")}</strong>
          <small>${formatDate(message.createdAt)}</small>
        </a>
        <div class="chat-message-actions">
          ${message.userId === currentUser.uid ? '<button class="inline-action" data-delete-chat type="button">delete</button>' : ""}
          <button class="inline-action" data-report-chat type="button">report</button>
        </div>
      </div>
      ${messageContent}
    </div>
  `;

  element.querySelector(".reveal-button")?.addEventListener("click", (event) => {
    const wrapper = event.currentTarget.parentElement;
    wrapper.innerHTML = `<p>${escapeHtml(message.text)}</p>`;
  });

  element.querySelector("[data-delete-chat]")?.addEventListener("click", (event) =>
    twoClickDelete(event.currentTarget, async () => {
      await deleteDoc(doc(db, "chatMessages", message.id));
      showToast("your message was deleted.");
    })
  );

  element.querySelector("[data-report-chat]").addEventListener("click", () =>
    openReport({
      targetType: "chat",
      targetId: message.id,
      parentId: "",
      reportedUserId: message.userId,
      targetPreview: message.text
    })
  );

  return element;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatText.value.trim();
  if (!text || !currentUser || !currentProfile) return;

  const button = document.querySelector("#send-chat-button");
  button.disabled = true;
  chatFormMessage.textContent = "";

  try {
    await addDoc(collection(db, "chatMessages"), {
      userId: currentUser.uid,
      ...profileSnapshot(),
      text,
      spoiler: chatSpoiler.checked,
      createdAt: serverTimestamp()
    });
    chatForm.reset();
  } catch (error) {
    console.error(error);
    chatFormMessage.textContent = "the message could not be sent.";
  } finally {
    button.disabled = false;
  }
});

refreshFeedButton.addEventListener("click", () => renderPosts());
signoutButton.addEventListener("click", () => signOut(auth));

function startListeners() {
  unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
    books = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    populateBookSelect();
  });

  unsubscribeProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
    profiles = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => String(a.displayName || "").localeCompare(String(b.displayName || "")));
    renderReaders();
  });

  unsubscribePosts = onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(60)),
    (snapshot) => {
      posts = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      renderPosts();
    },
    (error) => {
      console.error(error);
      showToast("the community feed could not be loaded.");
    }
  );

  unsubscribeChat = onSnapshot(
    query(collection(db, "chatMessages"), orderBy("createdAt", "asc"), limitToLast(100)),
    (snapshot) => {
      chatMessages.innerHTML = "";
      chatEmpty.hidden = snapshot.size !== 0;
      snapshot.docs.forEach((entry) =>
        chatMessages.appendChild(renderChatMessage({ id: entry.id, ...entry.data() }))
      );
      chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    (error) => {
      console.error(error);
      chatFormMessage.textContent = "the chat could not be loaded.";
    }
  );
}

function stopListeners() {
  [unsubscribePosts, unsubscribeProfiles, unsubscribeBooks, unsubscribeChat].forEach((unsubscribe) => unsubscribe?.());
  unsubscribePosts = unsubscribeProfiles = unsubscribeBooks = unsubscribeChat = null;
  clearChildListeners();
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  loginView.hidden = Boolean(user);
  communityView.hidden = !user;
  signoutButton.hidden = !user;
  myPublicProfileLink.hidden = !user;

  stopListeners();

  if (user) {
    try {
      await loadCurrentProfile(user);
      startListeners();
    } catch (error) {
      console.error(error);
      showToast("your community profile could not be loaded.");
    }
  }
});
