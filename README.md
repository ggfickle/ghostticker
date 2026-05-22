# ghostticker

`ghostticker` is a local terminal TUI for quietly watching an A-share watchlist while still looking like you are staring at a normal developer terminal.

It is intentionally small and local-first:

- watchlist is stored on disk
- no account system
- keyboard-only interaction
- default UI looks like a log stream
- alternate screen (content disappears on exit)

## Current status

This is an early open-source build with the following working pieces:

- empty-state TUI
- local watchlist persistence
- watchlist management screen
- real-time market quotes (via Tencent Finance API)
- event engine with TRACE/INFO/WARN levels
- log stream UI disguised as terminal output
- field obfuscation (task.symbol, delta, rate, flow)
- intraday chart (press `v` to show/hide)
- safe mode (press `s` to hide all market hints)
- 5-second auto-refresh
- alternate screen (like `less` - content disappears on exit)
- `a` to open/close watchlist manager
- `j` / `k` to move selection
- `x` to delete the selected symbol
- `Enter` to add a numeric symbol
- `v` to toggle intraday chart
- `s` to toggle safe mode
- `q` or `Esc` to quit

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

- `q` or `Esc`: quit (Esc in manager returns to main view, Esc again quits)
- `a`: open or close watchlist manager
- `j` / `k`: move selection (works in both views)
- `x`: delete selected symbol (in manager)
- `Enter`: save the typed symbol (in manager)
- `v`: toggle intraday chart for focused symbol
- `s`: toggle safe mode (hide all market hints)
- `r`: manual refresh (not yet implemented)

## Display Modes

### Quiet Mode (default)

Looks like a normal terminal log stream:
- TRACE/INFO/WARN events
- Field names: task.symbol, delta, rate, flow
- No obvious stock market terminology

### Safe Mode (press `s`)

Even more discreet:
- Hides delta, rate, flow fields
- Only shows event messages
- Use when someone is nearby

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
