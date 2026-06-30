export function getFirstMarkdownImage(markdown: string | undefined, fallback = '/images/uploads/lab-hero.png') {
  const match = String(markdown || '').match(/!\[([^\]]*)]\(([^)]*)\)/);
  if (!match) return fallback;

  const { url } = parseMarkdownImageInner(match[2]);
  return url || fallback;
}

export function parseMarkdownImageInner(value: string) {
  const inner = value.trim();

  if (inner.startsWith('<')) {
    const end = inner.indexOf('>');
    if (end > 0) {
      return {
        url: inner.slice(1, end).trim(),
        title: inner.slice(end + 1).trim().replace(/^["“]|["”]$/g, '') || null,
      };
    }
  }

  const titleMatch = inner.match(/^(.*?)(?:\s+["“]([^"”]*)["”])\s*$/);
  return {
    url: (titleMatch ? titleMatch[1] : inner).trim(),
    title: titleMatch && titleMatch[2] ? titleMatch[2].trim() : null,
  };
}
