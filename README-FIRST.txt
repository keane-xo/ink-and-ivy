INK AND IVY — CRITICAL ADMIN UID REPAIR

THE SCREENSHOT CONFIRMED THE ACTUAL FIREBASE AUTH UID:

66iUUKyOu7Rvu2I6Hwtdel82b122

The earlier badge/notification build incorrectly removed the final "122".
That was the cause of the Admin page saying:

"the login worked, but this account has uid ..."

This package restores the correct UID everywhere the recent updates had changed it.

FILES REPAIRED
- admin.js
- challenges.js
- streaks.js
- librarian-badge.js
- FIRESTORE_RULES.txt

HTML FILES ARE INCLUDED ONLY TO CACHE-BUST THE REPAIRED JS:
- index.html
- community.html
- recommendations.html
- challenges.html
- journal.html
- profile.html
- reader.html
- admin.html

The profile.html in this package PRESERVES:
- the Librarian badge system
- "owner of ink and ivy" above the public profile name

INSTALL IN THIS ORDER

1. FIREBASE
Open FIRESTORE_RULES.txt.
Go to Firebase > Firestore Database > Rules.
Replace the current rules completely and click Publish.

DO NOT upload FIRESTORE_RULES.txt to GitHub.

2. GITHUB
Upload and replace:
- admin.js
- challenges.js
- streaks.js
- librarian-badge.js
- index.html
- community.html
- recommendations.html
- challenges.html
- journal.html
- profile.html
- reader.html
- admin.html

3. WAIT 1–3 MINUTES.

4. TEST ADMIN
Open:
https://keane-xo.github.io/ink-and-ivy/admin.html?v=17

Press Ctrl+Shift+R once, then sign in.

The Admin dashboard should now accept the account with UID:
66iUUKyOu7Rvu2I6Hwtdel82b122

5. TEST READER FEATURES
Also check:
- Librarian badge
- Challenges/streaks
- Community
- Friend Picks

No paid Firebase services are involved.
