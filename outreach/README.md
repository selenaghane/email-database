# Outreach mail merge

Asks students and student orgs to submit an email to the library. Runs as a
Google Apps Script bound to a Google Sheet, working through your own Gmail —
no server, no API keys, nothing secret in this repo.

**Nothing is sent automatically.** By default the script writes each email into
your Gmail drafts, personalised and addressed, and you press Send yourself.

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
   it needs Gmail access and access to this spreadsheet. Approve it. The
   "unverified app" warning is expected for a script you wrote yourself:
   *Advanced → Go to (project) → Allow*.
7. Add contacts (columns below), or paste in `sample-contacts.csv`.
8. **Outreach → Preview next email**, then **Draft queued emails**.

## Modes

`CONFIG.MODE` decides what "prepare an email" means:

| Mode | What happens |
| --- | --- |
| `draft` *(default)* | Writes a Gmail draft. You read it and press Send |
| `send` | Sends immediately. Only worth switching to once the copy has settled |
| `off` | Practice mode — works out what it would do, touches nothing |

Menu labels follow the mode, so in `send` mode the menu reads "Send queued
emails" rather than "Draft queued emails".

## Columns

Created for you by **Set up sheet**. The script looks columns up by header
name, so you can reorder them or add your own alongside.

| Column | You fill | What it does |
| --- | --- | --- |
| `Name` | yes | Greeting. First word is used, minus any `Dr.`/`Prof.` |
| `Email` | yes | Rows with a malformed address are skipped |
| `Type` | yes | `student` or `org` — picks the template |
| `Org` | orgs | Interpolated into the org subject line and body |
| `Personal note` | yes | The one line that makes it not a blast. See below |
| `Status` | sometimes | Blank or `Queued` = will be drafted. See lifecycle |
| `Drafted at` | no | Written when the draft is created |
| `Sent at` | no | Written when the script sees it in your sent mail |
| `Follow-up at` | no | Written on follow-up; guarantees only one |
| `Replied at` | no | Written by the reply check |
| `Notes` | optional | Yours. Failures get recorded here too |

## Status lifecycle

```
(blank) ──script drafts it──> Drafted ──you press Send──> Sent
                                 │                          │
                    you never send it: stops here           │
                                                            ├─ 7 days quiet ─> Sent + Follow-up at
                                                            └─ they reply ──> Replied ─(you)─> Submitted

Do not contact / Bounced            [terminal: never touched again]
```

The gap between `Drafted` and `Sent` is the point of draft mode, and the
follow-up clock deliberately starts at `Sent`, not `Drafted`. So a draft you
sit on for a week doesn't produce an instant follow-up, and a draft you decide
not to send produces nothing at all.

`Replied`, `Submitted`, `Do not contact`, and `Bounced` are terminal. Set
`Do not contact` the moment someone asks; a reply already moves them to
`Replied`, which stops mail on its own.

## Running it

Menu items, all safe to click twice — the Status guards mean nobody is drafted
or emailed twice:

- **Preview next email** — renders the next queued one, creates nothing.
- **Draft queued emails** — writes drafts, up to `DAILY_CAP`.
- **Check what I have sent** — looks for each draft in your sent mail and
  moves those rows to `Sent`, recording when you actually sent them.
- **Check for replies** — searches for mail *from* each contact dated after
  you emailed them; marks matches `Replied`.
- **Draft follow-ups** — one nudge per contact, `FOLLOWUP_AFTER_DAYS` after
  the real send.
- **Run daily pass now** — sent-check, replies, follow-ups, new drafts, in
  that order so nobody who already answered gets nudged.
- **Install daily trigger** — runs that pass every morning around 9am.

With the trigger installed your only job is adding rows and pressing Send on
drafts you're happy with.

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
