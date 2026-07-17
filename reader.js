import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
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
setPersistence(auth, browserLocalPersistence).catch(console.error);

const authView = document.querySelector("#auth-view");
const profileView = document.querySelector("#profile-view");
const signinForm = document.querySelector("#signin-form");
const signupForm = document.querySelector("#signup-form");
const signinMessage = document.querySelector("#signin-message");
const signupMessage = document.querySelector("#signup-message");
const profileForm = document.querySelector("#profile-form");
const profileMessage = document.querySelector("#profile-message");
const profileDisplayName = document.querySelector("#profile-display-name");
const profileAvatarUrl = document.querySelector("#profile-avatar-url");
const profileBio = document.querySelector("#profile-bio");
const profileAvatarPreview = document.querySelector("#profile-avatar-preview");
const profileNamePreview = document.querySelector("#profile-name-preview");
const profileBioPreview = document.querySelector("#profile-bio-preview");
const toast = document.querySelector("#toast");

let currentUser = null;
let selectedAvatar = "📚";
let selectedColor = "#e8b8c5";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function friendlyAuthError(error) {
  const code = error?.code || "";

  if (code.includes("email-already-in-use")) return "that email already has an account.";
  if (code.includes("invalid-email")) return "enter a valid email address.";
  if (code.includes("weak-password")) return "use a password with at least 6 characters.";
  if (code.includes("invalid-credential")) return "the email or password was not accepted.";
  if (code.includes("too-many-requests")) return "too many attempts. wait a moment and try again.";

  return `firebase error: ${code || "unknown-error"}`;
}

function updatePreview() {
  const name = profileDisplayName.value.trim() || "reader";
  const bio = profileBio.value.trim() || "a little corner for books and thoughts.";
  const avatarUrl = profileAvatarUrl.value.trim();

  profileNamePreview.textContent = name;
  profileBioPreview.textContent = bio;
  profileAvatarPreview.style.setProperty("--avatar-color", selectedColor);

  if (avatarUrl) {
    profileAvatarPreview.innerHTML = `<img src="${avatarUrl.replaceAll('"', "&quot;")}" alt="">`;
    const image = profileAvatarPreview.querySelector("img");
    image.addEventListener("error", () => {
      profileAvatarPreview.textContent = selectedAvatar;
    }, { once: true });
  } else {
    profileAvatarPreview.textContent = selectedAvatar;
  }
}

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    const showSignin = tab.dataset.authTab === "signin";
    signinForm.hidden = !showSignin;
    signupForm.hidden = showSignin;
    signinMessage.textContent = "";
    signupMessage.textContent = "";
  });
});

signinForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = signinForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "signing in...";
  signinMessage.textContent = "";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector("#signin-email").value.trim(),
      document.querySelector("#signin-password").value
    );
  } catch (error) {
    console.error(error);
    signinMessage.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = "sign in";
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const displayName = document.querySelector("#signup-name").value.trim();
  const email = document.querySelector("#signup-email").value.trim();
  const password = document.querySelector("#signup-password").value;
  const confirmation = document.querySelector("#signup-confirm-password").value;
  const button = signupForm.querySelector('button[type="submit"]');

  if (password !== confirmation) {
    signupMessage.textContent = "the passwords do not match.";
    return;
  }

  button.disabled = true;
  button.textContent = "creating...";
  signupMessage.textContent = "";

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "profiles", credential.user.uid), {
      displayName,
      avatarEmoji: "📚",
      avatarColor: "#e8b8c5",
      avatarUrl: "",
      bio: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    signupMessage.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = "create account";
  }
});

async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "profiles", user.uid));
  const profile = snapshot.exists()
    ? snapshot.data()
    : {
        displayName: user.email?.split("@")[0] || "reader",
        avatarEmoji: "📚",
        avatarColor: "#e8b8c5",
        avatarUrl: "",
        bio: ""
      };

  selectedAvatar = profile.avatarEmoji || "📚";
  selectedColor = profile.avatarColor || "#e8b8c5";

  profileDisplayName.value = profile.displayName || "";
  profileAvatarUrl.value = profile.avatarUrl || "";
  profileBio.value = profile.bio || "";

  document.querySelectorAll("[data-avatar]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.avatar === selectedAvatar);
  });

  document.querySelectorAll("[data-color]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.color === selectedColor);
  });

  updatePreview();
}

document.querySelectorAll("[data-avatar]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedAvatar = button.dataset.avatar;
    document.querySelectorAll("[data-avatar]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    updatePreview();
  });
});

document.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    document.querySelectorAll("[data-color]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    updatePreview();
  });
});

profileDisplayName.addEventListener("input", updatePreview);
profileAvatarUrl.addEventListener("input", updatePreview);
profileBio.addEventListener("input", updatePreview);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const button = document.querySelector("#save-profile-button");
  const displayName = profileDisplayName.value.trim();
  const avatarUrl = profileAvatarUrl.value.trim();
  const bio = profileBio.value.trim();

  if (!displayName) {
    profileMessage.textContent = "enter a display name.";
    return;
  }

  button.disabled = true;
  button.textContent = "saving...";
  profileMessage.textContent = "";

  try {
    await setDoc(
      doc(db, "profiles", currentUser.uid),
      {
        displayName,
        avatarEmoji: selectedAvatar,
        avatarColor: selectedColor,
        avatarUrl,
        bio,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    showToast("your profile was saved.");
  } catch (error) {
    console.error(error);
    profileMessage.textContent = "your profile could not be saved.";
  } finally {
    button.disabled = false;
    button.textContent = "save profile";
  }
});

document.querySelector("#reader-signout-button").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  authView.hidden = Boolean(user);
  profileView.hidden = !user;

  if (user) {
    try {
      await loadProfile(user);
    } catch (error) {
      console.error(error);
      profileMessage.textContent = "your profile could not be loaded.";
    }
  }
});
