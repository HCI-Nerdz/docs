# Recursion

## What it is

Recursion is a computational pattern built from three image schemas working together: PART-WHOLE, CONTAINER, and PATH with VERTICALITY.

PART-WHOLE: a whole structure contains parts that resemble the whole at a smaller scale. A directory contains subdirectories; a linked list is a head part plus a list part; a tree is a root part plus tree parts below. Recursive code expresses an operation on the whole as an operation on its parts plus a rule for combining results.

CONTAINER: each function call occupies a bounded region—the stack frame—that holds local state sealed off from other frames. Frames are nested containers: an outer call's container encloses the inner call's container until the inner completes and is removed.

PATH with VERTICALITY: execution moves downward along the call chain (deeper into nested containers) until a base case stops descent, then moves upward (return path) as each container releases its result to the one above. "Up" and "down" here map to stack growth and shrinkage, not physical space, but the vertical metaphor matches how debuggers and stack traces display calls.

Recursion is therefore not a separate kind of logic from iteration; it is the same sequential machine organized so that PART-WHOLE structure in the problem is mirrored by nested CONTAINER frames and a two-phase PATH (descent, then ascent).

## Why it exists

Many domains present repeatable PART-WHOLE geometry. File systems, parse trees, organizational charts, and fractal-like data all invite descriptions of the form "handle the piece at this level, then handle the rest the same way." Recursion exists in programming languages because the call stack already implements nested containers with automatic push on entry and pop on return. Writing recursive functions delegates container management to the runtime instead of simulating it with explicit structures.

The cognitive appeal follows the same schemas. People sort nested boxes, open folders inside folders, and parse sentences into clauses inside sentences without formal training. When code structure aligns with PART-WHOLE perception, less translation is needed between how the problem looks and how the program reads. When alignment is poor—numeric loops over flat arrays—the recursive form may feel forced.

Recursion also separates the stopping rule (base case: no further parts to descend into) from the combining rule (recursive case: process parts, merge). That split matches how people often explain hierarchical things: "if there's nothing left, stop; otherwise, do this bit and repeat on what's inside."

## How it works

Descent: the caller enters its frame (container pushed onto the stack). If the input matches the base case—empty container, zero size, leaf node—the function computes the answer and begins ascent without further nesting. Otherwise the function performs local work and invokes itself on a proper part (strictly smaller whole). Each invocation repeats: new inner container, same pattern.

The PATH downward continues only while each step reduces the whole toward a base part. VERTICALITY is visible in stack depth: depth equals the longest chain of nested wholes before a base case. A balanced tree of height h produces paths of length h; a skewed tree can produce length proportional to node count.

Ascent: when an inner call returns, its container is destroyed and its return value crosses the boundary into the outer container. The outer call may still be mid-computation—waiting on a second subtree, for example—so the PATH upward is not instantaneous for the entire chain; it unwinds one container at a time. PART-WHOLE combining happens during ascent: the whole's result is assembled from part results already computed below.

Tail-recursive forms arrange the PATH so the last action in a container is descent into the next container of the same function, allowing some runtimes to collapse vertical depth by reusing the top container—PATH becomes a cycle at fixed height rather than a growing column.

## Tradeoffs and failure modes

CONTAINER depth is finite. Each nested frame consumes stack memory; exceeding the limit overflows the container stack regardless of logical correctness. Deep PART-WHOLE structures—long linked lists processed recursively, unbalanced trees—stress vertical PATH length. An explicit heap-allocated stack preserves the same PART-WHOLE algorithm while moving containers off the limited vertical region.

Failure to reach a base case means infinite descent: containers push forever until overflow. A recursive case that does not shrink the whole—passing the same part again, or two parts that together still equal the whole without progress—breaks the PATH termination condition.

Redundant PART-WHOLE visits waste work when the same sub-whole is reached on multiple PATH branches. Without memoization, overlapping subtrees in a graph (not a tree) violate the simple tree PART-WHOLE assumption and can explode combinatorially.

Cognitively, maintaining multiple open containers in mind is costly. Readers must track which level they are on, which part results are still pending, and where ascent will resume. Stack traces in debuggers externalize VERTICALITY, which helps. Engineers who think primarily in flat PATH loops may find nested PART-WHOLE code harder to simulate than equivalent iterative code with an explicit stack variable—same geometry, different surface form.

Mutual recursion splits PART-WHOLE handling across two functions; the container nesting is unchanged, but the PATH alternates between two names, which can obscure which whole is being reduced at each depth.

## One concrete walkthrough

Count nodes in a binary tree using PART-WHOLE, CONTAINER, and PATH.

Whole: tree at root `R`. Parts: left subtree `L`, right subtree `Rgt`, and the root node itself as atomic base when subtrees are empty.

Base case (empty whole): empty tree → count 0. No descent; container resolves immediately.

Recursive case: non-empty whole → count = 1 (root) + count(`L`) + count(`Rgt`). Descent PATH: Call A in container depth 1 for `R`. Must enter container depth 2 for count(`L`) and count(`Rgt`).

count(`L`): suppose `L` is a single leaf. Base on both child parts (empty). Returns 1. Ascent to depth 1; left part result = 1 stored in A's frame.

count(`Rgt`): suppose `Rgt` has root `B` with empty left and leaf right `C`. Container depth 2 for `B`. Descent to depth 3 for count(`C`); leaf returns 1; ascent to depth 2: 1 + 0 + 1 = 2 for subtree `Rgt`. Ascent to depth 1; right part result = 2.

Container depth 1 completes ascent: 1 + 1 + 2 = 4.

Trace VERTICALITY: maximum depth 3 (R → B → C). Three nested containers alive at peak; then C's container pops, B's pops, partial results combine at each pop.

PART-WHOLE reading: the whole tree's size is the whole root plus the wholes below it. PATH reading: go down until every branch hits an empty whole (leaves and missing children), then come up multiplying and adding at each whole boundary. The walkthrough is the same whether you say "recursive function" or "nested containers on a vertical path through self-similar parts"—the schemas name what the machine and the mind are already doing.
