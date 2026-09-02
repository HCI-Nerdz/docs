# Agent notes — HCI-Nerdz docs

## Editorial titles

- Antora page titles name concepts.
- News/blog titles: `$AGENT_RULES_PATH/agents/editorial/titles.md` (house; cold-reader gate). Local `STYLE.adoc` is a pointer only.
- Philosophy: [Titles as orientation](https://hci-nerdz.github.io/blog/titles-as-orientation/)
- Workstation facts: `$CODE_ROOT/machine.md` + `$CODE_ROOT/harness.md` — never commit; never per-repo.

## Site / Antora

- Component: `hci-nerdz`; start page `hci-nerdz::index.adoc`
- URL: `https://hci-nerdz.github.io/docs/`
- UI: Valentus `v2` bundle; brand CSS `supplemental-ui/css/hci-brand.css`
- `@antora-supplemental/unversioned-component-urls` / alias so `/hci-nerdz/` → latest
- Instruction flows: `instruction-flows.adoc` + `@antora-supplemental/instruction-flow` (GitHub `asciidoc-interactive`) under `asciidoc.extensions`; literature `literature/instruction-flows/`
- Pass-through extensions: `pass-through-extensions.adoc` — meta-suffix peel for Explorer associations
- Open-with interrupt: `open-with-interrupt.adoc` — Ctrl+double-click / file middle-click → app picker; recipes for Windows/macOS/Linux; essay `/blog/choosing-a-file-handler-without-the-context-menu/`
- Visitor-first repo homepage: `visitor-first-repo-homepage.adoc` — hide empty GitHub sidebar CTAs; README before file tree; upstream https://github.com/orgs/community/discussions/204347
- Context-bound settings: `context-bound-settings.adoc` — settings as dependent process beside activity UI; applicability predicates; essay `/blog/making-settings-follow-the-activity/`; demo `/demos/context-bound-settings/`
- Context Edge: `context-edge.adoc` (slug: context-edge) — edge-summoned ecosystem nav (top/left rails → wireframe platform map; overlay colors); essay `/blog/ecosystem-nav-at-the-screen-edge/`; demo `/demos/context-edge/`; MVP `HCI-Nerdz/context-edge`
- Labels versus wires: `navigating-by-content.adoc` (slug kept; concept name is Labels versus wires) — symptom ↔ diagnosis/treatment dialectic; CAS + mutable pointers + `CONSUMERS.md`; symptom essay `/blog/path-renames-that-break-dependents/` + demo; diagnosis essay `/blog/labels-versus-wires/`; sibling connectome-fs explanation. **Systems umbrella:** Internet Reliability @ DevCentr (`docs.devcentr.org` … `/internet-architecture/reliability/`). Not the same phrase as instruction-flows *Navigating by content*.
- Grounded tokens: `grounded-tokens.adoc` — heuristic vs researched inline marks in AI assistant output; essay `/blog/making-model-assumptions-transparent/`; demo `/demos/grounded-tokens/`; literature `literature/grounded-tokens/`
- Symptom ↔ diagnosis/treatment: for repertoire ideas people only feel as a symptom, keep a stable symptom entry (essay/demo) paired with a revisable diagnosis/treatment face (docs + technical essay). Either side can revise without retitling the other.
- Topics: `scoped-ux-architecture.adoc` (≠ feedforward)
- Literature: raw conversation sources under `literature/` — catalog page `literature.adoc`; prefer curated topics for teaching, open literature for provenance
- Mermaid: `supplemental-ui/js/site-mermaid.js` + `css/site-mermaid.css` (same pattern as DevCentr docs). Hub compose pack elsewhere: **Facto** (`antora-supplemental/antora-facto`); Valentus stays lean.
