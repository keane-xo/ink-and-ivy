INK AND IVY — BADGE TIERS, READER TITLES & NOTIFICATIONS
Built from the exact current ZIP you uploaded.

WHAT THIS UPDATE ADDS

BADGE TIERS
Each of the seven automatic badges now has three permanent levels:

                     SPROUT     BLOOM     EVERGREEN
Page Turner             3          6          12 books
Genre Explorer          3          6          12 genres
Friend's Choice         1          2           4 friend picks completed
Reviewer's Quill        5         10          20 reviews
Journal Keeper          5         10          20 journal pages
Tome Traveler           1          2           4 completed books over 400 pages
Seasonal Reader         4          8          16 books in one season

Once a badge level is earned, it stays earned even if later activity changes.

TIER COLORS
- Sprout: soft cream / blush
- Bloom: coral pink
- Evergreen: deep ivy green with a warm gold accent

TITLES
Completing all seven badges in a tier permanently unlocks:
- Sprout: Storykeeper
- Bloom: Ink Society
- Evergreen: Keeper of the Stacks

Readers can choose any title they have unlocked or hide their title.
The chosen title appears beside their name on their public reader page and
throughout the Community feed, comments, chat, and reader directory.

MIGRATION
Existing one-level badges are preserved automatically as Sprout badges.
Readers should not lose badges they already earned.

BADGE BANNERS
When a new badge tier is earned, a banner slides down from the top of the site.
Completing a whole tier also produces a larger "collection complete" title
announcement.

NOTIFICATION DOTS
Pink notification dots now appear for:
- Community: someone likes or comments on your post
- Friend Picks: someone recommends a book to you
- Badges: a badge tier or reader title is unlocked

If Friend Picks or Badges has something unread, the More menu gets a dot AND
the individual page inside the dropdown gets its own dot.

Opening the relevant destination clears that category's dot.

IMPORTANT FIX INCLUDED
The admin UID in the uploaded code/rules had extra characters on the end.
This package corrects it to:
66iUUKyOu7Rvu2I6Hwtdel82b

It also keeps the existing nine-week ballot working by allowing signed-in
readers to read pending title suggestions while they are on the ballot.


INSTALL — DO THIS IN THIS ORDER

1. FIREBASE FIRST
Open:
Firebase Console > Firestore Database > Rules

Open FIRESTORE_RULES.txt from this package.
Copy ALL of it.
Replace the current Firestore rules completely.
Click Publish.

Do NOT upload FIRESTORE_RULES.txt to GitHub.

2. GITHUB
Open the GITHUB-UPLOAD folder in this package.
Select ALL 21 files inside that folder.
In GitHub:
Add file > Upload files
Drag all 21 files into the upload area.
Commit directly to main.

You do not need to delete any other website files.

3. WAIT FOR GITHUB PAGES
Give GitHub Pages roughly 1–3 minutes to redeploy.

4. HARD REFRESH / TEST
Homepage:
https://keane-xo.github.io/ink-and-ivy/?v=22

Challenges:
https://keane-xo.github.io/ink-and-ivy/challenges.html?v=4

Community:
https://keane-xo.github.io/ink-and-ivy/community.html?v=4

Admin:
https://keane-xo.github.io/ink-and-ivy/admin.html?v=15


QUICK TEST CHECKLIST

A. Log in as a reader.
B. Open Challenges.
   - You should see Sprout / Bloom / Evergreen styling.
   - Each badge should show progress toward the next level.
   - You should see the three collection-title cards.
C. If that reader already had old badges, they should appear as Sprout badges.
D. If a reader has all seven Sprout badges, Storykeeper should be unlocked.
E. Save a new journal page or review that crosses a badge threshold.
   - The badge-unlocked banner should slide down.
F. From one reader account, send another reader a Friend Pick.
   - Recipient should get a pink dot on More and Friend Picks.
G. Like or comment on another reader's Community post.
   - Post owner should get a pink dot on Community.
H. Open the page with the unread notification.
   - Its dot should clear.
I. Open Admin and confirm normal admin access still works.

No paid Firebase services, Cloud Functions, or Firebase Storage were added.
