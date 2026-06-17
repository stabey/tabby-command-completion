# Tabby Command Completion

Shell-independent command completion for [Tabby](https://tabby.sh/).

This plugin is designed for conservative server environments: old Bash, no zsh/fish requirement, no remote shell modification, and no server-side install step. Completion is provided locally from command history, templates, static command rules, and optional lightweight read-only probes.

## Do I Need To Fork A Tabby Plugin Template?

No. Tabby's plugin docs do not require forking a special template repository. The official guidance describes the plugin package layout and points to [`Eugeny/tabby-clippy`](https://github.com/Eugeny/tabby-clippy) as an example plugin. `tabby-clippy` is not marked as a GitHub template repository.

The important Tabby plugin requirements are:

- `package.json` includes the `tabby-plugin` keyword;
- `main` points to the bundled plugin entry, usually `dist/index.js`;
- the plugin default export is an Angular `NgModule`;
- the module registers Tabby extension providers such as `TerminalDecorator` or `ConfigProvider`;
- publishing to npm with the `tabby-plugin` keyword makes the plugin discoverable in Tabby's plugin manager.

This repository follows that standalone plugin shape.

## Current Scope

Implemented:

- command history capture through Tabby's `SessionMiddleware`;
- per-server history grouping, for example `ssh:user@host:22`;
- automatic prefix suggestions while typing;
- completion popup for xterm-based Tabby terminals;
- settings tab under Tabby's Settings window;
- `Ctrl+R` for history search;
- `!` at the beginning of a line for history-only completion;
- candidate navigation with arrow keys, `Tab` to accept by default, `Enter` to run the current line, and `Escape` to close;
- conservative history storage rules that skip empty commands, leading-space commands, and control characters.

Planned:

- static rules for common Bash-era tools such as `systemctl`, `journalctl`, `git`, `docker`, `kubectl`, `tar`, `find`, `grep`, `ssh`, `scp`, and `rsync`;
- team command templates with placeholders;
- optional lightweight probes for paths, installed tools, git branches, and systemd units;
- privacy controls, encrypted storage integration, and candidate deletion.

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Run Tabby with this plugin during development:

```bash
TABBY_PLUGINS="$(pwd)" tabby --debug
```

Tabby also loads plugins from the Plugins directory shown under `Settings > Plugins`.

## Architecture

The plugin is split into small pieces:

- `CommandCompletionDecorator` attaches to xterm tabs, handles hotkeys, and owns the popup lifecycle.
- `CommandLineTrackerMiddleware` observes terminal input and maintains a best-effort current command line.
- `CommandHistoryStore` stores and ranks history candidates.
- `CompletionPopup` renders the suggestion UI near the terminal cursor.
- `CommandCompletionSettingsTabComponent` exposes user-facing settings.

The next major internal API should be a `CompletionProvider` interface so history, templates, static rules, and probes can be developed independently.

## Settings

After installing the plugin, Tabby shows a `Command completion` page in Settings.

Available options:

- enable or disable command completion;
- switch between automatic prefix suggestions and manual shortcuts only;
- enable or disable the automatic popup;
- choose whether `Tab` or `Enter` accepts the selected candidate;
- set minimum prefix length, maximum suggestions, and maximum stored history items;
- choose whether history is shared across systems or grouped per SSH user, host, and port;
- clear local command history.

## Safety Model

This plugin should never execute a completion candidate by default. Accepting a candidate only inserts text into the terminal.

Remote probing must be optional, read-only, short-timeout, cached, and visible to users. The default experience should work without sending any extra command to remote servers.

## Prior Art

WindTerm appears to use a hybrid completion model: static command metadata, scheme trigger rules, command history, and QuickBar commands. Its public source repository does not include the terminal UI or completion engine, but the 2.7.0 portable package includes command metadata under `terminal/commands` and completion triggers under `terminal/schemes/*/*.complete`.
