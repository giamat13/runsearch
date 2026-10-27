runsearch 1.0.0 is the first release: a PowerToys Run style launcher for Windows.

## Features

- Opens with `Alt+Space` (change it in Settings). Results from every plugin appear as you type.
- Calculator, unit converter and currency converter (ECB rates, needs internet). `50 ils to usd` works.
- Programs, folders, Windows Search, Windows settings, registry, services, shell commands, time and date, URIs,
  web search, window walker, Windows Terminal profiles, VS Code workspaces, value generator, and search history.
- OneNote pages with `o:` (needs the desktop version of OneNote, not the Store app).
- PowerToys modules with `@` (needs PowerToys installed).
- Tray icon with Show, Settings, Start with Windows, and Quit.
- Settings window: shortcut, window width, and which plugins are on.
- Automatic updates for the installer: checked at start-up at most once a day, downloaded in the background, and installed
  when you quit. The tray menu has Check for updates.

## Known limits

- The files are not code-signed yet, so Windows SmartScreen may warn when you first run them.
- Two downloads: the installer (`runsearch-1.0.0-setup.exe`) and a portable file that runs without installing
  (`runsearch-1.0.0-portable.exe`). Only the installer updates itself; the portable file must be replaced by hand.
