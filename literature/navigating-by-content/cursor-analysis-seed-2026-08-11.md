# Navigating by content — analysis seed (Cursor, 2026-08-11)

Author framing + synthesis of (1) the Gemini export on NDN / CAS / dependency coupling and (2) the Cursor chat on reverse dependencies (`CONSUMERS.md`), org placement, and DevX.

Not polished docs. Curated face: Antora topic `navigating-by-content`.

## Problem (lived)

Renaming a public path, package surface, or doc URL in one project breaks dependents that baked the string into prose, configs, or other sites. Package registries already track reverse deps for *code*. Prose URLs and cross-repo docs do not. AI agents guess which trees to search.

Canonical / pretty URLs are supposed to be for **human convenience**, not for **functional wiring**. Using the human label as the identity of a resource is the root mistake.

## Two naming failures that feel related

| Layer | Example research | What it names | Failure mode |
| --- | --- | --- | --- |
| Network (≈ L3/4) | Named Data Networking (NDN; e.g. Dr. Lan Wang / Memphis Networking Research Lab) | Packets / content by hierarchical name, not host IP | Location churn; host-centric fetch |
| Application / DevX | Sourcegraph/Kythe, OpenRewrite, Unison, `CONSUMERS.md` | Symbols, docs, URLs, consumer graphs | Rename / semantic break across repos |

They are **architecturally orthogonal** (Gemini): NDN does not rewrite Markdown links; reverse-dep manifests do not route packets.

They **complement in UX/DevX** (author): the human want is “I should not have to care where the bytes live or what pretty name we currently use,” as long as it is the same thing (or the same *intent* with an explicit pointer update).

## Combined stack (proposal)

1. **Content-addressed identity (CAS)** — consumers bind to `hash(bytes)` (or content-addressed graph nodes). Renames and moves with identical content do not break fetch.
2. **Mutable human pointer** — a stable semantic name (`/docs/latest/auth`, NDN hierarchical name, IPNS-style pointer) maps to the current hash when content *updates*.
3. **Reverse consumer graph** — producers list who depends on them (`CONSUMERS.md` / registry). Used when human-readable aliases must change, or when the world still wires on strings (today’s web). Agents search those trees instead of guessing.
4. **Pragmatic absorb layer** — redirects, Antora aliases, “cool URIs don’t change,” link checkers. Keep shipping while CAS adoption is incomplete.

## Near-term vs long-term

- **Near-term (multi-repo today):** stable public surfaces + producer-owned `CONSUMERS.md` + search/refactor under listed trees + redirects.
- **Long-term (internet / FS / VCS):** content-addressed substrate (see connectome-fs: GUID/hash nodes, edges, editions) so hierarchy and pretty URLs are *projections*, not identity.

## Org placement (decided in chat)

- **HCI Nerdz** — analysis, proposal, essays, demo: reference integrity as cognitive tax / DevX pain.
- **DevCentr** — practitioner conventions and agent rules for reverse-deps (follow-up).
- **connectome-fs** — sibling explanation + blog: this *is* the substrate thesis (identity ≠ path).
- Not AMDphreak for the manifesto.

## Homepage domains

HCI Nerdz homepage should orient **domains of HCI** (second section, not hero) so non-visual repertoire (naming / reference integrity) has a shelf beside chrome demos.

## Related faces

- Relatable essay: sick of chasing URLs; labels vs wires.
- Technical essay: layer diagram, NDN boundary, CAS + pointer + consumers.
- Docs topic: full proposal + mermaid + `CONSUMERS.md` shape.
- Demo: animated mock of rename-break vs content-stable fetch.
- Icon: hash core + detachable name tag.
