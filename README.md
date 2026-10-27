# runsearch

A clone of PowerToys Run (the Windows launcher) built with Electron. Press `Alt+Space`, or change the shortcut in Settings.

Run with `npm start`, or F5 in VS Code.

## Plugins (same activation keywords as PowerToys Run)

| Keyword | Plugin | Notes |
| --- | --- | --- |
| *(global)* | Programs, Calculator, Units, Folders, System commands, Time & date, URIs, Web search, Window walker, Terminal profiles | |
| `.` | Programs | Start Menu, packaged apps, PATH |
| `=` | Calculator | |
| `%%` | Unit converter | also global: `10 cm in inches` |
| *(global)* | Currency converter | **not in PowerToys Run**; `50 ils to usd` or `50ils2usd`, ECB rates |
| `>` | Shell | |
| `?` | Windows Search index | |
| `??` | Web search | |
| `//` | URI | |
| `<` | Window walker | |
| `$` | Windows settings | 306 entries taken from PowerToys |
| `:` | Registry | |
| `!` | Services | |
| `_` | Windows Terminal profiles | |
| `#` | Value generator | guid, uuid, md5, sha*, base64, url |
| `)` | Time & date | |
| `!!` | History | |
| `{` | VS Code workspaces | |
| `o:` | OneNote | pages of the desktop OneNote app, read over COM; needs the desktop version, not the Store app |
| `@` | PowerToys | launches PowerToys modules, found in the PowerToys install folder |

Plugins can be switched off in Settings. To write a new one, see [docs/plugins.md](docs/plugins.md).

## Tray and settings

The tray icon has: Show, Settings, Start with Windows, and Quit. Settings change the shortcut, the window width, which plugins are
on, and whether the app starts with Windows. They are saved to `settings.json` in `%APPDATA%\runsearch`.

If the shortcut is already used by another app (PowerToys Run uses `Alt+Space` too), runsearch shows a notification and keeps running.
Pick another shortcut in Settings.

## Development

```
npm install
node node_modules/electron/install.js   # downloads the Electron binary if npm skipped it
npm start
```

`npm start` / F5 open the bar immediately with `--show --keep-open` when launched from VS Code. If Electron
starts as plain Node, clear the `ELECTRON_RUN_AS_NODE` environment variable (the VS Code launch config does this).

Flags and variables:

- `--show` opens the bar on start. `--keep-open` keeps it open when it loses focus.
- `RS_QUERY=<text>` opens the bar with that query typed in, 800 ms after start. Handy for checking a plugin.

Tests use Node's built-in test runner and need no Electron window:

```
npm test
```

`data/windows-settings.json` is generated from the PowerToys source with `npm run build:settings`.

## Building

```
npm run dist
```

This writes two files to `dist/`: an installer (`runsearch-<version>-setup.exe`) and a portable exe
(`runsearch-<version>-portable.exe`) that runs without installing. With "Start with Windows" on, the portable exe starts
from the file you ran, not from the temp copy that it unpacks.

Releases are built and published by `.github/workflows/release.yml`. The steps are in [CLAUDE.md](CLAUDE.md).

## License

MIT, see `LICENSE`. Third-party notices: `THIRD_PARTY_LICENSE.txt`.

## Credits

Icons, the Windows settings list and the interface layout are derived from
[Microsoft PowerToys](https://github.com/microsoft/PowerToys) (MIT, Copyright (c) Microsoft Corporation).
See `THIRD_PARTY_LICENSE.txt`.
