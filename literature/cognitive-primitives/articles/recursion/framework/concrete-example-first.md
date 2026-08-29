# Recursion

## What it is

Consider a binary tree: each node holds a label and optional left and right children. How many nodes does the tree contain? For the tree below root `M`, with left subtree rooted at `A` (a leaf) and right subtree rooted at `P` (which has leaf child `Q`), the answer is four nodes: `M`, `A`, `P`, and `Q`.

Recursion is the standard way to express that count. A tree's size is zero if the tree is empty. Otherwise it is one plus the size of the left subtree plus the size of the right subtree. The definition refers to "size" again on strictly smaller trees—the same operation on nested parts of the same shape. In code, a function `size(tree)` implements that definition by calling `size` on the left and right children when the tree is not empty.

Each call waits for nested calls to finish. The runtime keeps a stack of active calls; the deepest calls reach empty subtrees first, return zero or one, and results combine on the way back up. Recursion here is both the mathematical definition of tree size and the mechanism that walks the tree structure.

## Why it exists

Tree size is awkward to describe without self-reference. You could iterate with an explicit queue or stack of nodes to visit, but the declarative definition—size of whole equals one plus sizes of parts—maps directly to recursive functions. File systems, JSON documents, abstract syntax trees, and organizational hierarchies share the same part-whole shape; recursive algorithms are the default tool.

The call stack exists for ordinary functions; tree algorithms reuse it as implicit storage for "which subtrees I still owe." Humans parsing the same tree often reason recursively in conversation: "this node plus everything under it." The cognitive step from "tree in the diagram" to "function that calls itself on subtrees" is short because the structure is visible in the example.

## How it works

Two cases drive every recursive tree function. Base case: empty pointer or sentinel meaning no node → return 0 for size (or return false for search, or return empty list for collect). Recursive case: current node exists → compute from children.

For size, the recursive case returns `1 + size(left) + size(right)`. The call on the left must complete (and possibly the call on the right) before the current frame can finish addition. Order of child calls matters only if side effects exist; for pure size, left-then-right and right-then-left yield the same sum.

Stack depth equals the longest root-to-leaf path. A bushy tree may have modest depth; a skewed tree may have depth equal to node count. Each frame stores the current node pointer and the partial sum waiting on child results.

## Tradeoffs and failure modes

Our four-node example uses depth at most three along path `M → P → Q`. A tree of millions of nodes in a straight line could recurse millions of frames and overflow the stack even though counting nodes is O(n) work. An iterative depth-first walk with an explicit stack avoids that bound on call-stack depth.

Missing base case—forgetting to treat null as zero—leads to null pointer dereference or infinite descent. Computing size on a cyclic graph with naive recursion loops forever unless visited nodes are tracked; trees are acyclic by definition, graphs are not.

Duplicate traversals: naive recursive Fibonacci on a tree of overlapping subproblems is a different pitfall; tree size as defined visits each node once if each node is reached only from its parent. For size, redundancy is not an issue; for path enumeration without memo, it can be.

Cognitively, tracing size on a small drawn tree—mark each node when entered, write returned counts beside nodes—is enough for junior engineers to verify code. Large trees require trusting the induction rather than simulating every frame.

## One concrete walkthrough

Tree: `M` has left `A` (no children) and right `P`; `P` has right child `Q` only (left empty).

Call `size(M)`: not empty → need `1 + size(A) + size(P)`.

`size(A)`: leaf → `1 + size(null) + size(null)` = `1 + 0 + 0` = **1**. Returns 1 to `size(M)`.

`size(P)`: not empty → `1 + size(null) + size(Q)`.

`size(Q)`: leaf → **1**. Returns to `size(P)`.

`size(P)` completes: `1 + 0 + 1` = **2**. Returns to `size(M)`.

`size(M)` completes: `1 + 1 + 2` = **4**.

Stack timeline: frames for M, then A ( completes quickly), back to M, then P, then Q, then unwind P, then M. Peak depth three when inside `size(Q)`.

The same tree size scenario could be written iteratively with a counter incremented on each visited node; the recursive version mirrors the definition sentence-for-sentence. That identity—example tree, definition, call trace, final count four—is the full story of recursion for this problem: self-similar structure, base on empty, combine on return, stack records the path from `M` down to `Q` and back.
