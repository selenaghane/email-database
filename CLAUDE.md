# Email Library

A free, public library of real student outreach emails that worked — cold
emails to professors, internship inquiries, podcast/event invites — with
annotations explaining the moves each one makes. Every email in the
collection worked (got a reply) — there is no "no-reply" filtering/category.
There is a separate `outcome` field (see Data model) for what happened
*after* the reply — a one-line factual result, not a reply-status tag.

## Stack

- Static site: Astro + Tailwind, deployed to GitHub Pages. No backend, no
  database, no auth.
- `astro.config.mjs` has `site`/`base` placeholders — update them once the
  real GitHub username/repo is known.
- Content lives as markdown files with YAML frontmatter in
  `src/content/emails/`. Submissions come in through `/submit` (a Web3Forms-
  backed form) or by forwarding to a contact email — see Submission flow
  below. Either way, they are turned into content files by hand; there is no
  automated ingestion path.

## Data model (`src/content/config.ts`)

Per email, frontmatter holds:

- `id` — string, must equal the filename (without `.md`). One source of
  truth for the URL and the content; checked by
  `scripts/validate-annotations.mjs`, not by Zod.
- `category` — `research-position | internship | podcast-invite |
  event-invite | other`. Fixed enum, not meant to be edited casually. This is
  the *topic* of the outreach (what it's about).
- `approach` — `cold-email | attended-event | brief-meeting | taught-by |
  referred`. Fixed enum. This is the sender's connection to the recipient
  at the time of the email: no prior contact at all, having seen/heard them
  at a talk or event, a brief in-person meeting (e.g. a conference, career
  fair), the recipient having taught the sender directly, or an
  introduction/referral from a mutual contact. Orthogonal to `category`: an
  internship inquiry and a podcast invite can each use any of these.
- `context` — 1–2 sentences: who sent it, what they were asking for.
- `outcome` — optional, one concise line: what actually resulted (e.g.
  "Recorded the episode; now published on [platform]."). Sender-side factual
  summary of what happened next, not the recipient's reply text — still
  subject to the "never publish recipient replies" and "placeholders only"
  constraints below. Shown at the bottom of the detail page, omitted
  entirely (no "Outcome" heading rendered) when absent. Optional because a
  freshly added email may not have a known outcome yet — fill it in when
  known.
- `annotations` — array of `{ quote, note }`. No `tag` field — annotations
  are not categorized, just a highlighted quote plus a one-line note.

**`body` is not a frontmatter field.** It is the markdown file's content
(everything below the `---` frontmatter block). It is treated as plain text,
not rendered markdown — pages read `entry.body` directly and splice
highlight spans into it by string offset. Don't add markdown formatting
(bold, links, headers) inside an email body; it will render as literal
characters.

**Write each paragraph as one unwrapped line.** Blank lines still separate
paragraphs (rendered with `white-space: pre-wrap`, so the browser soft-wraps
visually), but a manual hard line-break in the middle of a paragraph will
silently break any annotation `quote` that happens to span that line break —
the substring won't match. `npm run validate` will catch it, but it's easier
to just not hard-wrap.

The `emailSchema` in `src/content/config.ts` is `.strict()`: any frontmatter
key outside this list fails the build. That's deliberate — see Hard
constraints below.

## Taxonomy

`category` and `approach` are the only two filterable/categorical fields.
Their display labels are centralized in `src/data/taxonomy.ts` (`CATEGORIES`,
`APPROACHES`, `getCategoryLabel`, `getApproachLabel`) — don't hardcode a
label in a component or page. There is deliberately no third, open-ended
tagging vocabulary for annotations (there was one earlier — a `tag` field
plus a `src/data/tags.ts` vocabulary — but it was removed as redundant/
confusing alongside `category`/`approach`). Annotations are just
`{ quote, note }`; don't reintroduce a `tag` field without confirming with
the user first.

## Validation

`scripts/validate-annotations.mjs` runs automatically before every build
(`npm run build` → `validate` → `astro check` → `astro build`; run it alone
via `npm run validate`). It checks, per email file:

1. frontmatter `id` matches the filename.
2. every `annotations[].quote` is an exact substring of the raw body text.

These can't be expressed inside the Zod schema because `body` lives outside
frontmatter. If you change how `body` is stored, update this script too.

## Hard constraints

- **Never publish recipient replies.** There is no schema field for a
  reply/response, and none should ever be added. The `.strict()` schema
  will fail the build if one is added by mistake (e.g. pasted in from a raw
  form export) — do not work around that by loosening the schema. This
  library is about the outreach email only, never what the recipient said
  back.
- **Placeholders only.** No real names, institutions, paper/talk titles, or
  other identifying details in committed content — including examples and
  fixtures. Use bracketed placeholders like `[R1 university]`,
  `[talk title]`, `[subfield]`, `[student name]`. This applies to `context`
  and `body` alike.
- **Annotation notes are descriptive, not causal.** A note should name the
  move the email makes ("pre-answers scheduling logistics", "names a
  specific, low-effort ask"), not claim it's why the recipient replied
  ("this is why they said yes"). We don't have the counterfactual — there's
  no comparison set of ignored emails, so there's no basis for causal
  claims. When writing or reviewing annotations, if a note reads like a
  claim about the recipient's motivation rather than a description of the
  email's structure, rewrite it.

## Submission flow

`src/pages/submit.astro` is a form, not a content pipeline — it collects raw
submissions for a human to read, it does not publish anything by itself.

- **Where the key lives.** The form posts client-side (no backend) to
  Web3Forms using `PUBLIC_WEB3FORMS_KEY`, read via
  `import.meta.env.PUBLIC_WEB3FORMS_KEY` and injected into the page's inline
  script with Astro's `define:vars`. Locally it comes from `.env` (gitignored,
  see `.env.example` for the template); in CI it comes from the
  `PUBLIC_WEB3FORMS_KEY` GitHub Actions repository secret, wired into the
  build step's `env:` in `.github/workflows/deploy.yml`. Because this is a
  static site with no server, the key ships inside the public JS bundle —
  that's expected for Web3Forms (the key is rate-limited/domain-checked on
  their end, not a server secret), not a bug to fix.
- **What the form collects:** `category`, `priorContact` (maps to the
  content schema's `approach` — options pulled from `APPROACHES` in
  `src/data/taxonomy.ts`, never retyped), `emailSubject` (required), `body`,
  `displayName` (optional — free text, "leave blank" is a valid answer for
  anonymous credit; there is no separate credit-preference enum), and
  `submitterEmail`, plus four required consent checkboxes and a `botcheck`
  honeypot field. There is no `context` field on the form — the site owner
  writes `context` by hand during publishing, same as `annotations`.
- **The form does not ask the submitter to redact or delete anything.**
  The guidance above the body field explicitly says they may self-censor
  identifying details if they want, or just paste the email exactly as they
  have it — including the recipient's reply, if it's easier to paste the
  whole thread — and it will be censored before publishing. This is a
  deliberate choice to lower submission friction: the redaction and
  reply-stripping work moved from the submitter to the site owner. It did
  not disappear.
- **Consequence: raw submissions may contain the recipient's reply and
  real identifying details.** That's expected and fine for an unreviewed
  submission sitting in an inbox — it is not fine in a content file. The
  "never publish recipient replies" and "placeholders only" hard
  constraints above apply in full when converting a submission into
  `src/content/emails/<slug>.md`: strip the reply and everything from the
  signoff onward, substitute placeholders, and write `context` and
  `annotations` by hand, before running `npm run validate` and committing.
  Never wire a submission into a content file automatically or unread.
- **The alternate path** — forwarding the raw email to the contact address
  shown on `/submit` — carries the exact same rule; the intake channel
  doesn't matter, only what ends up in the content file.

## Adding a new email

1. Create `src/content/emails/<slug>.md`.
2. Frontmatter: `id` (= `<slug>`), `category`, `approach`, `context`,
   `outcome` (optional), `annotations` (each just `{ quote, note }`).
3. Body: the email text below the frontmatter, placeholders substituted in.
4. Make sure every annotation `quote` is copy-pasted verbatim from the body
   (exact substring, including punctuation/whitespace) — `npm run validate`
   will catch mismatches before you push.
