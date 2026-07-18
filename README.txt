INK AND IVY — FREE STREAKS, NINE-WEEK VOTING, AND AUTOMATIC BADGES

THIS VERSION DOES NOT REQUIRE A PAID FIREBASE PLAN.

The implementation intentionally avoids:
- Cloud Functions
- Cloud Scheduler
- Firebase Storage
- Any paid server or outside service

Because there is no paid scheduled backend, a completed cycle is finalized
automatically the first time the librarian/admin opens the streaks page after
the cycle has ended.

STREAK RULES

- Streak tracking starts August 13, 2026.
- One signed-in visit per calendar day counts.
- The website uses the America/Chicago calendar date.
- Every cycle lasts exactly 63 days.
- The first cycle is August 13 through October 14, 2026.
- The website stores both the current streak and the highest streak reached
  during the cycle.
- Losing a streak does not erase the cycle's highest streak.
- The librarian/admin account is excluded from the prize.
- A tie is won by the reader who reached the tied streak first.

BOOK SELECTION AT THE END OF EACH CYCLE

Exactly three books are selected:
1. One guaranteed selection chosen by the reader with the highest cycle streak.
2. Two books chosen by all readers from a three-book ballot.

The community ballot opens during the final seven days of each cycle.
The admin selects the three ballot finalists before voting opens.

AUTOMATIC BADGES

The progress buttons are gone. The website now checks:
- Completed checkout records
- Genres of completed books
- Completed books received through Friend Picks
- Published book reviews
- Saved reading-journal pages
- Book page counts
- Completed books within the same season

Brave Browser has been removed.

PAGE COUNTS

Tome Traveler requires page-count information. The updated admin book editor
has an optional Page Count field. Existing books can be edited to add it.

STEP 1 — FIREBASE RULES

Open FIRESTORE_RULES.txt.
Copy everything into Firebase > Firestore Database > Rules.
Replace the current rules and click Publish.

STEP 2 — GITHUB

Upload and replace:
- index.html
- style.css
- script.js
- reader.html
- reader.css
- reader.js
- community.html
- community.css
- community.js
- profile.html
- profile.css
- profile.js
- journal.html
- journal.css
- journal.js
- recommendations.html
- recommendations.css
- recommendations.js
- challenges.html
- challenges.css
- challenges.js
- admin.html
- admin.css
- admin.js

Upload these new files:
- streaks.js
- badge-engine.js

Do not upload FIRESTORE_RULES.txt to GitHub.

STEP 3 — OPEN THE PAGE

https://keane-xo.github.io/ink-and-ivy/challenges.html?v=2

The first cycle does not begin until August 13, 2026, so the page will show a
countdown before that date.
