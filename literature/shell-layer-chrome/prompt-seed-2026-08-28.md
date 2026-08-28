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
