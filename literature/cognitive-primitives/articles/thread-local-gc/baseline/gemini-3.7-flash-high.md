# Thread-Local Garbage Collection

## What it is

Thread-local garbage collection is a memory management strategy where each thread owns a private heap region, allowing it to allocate and reclaim memory independently without stopping or synchronizing with other threads.

In traditional garbage-collected runtimes, all threads allocate into a single shared heap. Reclaiming unreachable objects requires inspecting every thread's state, demanding either a "stop-the-world" pause—halting all application threads to trace roots and relocate objects—or complex concurrent protocols using atomic operations and memory barriers.

Thread-local GC partitions memory into two tiers:
- **Thread-local heaps (nurseries):** Private regions assigned exclusively to individual threads, accessible only to their owner.
- **Shared global heap:** A common region accessible to all threads for long-lived or shared data.

Because no other thread holds pointers into a private heap, the owning thread can trace, collect, and compact its local region in isolation—without locks, safepoints, or cross-core coordination. When local data must be shared across threads, the runtime detects the transition and promotes it to the shared global heap.

## Why it exists

As core counts scale, global garbage collection faces severe bottlenecks:

1. **Pause-time scaling:** Stop-the-world pauses require bringing every thread to a safepoint. As thread counts grow, coordination latency increases, causing unpredictable tail-latency spikes.
2. **Synchronization overhead:** Concurrent collectors avoid full pauses by using barriers and atomic instructions, consuming CPU cycles.
3. **Allocator contention:** Threads allocating from a single shared allocator can bottleneck on locks or freelist metadata.

Thread-local GC exploits a key empirical observation: most allocated objects in multithreaded systems are short-lived and thread-confined. Web request handlers, worker pools, and actor runtimes allocate temporary buffers, parse trees, and intermediate data structures that are created, used, and discarded entirely within a single thread.

Isolating these ephemeral objects in private heaps allows threads to allocate rapidly via bump pointers and reclaim dead memory immediately. A busy thread can collect its private heap in microseconds without stalling neighboring threads. Shared collections still occur for global data, but far less frequently because most memory churn is resolved locally.

## How it works

Thread-local garbage collection combines private root scanning, dynamic escape tracking, and multi-tier heap collection.

Each thread allocates in its private arena using a bump pointer, incrementing an offset by the requested size with zero locking or atomic overhead.

When an arena fills, the owning thread runs a local collection. It inspects only its private root set:
- Stack frames and local variables of the executing thread.
- CPU registers held by the thread.
- Thread-local storage variables.

The collector ignores the stacks and registers of all other threads. It traces reachable objects within its arena and reclaims dead memory, typically using an evacuating collector that copies live objects to a fresh segment or compacts them in place.

The core correctness rule of thread-local GC is that **the shared heap must never contain an untracked pointer to a thread-local object**, nor may one thread hold a direct reference into another thread's private memory. Violating this invariant allows a thread to free memory another thread is actively reading.

To maintain this invariant, the runtime tracks escaping objects:
- **Write barriers:** The compiler inserts checks on pointer stores. When a thread writes a reference to a local object into a shared object or communication channel, the barrier intercepts the operation.
- **Promotion:** The runtime promotes escaping objects by copying them to the shared global heap and updating references to point to the new shared address. Any local objects transitively reachable from them are also promoted.
- **Escape analysis:** Compilers statically identify allocations proven to escape, allocating them directly in the shared heap to bypass runtime promotion.

A global collector periodically reclaims unreachable objects from the shared heap, managing a smaller, more stable working set.

## Tradeoffs and failure modes

While thread-local GC provides predictable latency for thread-isolated workloads, it introduces distinct architectural tradeoffs and failure modes.

The primary tradeoffs include:
- **Write barrier overhead:** Every heap pointer store executes barrier checks to detect cross-heap references, adding baseline CPU overhead on write-heavy code.
- **Promotion latency:** Migrating an escaping object graph requires traversing and copying referenced data. Publishing large, deeply nested structures in a single write can cause localized latency spikes.
- **Memory footprint:** Reserving private nursery capacity across many threads increases total memory consumption compared to a centralized allocator, especially when threads sit idle.
- **Workload sensitivity:** Thread-local GC excels in request-isolated architectures. It offers little benefit to workloads characterized by shared mutable state or producer-consumer pipelines where nearly every allocation escapes.

Failure modes center on broken locality and resource imbalance:
- **Invariant violation (use-after-free):** If compiler bugs, unsafe native code (FFI), or manual pointer tricks publish a local pointer without triggering a write barrier, a local collection may reclaim that memory, producing dangling pointers and data corruption.
- **Thread imbalance and allocation starvation:** If one thread allocates heavily while others sit idle, it may exhaust its nursery rapidly. Without dynamic rebalancing, the runtime may trigger premature global collections or out-of-memory errors despite unused memory in idle nurseries.
- **Premature promotion cascades:** Overly conservative escape detection promotes temporary objects into the shared heap unnecessarily, polluting global memory and increasing expensive global GC cycles.

## One concrete walkthrough

Consider a worker thread in a web server handling an HTTP POST request.

1. **Local allocation:** The worker thread receives a network payload. It allocates a request buffer, JSON parser tokens, a session record, and an audit log struct in its private nursery via bump-pointer allocation without locks.
2. **Private collection:** Mid-request, the nursery fills. The worker thread pauses only itself and scans its stack and registers. It finds that the request buffer and JSON tokens are dead, while the session record and audit struct remain live. It evacuates live objects to a fresh local segment, resetting its nursery. Sibling threads continue running without interruption.
3. **Publication and promotion:** To log the completed transaction, the worker thread enqueues the audit struct into a shared, thread-safe logging queue.
   - The store activates the compiler's write barrier.
   - The barrier detects that the audit struct resides in thread-local memory.
   - The runtime copies the audit struct and its strings into the shared global heap and updates the queue entry with the new shared address.
4. **Resolution:** The request finishes. Remaining local objects (the session record) are discarded on subsequent local collections when stack references drop. The promoted audit struct remains in the shared heap until the background logging thread processes it, after which it is reclaimed during a standard shared-heap GC cycle.
