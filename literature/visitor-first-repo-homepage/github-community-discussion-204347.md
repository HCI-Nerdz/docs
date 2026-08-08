# Repo homepage should be visitor-first: hide empty sidebar sections; put README before the file tree

- **Source:** [https://github.com/orgs/community/discussions/204347](https://github.com/orgs/community/discussions/204347)
- **Author:** @AMDphreak
- **Created:** 2026-08-08T13:25:42Z
- **Category:** Repositories (Product Feedback)
- **Snapshot for:** HCI Nerdz literature / visitor-first repo homepage (2026-08-08)

> Raw export of the discussion body for provenance. Prefer the curated docs topic and site essay for teaching.

---

### 🏷️ Discussion Type

Product Feedback

### Body

---

## Repo homepage should be visitor-first: hide empty sidebar sections; put README before the file tree

### Problem

GitHub repository pages are optimized for **owners/maintainers**, not for the much larger audience of visitors and potential contributors.

On repos with no releases or packages (example: https://github.com/AMDphreak/.issues):

1. **Empty sidebar sections still take space** — “No releases published” and “No packages published” are owner onboarding CTAs, not useful visitor information.
2. **About duplicates header chrome** — stars / watching / forks already live in the top bar. A “Readme” link is redundant when a README exists, and should not appear when there is no README.
3. **The file browser owns the first viewport** — most visitors want the project story (README). The directory dump is secondary. Owners who need the tree already know where Code lives.

This is the same class of mismatch as git’s vocabulary being centered on the person who created the repository rather than people joining later.

Same thesis from outside GitHub (Jan 2026): [GitHub Needs a Meaning First Makeover](https://anish95.medium.com/github-needs-a-meaning-first-makeover-in-2026-d3fb4d42e27d).

### Proposal A — Progressive disclosure for unpopulated sidebar sections

- **Default:** only render sections that have real content (latest release, published package, contributors, website, topics, etc.).
- **Minimal always-on set (suggestion):** description/topics (if set), website (if set), Activity, Contributors — plus the existing header Pin / Watch / Fork / Star.
- **Owner/maintainer hover affordance:** below populated items, hovering the empty area reveals a `+` control. It opens a short list of addable sections; hovering a row briefly expands a one-line explanation (e.g. “Releases — publish versioned binaries and notes”).
- **No README → no Readme link** in About.

### Proposal B — README-first home (tabs or reordered layout)

Either:

1. Sticky secondary tabs: **README** | **Code** (default README when present; otherwise Code), or
2. README above a collapsible / below-the-fold file tree.

Sticky tabs under the repo nav keep switching cheap without burying meaning under files.

### Mockups (proof of concept)

Each step builds on the previous.

**1. Current** — empty Releases/Packages + files-first chrome:

![Current GitHub repo page showing empty Releases and Packages](https://raw.githubusercontent.com/AMDphreak/.issues/main/images/github-repo-page-visitor-first/current-github-repo-page.png)

**2. Proposed** — README first; empty Releases/Packages gone; owner `+` / Add section affordance:

![README-first layout with minimal sidebar](https://raw.githubusercontent.com/AMDphreak/.issues/main/images/github-repo-page-visitor-first/poc-readme-first-minimal-sidebar.png)

**3. Same layout as (2)** — hovering `+` → click to add sections with brief descriptions:

![Sidebar hover add-section menu cropped](https://raw.githubusercontent.com/AMDphreak/.issues/main/images/github-repo-page-visitor-first/poc-sidebar-hover-add-sections.png)

**4. Same layout as (2)–(3)** — Code tab selected (file tree); minimal sidebar + Add section retained:

![Code tab showing file browser with minimal sidebar](https://raw.githubusercontent.com/AMDphreak/.issues/main/images/github-repo-page-visitor-first/poc-code-tab-files.png)

### Non-goals

- Removing Releases/Packages when a repo actually uses them.
- Hiding owner tools from owners — only change **default visibility** and **progressive disclosure** for visitors.

### Prior art / related

- Community workarounds: Refined GitHub, GitHub-Defreshed, etc. (users already paper over density issues).
- Adjacent ideas (tabs next to README, density complaints) exist, but I did not find a discussion that combines hide-empty sidebar progressive disclosure + README-first / sticky Code↔README tabs with mockups. Happy to consolidate if maintainers point at a better parent thread.
