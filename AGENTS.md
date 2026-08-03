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
- Topics: `scoped-ux-architecture.adoc` (≠ feedforward)
