# Thread-Local Garbage Collection

## What it is

A **thread** is one execution line inside a process — a stack, a program counter, registers. A **heap** is memory where objects live after `new` or equivalent allocation. A **pointer** is an address stored in a stack slot, register, or another object, telling the CPU where to find data.

**Garbage collection** means the runtime finds heap objects no pointer chain reaches from live roots, then recycles those bytes for new objects. Roots are concrete: local variables on the stack, static globals, CPU registers at a safepoint.

**Thread-local garbage collection** splits the heap by thread. Each thread gets a **thread-local heap** — its own allocation region and often its own collector pass. Thread 3's collector reclaims garbage in thread 3's region without stopping thread 1's stack and without locking the entire program heap for every allocation.

Shared data still exists. Objects that outlive one handler or must be read by another thread move to a **shared heap** or get tracked so local collectors do not free them. The split is organizational: most bytes allocate and die on the same thread that created them.

## Why it exists

One global heap plus one global collector creates two visible problems: **lock contention** when many threads call `malloc` at once, and **stop-the-world pauses** when the collector needs every thread frozen to scan roots safely.

Thread-local heaps cut contention — a thread bumps a pointer in its own page list. Thread-local collection cuts pause scope — only the collecting thread waits at a local safepoint, not the whole process.

Programs with many identical worker threads — server request handlers, thread-pool tasks — match this layout. Each request builds a pile of short-lived objects on one thread's stack and heap; few survive after the response. Most garbage is thread-scoped in practice even when the language allows sharing.

## How it works

**Allocation**: The runtime hands thread T a nursery — a contiguous chunk. T allocates by advancing an offset. When the chunk fills, T gets another chunk or triggers a local collection.

**Local collection**: The collector for T scans T's roots — stack frames, registers — and marks reachable objects in T's heap regions. Unmarked objects in those regions become free memory. Other threads keep running unless they hit a safepoint for unrelated reasons.

**Escape and promotion**: When code stores a pointer to object O in a global, sends O on a queue, or inserts O into a map another thread reads, O **escapes** T's local heap. The runtime **promotes** O — copies or moves O to shared memory and updates pointers — or registers O as globally rooted. After promotion, T's local sweeps treat O as outside their reclaim set.

**Cross-thread pointers**: If thread A reads a pointer into thread B's local heap, B's collector must see that edge. **Write barriers** — small snippets on pointer stores — log inter-thread or inter-heap edges into a **remembered set**. At collection time, B merges those edges into its root set so live objects are not mistaken for garbage.

**Safepoints**: Local collection still needs a moment when T's stack layout is stable and roots are enumerable. That pause is thread-local, not process-wide.

Concrete chain: allocate locally → use on stack → handler ends → roots vanish → local mark-sweep or copy-collect → bytes back to T's free list. Cross-thread chain: allocate locally → store into shared structure → barrier fires → promotion → shared roots protect O.

## Tradeoffs and failure modes

**Wins**: Fewer locks on the hot allocation path. Shorter or zero global pauses for local nurseries. Better CPU cache reuse when a thread's reads stay in its pages.

**Costs**: Promotion copies bytes and fixes pointers. Write barriers run on stores that might escape. Multiple heaps mean balancing — one thread may hoard empty pages while another allocates fresh OS memory.

**Use-after-free**: If a cross-thread pointer is invisible to B's collector, B frees while A still loads the address. Hard crash or heap corruption. This is the primary correctness failure mode.

**Floating garbage**: Stale pointer in a local structure keeps an object marked though the program logic discarded it. Wastes RAM; rarely breaks semantics.

**Load skew**: Hot thread collects constantly; cold threads rarely fill nurseries. Throughput may bottleneck on one collector unless the runtime migrates work or steals pages.

**Over-escape**: If programmers or libraries funnel most objects through shared caches, local heaps stay nearly empty and barriers dominate without contention relief.

## One concrete walkthrough

Server process `api-srv`. Four pthreads W1–W4 pull HTTP jobs from a queue. Shared `session_map` hash table lives in old shared heap memory.

**Request on W2**, body 4 KB JSON:

1. W2 calls parser; allocator grabs 180 bytes × 120 small objects from W2's nursery — total ~22 KB in W2-local pages.
2. Stack frame `handle_req` holds pointer `root → parse_tree`.
3. W2 builds 2 KB response buffer, also local.
4. Response sent; `handle_req` returns; stack slot `root` gone.
5. W2 nursery 90% full; local GC runs on W2 only. Roots: W2 stack + remembered set. Parse tree unreachable; 22 KB reclaimed. W1 still serving.

**Next request on W2**, cookie `session-8842`:

1. W2 locks bucket in `session_map`, finds existing `Session*` pointing into shared heap — allocated days ago on W3, promoted then.
2. W2 reads fields; no new session object; no promotion.

**Next request on W2**, no cookie:

1. W2 allocates `Session{ id=9910 }` — 256 bytes in W2 nursery.
2. Handler inserts into `session_map`. Store barrier records escape; runtime promotes 9910 to shared heap slot `0x7F12A000`, updates map pointer.
3. W2 returns; local GC runs. Map entry roots 9910 in shared space; W2 nursery reclaims only the temporary parse scraps from step 1 if any remain.

**Later on W3**:

1. W3 loads `session-9910` from map, dereferences `0x7F12A000` — valid shared object. If promotion had been skipped, W3 might read freed W2 nursery — use-after-free.

**Under load**: W2 allocates 50 MB/hour local, reclaims 49 MB/hour local; shared heap grows 1 MB/hour net from new sessions. Global old-gen collection runs once per minute; W2 local collections run every ~200 requests. P99 latency avoids 40 ms global pauses seen on the old monolithic heap.

That numbers-and-steps picture is thread-local GC: local birth and death on one thread's pages; shared map for cross-thread survival; barriers and promotion at the boundary.
