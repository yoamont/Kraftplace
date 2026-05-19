export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toSlug(name: string, id: number): string {
  const base = slugify(name);
  return base ? `${base}-${id}` : String(id);
}

export function idFromSlug(slug: string): number | null {
  const parts = slug.split('-');
  const id = parseInt(parts[parts.length - 1], 10);
  return isNaN(id) ? null : id;
}
