# Prompt seed â prohelp gutter + auto-help affordance

**Date:** 2026-08-28
**Origin:** User request â prohelp + Open Shell context-button system
**Public face:** [Shell layer chrome](https://hci-nerdz.github.io/docs/hci-nerdz/shell-layer-chrome.html) Â· [Shell context chrome](https://hci-nerdz.github.io/docs/hci-nerdz/shell-context-chrome.html) Â· [Prohelp gutter @ OpenShellOrg](https://openshellorg.github.io/docs/shell-architecture/prohelp-gutter.html)

---

## Problem

Users only discover CLI help after typing `--help` or failing. That hides reliability â the shell should *show* when help exists.

## Automatic help affordance

When prohelp recognizes the command in the input buffer, show interactive **`?`** without user typing help flags. Builds trust.

## Placement

1. **Primary:** Gutter zone at prompt start â black/reserved band before context tokens; `?` first when prohelp matches.
2. **Secondary:** Inline ghost/hover `?` after matched prefix on narrow terminals.

## Glyph policy

- U+2370 â rejected (monospace visibility)
- Raw `?` â acceptable fallback
- Custom TUI overlay glyph â v1 target

## Gutter scope

Overlay-only: `â¶`, `âª`, AâZ / 0â9 markers. Deprecate printf ad-hoc arrows/bullets. Width: 2 / 3 / 4â6 cols.

## Context row

Gutter `?` at persistent context row start when namespace active; prohelp scopes to focused token.

## SDL hints

`detectPattern`, `matchPrefix`, `detectMode`, `autoHelp`, `requiresContext`, `scopeNamespace`, `gutterPlacement`, `gutterIcon`, `gutterWidthHint`, `gutterPriority`.

Prohelp stays shell-agnostic â not bundled with Open Shell.
