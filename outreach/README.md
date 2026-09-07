# Outreach mail merge

Asks students and student orgs to submit an email to the library. Runs as a
Google Apps Script bound to a Google Sheet, sending from your own Gmail — no
server, no API keys, nothing secret in this repo.

Gmail allows roughly 100 recipients/day on a consumer account; `DAILY_CAP` is
set to 40. Anything left over rolls to the next run.

## Setup (about ten minutes, once)

1. Create a Google Sheet. Name it whatever you like.
2. **Extensions → Apps Script.** Delete the stub `Code.gs` it opens with.
3. Add two script files matching the two here, and paste the contents in:
   - `Code.gs` ← `outreach/Code.gs`
   - `Templates.gs` ← `outreach/Templates.gs`
4. In `Code.gs`, set `CONFIG.FROM_NAME` to your name. Check `REPLY_TO` and
   `SITE_URL` while you're there.
5. Save, then reload the Sheet. An **Outreach** menu appears in the menu bar.
6. **Outreach → Set up sheet.** Google will ask you to authorize the script —
   it needs Gmail send access and access to this spreadsheet. Approve it. The
   "unverified app" warning is expected for a script you wrote yourself:
   *Advanced → Go to (project) → Allow*.
7. Add contacts (columns below), or paste in `sample-contacts.csv` as a
   starting point.
8. **Outreach → Preview next email.** Read it end to end.
9. Only once that looks right, set `DRY_RUN: false` in `Code.gs`.

## Columns

Created for you by **Set up sheet**. The script looks columns up by header
name, so you can reorder them or add your own alongside.

| Column | You fill | What it does |
| --- | --- | --- |
| `Name` | yes | Greeting. First word is used, minus any `Dr.`/`Prof.` |
| `Email` | yes | Rows with a malformed address are skipped, not sent |
| `Type` | yes | `student` or `org` — picks the template |
| `Org` | orgs | Interpolated into the org subject line and body |
| `Personal note` | yes | The one line that makes it not a blast. See below |
| `Status` | sometimes | Blank or `Queued` = will send. See lifecycle below |
| `Sent at` | no | Written on send; the follow-up clock starts here |
| `Follow-up sent at` | no | Written on follow-up; guarantees only one |
| `Replied at` | no | Written by the reply check |
| `Notes` | optional | Yours. Send failures get recorded here too |

## Status lifecycle

```
(blank) ──send──> Sent ──7 days, no reply──> Sent + Follow-up sent at
   │                │
   │                └──they reply──> Replied ─(you, by hand)─> Submitted
   │
   └── Do not contact / Bounced          [terminal: never emailed again]
```

`Replied`, `Submitted`, `Do not contact`, and `Bounced` are terminal — the
script skips those rows on every pass. Set `Do not contact` the moment someone
asks, including a "no thanks" reply; the reply check will have already moved
them to `Replied`, which stops mail on its own.

## Running it

Menu items, all safe to click twice — the Status guards mean nothing is sent
to the same person twice:

- **Preview next email** — renders the next queued one, sends nothing.
- **Send queued emails** — initial emails, up to the cap.
- **Check for replies** — searches Gmail for mail *from* each contact dated
  after you emailed them; marks matches `Replied`.
- **Send follow-ups** — one nudge per contact, `FOLLOWUP_AFTER_DAYS` later.
- **Run daily pass now** — replies, then follow-ups, then new sends, in that
  order so nobody who already answered gets nudged.
- **Install daily trigger** — runs that pass every morning around 9am.

Install the trigger and the whole thing runs itself; you just keep adding rows.

## The personal note is the part that matters

Everything else here is mechanical. `Personal note` is one specific sentence —
where you met, what they worked on, who suggested them — dropped in above the
pitch. A merge with a real note reads like an email; the same merge with an
empty note reads like a blast, and gets treated as one.

If you can't write that line for a contact, that's a useful signal about
whether they belong on the list.

Two lines in the templates are load-bearing and worth keeping if you rewrite
the copy: the opt-out (what makes the single follow-up defensible) and the
promise that you handle redaction (submitters paste much more readily once
they know they don't have to censor anything — which is exactly how `/submit`
is written).

## Keep the real list out of git

`outreach/contacts.csv` is gitignored. The live list belongs in the Sheet, not
the repo — the same placeholders-only rule that governs `src/content/emails/`
applies to anything committed here, and a contact list is real names and real
addresses by definition.
