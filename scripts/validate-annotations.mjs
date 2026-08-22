// Cross-checks that Zod can't express because `body` is the markdown
// content, not a frontmatter field:
//   1. frontmatter `id` matches the filename (one source of truth for URLs)
//   2. every annotation.quote is an exact substring of the email body
// Run automatically as part of `npm run build`; can also be run directly
// with `npm run validate`.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emailsDir = path.join(__dirname, '..', 'src', 'content', 'emails');

const files = readdirSync(emailsDir).filter((f) => f.endsWith('.md'));

let errors = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const raw = readFileSync(path.join(emailsDir, file), 'utf-8');
  const { data, content } = matter(raw);
  const body = content.trim();

  if (data.id !== slug) {
    errors.push(`${file}: frontmatter id "${data.id}" does not match filename "${slug}"`);
  }

  for (const [i, annotation] of (data.annotations ?? []).entries()) {
    if (!body.includes(annotation.quote)) {
      errors.push(
        `${file}: annotations[${i}].quote is not an exact substring of the body: ${JSON.stringify(
          annotation.quote
        )}`
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Annotation validation failed:\n');
  for (const err of errors) console.error(`  - ${err}`);
  console.error('');
  process.exit(1);
}

console.log(`Validated ${files.length} email(s), no issues found.`);
