# Prompt seed — prompt spatial layout (line modes)

**Date:** 2026-08-28  
**Origin:** Author framing (conversation seed) — stop cramming app+host+path+input on one line; wire both 1-line and 2-line for compare  
**Public faces:** [Shell context chrome](https://hci-nerdz.github.io/docs/hci-nerdz/shell-context-chrome.html) · [Prompt spatial layout @ OpenShellOrg](https://openshellorg.github.io/docs/shell-architecture/prompt-spatial-layout.html) · [Demo](https://hci-nerdz.github.io/shell-context-demo/)

---

## Thesis

Nobody wants to type after "their stuff" on the same line.
Prefer a newline before the command editor, then `▶` (U+25B6) **inside the gutter** as the consistent type-here grabber (gutter primary use — not a chevron outside an empty band).

## Modes (both first-class)

### 2-line (preferred Open Shell default)

```
    [gcloud: ftn] [py: .venv]  rjamd@desk:~/code
[?▶] gcloud compute instances list
```

All contexts on one context line (path with user@host and apps — not path alone).
Input line = gutter (holds `▶`) + command only.

### 1-line (compare / muscle memory)

```
[▶] [gcloud: ftn] [py: .venv] rjamd@desk:~/code  gcloud compute instances list
```

Concession: still types after chrome.

## Switcher

Line mode control lives in the **TUI top context bar** (always-on), not settings.

## Non-goals

Permanent 3-row layouts that isolate path or split host/apps/input by default.
Wrap the context surface instead.

## Spatial rules

- Left-arrow token focus: context tokens only — never the input buffer
- Gutter on input row; context row indents to gutter width in 2-line
- Command lookup injects `requiresContext` tokens onto the context surface, not into the input line


## Arrow mode (top-bar setting)

Do not hard-code `▶` lifetime:

| Value | Live | After submit | Copy |
|-------|------|--------------|------|
| `ephemeral` | `▶` in gutter | gone | never |
| `persist` | `▶` in gutter | stays on history row | included |

Advanced later: overlay-only persist (visible, stripped from copy).


## Mode-engaged top bar (host vs overlay)

probe → offer → accept (native host chrome) | reject (display-overlay fallback).
First-class host: openshellorg/terminal fork. Unknown → overlay.
