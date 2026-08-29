# Thread-local garbage collection

## What it is

Thread-local garbage collection is a memory-management strategy in which each execution thread owns a private heap region, and a collector reclaims unused objects within that region without coordinating with collectors on other threads at collection time. The word "thread-local" refers to ownership and allocation locality: most objects are created, used, and discarded by the same thread that allocated them. Reclamation work is scoped to that thread's heap rather than to the entire process address space at once.

This design sits between manual memory management (`malloc`/`free`, `new`/`delete`) and a single global garbage collector that traces the whole heap from root references. Thread-local collection narrows the question from "what is unreachable anywhere?" to "what is unreachable within this thread's arena, given what this thread still holds?"

The approach appears in language runtimes and servers with many worker threads—game engines, actor-style services, and managed runtimes that partition the heap by thread or processor. It is not the same as *thread-local storage* (TLS), which stores per-thread scalar data in OS-managed slots. Thread-local GC manages dynamically allocated objects on a per-thread heap.

## Why it exists

Global garbage collection scales poorly when many threads mutate the heap concurrently. A tracing collector must identify live objects, which requires a consistent view of reference edges while application code runs, or a stop-the-world pause so nothing changes during the trace. Concurrent collectors need write barriers or incremental bookkeeping; stop-the-world collectors introduce latency spikes proportional to live heap size, not merely to the garbage being reclaimed.

Thread-local heaps exploit a common pattern: most allocations are short-lived and thread-private. Request handlers, game entities, and per-task buffers often die when the thread finishes a unit of work. If those objects never escape to other threads—or escape only through controlled shared structures—a collector can treat each thread's heap as largely independent. Thread A's collector does not need to trace thread B's objects to free thread A's garbage.

The model also reduces synchronization on the allocation fast path. Bump-pointer allocation inside a thread-local arena avoids contending on a global allocator lock. When a thread resets its arena after a scoped task completes, deallocation can be bulk and cheap—sometimes equivalent to resetting an offset pointer rather than visiting individual objects.

## How it works

The runtime assigns each thread a dedicated allocation region. Allocation appends objects using a bump pointer or segregated free lists local to the thread. When the region fills, or at a safepoint, the thread-local collector runs.

Collection proceeds in phases analogous to global tracing, but bounded. First, **roots local to the thread**—stack slots, registers saved at safepoints, and thread-local handles—form the starting set for reachability. Second, the collector **traces within the thread heap**, following pointers among objects in the arena and marking reachable ones. Third, it **handles escapes**: if thread A passes a pointer to thread B, the object may live in A's heap while B holds the only live reference. Runtimes address this with escape tracking, shared heaps for escaped objects, reference counting on cross-thread edges, or by promoting escaped objects into a global old generation. The invariant is that an object must not be freed while any thread can still dereference it. Fourth, **reclamation** frees unmarked objects, compacts slabs, or discards entire regions. Some designs use generational thread-local nurseries where most objects die young and are promoted only if they survive or escape.

Safepoints matter because the stack is a root set. Without stopping the mutator or recording stack maps, the collector cannot know which stack words are pointers. Write barriers may still appear when objects in one thread's heap gain references from another, though barrier traffic is often lower because most writes stay intra-thread.

## Tradeoffs and failure modes

The main benefit is scalability under parallel load: collection work partitions with threads, allocation avoids global locks, and pause times can track per-thread live data rather than the entire process heap. Bulk reset of thread-local arenas makes scoped parallelism efficient.

Costs cluster around sharing and memory use. Programs that frequently share mutable graphs across threads defeat the locality assumption; escaped objects require global bookkeeping or expensive cross-thread tracing, and poor escape handling either leaks memory or frees live objects. Private heaps also **amplify memory use**: idle threads may each retain partially filled arenas that a unified allocator would consolidate. **Load imbalance** arises when one hot thread accumulates a large local heap while others stay small. Foreign function interfaces and unsafe pointer code can hide references from the collector, so thread-local GC does not remove the need for accurate root scanning at shared boundaries.

Failure modes include use-after-free if escape is misclassified, memory leaks if escaped objects are never merged into a traceable shared structure, and stop-the-world pauses on individual threads whose local heaps grow large without incremental collection.

## One concrete walkthrough

Consider a web server that assigns each incoming request to a worker thread from a pool. The runtime gives every worker a thread-local nursery spanning a few megabytes.

When a request arrives, the worker parses JSON, builds temporary strings and tree nodes, and allocates response buffers—all into its nursery via bump-pointer allocation. No lock is taken because the bump pointer advances only in this thread's region.

During handling, the worker publishes a compiled template into a concurrent cache shared across threads. That template was allocated in the worker's nursery but is now referenced globally. The runtime records an escape at the write barrier: the template is promoted into a shared old-generation heap, or registered in a global root set until the cache evicts it. Temporary parse nodes that were not published remain reachable only from this thread's stack and local roots.

When the request completes, the worker hits a safepoint. The thread-local collector traces stack and local roots within the nursery, finds that parse nodes and scratch buffers are unreachable, and reclaims them—either by sweeping or by resetting the nursery pointer if the runtime treats the whole request scope as a generation. The escaped template survives in shared storage; the worker's nursery is mostly empty for the next request.

If the worker instead passed a pointer to a temporary buffer directly to another thread without promotion, the other thread could read memory after the nursery reset—a bug the runtime must prevent via copying, pinning, or shared allocation for cross-thread handoffs. Thread-local collection is fast when lifetimes are thread-scoped; shared lifetimes require explicit escape handling.
