INK AND IVY — 3-BOOK LIMIT + 14-DAY CHECKOUTS

THIS UPDATE ADDS
- Reader accounts are required for checkout and waitlist requests
- A maximum of 3 pending checkout requests or active loans per reader
- A second limit check when the admin approves a checkout
- Automatic due dates exactly 14 days after approval
- Automatic book status changes:
  approve checkout -> out reading
  mark returned -> available
- Overdue labels and an overdue admin filter
- A private “my checkouts & waitlists” section on each reader’s account page
- Duplicate requests for the same book are blocked

INSTALLATION

1. FIREBASE RULES
Open FIRESTORE_RULES.txt.
Copy everything into Firebase > Firestore Database > Rules.
Replace the current rules and click Publish.

2. GITHUB
Upload and replace these nine files:
- index.html
- style.css
- script.js
- reader.html
- reader.css
- reader.js
- admin.html
- admin.css
- admin.js

Do not upload FIRESTORE_RULES.txt.

3. REFRESH
After committing, wait about one minute.
Open the homepage with ?v=11 if needed:
https://keane-xo.github.io/ink-and-ivy/?v=11

Open the admin with:
https://keane-xo.github.io/ink-and-ivy/admin.html?v=11

IMPORTANT
Older checkout records created before reader accounts were attached may not appear on a reader’s private checkout list because they do not contain that reader’s account ID. The admin can still manage those records normally. If an older approved checkout has no due date, the admin now has a “set 14-day due date” button.
