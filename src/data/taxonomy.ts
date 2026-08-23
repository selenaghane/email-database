// Display labels for the two fixed schema enums (category, approach) in
// src/content/config.ts. Unlike src/data/tags.ts, these aren't an open,
// editable vocabulary — changing a slug here must match a corresponding
// change to the enum in the content schema.

export const CATEGORIES = [
  { slug: 'research-position', label: 'Research position' },
  { slug: 'internship', label: 'Internship' },
  { slug: 'podcast-invite', label: 'Podcast invite' },
  { slug: 'event-invite', label: 'Event invite' },
  { slug: 'other', label: 'Other' },
] as const;

export const APPROACHES = [
  { slug: 'cold-email', label: 'Cold email' },
  { slug: 'attended-event', label: 'Attended event' },
  { slug: 'brief-meeting', label: 'Brief meeting' },
  { slug: 'taught-by', label: 'Taught by' },
  { slug: 'referred', label: 'Referred' },
] as const;

export function getCategoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function getApproachLabel(slug: string): string {
  return APPROACHES.find((a) => a.slug === slug)?.label ?? slug;
}
