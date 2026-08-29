# Thread-Local Garbage Collection

## What it is

Thread-local garbage collection is a family of memory-management designs where each thread (or a small set of threads) owns a private heap region and can reclaim unreachable objects in that region without stopping the whole process. “Garbage” still means the same thing it does in a classic collector: heap storage that the program can no longer reach through any chain of references from roots. What changes is *whose* roots and *whose* heap you scan by default, and how often you must coordinate with everyone else.

In the extreme form, a thread allocates into a nursery or arena that other threads are not allowed to point into—or may point into only through carefully mediated escape paths. While objects stay confined, that thread can collect its local region on its own schedule. Cross-thread references punch holes in the fantasy of complete independence; the interesting engineering is how those holes are tracked and what they cost.

## Why it exists

Global collectors pay a coordination tax. If every mutator can touch every object, a collector that needs a consistent view of the heap often pauses many threads, or runs concurrent protocols with read/write barriers that tax the common path. Latency-sensitive servers and high-churn request handlers feel that tax as pause times, throughput loss, or both.

Empirically, a lot of allocation is short-lived and never shared. Request handlers build temporary strings, trees, and buffers that die before the response is sent. If those objects never escape the allocating thread, a global scan is overkill: you are asking the entire runtime to agree about memory that only one stack could ever have reached. Thread-local collection exists to exploit confinement—collect where the garbage was born—while still providing a correct story when confinement fails.

## How it works

Start with roots local to a thread: its stack, registers, and any thread-local handles the runtime maintains. Allocations go into a thread-owned region. A local collection treats that region like a miniature heap: trace from local roots (and from any remembered set of inbound references), then reclaim unreachable local storage.

The design branches on escape. If an object reference is stored into a globally reachable location—another thread’s heap, a shared queue, a static field—the object has *escaped*. Runtimes detect escape with write barriers, type systems, or disciplined APIs (“this arena may not be shared”). Escaped objects are promoted into a shared heap, pinned until a global phase, or tracked in a remembered set so foreign collectors know inbound edges exist.

Some systems keep per-thread bump allocators and only run a local collector when the thread’s region fills; others use thread-local allocation buffers feeding a shared generational heap, which is related but weaker than true independent collection. True thread-local GC emphasizes *reclamation without a global safepoint* for the confined subset. Shared-heap collection still happens for the global residue—just less often for the common temporary junk.

Correctness still rests on reachability. Local collection is safe only if every possible path to a local object is known: local roots plus recorded cross-thread edges. Miss an edge and you free live memory. Over-approximate edges and you retain garbage longer. The bookkeeping is the product.

## Tradeoffs and failure modes

The win is lower pause contribution from short-lived confined junk and less cross-thread cache traffic when allocation stays local. The loss is complexity: escape detection, remembered sets, promotion policies, and debugging stories that now include “which heap was this in?”

Failure modes cluster around false confinement. A reference stuffed into a shared structure without notifying the barrier makes local collection unsound. Conversely, conservative escape (treating too many stores as global) collapses the design back toward a normal heap with extra ceremony. Imbalanced threads can also hurt: one thread allocating huge local regions forces frequent local GCs or promotion storms, while others idle. Tooling suffers when profilers and dumps must explain multiple heaps and promotion events.

Language and runtime constraints matter. Without a way to prove or trap escape, thread-local GC becomes a polite fiction—thread-local *allocation* with global *collection*. That still helps locality; it does not buy independent reclamation.

## One concrete walkthrough

Imagine a web worker thread handling one request. It allocates a JSON parse tree into its local region. While parsing, only that thread’s stack points at the tree. Midway, the handler finishes parsing and builds a small response object that will be handed to an I/O thread. The store into the shared outbound queue is an escape: the runtime records that the response (and anything it retains) is now globally reachable, promoting those objects or marking them non-local.

When the request ends, the parse tree is unreachable from the worker’s stack and was never escaped. The worker runs a local collection, sweeps the tree, and resets its bump pointer—without asking other workers to pause. The escaped response stays alive until the I/O path drops it and a shared collection (or explicit lifetime end) reclaims it. The local pass paid for the temporary tree; the global machinery only tracked what actually crossed the boundary.
