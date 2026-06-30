(function () {
  const listEl = document.querySelector('[data-list]');
  const logEl = document.querySelector('[data-log]');
  const saveButton = document.querySelector('[data-save]');
  const loginButton = document.querySelector('[data-login]');
  let currentCollection = null;
  let currentEntries = [];

  const collectionConfig = {
    publications: {
      folder: 'src/content/publications',
      groupLabel: 'year',
      titleField: 'title',
      groupField: 'year',
      sortGroups: compareYearGroups,
    },
    people: {
      folder: 'src/content/people',
      groupLabel: 'category',
      titleField: 'name',
      groupField: 'category',
      sortGroups: (a, b) => String(a).localeCompare(String(b)),
    },
  };

  function getNumericYear(year) {
    const value = String(year || '').trim();
    return /^\d+$/.test(value) ? Number(value) : null;
  }

  function compareYearGroups(a, b) {
    const aYear = getNumericYear(a);
    const bYear = getNumericYear(b);

    if (aYear === null && bYear !== null) return -1;
    if (aYear !== null && bYear === null) return 1;
    if (aYear !== null && bYear !== null) return bYear - aYear;
    return String(a).localeCompare(String(b));
  }

  function log(message) {
    logEl.textContent += `\n${message}`;
  }

  function resetLog(message) {
    logEl.textContent = message;
  }

  function decodeBase64(value) {
    const binary = atob(value.replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) return { data: {}, body: content, raw: '' };
    const raw = match[1];
    const data = {};

    raw.split('\n').forEach((line) => {
      const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!field) return;
      const key = field[1];
      let value = field[2].trim();
      if (/^".*"$/.test(value)) value = value.slice(1, -1).replace(/\\"/g, '"');
      if (/^(true|false)$/.test(value)) value = value === 'true';
      if (/^-?\d+(\.\d+)?$/.test(String(value))) value = Number(value);
      data[key] = value;
    });

    return { data, body: content.slice(match[0].length), raw };
  }

  function replaceOrder(content, order) {
    if (/^---\n[\s\S]*?\norder:\s*.*\n[\s\S]*?\n---/.test(content)) {
      return content.replace(/(^---\n[\s\S]*?\n)order:\s*.*(\n[\s\S]*?\n---)/, `$1order: ${order}$2`);
    }

    return content.replace(/^---\n/, `---\norder: ${order}\n`);
  }

  async function getToken() {
    if (!window.netlifyIdentity.currentUser()) {
      window.netlifyIdentity.open();
      throw new Error('Please log in first.');
    }
    return window.netlifyIdentity.currentUser().jwt();
  }

  async function github(path, options = {}) {
    const token = await getToken();
    const response = await fetch(`/.netlify/git/github/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
    return response.json();
  }

  async function loadCollection(collectionName) {
    currentCollection = collectionName;
    const config = collectionConfig[collectionName];
    resetLog(`Loading ${collectionName}...`);
    listEl.innerHTML = '';

    const files = await github(`contents/${config.folder}?ref=main`);
    const markdownFiles = files.filter((file) => file.name.endsWith('.md'));
    const entries = [];

    for (const file of markdownFiles) {
      const fileData = await github(`contents/${file.path}?ref=main`);
      const content = decodeBase64(fileData.content);
      const parsed = parseFrontmatter(content);
      entries.push({
        path: file.path,
        sha: fileData.sha,
        content,
        data: parsed.data,
      });
    }

    currentEntries = entries;
    renderList();
    resetLog(`Loaded ${entries.length} ${collectionName} item(s). Use arrows, then Save order changes.`);
  }

  function renderList() {
    const config = collectionConfig[currentCollection];
    const groups = new Map();

    currentEntries.forEach((entry) => {
      const group = entry.data[config.groupField] || 'Uncategorized';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(entry);
    });

    listEl.innerHTML = '';
    Array.from(groups.keys())
      .sort(config.sortGroups)
      .forEach((group) => {
        const entries = groups.get(group).sort((a, b) => {
          return Number(a.data.order || 10) - Number(b.data.order || 10) || String(a.data[config.titleField]).localeCompare(String(b.data[config.titleField]));
        });

        const section = document.createElement('section');
        section.className = 'order-group';
        const heading = document.createElement('h2');
        heading.textContent = `${config.groupLabel}: ${group}`;
        section.appendChild(heading);

        entries.forEach((entry, index) => {
          const item = document.createElement('div');
          item.className = 'order-item';
          const text = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = entry.data[config.titleField] || entry.path;
          const path = document.createElement('span');
          path.textContent = entry.path;
          text.append(title, path);

          const controls = document.createElement('div');
          controls.className = 'arrow-buttons';
          const upButton = document.createElement('button');
          upButton.type = 'button';
          upButton.textContent = '↑';
          upButton.disabled = index === 0;
          upButton.dataset.move = entry.path;
          upButton.dataset.direction = '-1';
          const downButton = document.createElement('button');
          downButton.type = 'button';
          downButton.textContent = '↓';
          downButton.disabled = index === entries.length - 1;
          downButton.dataset.move = entry.path;
          downButton.dataset.direction = '1';
          controls.append(upButton, downButton);

          item.append(text, controls);
          section.appendChild(item);
        });

        listEl.appendChild(section);
      });
  }

  function moveEntry(path, direction) {
    const config = collectionConfig[currentCollection];
    const entry = currentEntries.find((item) => item.path === path);
    const group = entry.data[config.groupField] || 'Uncategorized';
    const groupEntries = currentEntries
      .filter((item) => (item.data[config.groupField] || 'Uncategorized') === group)
      .sort((a, b) => Number(a.data.order || 10) - Number(b.data.order || 10));

    const index = groupEntries.findIndex((item) => item.path === path);
    const nextIndex = index + Number(direction);
    if (nextIndex < 0 || nextIndex >= groupEntries.length) return;

    const [movedEntry] = groupEntries.splice(index, 1);
    groupEntries.splice(nextIndex, 0, movedEntry);

    groupEntries.forEach((item, itemIndex) => {
      item.data.order = (itemIndex + 1) * 10;
    });

    renderList();
  }

  async function saveOrder() {
    resetLog('Saving order changes...');
    for (const entry of currentEntries) {
      const updatedContent = replaceOrder(entry.content, Number(entry.data.order || 10));
      if (updatedContent === entry.content) continue;
      await github(`contents/${entry.path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Update order for ${entry.path}`,
          content: encodeBase64(updatedContent),
          branch: 'main',
          sha: entry.sha,
        }),
      });
      log(`Saved ${entry.path}`);
    }
    log('Done. Netlify will rebuild after GitHub receives the commits.');
  }

  document.querySelectorAll('[data-load]').forEach((button) => {
    button.addEventListener('click', () => loadCollection(button.dataset.load).catch((error) => resetLog(`Error: ${error.message}`)));
  });

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-move]');
    if (!button) return;
    moveEntry(button.dataset.move, button.dataset.direction);
  });

  saveButton.addEventListener('click', () => saveOrder().catch((error) => log(`Error: ${error.message}`)));
  loginButton.addEventListener('click', () => window.netlifyIdentity.open());
  window.netlifyIdentity && window.netlifyIdentity.init();
})();
