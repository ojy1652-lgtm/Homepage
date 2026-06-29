(function () {
  const listEl = document.querySelector('[data-list]');
  const logEl = document.querySelector('[data-log]');
  const loadButton = document.querySelector('[data-load]');
  const loginButton = document.querySelector('[data-login]');
  const publishButton = document.querySelector('[data-publish]');
  let pulls = [];

  function resetLog(message) {
    logEl.textContent = message;
  }

  function log(message) {
    logEl.textContent += `\n${message}`;
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

  function render() {
    listEl.innerHTML = '';
    if (pulls.length === 0) {
      listEl.innerHTML = '<p class="empty">No open workflow pull requests found.</p>';
      return;
    }

    pulls.forEach((pull) => {
      const item = document.createElement('label');
      item.className = 'order-item checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${pull.number}" />
        <div>
          <strong>${pull.title}</strong>
          <span>#${pull.number} · ${pull.head && pull.head.ref ? pull.head.ref : 'workflow item'}</span>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  async function loadPulls() {
    resetLog('Loading workflow items...');
    const allPulls = await github('pulls?state=open');
    pulls = allPulls.filter((pull) => {
      const branch = pull.head && pull.head.ref ? pull.head.ref : '';
      return branch.startsWith('cms/') || branch.includes('/cms/');
    });
    render();
    resetLog(`Loaded ${pulls.length} workflow item(s).`);
  }

  async function publishChecked() {
    const checked = Array.from(listEl.querySelectorAll('input[type="checkbox"]:checked')).map((input) => Number(input.value));
    if (checked.length === 0) {
      resetLog('No items checked.');
      return;
    }

    resetLog(`Publishing ${checked.length} item(s)...`);
    for (const number of checked) {
      await github(`pulls/${number}/merge`, {
        method: 'PUT',
        body: JSON.stringify({
          commit_title: `Publish CMS workflow item #${number}`,
          merge_method: 'squash',
        }),
      });
      log(`Published #${number}`);
    }
    log('Done. Netlify will rebuild after GitHub receives the merge commits.');
  }

  loadButton.addEventListener('click', () => loadPulls().catch((error) => resetLog(`Error: ${error.message}`)));
  publishButton.addEventListener('click', () => publishChecked().catch((error) => log(`Error: ${error.message}`)));
  loginButton.addEventListener('click', () => window.netlifyIdentity.open());
  window.netlifyIdentity && window.netlifyIdentity.init();
})();
