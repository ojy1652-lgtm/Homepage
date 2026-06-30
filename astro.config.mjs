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
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = node.children.map((child) => {
        if (child.type === 'paragraph' && child.children?.length === 1 && child.children[0].type === 'text') {
          const image = parseLooseImage(child.children[0].value);
          if (image?.url) {
            return {
              type: 'image',
              url: image.url,
              alt: image.alt,
              title: image.title,
            };
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
