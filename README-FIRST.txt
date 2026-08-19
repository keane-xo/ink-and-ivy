INK AND IVY — BLIND DATE WITH A BOOK

Built on top of the latest repaired Ink & Ivy version, including:
- correct admin UID ending in 122
- notification fixes
- red Librarian badge
- "owner of ink and ivy" public-profile label
- Sprout / Bloom / Evergreen badges

WHAT IT ADDS

A new immersive page:
blind-date.html

Readers see mystery wrapped books instead of covers/titles/authors.

Each mystery date shows:
- the real genre
- a mood chosen by the Librarian
- an approximate reading commitment
- two custom clues
- a "perfect for..." note

Readers click "unwrap this book" to reveal:
- cover
- title
- author
- page count
- availability

Then "meet it on the shelves" opens that exact book in the normal Ink & Ivy
book-detail popup, where the existing checkout/waitlist system continues to work.

There is also a "surprise me" button that randomly chooses and unwraps a date.

ADMIN CONTROL

Admin now has a new "blind date" tab.

You can:
- turn the whole feature on/off without deleting the setup
- choose up to six books from the existing catalog
- control their order
- add mood
- add two clues
- add a "perfect for..." note
- change the page note

All reader-facing More menus now include:
blind date with a book

INSTALL IN THIS ORDER

1. FIREBASE FIRST
Open FIRESTORE_RULES.txt.
Go to Firebase > Firestore Database > Rules.
Replace the current rules completely.
Click Publish.

DO NOT upload FIRESTORE_RULES.txt to GitHub.

2. GITHUB — NEW FILES
Upload:
- blind-date.html
- blind-date.css
- blind-date.js

3. GITHUB — REPLACE
Replace:
- index.html
- community.html
- recommendations.html
- challenges.html
- journal.html
- profile.html
- reader.html
- admin.html
- admin.css
- admin.js

4. WAIT 1–3 MINUTES.

5. SET UP YOUR FIRST DATES
Open:
https://keane-xo.github.io/ink-and-ivy/admin.html?v=18

Sign in.
Open the new "blind date" tab.
Choose your mystery books and write the clues.
Click "save blind dates."

6. VIEW IT
Open:
https://keane-xo.github.io/ink-and-ivy/blind-date.html?v=1

If needed, press Ctrl+Shift+R once.

NO PAID FIREBASE SERVICES ARE USED.
Everything runs on the existing GitHub Pages + Firebase Spark setup.
