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
    // How the sender reached the recipient: cold with no prior contact,
    // following up on an earlier email/conversation, or through an existing
    // connection (e.g. a former camp instructor, a mutual contact).
    approach: z.enum(['cold-email', 'follow-up', 'warm-connection']),
    context: z.string().min(1).max(400),
    annotations: z.array(annotationSchema).default([]),
  })
  .strict();

export const collections = {
  emails: defineCollection({
    type: 'content',
    schema: emailSchema,
  }),
};
