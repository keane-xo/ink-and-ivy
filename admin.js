import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1d0xo61Z0U9mReJnw7s5Z3x0HFrrfB2k",
  authDomain: "ink-and-ivy-d0ff3.firebaseapp.com",
  projectId: "ink-and-ivy-d0ff3",
  storageBucket: "ink-and-ivy-d0ff3.firebasestorage.app",
  messagingSenderId: "444464034610",
  appId: "1:444464034610:web:de9c2c3a33737ae6849d2b"
};

const ADMIN_UID = "66iUUKyOu7Rvu2I6Hwtdel82b122";

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

let borrowingRequests = [];
let bookSuggestions = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2500);
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
        <h3>${item.bookTitle}</h3>
        <p><strong>${item.name}</strong> · ${item.requestType}</p>
        <p class="meta">by ${item.author || "unknown author"}</p>
        <p class="meta">${formatDate(item.createdAt)}</p>
        <span class="status">${item.status}</span>
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
        <h3>${item.title}</h3>
        <p><strong>${item.name}</strong> suggested this title</p>
        <p class="meta">by ${item.author || "unknown author"}</p>
        ${item.reason ? `<p>${item.reason}</p>` : ""}
        <p class="meta">${formatDate(item.createdAt)}</p>
        <span class="status">${item.status}</span>
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

async function loadData() {
  refreshButton.disabled = true;
  refreshButton.textContent = "loading...";

  try {
    const borrowingSnapshot = await getDocs(
      query(collection(db, "checkoutRequests"), orderBy("createdAt", "desc"))
    );
    const suggestionSnapshot = await getDocs(
      query(collection(db, "bookSuggestions"), orderBy("createdAt", "desc"))
    );

    borrowingRequests = borrowingSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data()
    }));

    bookSuggestions = suggestionSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data()
    }));

    updateCounts();
    renderBorrowing();
    renderSuggestions();
  } catch (error) {
    console.error(error);
    showToast("the dashboard could not load.");
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "refresh";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#admin-email").value.trim();
  const password = document.querySelector("#admin-password").value;

  loginButton.disabled = true;
  loginButton.textContent = "signing in...";
  loginMessage.textContent = "";

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (credential.user.uid !== ADMIN_UID) {
      await signOut(auth);
      loginMessage.textContent = "this account does not have admin access.";
    }
  } catch (error) {
    console.error(error);
    const code = error?.code || "unknown-error";
    loginMessage.textContent = `firebase error: ${code}`;
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

    const showingBorrowing = tab.dataset.tab === "borrowing";
    document.querySelector("#borrowing-panel").hidden = !showingBorrowing;
    document.querySelector("#suggestions-panel").hidden = showingBorrowing;
  });
});

onAuthStateChanged(auth, async (user) => {
  const isAdmin = user?.uid === ADMIN_UID;

  loginView.hidden = isAdmin;
  dashboardView.hidden = !isAdmin;
  signOutButton.hidden = !isAdmin;

  if (isAdmin) {
    await loadData();
  }
});
