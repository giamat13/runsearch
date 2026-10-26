const { shell } = require('electron');
const uri = require('./uri');

module.exports = {
  name: 'WebSearch',
  keyword: '??',
  global: true,
  query({ search, isKeyword }) {
    if (!search) return [];
    // PowerToys Run skips the global web search when the query is itself a URI.
    if (!isKeyword && uri.parse(search)) return [];
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(search);
    return [{
      title: search,
      subtitle: 'Search the web in the default browser',
      icon: 'WebSearch/WebSearch',
      score: isKeyword ? 400 : 2, // global result sits at the very bottom
      run: () => { shell.openExternal(url); },
    }];
  },
};
