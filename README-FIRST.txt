INK AND IVY — GLOBAL RED LIBRARIAN BADGE

This replaces the earlier Librarian implementation with one global role-badge
system so the Librarian badge is not dependent on one particular page.

THE BADGE
- text: librarian
- color: rich red
- permanent role badge tied only to the librarian/admin UID
- separate from Storykeeper / Ink Society / Keeper of the Stacks

WHERE IT NOW APPEARS
Whenever the librarian username is actually shown, the red Librarian badge is
attached beside it, including:

- Homepage account/menu username
- Homepage book reviews
- Review form name
- Public reader profile
- Community posts
- Community comments
- Community reader directory
- Community chat
- Reader-account profile preview
- Friend Picks sender/recipient names
- Streak leaderboard
- Previous streak-winner name
- Reading-journal owner line
- Admin review/report displays when the librarian name appears there

HOW IT WORKS
A new global file, librarian-badge.js, watches the page for any username tagged
with the librarian's reader ID. This also handles Firestore content that appears
after the page has already loaded.

This is much more reliable than hardcoding a badge independently on each page.

UPLOAD AND REPLACE IN GITHUB

NEW FILE:
- librarian-badge.js

REPLACE:
- index.html
- script.js
- community.html
- community.js
- profile.html
- profile.js
- reader.html
- reader.js
- recommendations.html
- recommendations.js
- challenges.html
- challenges.js
- journal.html
- journal.js
- admin.html
- admin.js

NO FIREBASE RULES CHANGE IS NEEDED.

After GitHub Pages redeploys:
1. Press Ctrl+Shift+R once.
2. Open the homepage while signed into the Librarian account.
3. Check the username in More.
4. Open the Librarian public profile.
5. Check a Community post/comment/chat message from the Librarian.
6. Check the streak leaderboard if the Librarian is listed there.

The red Librarian badge should now follow the librarian username anywhere the
site renders it.
