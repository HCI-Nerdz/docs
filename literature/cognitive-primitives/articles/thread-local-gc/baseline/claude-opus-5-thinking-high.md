# Thread-Local Garbage Collection

## What it is

Thread-local garbage collection is a heap organization in which each thread owns a private slice of the heap and can reclaim memory in that slice by itself, without coordinating with other threads.

A conventional tracing collector treats the heap as one shared graph. To reclaim anything safely it needs the full set of *roots* — pointers held in every thread's stack, registers, and global variables — and it must not let threads mutate the graph while it walks it. Hence the traditional stop-the-world pause at a *safepoint*, a place in compiled code where the runtime can read a thread's state accurately.

Thread-local collection changes the unit of collection from "the heap" to "this thread's region." If the runtime can guarantee that no object in a thread's region is reachable from any other thread, then that region's only roots are that thread's own stack and registers. One thread can pause itself, trace, reclaim, and resume while every other thread keeps running and is never even notified. That guarantee is the whole idea; the rest is machinery to maintain it.

The best-known production example is the BEAM, the virtual machine behind Erlang and Elixir, where each lightweight process has its own heap and is collected independently. By contrast, the JVM's thread-local allocation buffers (TLABs) give each thread a private chunk to bump-allocate into, but collection is still global. Private allocation and private collection are different properties, and the second is much harder to get.

## Why it exists

The first pressure is pause time. A stop-the-world collection costs roughly the time to trace live data plus the time to bring every thread to a safepoint, and both terms scale badly as heaps and thread counts grow. A service with a 10 ms tail-latency budget cannot absorb a 200 ms global pause. Thread-local collection makes pause cost proportional to one thread's private live data — often kilobytes — and confines the pause to that thread.

The second is the complexity of the collector itself. Concurrent collectors are hard to write correctly because they interleave with mutating threads, and much of their bulk is synchronization: barriers, remembered sets, handshakes, atomic mark bits. Inside a provably private region most of that is unnecessary, so the local collector can be a simple single-threaded copying collector.

## How it works

Three problems have to be solved: partitioning, escape, and cross-thread references.

**Partitioning.** The allocator hands each thread its own pages. Ownership is usually derivable from the address — align regions to a power of two and mask the pointer — so "is this object mine?" costs a couple of instructions.

**Escape.** An object escapes when a reference to it becomes visible to another thread, which can happen only through a few channels: stores into globals or other shared objects, stores into objects owned by another thread, and explicit hand-off such as a message send. The runtime instruments all of them with a *write barrier* — code the compiler emits alongside every reference-typed store, comparing the region of the object being written to against the region of the object being stored.

When the barrier sees a local object about to become reachable from foreign or shared memory, it does one of two things. It can *copy* the object into the receiving thread's region or a message buffer, so the original never escapes; this is the actor-style answer, and it is why message passing in such runtimes has value semantics. Or it can *promote* the object into a shared heap managed by a separate global collector. Promotion is transitive, since whatever the escaping object points to escapes too, so one reference can drag a large subgraph out of the local region.

**Cross-thread references.** A local region will still contain pointers *out* of itself, which are harmless: the local collector treats them as opaque and never follows them. Incoming pointers are the dangerous direction, and the invariant is that there are none; designs that permit a few record each in a *remembered set* used as an extra root.

A local collection is then unremarkable. At its own safepoint the thread scans its stack and registers for references into its region, copies the reachable objects to a fresh area, updates the references it found, and frees the old area wholesale.

## Tradeoffs and failure modes

Cycles that span regions cannot be collected locally. If thread A's promoted object points to thread B's and back, no single thread's view proves either is dead. Thread-local collection therefore never replaces a global collector; it defers it. Systems that pretend otherwise leak.

Barrier cost is paid on every reference store, by everyone — a permanent throughput tax, whether or not anything ever escapes.

Promotion and copying can dominate. A workload that produces shared data — a cache, a queue of large structures, a fan-out of results — pushes most allocation through the escape path. Copying costs bandwidth, and transitive promotion floods the shared heap, reintroducing the global pauses you were avoiding. The design fits mostly-private, short-lived data with small hand-offs, and fits shared mutable structure badly. Memory overhead is real too: each thread's unused headroom is unavailable to the others.

The sharpest failure mode is a correctness cliff. Any path that publishes a reference without going through a barrier — a hand-written intrinsic, a foreign-function call handing a raw pointer to native code — silently breaks the invariant, and the resulting dangling pointer surfaces long after and far from the cause. That is why the technique stays confined to runtimes that control every reference store.

## One concrete walkthrough

Take an actor-style runtime handling HTTP requests, one lightweight thread per connection, each with a 256 KB private region.

Thread 7 accepts a request and allocates a byte buffer for the raw bytes, a tokenizer state, a few dozen header strings, and a parsed request record — say 180 KB in total, all in its own region, all by bumping a pointer with no lock or atomic instruction.

The bump pointer reaches the end of the region, so thread 7 collects itself. It stops at its next safepoint, scans its own stack and registers, and finds three live references: the parsed request record, a header string, and a response builder. Tracing from those roots reaches about 12 KB, which it copies into a fresh region, rewriting the three stack slots to point at the copies before releasing the old region. Elapsed time: single-digit microseconds, and no other thread was paused or even signalled.

Next, thread 7 sends a query message to thread 12, referencing a query-parameters object in its own region. The barrier fires: the object is local, the destination is foreign. The runtime copies that object and everything it transitively references into thread 12's region, and the message carries the copy. Thread 7's original stays private and dies at its next local collection.

Finally, thread 7 records a cache entry in a process-wide shared map. The barrier sees a store into shared memory and this time promotes: the entry and its reachable subgraph move into the shared heap. Thread 7's region now holds an outgoing pointer its local collector will not follow, and the entry becomes the global collector's responsibility — and that collector runs rarely, paying the coordination cost thread 7 skipped a thousand times.

The cheap path is private and frequent, the expensive path is shared and rare, and the barrier is what keeps them apart.
