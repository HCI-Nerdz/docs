# Thread-Local Garbage Collection

## 1. What it is

Thread-local garbage collection is a memory-management technique in which each application thread can allocate objects into a private heap region and reclaim some or all of those objects without coordinating with every other thread. “Thread-local” describes object reachability and ownership, not merely where an allocator stores bytes: an object is safely local only while no reference to it is accessible from another thread.

This technique usually complements, rather than replaces, a process-wide garbage collector. A runtime may begin an object in a thread-local region, collect that region cheaply, and move or “promote” objects into a shared heap when they escape. The shared heap then uses ordinary tracing, reference counting, or another global strategy.

Thread-local collection differs from thread-local allocation buffers. An allocation buffer gives a thread a private chunk from which it can reserve memory without locking, but objects allocated there may still belong to the global heap and be collected globally. Thread-local GC additionally tries to make reclamation local.

## 2. Why it exists

General-purpose garbage collection becomes harder as thread count rises. To determine whether an object is dead, a tracing collector starts from roots—such as stack variables, registers, and global references—and follows pointers. If any thread can point anywhere, collecting one heap region may require inspecting or pausing all threads. Shared metadata, allocation counters, and collector queues can also become contention points.

Most short-lived objects, however, never leave the thread that creates them. Examples include temporary parse nodes, request-local intermediate values, and objects used while formatting a result. Treating all such objects as globally shared imposes synchronization and scanning costs that their actual use does not require.

A thread-local collector exploits this common case. Allocation can often be a pointer increment in private memory. A local collection needs to inspect only one thread’s roots and local region, reducing synchronization, cache-line bouncing, and global pauses. It can also improve locality because one thread allocates and scans nearby memory.

The goal is not simply maximum throughput. Local collections can make pause costs easier to attribute: a thread that creates temporary garbage usually pays to reclaim it, while unrelated threads continue running.

## 3. How it works

The central requirement is an invariant: while an object remains in thread T’s local heap, no other thread may hold a usable reference to it. If that invariant holds, only T’s stack, registers, and local objects can keep it alive. T can therefore collect its region without scanning other threads.

A typical design has three parts. First, each thread allocates into a private region. Second, the runtime detects when a reference to a local object is about to become shared. This transition is called escape. Third, escaped objects are promoted to memory managed under shared-heap rules.

Escape can occur when code stores a local reference into a shared object, publishes it through a concurrent queue, assigns it to a global variable, or passes it to another thread. Runtimes commonly enforce the boundary with a write barrier: extra logic attached to pointer stores. The barrier checks whether the destination or communication path is shared and, if necessary, promotes the referenced object before completing publication.

Promotion may involve more than copying one object. Suppose local object A points to local object B, and A is published. Another thread could reach B through A, so the runtime must promote the reachable local subgraph, or otherwise arrange that every transitively reachable object remains valid and safely managed. During copying, references must be updated, and repeated paths must not create duplicate copies.

When a local region fills, its owning thread reaches a safe point where its registers and stack can be interpreted reliably. A tracing local collector marks objects reachable from that thread’s roots and from any relevant shared-to-local references. Under a strict ownership invariant, shared-to-local references should not exist; designs that permit them need a remembered set recording such pointers. The collector then reclaims unmarked objects, often by compacting survivors or resetting storage when region structure allows it.

## 4. Tradeoffs and failure modes

The largest cost is boundary management. Every store that might publish a pointer may need a barrier, and promoting a connected object graph can be expensive. A workload that rapidly exchanges newly allocated objects between threads may spend more time checking and promoting than a conventional generational collector would spend collecting them.

Promotion also complicates object identity and pointer handling. If an object moves, all references to it must continue to denote the promoted object. Managed references can be rewritten or routed through handles, but unmanaged raw pointers, foreign-function interfaces, and interior pointers into an object make movement harder. A runtime may pin such objects, allocate them directly in shared memory, or restrict what may point into a local region.

Cycles are easy to collect while wholly local because tracing does not depend on reference counts. Cycles crossing ownership boundaries are harder: they require promotion, cross-region tracking, or eventual global tracing. Finalizers and weak references add ordering rules because observable cleanup must remain correct across local and global collections.

The most dangerous failure is incorrect publication. If another thread receives a pointer to memory that the owner still considers local, the owner may reclaim or move that object. The result is a dangling reference, corrupted data, or a race that appears only under particular timing. Consequently, the escape barrier is part of memory safety, not merely a performance optimization.

Finally, thread-local GC does not eliminate global coordination. Shared objects, inter-thread cycles, metadata maintenance, and occasionally promotion pressure still require a shared collector. The design works best when object graphs usually stay local long enough to die there.

## 5. One concrete walkthrough

Consider a server thread handling one request. It allocates a `Request` object, a temporary `Parser`, and three token objects in its local region. The parser points to the tokens, and the request points to the parser. Allocation touches only the thread’s private bump pointer.

The thread finishes parsing and constructs a `Result` that contains one token-derived string. It then enqueues the result for a writer thread. Enqueueing is publication: after the operation, another thread can reach the result.

The write barrier sees that the result is local but the queue is shared. It copies the result into the shared heap. Because the result points to the string, the barrier also promotes that string. It does not promote the parser or token objects because the promoted result has no references to them. The queue receives a reference to the shared copy only after promotion and reference updates are complete.

Later, the request thread fills its local region and triggers a local collection. Its current stack no longer refers to the parser, tokens, request, or original local result. The collector finds none of them reachable and reclaims their space. The writer thread continues using the promoted result and string in the shared heap; it never observed pointers into the reclaimed local region.

This example shows both the benefit and the key constraint. Most temporary parsing data dies through a collection involving one thread, while the small portion that crosses a thread boundary pays the promotion and shared-management cost.
