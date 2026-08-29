# Thread-Local Garbage Collection

## What it is

Thread-local garbage collection is a memory-management design in which each thread owns a private heap and can reclaim dead objects in that heap without stopping other threads. The collector is still a tracing collector: it starts from roots, follows pointers, and frees anything unreachable. As long as an object is reachable only from one thread, that thread can collect it against its own stack, registers, and private arena.

This is stronger than thread-local allocation. Many runtimes give each thread a bump-pointer buffer so new objects can be carved out without locking a shared free-list. Those buffers still feed a heap that a process-wide collector must scan. Thread-local collection keeps the objects themselves in a region other threads are not allowed to see, so a local collection does not need a consistent snapshot of the whole program.

The invariant that makes this legal is an escape distinction. An object is thread-local while no other thread can hold a pointer to it. The moment a pointer is stored into shared memory, sent through a mailbox, or otherwise published, the object is no longer private. It must be copied or promoted into a shared heap that a coordinated collector manages. Private heaps may point at the shared heap; the reverse is forbidden unless the private object is promoted first. A shared object pointing into a private nursery would let a local collection free memory another thread still uses.

## Why it exists

A tracing collector that treats the entire heap as one graph needs a consistent view of every pointer. On a multiprocessor that means stopping all mutator threads, or running a concurrent collector with write barriers, remembered sets, and a lot of cross-thread traffic. Pause time and synchronization cost scale with core count and with the size of the shared heap.

Most objects die young, and most never leave the thread that allocated them. Temporary buffers and intermediate nodes are allocated, used, and dropped without becoming shared state. Charging those objects a global collection is wasteful. Thread-local collection exploits that locality. A thread can fill a private nursery, collect from its own roots, and reuse the space while other threads keep running. Global collections still occur, but they should see mainly objects that actually crossed a thread boundary.

The design also matches some programming models. Actor and message-passing runtimes already treat an actor or process as an isolated heap. If a send copies or transfers the payload at the boundary, isolation is a language fact, not a heuristic, and collection of the actor’s heap can stay private.

## How it works

Allocation draws from a thread-private arena, typically a bump pointer. Roots for a local collection are that thread’s stack and registers. The collector traces those roots through the private heap. Unreachable private objects are reclaimed at once, often by resetting the bump pointer after compacting survivors. Reachable private objects stay private, sometimes in a slightly older private generation.

Escape detection preserves the invariant. The runtime must notice when a pointer to a private object is stored where another thread could load it: a static, a field of an already-shared object, a work queue, a channel. That notice is usually a write barrier on potentially publishing stores. On such a store the barrier either copies the object—and the private subgraph it reaches—into the shared heap, or it reclassifies the object as shared and promotes it in place. Promotion happens before the store completes, so a shared object never points into another thread’s private heap.

Some systems keep a purely private young generation and a shared old generation. Local collections are then minor collections. Promotion into the old generation happens on survival across local collections, or immediately on escape. Major collections of the shared heap still need coordination among threads; they should simply run less often. In a message-passing runtime the barrier can be the send itself: the payload is copied or ownership-transferred, and after send the sender holds no alias the receiver can follow.

## Tradeoffs and failure modes

The gain is pause isolation and less contention: a thread reclaims its own garbage without a global safepoint. The price is barriers, promotion machinery, and a second heap to manage.

Escape-heavy programs give the benefit back. If most allocations are immediately stored into shared maps, caches, or mailboxes, the write barrier fires constantly, objects flood the shared heap, and local collections reclaim little. The runtime has paid for two collectors and gotten roughly one.

A missed barrier is not a performance problem. If an obscure store—reflection, a native call, a compiler-lowered intrinsic—publishes a private pointer without promotion, a shared object now points into a private nursery. The next local collection may reuse that memory. Another thread then has a use-after-free. The bug is silent until a later load.

Copy-on-escape duplicates allocation: an object built locally and then published is allocated twice, and the copy can pull a large reachable subgraph into the shared heap. Transfer-on-escape avoids the copy but requires the sender to drop the pointer, which only some languages make natural.

Footprint can grow with thread count. Each thread holds spare nursery space. Hundreds of mostly idle threads can pin a large amount of private heap that a single shared nursery would have reused. Local collections also do not reclaim garbage that already lives in the shared heap. A leak among published objects still needs a global cycle. Thread-local collection is a filter in front of a shared collector, not a replacement for one. Addresses may also change on promotion, which complicates heap dumps and leak tools.

## One concrete walkthrough

A worker thread in a server receives a request. It allocates a parse tree, a few scratch buffers, and a result object. It will throw the tree away and either discard the result or publish it for another thread to read.

The parse tree is allocated in the worker’s private nursery. Pointers among its nodes never leave the thread. When the handler returns, the tree is unreachable from the worker’s stack. The worker runs a local collection: it scans its stack and registers, finds no pointers into the tree, and reclaims the nursery, often by resetting a bump pointer. No other thread paused. The shared heap was not scanned.

Now the handler stores the result into a global map of completed requests so a consumer thread can load it. That store is a publishing write. The write barrier sees a private object being installed into a shared structure. It copies or promotes the result and any private objects still reachable from it—for example a string body—into the shared heap, then writes the shared pointer into the map. After that, a local collection on the worker will not free the result; the shared collector owns it. The parse tree was never published, so it still dies in the worker’s next local collection.

If that barrier were skipped, the map would hold a pointer into the worker’s nursery. The worker’s next local collection could reuse the bytes. The consumer would then read freed storage. The walkthrough’s safety hangs on intercepting that one publishing store before the pointer becomes visible.
