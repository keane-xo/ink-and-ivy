INK AND IVY — LIBRARIAN BADGE VISIBILITY FIX

WHY YOU DIDN'T SEE IT

The first global version primarily identified the Librarian by the reader UID
stored on each rendered item. Your Community screenshot shows the username
"kisseskeane" correctly, but the badge did not appear beside it.

This update makes the system deliberately redundant:
1. It recognizes the Librarian by the admin reader UID.
2. It ALSO recognizes the exact displayed username "kisseskeane".

That means the red badge can still appear even on older Community posts or
other records whose stored userId does not match the current admin UID.

THE BADGE

kisseskeane  [librarian]

The badge is a rich red pill and is separate from earned reading titles.

GLOBAL COVERAGE

Every Ink & Ivy HTML page loads the same global librarian-badge.js file.
The script watches the page continuously, including Firestore content that
appears after page load.

It scans for the exact Librarian username and for the Librarian UID, so the
badge follows the username anywhere it is rendered.

UPLOAD TO GITHUB

NEW/REPLACEMENT:
- librarian-badge.js

REPLACE THESE HTML FILES:
- index.html
- community.html
- recommendations.html
- challenges.html
- journal.html
- profile.html
- reader.html
- admin.html

WHY THE HTML FILES ARE INCLUDED:
They change the script URL from ?v=1 to ?v=2 so Chrome/GitHub Pages cannot keep
serving the cached first version.

NO FIREBASE RULES CHANGE IS NEEDED.

AFTER UPLOAD

1. Wait 1–3 minutes for GitHub Pages.
2. Open:
   https://keane-xo.github.io/ink-and-ivy/community.html?v=6
3. Press Ctrl+Shift+R once.
4. Look at the same "kisseskeane" post shown in your screenshot.

You should now see the red Librarian badge directly beside the username.
