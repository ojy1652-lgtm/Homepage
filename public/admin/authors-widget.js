(function () {
  function normalizeAuthors(value) {
    const raw = value && typeof value.toJS === 'function' ? value.toJS() : value;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((author) => {
        if (typeof author === 'string') {
          return { name: author, labMember: false, corresponding: false };
        }

        return {
          name: author && author.name ? String(author.name) : '',
          labMember: Boolean(author && author.labMember),
          corresponding: Boolean(author && author.corresponding),
        };
      })
      .filter((author) => author.name.trim());
  }

  function authorsToText(authors) {
    return authors.map((author) => author.name).join(', ');
  }

  function parseAuthors(text, previousAuthors) {
    const previousByName = new Map(previousAuthors.map((author) => [author.name.trim().toLowerCase(), author]));

    return text
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name, index) => {
        const previous = previousByName.get(name.toLowerCase()) || previousAuthors[index] || {};
        return {
          name,
          labMember: Boolean(previous.labMember),
          corresponding: Boolean(previous.corresponding),
        };
      });
  }

  function registerAuthorsWidget() {
    const CMS = window.CMS;
    const h = window.h || (window.React && window.React.createElement);
    const createClass = window.createClass;

    if (!CMS || !h || !createClass) {
      window.setTimeout(registerAuthorsWidget, 50);
      return;
    }

    const AuthorsControl = createClass({
      getInitialState() {
        return {
          authorText: authorsToText(normalizeAuthors(this.props.value)),
        };
      },

      componentWillReceiveProps(nextProps) {
        if (nextProps.value !== this.props.value) {
          this.setState({ authorText: authorsToText(normalizeAuthors(nextProps.value)) });
        }
      },

      emitAuthors(authors) {
        this.props.onChange(
          authors
            .map((author) => ({
              name: author.name.trim(),
              labMember: Boolean(author.labMember),
              corresponding: Boolean(author.corresponding),
            }))
            .filter((author) => author.name)
        );
      },

      handleTextChange(event) {
        const authorText = event.target.value;
        const authors = parseAuthors(authorText, normalizeAuthors(this.props.value));
        this.setState({ authorText });
        this.emitAuthors(authors);
      },

      updateAuthor(index, patch) {
        const authors = normalizeAuthors(this.props.value);
        authors[index] = { ...authors[index], ...patch };
        this.setState({ authorText: authorsToText(authors) });
        this.emitAuthors(authors);
      },

      renderAuthorRow(author, index) {
        return h(
          'div',
          { key: `${author.name}-${index}`, style: rowStyle },
          h('input', {
            type: 'text',
            value: author.name,
            onChange: (event) => this.updateAuthor(index, { name: event.target.value }),
            style: nameInputStyle,
            'aria-label': 'Author name',
          }),
          h(
            'label',
            { style: checkboxLabelStyle },
            h('input', {
              type: 'checkbox',
              checked: author.labMember,
              onChange: (event) => this.updateAuthor(index, { labMember: event.target.checked }),
            }),
            ' Lab'
          ),
          h(
            'label',
            { style: checkboxLabelStyle },
            h('input', {
              type: 'checkbox',
              checked: author.corresponding,
              onChange: (event) => this.updateAuthor(index, { corresponding: event.target.checked }),
            }),
            ' Corresponding'
          )
        );
      },

      render() {
        const authors = normalizeAuthors(this.props.value);

        return h(
          'div',
          { className: this.props.classNameWrapper },
          h('textarea', {
            id: this.props.forID,
            value: this.state.authorText,
            onChange: this.handleTextChange,
            placeholder: 'Sungil Kim, June Ho Lee, Yaolong Xing, Dongchang Kim',
            rows: 3,
            style: textareaStyle,
          }),
          h('p', { style: helpStyle }, 'Comma-separated names are converted into editable author rows.'),
          h('div', { style: listStyle }, authors.map((author, index) => this.renderAuthorRow(author, index)))
        );
      },
    });

    const AuthorsPreview = createClass({
      render() {
        const authors = normalizeAuthors(this.props.value);
        return h(
          'span',
          {},
          authors.map((author, index) =>
            h(
              'span',
              { key: `${author.name}-${index}` },
              `${index > 0 ? ', ' : ''}${author.name}${author.corresponding ? '*' : ''}`
            )
          )
        );
      },
    });

    CMS.registerWidget('authors_with_flags', AuthorsControl, AuthorsPreview);
  }

  const textareaStyle = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: '88px',
    border: '1px solid #c8d1d6',
    borderRadius: '6px',
    padding: '10px 12px',
    font: 'inherit',
  };

  const helpStyle = {
    margin: '8px 0 12px',
    color: '#5d6b73',
    fontSize: '13px',
  };

  const listStyle = {
    display: 'grid',
    gap: '8px',
  };

  const rowStyle = {
    alignItems: 'center',
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1fr) auto auto',
    gap: '10px',
    padding: '8px',
    border: '1px solid #d8e0e4',
    borderRadius: '6px',
    background: '#fff',
  };

  const nameInputStyle = {
    border: '1px solid #c8d1d6',
    borderRadius: '4px',
    font: 'inherit',
    padding: '7px 8px',
    width: '100%',
  };

  const checkboxLabelStyle = {
    alignItems: 'center',
    display: 'inline-flex',
    gap: '5px',
    whiteSpace: 'nowrap',
  };

  registerAuthorsWidget();
})();
