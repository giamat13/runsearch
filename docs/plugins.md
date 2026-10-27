# Writing a plugin

Every plugin is a module in `plugins/` that exports one object. `main.js` lists the plugins in `ALL_PLUGINS`. A new plugin
needs its file and one entry in that list. [docs/plugin-template.js](plugin-template.js) is a working starting point.

## The object

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | Unique id. Settings store disabled plugins by this name. |
| `keyword` | yes | Prefix that routes the query to this plugin only. `''` for none. The text after it is `search`, with leading spaces removed (`=2+2`, `o: powertoys`). A single letter or digit is never a keyword. |
| `global` | yes | `true` to also answer queries that have no keyword. |
| `query({ raw, search, isKeyword })` | yes | Returns an array of results, or a Promise of one. `search` is the text after the keyword. |
| `init()` | no | Called once at startup. |
| `refresh()` | no | Called each time the window opens. |

## A result

| Field | Meaning |
| --- | --- |
| `title` | Shown in bold. Required. |
| `subtitle` | Smaller text under the title. |
| `tooltip` | Shown on hover. |
| `hl` | Character indexes of `title` to show in bold, for example from `lib/match.js`. |
| `icon` | Name under `assets/icons/` without the `.dark.png` / `.light.png` part, such as `Calculator/calculator`. |
| `iconFile` | A file whose own icon is shown, such as an `.exe`. Used instead of `icon`. |
| `score` | Higher ranks first. Results from all plugins are merged and sorted, and the top 40 are shown. |
| `run()` | Called on Enter or click. Return `false` to keep the window open. Return `{ query: 'text' }` to fill the search box. |
| `menu` | Extra buttons, each `{ title, glyph, key, run }`. |

## Rules

- Keep `query` fast. It runs on every keystroke. Read slow sources once and cache them, the way
  [plugins/onenote.js](../plugins/onenote.js) does.
- Errors thrown by `query` are swallowed, so a broken plugin shows no results instead of crashing. Return a result that
  explains the problem when that matters to the user (see [plugins/onenote.js](../plugins/onenote.js)).
- Helpers in `lib/`: `match` (fuzzy matching with highlight indexes), `util` (PowerShell, clipboard, spawning processes),
  `store` (saves JSON in the user data folder).
- Add a test under `test/` for any parsing or ranking logic. `npm test` runs them.
