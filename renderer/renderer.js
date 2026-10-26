(() => {
  const input = document.getElementById('q');
  const ghost = document.getElementById('ghost');
  const wrap = document.getElementById('results-wrap');
  const list = document.getElementById('results');
  const app = document.getElementById('app');

  let items = [];
  let sel = 0;
  let theme = 'dark';

  const fit = () => requestAnimationFrame(() => window.rs.resize(app.offsetHeight + 0));

  function iconSrc(it) {
    if (it.iconUrl) return it.iconUrl;
    if (!it.icon) return '';
    return `../assets/icons/${it.icon}.${theme}.png`;
  }

  function highlight(el, text, hl) {
    const set = new Set(hl || []);
    let buf = '';
    let bold = false;
    const flush = () => {
      if (!buf) return;
      if (bold) { const b = document.createElement('b'); b.textContent = buf; el.append(b); }
      else el.append(document.createTextNode(buf));
      buf = '';
    };
    [...text].forEach((ch, i) => {
      const isBold = set.has(i);
      if (isBold !== bold) { flush(); bold = isBold; }
      buf += ch;
    });
    flush();
  }

  function updateGhost() {
    const q = input.value;
    ghost.textContent = '';
    const it = items[sel];
    if (!q || !it || it.title.length <= q.length || !it.title.toLowerCase().startsWith(q.toLowerCase())) return;
    const typed = document.createElement('span');
    typed.className = 'typed';
    typed.textContent = q;
    ghost.append(typed, document.createTextNode(it.title.slice(q.length)));
  }

  function render() {
    list.textContent = '';
    wrap.hidden = items.length === 0;
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'row' + (i === sel ? ' selected' : '');
      li.setAttribute('role', 'option');
      if (it.tooltip) li.title = it.tooltip;

      const icon = document.createElement('div');
      icon.className = 'icon';
      const src = iconSrc(it);
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.onerror = () => { img.onerror = null; img.src = src.replace(/\.(dark|light)\.png$/, '.png'); };
        icon.append(img);
      }

      const text = document.createElement('div');
      text.className = 'text';
      const title = document.createElement('div');
      title.className = 'title';
      highlight(title, it.title, it.hl);
      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = it.subtitle;
      text.append(title, sub);

      const buttons = document.createElement('div');
      buttons.className = 'buttons';
      (it.menu || []).forEach((m, mi) => {
        const b = document.createElement('button');
        b.textContent = m.glyph || '';
        b.title = m.title;
        b.tabIndex = -1;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', (e) => { e.stopPropagation(); window.rs.run(it.id, mi); });
        buttons.append(b);
      });

      li.append(icon, text, buttons);
      li.addEventListener('mousedown', (e) => e.preventDefault());
      li.addEventListener('click', () => { sel = i; window.rs.run(it.id); });
      list.append(li);
    });
    updateGhost();
    fit();
  }

  function select(i) {
    if (!items.length) return;
    sel = (i + items.length) % items.length;
    [...list.children].forEach((c, n) => c.classList.toggle('selected', n === sel));
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
    updateGhost();
  }

  function send() {
    window.rs.query(input.value);
    if (!input.value) { items = []; sel = 0; render(); }
  }

  input.addEventListener('input', send);

  window.rs.on('results', ({ items: next }) => {
    items = next;
    sel = 0;
    render();
  });
  window.rs.on('reset', () => { input.value = ''; items = []; sel = 0; render(); input.focus(); });
  window.rs.on('set-query', (q) => { input.value = q; input.focus(); input.setSelectionRange(q.length, q.length); send(); });
  window.rs.on('theme', (t) => {
    theme = t.dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', t.accent);
    render();
  });

  const modKey = (e) => {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase().replace('arrow', ''));
    return parts.join('+');
  };

  document.addEventListener('keydown', (e) => {
    const k = modKey(e);
    switch (k) {
      case 'escape': e.preventDefault(); window.rs.hide(); return;
      case 'down': case 'tab': case 'ctrl+j': e.preventDefault(); select(sel + 1); return;
      case 'up': case 'shift+tab': case 'ctrl+k': e.preventDefault(); select(sel - 1); return;
      case 'pagedown': e.preventDefault(); select(Math.min(sel + 4, items.length - 1)); return;
      case 'pageup': e.preventDefault(); select(Math.max(sel - 4, 0)); return;
      case 'enter': e.preventDefault(); if (items[sel]) window.rs.run(items[sel].id); return;
      case 'right':
        if (ghost.textContent && input.selectionStart === input.value.length && items[sel]) {
          e.preventDefault();
          input.value = items[sel].title;
          send();
        }
        return;
      default: break;
    }
    const it = items[sel];
    if (!it || !it.menu) return;
    const hasSelection = input.selectionStart !== input.selectionEnd;
    const mi = it.menu.findIndex((m) => m.key === k);
    if (mi >= 0 && !(k === 'ctrl+c' && hasSelection)) {
      e.preventDefault();
      window.rs.run(it.id, mi);
    }
  });

  window.addEventListener('focus', () => input.focus());
  input.focus();
  fit();
})();
