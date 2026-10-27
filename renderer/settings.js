(() => {
  const $ = (id) => document.getElementById(id);
  const hotkey = $('hotkey');
  const width = $('width');
  const startWithWindows = $('startWithWindows');
  const pluginList = $('plugins');
  const status = $('status');

  // Turns a key press into an Electron accelerator such as "Ctrl+Alt+Space". Keys without a modifier are refused,
  // so the box cannot take over ordinary typing.
  const NAMED_KEYS = {
    ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Enter: 'Enter', Tab: 'Tab',
    Backspace: 'Backspace', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert',
  };
  const KEY_OK = /^([A-Z0-9]|F\d{1,2}|Space|Up|Down|Left|Right|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Insert)$/;
  const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph']);

  function acceleratorFrom(e) {
    if (MODIFIER_KEYS.has(e.key)) return null;
    const key = NAMED_KEYS[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
    if (!KEY_OK.test(key)) return null;
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');
    if (!parts.length) return null;
    return [...parts, key].join('+');
  }

  hotkey.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') return; // let Tab move focus out of the box
    e.preventDefault();
    const acc = acceleratorFrom(e);
    if (acc) { hotkey.value = acc; status.textContent = ''; }
  });

  function fill(s) {
    hotkey.value = s.hotkey;
    width.value = s.width;
    startWithWindows.checked = s.startWithWindows;
    pluginList.textContent = '';
    for (const p of s.plugins) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !s.disabledPlugins.includes(p.name);
      box.dataset.name = p.name;
      const name = document.createElement('span');
      name.textContent = p.name;
      label.append(box, name);
      if (p.keyword) {
        const kw = document.createElement('span');
        kw.className = 'kw';
        kw.textContent = p.keyword;
        label.append(kw);
      }
      li.append(label);
      pluginList.append(li);
    }
  }

  function collect() {
    const disabledPlugins = [...pluginList.querySelectorAll('input[type=checkbox]')]
      .filter((box) => !box.checked)
      .map((box) => box.dataset.name);
    return {
      hotkey: hotkey.value,
      width: Number(width.value),
      startWithWindows: startWithWindows.checked,
      disabledPlugins,
    };
  }

  // Returns true when the main process accepted the change. A shortcut that cannot be registered is refused and shown here.
  async function save(patch) {
    status.textContent = '';
    const res = await window.rsSettings.save(patch);
    if (!res.ok) status.textContent = res.error;
    return res.ok;
  }

  $('save').addEventListener('click', async () => {
    const patch = collect();
    if (!Number.isInteger(patch.width) || patch.width < 360 || patch.width > 2000) {
      status.textContent = 'Window width must be a whole number from 360 to 2000.';
      return;
    }
    if (await save(patch)) window.rsSettings.close();
  });
  $('cancel').addEventListener('click', () => window.rsSettings.close());
  $('defaults').addEventListener('click', async () => {
    if (!defaults) return;
    if (await save({ ...defaults })) fill({ ...defaults, plugins: plugins });
  });

  let defaults = null;
  let plugins = [];
  window.rsSettings.get().then((s) => {
    defaults = s.defaults;
    plugins = s.plugins;
    fill({ ...s, plugins });
  });
})();
