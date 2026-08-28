# Token provenance — literature seed (2026-08-28)

Source conversation that seeded the **token provenance** concept: visually mark which tokens in an AI assistant reply came from heuristics vs grounded investigation.

## Motivation (case study)

An agent was asked to update a Bitwarden fork onto `main`. It repeatedly targeted `AMDphreak/clients` — a plausible guess because upstream is `bitwarden/clients`. The actual fork is `AMDphreak/bitwarden-clients`. The agent burned several turns on 404s before checking GitHub.

Screenshot: [`case-study-fork-name.png`](../../docs/modules/ROOT/assets/token-provenance/case-study-fork-name.png) (also in demo assets).

The user could not tell, at a glance, that the repo slug was an **assumption** rather than a **verified** identifier.

## Core idea

Surface **provenance at the token level** in assistant output:

| Class | Meaning | Example |
| --- | --- | --- |
| **Heuristic** | Pattern completion, default, analogy — not yet checked against a source | `AMDphreak/clients` before any `gh repo view` |
| **Grounded** | Confirmed by tool output, file read, API response, or explicit user fact | `AMDphreak/bitwarden-clients` after GitHub lookup |
| **User-stated** | Taken from the prompt or pinned context | repo name the user typed |
| **Unknown** | Model emitted a claim; runtime has no provenance metadata yet | legacy plain text |

## Visual language (proposal)

- **Heuristic** — dashed underline, warm amber; tooltip: “Assumed — not verified”
- **Grounded** — solid underline, teal; click/hover reveals source (tool name + snippet)
- **User-stated** — dotted underline, neutral grey
- **Do not** rely on color alone — underline style + legend + optional icon glyph

Default: **off or subtle** for grounded tokens; **emphasize** heuristics so assumptions stand out without punishing verified facts.

## Implementation sketch (for Cursor-like hosts)

1. Instrument tool loop: each span the model emits gets a provenance tag from the last grounding event that touched it.
2. Reconcile on edit: when the model replaces `clients` with `bitwarden-clients`, upgrade span class from heuristic → grounded.
3. User override: “mark as verified” on a span (teaches the session, optional persistence).
4. Accessibility: `aria-description` on marked spans; high-contrast patterns.

## Product framing

People first, devs second — the email to Cursor should lead with the **human cost** (wasted minutes, false confidence), not the instrumentation spec. Link the **demo** (30-second replay) before the essay or docs.

## Links (public face)

- Demo: https://hci-nerdz.github.io/demos/token-provenance/
- Essay: https://hci-nerdz.github.io/blog/when-the-agent-assumes-the-fork-name/
- Docs: https://hci-nerdz.github.io/docs/hci-nerdz/token-provenance.html

## Related HCI Nerdz thesis

- [Attention is not inventory](https://hci-nerdz.github.io/blog/attention-is-not-inventory/) — don’t make users mine every token for “did it actually check?”
- [Product representation is the bug](https://hci-nerdz.github.io/blog/product-representation-is-the-bug/) — the UI presents guesses with the same weight as facts
