import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

function parseLooseImage(value) {
  const match = String(value || '').trim().match(/^!\[([^\]]*)]\(([^)]*)\)$/);
  if (!match) return null;

  const alt = match[1];
  const inner = match[2].trim();

  if (inner.startsWith('<')) {
    const end = inner.indexOf('>');
    if (end > 0) {
      return {
        alt,
        url: inner.slice(1, end).trim(),
        title: inner.slice(end + 1).trim().replace(/^["“]|["”]$/g, '') || null,
      };
    }
  }

  const titleMatch = inner.match(/^(.*?)(?:\s+["“]([^"”]*)["”])\s*$/);
  return {
    alt,
    url: (titleMatch ? titleMatch[1] : inner).trim(),
    title: titleMatch && titleMatch[2] ? titleMatch[2].trim() : null,
  };
}

function remarkLooseImageLinks() {
  return (tree) => {
    const childToImages = (child) => {
      if (child.type === 'image') return [child];

      if (child.type !== 'text') return null;

      const lines = child.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) return [];

      const images = lines.map(parseLooseImage);
      if (!images.every((image) => image?.url)) return null;

      return images.map((image) => ({
        type: 'image',
        url: image.url,
        alt: image.alt,
        title: image.title,
      }));
    };

    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = node.children.flatMap((child) => {
        if (child.type === 'paragraph' && Array.isArray(child.children)) {
          const imageGroups = child.children.map(childToImages);
          if (imageGroups.every((group) => group !== null)) {
            const images = imageGroups.flat();
            if (images.length > 0) {
              return images;
            }
          }
        }

        walk(child);
        return child;
      });
    };

    walk(tree);
  };
}

export default defineConfig({
  site: process.env.URL || 'http://localhost:4321',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkLooseImageLinks],
  },
});
