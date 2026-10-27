// Copy this file to plugins/<name>.js, then add '<name>' to the ALL_PLUGINS list in main.js.
const { match } = require('../lib/match');
const { copy } = require('../lib/util');

const ITEMS = ['Example one', 'Example two'];

module.exports = {
  // Shown in Settings and used as the key in disabledPlugins. Keep it unique.
  name: 'Example',
  // Typing this at the start of the query runs only this plugin. Use '' when the plugin has no keyword.
  keyword: 'ex:',
  // true: the plugin also answers queries without the keyword.
  global: false,

  // Called once at startup, if the plugin defines it.
  // init() {},

  // Called every time the window opens, if the plugin defines it.
  // refresh() {},

  // search is the text after the keyword (or the whole query for global plugins).
  // Return an array of results, or a Promise of one. Return [] when there is nothing to show.
  query({ search, isKeyword }) {
    if (!search) return [];
    return ITEMS
      .map((text) => ({ text, hit: match(search, text) }))
      .filter((x) => x.hit)
      .map(({ text, hit }) => ({
        title: text,                    // required
        subtitle: 'Select to copy',     // optional, shown under the title
        tooltip: 'Full description',    // optional, shown on hover
        hl: hit.indexes,                // optional, character indexes of title to show in bold
        icon: 'Folder/folder',          // optional, a name under assets/icons/ without the .dark/.light.png part
        // iconFile: 'C:\\path\\to\\file.exe', // optional, use this file's own icon instead of icon
        score: 200 + hit.score,         // higher ranks first; the results of all plugins are merged
        run: () => { copy(text); },     // called on Enter or click; return false to keep the window open
        // Optional extra buttons, one per entry. key is a shortcut such as 'ctrl+c'.
        // menu: [{ title: 'Copy', glyph: '\uE8C8', key: 'ctrl+c', run: () => copy(text) }],
      }));
  },
};
