// import.meta.env.BASE_URL reflects the `base` value from astro.config.mjs
// verbatim and is not guaranteed to end with a slash, so joining it directly
// with a path (`${BASE_URL}emails/...`) can produce a missing-slash URL like
// "/email-databaseemails/...". Use this everywhere instead.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\//, '')}`;
}
