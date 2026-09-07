# Instagram and TikTok DMs

## What cannot be automated, and why not to try

Neither platform offers a way to message people who have not messaged you
first. Instagram's Messaging API only opens a window *after* someone contacts
you; TikTok has no DM API at all. The third-party tools that advertise DM
automation work by driving a logged-in session, which breaks both platforms'
terms. The penalty is an action block or a ban — and a blocked account cannot
send DMs at all, which is strictly worse than sending them slowly by hand.

So the script does the half that can be done: it writes each message,
personalised, into a cell you copy. You send them yourself.

## Setup

You already have the sheet from the email setup. Add the DM side:

1. **Outreach → Set up DM sheet.** A second tab called `DMs` appears.
2. Fill in `Handle`, `Platform`, `Name` if you know it, and **`What they
   posted`** — one specific line about the actual video or post.
3. **Outreach → Build DM messages.** The `Message` column fills in.
4. Copy a cell, send it, set `Status` to `Sent`.

Rows already `Sent` get a `Follow-up` message built instead. `Replied` and
`Do not contact` rows are never touched again.

A row with no `What they posted` is skipped, and the script says how many it
skipped. That is deliberate: the rest of the message is identical for
everyone, so without that line there is nothing worth sending.

## Why there is no link in the first message

A link from an account you do not follow reads as spam to the person and to
the platform, and DMs from strangers land in Requests, where a link makes them
easier to dismiss. So the first message asks a question and offers the link.
Send this only once they reply:

```
here it is: https://selenaghane.github.io/email-database

the submit form is https://selenaghane.github.io/email-database/submit - paste
the email exactly as you have it, you don't need to censor anything yourself.
i swap out names and schools before publishing, and the reply you got is never
published.
```

## Sending them without getting restricted

Both platforms rate-limit unsolicited DMs, and a new or low-activity account
sending many in a row is the exact pattern they act on.

- **Warm the account first.** If it is new or empty, it will be limited
  quickly. A profile with a bio, a photo, and some normal activity is treated
  differently from a blank one.
- **Go slowly.** A couple of dozen a day is a sane ceiling; spread them out
  rather than sending in one burst.
- **Never send identical text.** The `What they posted` line is what makes
  each message different, which is both why it works and why it does not trip
  spam detection.
- **Stop when told.** Anyone who says no, or does not reply after one
  follow-up, is done. Set `Do not contact`.

## Comment first

Replying to a post before you DM raises the reply rate a lot: your name is
already familiar when the message arrives, and a comment is public and
low-pressure where a DM is neither. Leave something real on the post — not
"great video" — then DM a day later.

## Ages

A good share of study and college-advice creators are under 18. Instagram
restricts adults DMing teenagers who do not follow them, so some messages will
simply not deliver. Where a business email is listed, that often reaches a
parent or manager, and that is who decides — which is a reason to keep the
wording plain and unpushy in both channels.

## Which channel to use for whom

| They have | Use | Why |
| --- | --- | --- |
| a business email in bio | email | Higher effort to send, far higher reply rate, no rate limits |
| no email, active comments | comment, then DM | The comment does the introducing |
| no email, large following | DM only | Expect a low reply rate and do not chase |

If a creator lists a business email, use it. The email templates are stronger
than the DM copy and nothing about a DM makes it more likely to be read.
