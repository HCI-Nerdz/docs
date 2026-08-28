# Piles — literature seed (2026-08-19)

Source conversation that seeded the **Piles** concept: canvas email with sentiment signals.

## Core ideas

- **Sentiment axis:** Good / Mostly Good / Neutral / Mostly Bad / Bad — border color + text label
- **Urgency:** glow behind preview, independent of sentiment (attorney reply can be good + urgent)
- **Canvas piles:** message previews on a desk-like 2D surface; latest on top with tilt
- **Auto-sort:** landing canvas holds recent mail; after 30 minutes messages sort into sender/platform piles
- **Fade:** sorted messages grey on landing canvas for ~10 hours, then removed
- **Vertical tab tray:** active + draft messages; dismiss tab when done; **no autoload**
- **Grid mode:** accessible parallel to canvas
- **Advanced search:** glob syntax separate from simple search (`from:*@github.com`, `subject:*APY*`)
- **Scam detection:** heuristic + optional LLM for job-offer scams etc.

## Product name

**Piles** — innocuous name; nobody will see the pile-based email canvas coming.

## Implementation

- Pattern / demos: `HCI-Nerdz/piles`
- Daily-driver app: `Desktop-Tooling/piles`
- Demo: https://hci-nerdz.github.io/piles/

## Related HCI Nerdz thesis

[Attention is not inventory](https://hci-nerdz.github.io/blog/attention-is-not-inventory/) — treat cognitive budget as a hard constraint; Piles reduces mining cost via glanceable sentiment.
