# Thread-local garbage collection

## What it is

Thread-local garbage collection is a heap management design in which each thread owns a private region of memory that the collector can reclaim independently, without pausing the other threads in the process. In a conventional stop-the-world collector, the runtime must halt every thread, walk all roots (every stack, every register set, all globals), reclaim the garbage, and resume the world together. In a thread-local design, a collection cycle for thread A touches only A's private heap and A's own roots. Threads B, C, and D keep running.

The design rests on one invariant: objects in a thread's private heap are never directly referenced from other threads' heaps. Either the language enforces this by construction — Erlang is the canonical example, where each lightweight process has its own heap and messages are copied between processes — or the runtime enforces it with bookkeeping that tracks every pointer crossing a region boundary.

One clarification is worth making early. Many mainstream runtimes (the HotSpot JVM, for instance) give each thread a thread-local allocation buffer: a private bump-pointer arena that makes allocation fast and contention-free. That is thread-local *allocation*, not thread-local *collection* — the heap is still shared and still collected with global pauses. Thread-local GC goes further and partitions collection itself.

## Why it exists

The primary motivation is pause time. In a global collector, the worst-case pause scales with the total live heap and with the number of threads that must rendezvous at a safepoint. For latency-sensitive systems — telecom switches, game loops, market-data handlers, interactive servers — occasional multi-millisecond stalls are unacceptable. If each thread's heap is small, collecting it is fast, and nobody else stalls while it happens.

The second motivation is scalability. A global safepoint requires stopping every thread; the coordination cost grows with core count, and the pause wastes the aggregate throughput of the whole machine. A local collection needs no global coordination at all, so adding cores does not make collections more expensive.

The third motivation is locality. A small per-thread nursery fits in cache, bump allocation touches few cache lines, and because most objects die young (the generational hypothesis), the majority of garbage is reclaimed inside the nursery at very low cost. Erlang gets an additional dividend: when a process exits, its entire heap is freed in one shot, with no tracing at all.

## How it works

**Allocation.** Each thread bump-allocates into a private nursery — typically a small contiguous region, often managed as one semispace of a copying collector.

**Trigger and roots.** When the nursery fills, the allocating thread pauses itself at a safepoint and runs a minor collection. The root set is small: that thread's stack slots, registers, and spilled temporaries. Because the invariant guarantees that no other heap points in, this root set is complete.

**Tracing and evacuation.** Live objects are copied to a to-space (or promoted, as described below); copying compacts as a side effect. Everything left behind is dead and is reclaimed wholesale by resetting the bump pointer. No mark pass over the global heap is needed.

**Cross-region pointers.** This is the hard part, and there are two strategies. Enforcement by construction: the language makes sharing impossible — Erlang copies terms on message send, so process heaps are disjoint object graphs and per-process collection is trivially sound. Enforcement by bookkeeping: the runtime keeps a remembered set per local heap, recording pointers from the shared heap (or from other local heaps) into it. A write barrier — a few extra instructions on every reference store — keeps the remembered set current. During a local collection, the remembered set is treated as extra roots.

**Promotion and the shared heap.** Objects that survive enough local cycles, or that become reachable from shared structures, are promoted into a shared old-generation heap managed by a global collector (often concurrent or incremental, but sometimes still stop-the-world). Thread-local collection reduces the frequency of global collections; it does not eliminate them.

## Tradeoffs and failure modes

**Memory overhead.** Every thread reserves nursery space whether or not it uses it. Thousands of threads multiplied by a few hundred kilobytes each is real memory, and fixed-size regions fragment the address space.

**Bookkeeping cost.** Write barriers tax every pointer store, and remembered sets grow with the amount of sharing. If sharing is dense, the remembered set degenerates toward "the whole heap is roots," and local collection loses its advantage while still paying the barrier cost.

**Promotion storms.** A burst of long-lived or widely shared data forces mass promotion, which fills the shared heap and triggers exactly the global pause the design was built to avoid.

**Imbalance.** Thread-local GC helps the aggregate, not the outlier. One thread with a large live set still suffers long local pauses, and sizing nurseries per workload is a genuine tuning burden.

**Correctness hazards.** A missing write-barrier insertion — in hand-written assembly, at an FFI boundary, or in a compiler path that wrongly elides it — silently corrupts the heap. This is the classic bug class in these systems, and it is nasty because the corruption surfaces far from its cause. Thread teardown also needs care: an exiting thread's heap must be reclaimed or merged while other threads may still hold remembered-set entries referring into it.

## One concrete walkthrough

Consider a network server whose runtime gives each worker thread a 1 MB copying nursery plus a shared old-generation heap, with write barriers and per-thread remembered sets.

Thread A handles requests, bump-allocating request objects into its nursery. Most stores are nursery-internal and cost nothing extra. Occasionally a handler caches a result in a shared table; that store trips the write barrier, which appends an entry to A's remembered set.

After some thousands of requests, the nursery fills. A reaches a safepoint and pauses — only A. The collector scans A's stack and registers, plus A's remembered set, as roots. Live objects are copied to the to-space; objects that have already survived two cycles are promoted to the shared heap instead. Pointers are updated, the from-space is abandoned, and the bump pointer resets. The whole cycle takes tens of microseconds because the nursery is small. Threads B, C, and D never stopped.

Over hours, the shared heap slowly accumulates promoted objects. When it crosses a threshold, the global collector runs — say a mostly concurrent mark with one brief rendezvous. Because the nurseries absorbed nearly all allocation, these global cycles are rare.

Now the failure variant: suppose handlers start stashing every request object into a shared cache. The write barrier fires on nearly every store, the remembered set balloons, promotion spikes, and the shared heap fills quickly. Global collections come to dominate, and the design's benefit evaporates. The fix is architectural — keep data thread-confined — not a bigger nursery.
