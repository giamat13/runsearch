# runsearch

A clone of PowerToys Run (the Windows launcher) built with Electron. Press `Alt+Space`.

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

Not ported: the PowerToys (`@`) and OneNote (`o:`) plugins, and the settings window.

## Development

```
npm install
node node_modules/electron/install.js   # downloads the Electron binary if npm skipped it
npm start
```

`npm start` / F5 open the bar immediately with `--show --keep-open` when launched from VS Code. If Electron
starts as plain Node, clear the `ELECTRON_RUN_AS_NODE` environment variable (the VS Code launch config does this).
`data/windows-settings.json` is generated from the PowerToys source with `npm run build:settings`.

## License

MIT, see `LICENSE`. Third-party notices: `THIRD_PARTY_LICENSE.txt`.

## Credits

Icons, the Windows settings list and the interface layout are derived from
[Microsoft PowerToys](https://github.com/microsoft/PowerToys) (MIT, Copyright (c) Microsoft Corporation).
See `THIRD_PARTY_LICENSE.txt`.
