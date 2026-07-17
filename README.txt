INK AND IVY — READER COMMUNITY UPDATE

THIS UPDATE ADDS:
- Reader account creation and sign-in
- Custom display names, bios, avatar icons, colors, and optional image links
- Reader profile pictures beside comments
- One 1–5 star rating per reader per book
- Reader comments that can be edited or deleted by their author
- Average ratings inside each clickable book popup
- A review-moderation tab in the admin dashboard

STEP 1 — FIREBASE
Open FIRESTORE_RULES.txt.
Copy all of it into Firebase > Firestore Database > Rules.
Click Publish.

STEP 2 — GITHUB
Upload and replace:
- index.html
- style.css
- script.js
- admin.html
- admin.css
- admin.js

Upload these new files:
- reader.html
- reader.css
- reader.js

Do not upload FIRESTORE_RULES.txt.

STEP 3 — REFRESH
Open the homepage with ?v=7 at the end once if the old version is cached.
The reader login button will now open the account page.
