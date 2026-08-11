# Agent notes — HCI-Nerdz docs

## Editorial titles

- Antora page titles name concepts.
- Site news/blog: [STYLE on public site](https://github.com/HCI-Nerdz/HCI-Nerdz.github.io/blob/main/STYLE.adoc) — first-party news omits org; *as*-framing; attach modifiers.
- Philosophy: [Titles as orientation](https://hci-nerdz.github.io/blog/titles-as-orientation/)
- Machine facts: `$CODE_ROOT/MEMORIES.md` only — no per-repo `MEMORIES.md`.

## Site / Antora

- Component: `hci-nerdz`; start page `hci-nerdz::index.adoc`
- URL: `https://hci-nerdz.github.io/docs/`
- UI: Valentus `v2` bundle; brand CSS `supplemental-ui/css/hci-brand.css`
- `@antora-supplemental/unversioned-component-urls` / alias so `/hci-nerdz/` → latest
- Instruction flows: `instruction-flows.adoc` + `@antora-supplemental/instruction-flow` (GitHub `asciidoc-interactive`) under `asciidoc.extensions`
- Pass-through extensions: `pass-through-extensions.adoc` — meta-suffix peel for Explorer associations
- Open-with interrupt: `open-with-interrupt.adoc` — Ctrl+double-click / file middle-click → app picker; recipes for Windows/macOS/Linux
- Visitor-first repo homepage: `visitor-first-repo-homepage.adoc` — hide empty GitHub sidebar CTAs; README before file tree; upstream https://github.com/orgs/community/discussions/204347
- Context-bound settings: `context-bound-settings.adoc` — settings as dependent process beside activity UI; applicability predicates; essay `/blog/when-settings-live-across-town/`; demo `/demos/context-bound-settings/`
- Context rails: `context-rails.adoc` — edge-summoned ecosystem nav (top/left rails → wireframe platform map; overlay colors); essay `/blog/when-platforms-overload-the-entrypoint/`; demo `/demos/context-rails/`; MVP `HCI-Nerdz/context-rails`
- Topics: `scoped-ux-architecture.adoc` (≠ feedforward)
- Literature: raw conversation sources under `literature/` — catalog page `literature.adoc`; prefer curated topics for teaching, open literature for provenance
