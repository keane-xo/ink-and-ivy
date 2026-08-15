INK AND IVY — LIBRARIAN BADGE RELIABILITY FIX

I changed the badge logic again based on the screenshots where it disappeared.

WHAT WAS WRONG

The previous version was still depending too much on surrounding reader-ID
containers. Some older posts/reviews contain a reader ID that does not match the
current admin UID, so the username fallback was being skipped.

THIS VERSION DOES NOT DO THAT.

The new script treats the exact visible username "kisseskeane" as the primary
display anchor. It looks at the element's OWN text node instead of the text of a
large parent card or dropdown.

That has two benefits:
1. The badge appears beside "kisseskeane" even on older content.
2. Parent containers no longer match the username, so the dropdown cannot get
   a second duplicate Librarian pill.

The admin UID is still supported as a secondary check.

STYLE

The badge remains the subtle style requested:
- pale almost-transparent red/pink center
- dark red outline
- dark red text
- compact rounded pill
- no heavy shadow

UPLOAD AND REPLACE IN GITHUB

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

TEST

After GitHub Pages deploys:
1. Open https://keane-xo.github.io/ink-and-ivy/community.html?v=8
2. Press Ctrl+Shift+R once.
3. Check the old "new badge system created!" post.
4. Check the More dropdown.
5. Check a review and the public reader profile.

There should be exactly one subtle red Librarian pill beside each visible
"kisseskeane" username.
