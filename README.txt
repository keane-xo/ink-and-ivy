INK AND IVY — COMMUNITY SOCIAL UPDATE

THIS UPDATE ADDS
- A signed-in community page
- A book-centered social feed
- Personal book-blog posts with optional image links
- Spoiler mode that hides the title, text, image, and comments until clicked
- Likes and comments
- Clickable public reader pages
- Favorite books, TBR, and currently-reading lists
- A community-wide book chat
- Spoiler-hidden chat messages
- Private reporting for posts, comments, and chat messages
- A report queue in the admin dashboard

INSTALLATION

1. FIREBASE RULES
Open FIRESTORE_RULES.txt.
Copy everything into Firebase > Firestore Database > Rules.
Replace the current rules and click Publish.

2. GITHUB
Upload and replace:
- index.html
- reader.html
- reader.css
- reader.js
- admin.html
- admin.css
- admin.js

Upload these new files:
- community.html
- community.css
- community.js
- profile.html
- profile.css
- profile.js

The package also contains the current style.css, script.js, and favicon.svg.
They do not need to be uploaded unless they are missing from GitHub.

Do not upload FIRESTORE_RULES.txt.

3. REFRESH
After committing, wait about one minute.
Open community.html?v=1 in a new tab if Chrome shows an older version.
