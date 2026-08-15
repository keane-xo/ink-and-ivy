INK AND IVY — LIBRARIAN BADGE STYLE + DUPLICATE FIX

This fixes the two things shown in your screenshots:

1. The Librarian pill was too heavy/tall in Community.
2. It could duplicate in the More dropdown.

NEW STYLE
- pale, almost-transparent red/pink center
- dark red outline
- dark red text
- no heavy shadow
- compact rounded pill, modeled after the "picked by me" badge

DUPLICATE FIX
The script now uses the reader-ID host first and only uses the username fallback
when no reader-ID host surrounds the name. It also removes extra copies if more
than one badge gets attached to the same username area.

UPLOAD AND REPLACE IN GITHUB:
- librarian-badge.js
- index.html
- community.html
- recommendations.html
- challenges.html
- journal.html
- profile.html
- reader.html
- admin.html

NO FIREBASE RULES CHANGE IS NEEDED.

After upload:
1. Wait 1–3 minutes.
2. Open https://keane-xo.github.io/ink-and-ivy/community.html?v=7
3. Press Ctrl+Shift+R once.
4. Check both a Community post and the More dropdown.
