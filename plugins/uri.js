const { shell } = require('electron');

function parse(s) {
  s = s.trim();
  if (!s || /\s/.test(s)) return null;
  if (/^[a-z][a-z0-9+.-]+:\/\/\S+/i.test(s) || /^(mailto|tel|ms-[a-z-]+|steam|spotify|discord):\S*/i.test(s)) {
    return { uri: s, web: /^https?:/i.test(s) };
  }
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(s) && !/^\d+(\.\d+)+$/.test(s)) {
    return { uri: 'https://' + s, web: true };
  }
  return null;
}

module.exports = {
  name: 'WindowsUriHandler',
  keyword: '//',
  global: true,
  parse,
  query({ search }) {
    const u = parse(search);
    if (!u) return [];
    return [{
      title: search.trim(),
      subtitle: u.web ? 'Open in default browser' : 'Open URI',
      icon: 'Uri/uri',
      score: 400,
      run: () => { shell.openExternal(u.uri); },
    }];
  },
};
