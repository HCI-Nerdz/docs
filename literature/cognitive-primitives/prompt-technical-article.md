# Shared technical article prompt (cognitive-primitives corpus)

Use this prompt verbatim for every **baseline** generation.
For **framework** variants, append the matching **Style constraint** from `style-constraints.md` after the prompt body.
Substitute `{TOPIC}` with one of the topic strings below.

## Topic strings

| Slug | `{TOPIC}` value |
|------|-----------------|
| `thread-local-gc` | Thread-local garbage collection |
| `cas-vs-locks` | Compare-and-swap (CAS) versus locks |
| `object-capabilities` | Capability-based security (object capabilities) |
| `recursion` | Recursion (as a programming and cognitive concept) |

## Prompt body

```
Write a technical explanation article on: {TOPIC}

Audience: a strong junior to mid-level systems engineer. Assume undergraduate CS basics (processes, memory, stacks, pointers at a conceptual level). Do not assume research-level familiarity with garbage collectors, concurrent algorithms, or security formalisms.

Goals:
- Be correct. Prefer unpacking jargon over stacking undefined terms.
- Do not invent concrete APIs, library names, or runtime flags unless they are widely standard and you name them carefully.
- Do not change the topic or pivot into an adjacent subject.

Required outline (use these section headings, in this order):
1. What it is
2. Why it exists
3. How it works
4. Tradeoffs and failure modes
5. One concrete walkthrough

Length: roughly 800–1200 words.
Tone: clear technical prose. No marketing voice. No bullet-only essays — short paragraphs are fine; lists only where they reduce load.

Output: Markdown only. Start with a single H1 title. Then the five H2 sections above. No preamble about the prompt. No meta commentary about style rules.
```
