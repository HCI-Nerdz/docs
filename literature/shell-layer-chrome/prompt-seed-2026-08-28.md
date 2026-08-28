# Prompt seed — shell layer chrome

**Date:** 2026-08-28 (afternoon extension)  
**Origin:** Author framing — display layers, paste preview, proshell naming debate  
**Public face:** [Shell layer chrome](https://hci-nerdz.github.io/docs/hci-nerdz/shell-layer-chrome.html)

---

Add output/display layers to the shell. TUIs on separate buffer — does not interrupt stdout record; disappears after UX role played.

**Naming:** Avoid `proshell` — couples to prohelp falsely. Prefer **Open Shell** (public), `ctxshell`/`preshell` as concept names.

**Paste preview:** Multi-line paste shows up to 5 lines in overlay at top, TUI outline, PgUp/PgDn scroll before accept. Step tracker during execution; cancel without poisoning shell.

**Control plane:** Invisible layer routes keys to overlay | context token | base input.

**Mode swap:** UNIX vs Nushell in one session — Ctrl+PgUp/PgDn; Ctrl+1 as mode selector dropdown (not Ctrl+1/2 side by side). Ctrl+2-0 reserved. Ctrl+backtick = home. Ctrl+/ = palette.

**Startup:** Layout document on overlay, not profile echo hacks.

**Comparison pages:** Keybindings matrix + shell landscape taxonomy on openshellorg site.

---

## Addendum — typography (same day)

**Curated default cell/monospace font: Consolas** (system face; do not bundle).
Rationale: monospace must fit OSO non-mono chrome (dew/host widgets, context bar) — not "any mono."
Override allowed (user setting / host chrome).
Fallback: Consolas → Cascadia Mono → Courier New → monospace.

---

## Addendum — open-terminal layout modes + association (same day, PM)

Open Terminal chrome is **multi-mode**, not “decoupled index only”:

| Mode | HCI note |
|------|----------|
| **Standalone** | Familiar “I opened a terminal” — tabs top or left; surface co-located. |
| **Decoupled index** | Index / calling chrome separate from live PTY windows (activity-map cousin). |
| **Other** | Leave room; don’t freeze compositions early. |

**Re-association / thumbs:** session processes stay visible and produce thumbnails; controller UIs **subscribe** (v0 allows multiple). Exclusive “manager hides taskbar windows” is a later product choice. Prefer shared-memory thumb addresses for realtime previews — watch perf.

Canonical: [PRODUCT-MODEL](https://github.com/openshellorg/open-terminal/blob/main/docs/PRODUCT-MODEL.adoc) · [session-association](https://github.com/openshellorg/shell-architecture/blob/main/docs/modules/ROOT/pages/session-association.adoc).
