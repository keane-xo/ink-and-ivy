INK AND IVY — NEW-TITLE SUGGESTION LIMIT CLARIFICATION

CORRECTION
The two-per-nine-weeks limit now applies to NEW BOOKS A READER WANTS ADDED
TO THE LIBRARY.

It does NOT limit checkout requests for books already on the shelves.

THE RULES ARE NOW
- Up to 3 pending checkout requests or active loans at one time
- Approved checkouts last 14 days
- Up to 2 new-title suggestions in any rolling 9-week period
- Waitlist joins do not use the new-title suggestion allowance

THE WEBSITE NOW MAKES THIS CLEAR
- "request a new book" is renamed "suggest a new title"
- The suggestion form says it is not a checkout form
- The reader-account 0/2 counter says "new titles suggested in 9 weeks"
- The reader account explains that the 0/2 rule does not limit checkouts
- The website now enforces the 2-in-9-weeks limit on title suggestions

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

Do not upload FIRESTORE_RULES.txt to GitHub.

STEP 3 — REFRESH
Homepage:
https://keane-xo.github.io/ink-and-ivy/?v=15

Reader account:
https://keane-xo.github.io/ink-and-ivy/reader.html?v=15

NOTE
Older title suggestions made before this update do not contain a reader account ID,
so they cannot be counted automatically toward an individual reader's 9-week limit.
New suggestions will be counted correctly.
