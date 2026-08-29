# Thread-Local Garbage Collection

## What it is

Start with facts, not jargon.

A CPU executes one instruction at a time per core. A **process** owns a virtual address space — a range of byte addresses the OS maps to physical RAM or swap. Bytes have no type until code interprets them.

A **thread** is a schedulable unit inside a process: its own instruction pointer, stack pointer, and register set. Threads in one process share the same address space. They can read and write the same addresses unless the runtime forbids it.

**Memory** for call frames lives on each thread's **stack** — LIFO, automatic lifetime tied to function entry and exit. Memory for arbitrary-sized blocks with programmer-controlled lifetime lives on the **heap** — bytes allocated by explicit request, freed only when something reclaims them.

If heap bytes are never reclaimed after last use, allocated addresses accumulate until the process exhausts its limit. **Reclamation** is therefore mandatory. **Tracing reclamation** (what people call garbage collection) means: enumerate addresses currently referenced from known starting points, treat every other heap object as dead, return dead bytes to an free list.

**Thread-local garbage collection** partitions heap responsibility by thread. Each thread receives a dedicated allocation subrange (or linked list of pages). The tracing pass that reclaims unused objects in that subrange runs in the context of one thread and uses that thread's registers and stack as primary root sources. Other threads may continue executing during that pass, subject to safepoint rules on the collecting thread only.

No new magic beyond partitioned bytes and scoped tracing — the name states the partition key: thread.

## Why it exists

Fact: multiple cores can run multiple threads truly in parallel. Fact: two threads writing the same memory location without coordination create data races unless synchronization primitives serialize access.

A single global free list for all heap allocations is one shared mutable structure. Every allocation may update it. Parallel threads contend on the lock or atomic that protects it. Contention scales poorly when allocation rate scales with thread count.

A global tracing pass needs a complete, consistent snapshot of all roots in all threads simultaneously, or a proof that concurrent mutation is tracked. The usual implementation is: stop every thread at a **safepoint**, scan all stacks, then trace the whole heap. Stop duration grows with heap size and thread count.

Partition heap bytes by thread and two pressures ease: (1) most allocation touches only one thread's metadata; (2) most tracing touches only one thread's heap region and one thread's stack. Parallelism in the program can map to parallelism in reclamation when object lifetimes align with thread boundaries — which they often do in request-per-thread servers.

We have not assumed garbage collection yet at the start — only finite memory, shared address space, parallel threads, and the cost of shared mutable allocators. Thread-local GC is one engineering response built on those facts.

## How it works

Build upward in layers already established.

**Layer 1 — bytes and pointers.** A heap object occupies a contiguous address range. A pointer is a stored address value. Reachability is graph reachability over pointer edges starting from root addresses.

**Layer 2 — roots per thread.** At any safepoint on thread T, roots include words in T's stack frames and T's callee-saved register set. Globals and shared structures are additional roots for any pass that might reclaim objects they reference.

**Layer 3 — thread-local allocation region.** The runtime maps pages to T. An allocator hands T addresses only from T's region for fast-path news. A bump pointer or segregated free list inside the region avoids touching global allocator state.

**Layer 4 — local trace.** When T's region fills or a timer fires, the collector for T marks reachable objects reachable from T's roots plus any registered external roots pointing into T's region. Unmarked objects wholly contained in T's reclaimable region return to T's free list.

**Layer 5 — shared address space reality.** Another thread U may store a pointer value targeting an address inside T's region. T's trace must treat that stored value as a root edge. **Write barriers** — code executed on pointer stores — append (U, address) tuples to a remembered set T consults before freeing.

**Layer 6 — escape.** If T stores a pointer to object O into memory U will read without further synchronization on O's location, O's lifetime is no longer thread-local. The runtime **promotes** O: copy or move O's bytes to a shared region S, fix pointers, so T's local trace no longer owns O's fate alone.

Order matters: you cannot define promotion before escape, or barriers before shared address space. Each layer uses only vocabulary from prior layers.

## Tradeoffs and failure modes

From the same foundations:

**Trade — synchronization vs isolation.** Partitioned allocators reduce lock traffic but cannot eliminate it: promotion, global roots, and page stealing reintroduce shared metadata.

**Trade — CPU vs memory.** Local nurseries improve cache locality; multiple partially filled regions increase total RSS versus one compacted heap.

**Failure — unsound reclamation.** If a pointer from U to T's region is omitted from T's root set, T returns live bytes to the free list. U later loads through the pointer — undefined behavior on machines where memory is just bytes. This is not a GC-specific mystery; it is use-after-free in a traced system.

**Failure — logical leak.** A reachable-but-unused object stays marked because some forgotten pointer remains in T's heap or a global — floating garbage. Bytes wasted; graph was conservative.

**Failure — skew.** If work is not uniform across threads, one region allocates faster; its trace runs hotter. Fixed partition key (thread) may mismatch variable load unless the runtime migrates pages.

**Failure — over-promotion.** If most objects escape immediately, layer 3 provides little benefit and layers 5–6 dominate cost.

Each failure names a broken invariant from the layers above, not a separate folklore item.

## One concrete walkthrough

Ground the stack of layers in one trace.

Process P, address space 48-bit. Threads W1–W4, identical worker loops. Shared global `G` at address `0x5000` holds a hash map — roots for any pass that reclaims map nodes.

**W2 iteration.**

1. **Allocate (L3).** Parser requests 120 blocks totaling 22 KiB. Allocator returns addresses `0xA0000–0xA58FF` from W2's mapped pages. No global lock on bump path.

2. **Roots (L2).** Stack slot at `RBP-32` holds `0xA0100` — root to parse tree.

3. **Handler return.** Pop frame; `RBP-32` overwritten. Parse tree no longer reachable from W2 roots alone.

4. **Local trace (L4).** W2 safepoint. Scan W2 stack → no edge into parse region. Scan remembered set → empty this cycle. Mark-sweep inside `0xA0000–0xA58FF`. All 22 KiB to W2 free list. W1, W3, W4 instructions retire during W2 safepoint only on W2's core.

5. **New session.** Allocate `Session` at `0xA1000` (256 B). Insert pointer into `G` at `0x5008`.

6. **Barrier (L5).** Store into `G` triggers log: external root `{G, 0xA1000}`.

7. **Escape (L6).** Runtime copies 256 B to `0x700000` in shared region S, updates `G` to `0x700000`, clears barrier entry for old address. O's lifetime tied to S and map roots.

8. **W3 later.** Load from `G`, dereference `0x700000` — valid. Had step 7 been skipped, step 4 could have reclaimed `0xA1000` while `G` still held `0xA1000` — layer-4 trace unsound relative to layer-1 shared memory.

Metrics follow: W2 local traces every 200 iterations; S traced globally every 60 s; cross-thread stores into W2 nurseries rare except promotion path.

The walkthrough is the layer cake executed: bytes, pointers, per-thread roots, local trace, barrier for cross-thread edges, promotion when lifetime leaves the thread partition.
