# Thread-Local Garbage Collection

## What it is

Thread-local garbage collection is a memory-management strategy in which each thread owns a private heap region and reclaiming unused objects in that region does not require stopping or coordinating with every other thread in the process. A garbage collector (GC) finds heap objects that a program can no longer reach through live references and returns that storage for reuse. In a classic stop-the-world collector, all application threads pause so the collector can safely scan shared heaps. Thread-local GC narrows that work: most allocations and most collections happen against memory that only one thread is supposed to touch.

The idea depends on a locality invariant. Objects allocated in a thread-local nursery or arena are treated as private until the runtime proves that a reference to them has escaped into shared memory—for example by being stored in a global, passed to another thread, or published through a concurrent data structure. While an object stays local, the owning thread can free it, compact its region, or run a small collection without taking a process-wide GC lock. Once an object escapes, it graduates into a shared heap that is managed by a slower, more coordinated collector.

Thread-local GC is therefore not “a GC that ignores other threads.” It is a split design: fast, mostly independent reclamation for thread-private data, plus a conventional shared collector for everything that has become visible across threads.

## Why it exists

Multithreaded programs allocate heavily, and global collections become expensive as core counts grow. Every global pause scales poorly: more threads mean more stacks to scan, more caches to disrupt, and longer windows where useful work sits idle. Many short-lived objects never leave the thread that created them—temporary buffers, intermediate parse trees, per-request state in a worker thread. Paying a process-wide pause to reclaim those objects wastes synchronization on work that could have stayed local.

Thread-local collection attacks that cost asymmetry. If a thread can recycle its own garbage without notifying peers, allocation latency stays low and pause times stay proportional to the thread’s private heap rather than to the whole process. That matters for latency-sensitive services and for runtimes that want predictable per-thread behavior under load.

There is also an engineering motive. Isolating young or private heaps simplifies reasoning about races during collection. As long as other threads cannot hold pointers into a private region, the collector does not need complex concurrent marking protocols for that region. The hard concurrency problems are pushed onto the smaller set of objects that actually escape.

## How it works

A typical design starts with a per-thread allocation buffer or nursery. The thread bumps a pointer to allocate. When the nursery fills, the thread runs a local collection: it treats its stack, registers, and any remembered local roots as the root set, traces reachable objects inside the nursery, and either frees dead space or copies survivors into a survivor space or the shared heap.

Escape tracking is the critical mechanism. The runtime must notice when a local object becomes reachable from outside the thread. Common techniques include write barriers on stores into the shared heap, special handling when an object is returned across an API boundary that another thread might observe, and “remembered sets” that record inter-region pointers. If a store publishes a pointer from shared memory into a local object, that object is no longer safe to collect privately; it must be promoted or relocated into shared space first.

Promotion policies vary. Some systems copy escaping objects eagerly into a global heap. Others keep a shared old generation and only collect nurseries locally, treating promotion as the handoff into globally managed memory. Local collections may be copying collectors (compact by moving survivors) or mark-sweep over a thread-owned arena. Shared collections still exist for the global heap and for any cross-thread cycles or shared roots that local passes cannot see alone.

Correctness rests on the invariant that no other thread holds a live reference into memory being reclaimed locally. If that invariant is violated—missed barrier, incorrect escape analysis, or unsafe manual publication—the collector can free memory that another thread still uses, which is a use-after-free bug dressed as an optimization.

## Tradeoffs and failure modes

The main benefit is reduced pause scope and better allocator scalability for thread-private allocation patterns. Threads that churn short-lived local objects can reclaim memory without dragging the rest of the process into a safepoint as often.

The main cost is complexity. Escape tracking must be complete. Write barriers add overhead on stores. Promotion into the shared heap can create a new bottleneck if many objects escape after all; then local collection buys little and you still pay for barriers and bookkeeping. Workloads that share most allocated objects—producer/consumer pipelines, heavily concurrent graphs—see weaker gains and more traffic into the shared collector.

Failure modes cluster around broken locality. A missed escape lets a local collector reclaim an object another thread still reads. Conversely, overly conservative escape treatment promotes too much, bloating the shared heap and lengthening global collections. Thread-local heaps can also waste memory: each thread retains free capacity that other threads cannot use, so high thread counts increase footprint. Imbalanced threads (one allocator, many consumers) can leave large private regions idle while other threads allocate into shared space under pressure.

Debugging is harder than with a single heap. Bugs surface as rare cross-thread corruption rather than clean, reproducible “out of memory” failures. Tuning allocation buffer sizes, promotion thresholds, and when to fall back to a global collection becomes part of operating the runtime.

## One concrete walkthrough

Consider a worker thread handling one HTTP request. It allocates a request object, a few header strings, and a temporary decode buffer in its nursery. While parsing, those objects are only reachable from the thread’s stack. When the nursery fills mid-request, the thread pauses only itself, scans its stack, finds the live request state, copies survivors, and discards the dead temporary buffers. Other worker threads keep running.

Near the end of the request, the handler stores a pointer to the request object into a shared completion queue so another thread can write the response log. The write barrier fires: the request object has escaped. Before or during that publication, the runtime promotes the object (and anything else reachable from it that must remain valid) into the shared heap. The local nursery no longer claims exclusive ownership.

Later, a global collection may reclaim that request object once no queue or thread root still references it. The short-lived decode buffers, which never escaped, were already reclaimed by the thread-local pass without a process-wide pause. That split—local reclaim for private garbage, promotion plus shared GC for published objects—is the operational core of thread-local garbage collection.
