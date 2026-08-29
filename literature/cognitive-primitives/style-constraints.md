# Style constraints (framework variants)

Append **exactly one** of the following blocks after the shared prompt body when generating a framework-ruled article. Keep the required outline and length band.

## `nsm` — Natural Semantic Metalanguage / semantic primes

```
Style constraint (NSM / semantic primes):
Prefer reductive paraphrase. When you introduce a technical term, unpack it using everyday relational language close to NSM primes (THERE IS, SOMEONE, SOMETHING, DO, HAPPEN, THINK, KNOW, WANT, WHERE, INSIDE, BEFORE, AFTER, GOOD, BAD, MORE, PART OF, KIND OF, BECAUSE, IF, CAN, NOT). Avoid circular dictionary definitions. You may still use the technical term once it has been unpacked. Prefer short clauses over nested abstractions.
```

## `image-schemas` — Image schemas & conceptual metaphor

```
Style constraint (image schemas / conceptual metaphor):
Ground abstract mechanics in explicit image schemas: CONTAINER (in/out, inside/boundary), SOURCE-PATH-GOAL (from → along → to), VERTICALITY (up/down, higher/lower), FORCE/BLOCKAGE, LINK/PART-WHOLE. Make the metaphor visible in the prose (e.g. “memory lives inside a thread’s private room”). Do not let metaphors contradict the technical truth; if a metaphor breaks, say where it stops.
```

## `embodied` — Grounded / embodied cognition

```
Style constraint (grounded / embodied cognition):
Explain via modal, sensorimotor-flavored simulations a reader can almost feel: grasping, releasing, bumping into, waiting in line, holding something while walking. Prefer verbs of bodily action over purely symbolic descriptions. Still stay technically accurate — embodiment is scaffolding, not anthropomorphic fiction about the machine “wanting” things.
```

## `concreteness` — Concreteness / imageability bias

```
Style constraint (concreteness / imageability):
Prefer high-concreteness, high-imageability wording. Favor basic-level categories (thread, heap, lock, pointer, stack frame) over superordinate abstractions (entity, mechanism, infrastructure) unless you immediately concretize them. Prefer countable scenes over mass abstractions. Minimize stacked nominalizations (“utilization of implementation strategies”).
```

## `cognitive-load` — Cognitive load optimization (Sweller)

```
Style constraint (cognitive load optimization):
Minimize working-memory overhead. Keep sentences short; keep dependency depth shallow (avoid long chains of subordinate clauses). Introduce at most one new term per paragraph, define it immediately, then reuse it. Prefer sequencing over simultaneous comparison until both sides are defined. Cut ornamental asides.
```

## `first-principles` — First-principles unpacking

```
Style constraint (first-principles unpacking):
Start from irreducible physical/computational facts (finite memory, exclusive vs shared access, sequential instruction streams) and build upward. Explicitly refuse to treat jargon as foundational — every specialized term must rest on something more primitive you already stated. Order the article so later sections only use vocabulary established earlier.
```

## `concrete-example-first` — Concrete example first

```
Style constraint (concrete-example-first):
Open section 1 with a tiny concrete scenario (names, sizes, steps) before any abstract definition. Keep returning to that same scenario in later sections so abstractions are extrapolations from one shared example. Define terms only after the example has made the need for the term obvious.
```
