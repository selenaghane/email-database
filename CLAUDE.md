# Email Library

A free, public library of real student outreach emails that worked — cold
emails to professors, internship inquiries, podcast/event invites — with
annotations explaining the moves each one makes. Every email in the
collection worked (got a reply); there is no "no-reply"/outcome tracking —
that was considered and deliberately removed. Don't reintroduce an
outcome/reply-status field without confirming with the user first.

## Stack

- Static site: Astro + Tailwind, deployed to GitHub Pages. No backend, no
  database, no auth.
- `astro.config.mjs` has `site`/`base` placeholders — update them once the
  real GitHub username/repo is known.
- Content lives as markdown files with YAML frontmatter in
  `src/content/emails/`. Submissions currently come in through a Google Form
  and are turned into these files by hand (or by a script you write later) —
  there is no live ingestion path.

## Data model (`src/content/config.ts`)

Per email, frontmatter holds:

- `id` — string, must equal the filename (without `.md`). One source of
  truth for the URL and the content; checked by
  `scripts/validate-annotations.mjs`, not by Zod.
- `category` — `research-position | internship | podcast-invite |
  event-invite | other`. Fixed enum, not meant to be edited casually. This is
  the *topic* of the outreach (what it's about).
- `approach` — `cold-email | follow-up | warm-connection`. Fixed enum. This
  is *how* the sender reached the recipient — no prior contact, following up
  on an earlier email/conversation, or through an existing personal
  connection (e.g. a former camp/program instructor, a mutual contact).
  Orthogonal to `category`: an internship inquiry and a podcast invite can
  each be cold, a follow-up, or through a connection.
- `context` — 1–2 sentences: who sent it, what they were asking for.
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

## Adding a new email

1. Create `src/content/emails/<slug>.md`.
2. Frontmatter: `id` (= `<slug>`), `category`, `approach`, `context`,
   `annotations` (each just `{ quote, note }`).
3. Body: the email text below the frontmatter, placeholders substituted in.
4. Make sure every annotation `quote` is copy-pasted verbatim from the body
   (exact substring, including punctuation/whitespace) — `npm run validate`
   will catch mismatches before you push.
