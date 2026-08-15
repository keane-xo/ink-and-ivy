INK AND IVY — NOTIFICATION SYSTEM FIX

THIS FIX ADDRESSES BOTH PROBLEMS YOU REPORTED:

1. A pink notification dot stayed visible after you checked the page.
2. A pink notification dot could appear even when there was no genuine unread notification.

WHAT CHANGED

- Dots are now physically removed from the page when there is nothing unread.
  They are no longer created and merely hidden.

- Only notifications whose Firestore `read` field is explicitly `false` count
  as unread. Malformed/stale records with no read state no longer create dots.

- Opening Community immediately counts Community notifications as checked.
  The Community dot disappears immediately.

- Opening Friend Picks immediately counts Friend Picks notifications as checked.
  Both the Friend Picks dot and its parent More-menu dot disappear immediately.

- Opening Challenges immediately counts badge/title notifications as checked.
  Both the Badges dot and its parent More-menu dot disappear immediately.

- The browser keeps a small local read cache as a fallback so a slow Firestore
  acknowledgement cannot make a dot flash back on after you already checked it.

- Firestore still receives the permanent `read: true` update, so the state
  persists normally.

- Badge/title notifications are now idempotent. Once a badge notification has
  existed, later automatic badge syncs cannot reset that same notification to
  unread again.

- Notification Firestore update rules were simplified so the recipient can
  only mark an existing notification read.

INSTALL IN THIS ORDER

1. FIREBASE FIRST
Open FIRESTORE_RULES.txt.
Go to Firebase > Firestore Database > Rules.
Replace the current rules completely.
Click Publish.

Do NOT upload FIRESTORE_RULES.txt to GitHub.

2. GITHUB
Upload and replace ALL of these files:
- notification-center.js
- badge-engine.js
- index.html
- community.html
- recommendations.html
- challenges.html
- journal.html
- profile.html
- reader.html

The profile.html and reader.html in this fix preserve the Librarian name badge
from the later update.

3. WAIT 1–3 MINUTES FOR GITHUB PAGES.

4. TEST WITH A HARD REFRESH
Use Ctrl+Shift+R once.

Recommended test:
- Sign in to Account A.
- From Account B, like/comment on A's Community post or send A a Friend Pick.
- Return to Account A. The dot should appear.
- Open the corresponding page.
- The dot should disappear immediately and stay gone after refresh.

No paid Firebase services were added.
