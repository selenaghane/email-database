import { defineCollection, z } from 'astro:content';

// `quote`, `note` per annotation. `quote` must be an exact substring of the
// email body (enforced in scripts/validate-annotations.mjs, since the body
// lives in the markdown content, not in frontmatter, and Zod alone can't see
// across that boundary). `note` should be descriptive ("pre-answers
// scheduling logistics"), not causal ("this is why they said yes") — see
// CLAUDE.md.
const annotationSchema = z.object({
  quote: z.string().min(1),
  note: z.string().min(1).max(280),
});

// Deliberately closed with .strict(): an unrecognized key (e.g. a stray
// `reply` or `recipientReply` field someone pastes in from a form export)
// fails the build instead of silently publishing. Recipient replies must
// never have a schema field — see CLAUDE.md.
const emailSchema = z
  .object({
    id: z.string(),
    category: z.enum([
      'research-position',
      'internship',
      'podcast-invite',
      'event-invite',
      'other',
    ]),
    // The sender's connection to the recipient at the time of this email:
    // no prior contact, having seen/heard them at a talk or event, a brief
    // in-person meeting (e.g. a conference, career fair), the recipient
    // having taught the sender directly, or an introduction/referral from
    // a mutual contact.
    approach: z.enum(['cold-email', 'attended-event', 'brief-meeting', 'taught-by', 'referred']),
    context: z.string().min(1).max(400),
    // What actually resulted, in one concise line (e.g. "Recorded the
    // episode; published on [platform]."). Optional: a freshly added email
    // may not have a known outcome yet. Not the recipient's reply text —
    // just a factual, sender-side summary of what happened next.
    outcome: z.string().min(1).max(200).optional(),
    annotations: z.array(annotationSchema).default([]),
  })
  .strict();

export const collections = {
  emails: defineCollection({
    type: 'content',
    schema: emailSchema,
  }),
};
