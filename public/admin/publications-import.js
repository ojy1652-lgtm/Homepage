(function () {
  const headers = ['Title', 'Authors', 'Journal', 'Year', 'Volume', 'Pages', 'DOI', 'Abstract'];
  const logEl = document.querySelector('[data-log]');
  const fileEl = document.querySelector('[data-file]');
  const loginButton = document.querySelector('[data-login]');
  const importButton = document.querySelector('[data-import]');
  const templateButton = document.querySelector('[data-download-template]');

  function log(message) {
    logEl.textContent += `\n${message}`;
  }

  function resetLog(message) {
    logEl.textContent = message;
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function yamlString(value) {
    const escaped = String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  function parseAuthors(value) {
    return String(value || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, labMember: false, corresponding: false }));
  }

  function publicationToMarkdown(row, index) {
    const title = row.Title || row.title;
    const year = Number(row.Year || row.year);
    const journal = row.Journal || row.journal;
    const authors = parseAuthors(row.Authors || row.authors);

    if (!title || !year || !journal) {
      throw new Error(`Row ${index + 2}: Title, Journal, and Year are required.`);
    }

    const frontmatter = [
      '---',
      `title: ${yamlString(title)}`,
      'authors:',
      ...authors.flatMap((author) => [
        `  - name: ${yamlString(author.name)}`,
        '    labMember: false',
        '    corresponding: false',
      ]),
      `journal: ${yamlString(journal)}`,
      `year: ${year}`,
      row.Volume ? `volume: ${yamlString(row.Volume)}` : null,
      row.Pages ? `pages: ${yamlString(row.Pages)}` : null,
      row.DOI ? `doi: ${yamlString(row.DOI)}` : null,
      'tags: []',
      'featured: false',
      'order: 10',
      '---',
    ].filter(Boolean);

    const body = String(row.Abstract || '').trim();
    return `${frontmatter.join('\n')}\n\n${body}\n`;
  }

  function getCurrentUser() {
    return new Promise((resolve) => {
      if (!window.netlifyIdentity) {
        resolve(null);
        return;
      }

      window.netlifyIdentity.on('init', (user) => resolve(user));
      window.netlifyIdentity.init();
    });
  }

  async function getAuthToken() {
    const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
    if (!user) return null;
    const token = await user.jwt();
    return token;
  }

  async function putFile(path, content, token) {
    const endpoint = `/.netlify/git/github/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
    const existingResponse = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existing = existingResponse.ok ? await existingResponse.json() : null;

    const payload = {
      message: `Import publication ${path.split('/').pop()}`,
      content: toBase64Utf8(content),
      branch: 'main',
    };

    if (existing && existing.sha) {
      payload.sha = existing.sha;
    }

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${path}: ${response.status} ${text}`);
    }
  }

  function toBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  templateButton.addEventListener('click', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      [
        'Example paper title',
        'Sungil Kim, June Ho Lee, Yaolong Xing, Dongchang Kim',
        'Example Journal',
        2026,
        '12',
        '101-110',
        '10.0000/example',
        'Optional abstract text.',
      ],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Publications');
    XLSX.writeFile(workbook, 'publication-import-template.xlsx');
  });

  loginButton.addEventListener('click', () => {
    window.netlifyIdentity.open();
  });

  importButton.addEventListener('click', async () => {
    try {
      resetLog('Reading Excel file...');
      const file = fileEl.files && fileEl.files[0];
      if (!file) throw new Error('Please choose an Excel file first.');

      const user = await getCurrentUser();
      if (!user) {
        window.netlifyIdentity.open();
        throw new Error('Please log in first, then click Import again.');
      }

      const token = await getAuthToken();
      if (!token) throw new Error('Could not get Netlify Identity token.');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (rows.length === 0) throw new Error('No publication rows found.');

      log(`Found ${rows.length} row(s).`);

      for (const [index, row] of rows.entries()) {
        const title = row.Title || row.title;
        const year = row.Year || row.year;
        const slug = `${year}-${slugify(title) || `publication-${index + 1}`}`;
        const path = `src/content/publications/${slug}.md`;
        const markdown = publicationToMarkdown(row, index);
        await putFile(path, markdown, token);
        log(`Imported ${path}`);
      }

      log('Done. Netlify will rebuild after GitHub receives the commits.');
    } catch (error) {
      log(`Error: ${error.message}`);
    }
  });
})();
