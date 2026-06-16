# Roadmap

## Phase 1: Reliable History Completion

- Keep the current line tracker conservative and predictable.
- Store history outside Tabby config when the history grows beyond MVP size.
- Add candidate deletion with `Shift+Delete`.
- Add settings for max history size, system grouping, and trigger keys.
- Add privacy filters for commands that likely contain secrets.

## Phase 2: Templates

- Add user and team template files.
- Support placeholders, default values, and recent placeholder values.
- Add template-only search mode.
- Add import/export for team-maintained command packs.

## Phase 3: Static Command Rules

- Define a YAML or JSON rule format.
- Implement providers for common commands:
  - `git`
  - `systemctl`
  - `journalctl`
  - `docker`
  - `kubectl`
  - `tar`
  - `find`
  - `grep`
  - `ssh`, `scp`, `rsync`
- Parse command position, subcommand position, options, option values, and path arguments.

## Phase 4: Optional Lightweight Probes

- Keep probes disabled by default.
- Prefer side-channel SSH when Tabby exposes it safely.
- If only PTY probing is available, require explicit manual refresh.
- Cache probe results per profile, host, user, and working directory where appropriate.
- Start with read-only probes:
  - installed command discovery
  - git branch names
  - systemd unit names
  - local/remote path names

## Phase 5: Polish And Distribution

- Add settings UI.
- Add tests for line tracking, ranking, command parsing, and privacy filters.
- Publish to npm with the `tabby-plugin` keyword.
- Add screenshots and demo recordings.
