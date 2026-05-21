# ghostticker

`ghostticker` is a local terminal TUI for quietly watching an A-share watchlist while still looking like you are staring at a normal developer terminal.

It is intentionally small and local-first:

- watchlist is stored on disk
- no account system
- keyboard-only interaction
- default UI stays minimal

## Current status

This is an early open-source build with the following working pieces:

- empty-state TUI
- local watchlist persistence
- watchlist management screen
- `a` to open/close watchlist manager
- `j` / `k` to move selection
- `x` to delete the selected symbol
- `Enter` to add a numeric symbol

Market quote fetching and the disguised log/event stream are still under active development.

## Install

`ghostticker` is a Node.js terminal CLI, so the release package is platform-neutral. You need Node.js 22 or newer and npm.

```bash
curl -fsSL https://raw.githubusercontent.com/ggfickle/ghostticker/main/scripts/install.sh | bash
```

## Run

```bash
ghostticker
```

The installer downloads the latest GitHub release, installs it under `~/.local/share/ghostticker`, and writes a launcher to `~/.local/bin/ghostticker`.

If `ghostticker` is not found after install, add this to your shell profile:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Manual install from source

```bash
git clone https://github.com/ggfickle/ghostticker.git
cd ghostticker
npm ci
npm run build
npm link
ghostticker
```

## Test

```bash
npm test
npx tsc --noEmit
```

## Keys

- `a`: open or close watchlist manager
- `j` / `k`: move selected symbol in the manager
- `x`: delete selected symbol
- `Enter`: save the typed symbol
- `Esc`: leave the manager

## Local data

Watchlist and preferences are stored under:

```text
~/.ghostticker/
```

Files:

- `watchlist.json`
- `preferences.json`

## License

MIT
