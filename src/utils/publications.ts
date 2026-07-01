export function getNumericYear(year: string | number | undefined) {
  const value = String(year ?? '').trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}

export function getLatestPublicationYear<T extends { data: { year?: string | number } }>(papers: T[]) {
  const years = papers.map((paper) => getNumericYear(paper.data.year)).filter((year): year is number => year !== null);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
}

export function getPublicationYearLabel(year: string | number | undefined, latestYear: number) {
  const numericYear = getNumericYear(year);
  return String(numericYear ?? latestYear);
}

export function comparePublications<
  T extends { data: { year?: string | number; order: number; title: string } },
>(a: T, b: T) {
  const aYear = getNumericYear(a.data.year);
  const bYear = getNumericYear(b.data.year);

  if (aYear === null && bYear !== null) return -1;
  if (aYear !== null && bYear === null) return 1;
  if (aYear !== null && bYear !== null && aYear !== bYear) return bYear - aYear;

  return b.data.order - a.data.order || a.data.title.localeCompare(b.data.title);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getCitationHtml(paper: { data: { journal?: string; volume?: string; pages?: string } }) {
  const journal = String(paper.data.journal ?? '').trim();
  const volume = String(paper.data.volume ?? '').trim();
  const pages = String(paper.data.pages ?? '').trim();
  const parts = [];

  if (journal) parts.push(`<em>${escapeHtml(journal)}</em>`);
  if (volume) parts.push(`<strong>${escapeHtml(volume)}</strong>`);

  const journalVolume = parts.join(' ');
  return [journalVolume, pages ? escapeHtml(pages) : ''].filter(Boolean).join(', ');
}
