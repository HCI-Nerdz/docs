# Thread-Local Garbage Collection

## What it is

A **thread** runs instructions independently inside one process. Each thread has its own stack. Threads also use **heap** memory for objects that outlive a single function call.

**Garbage collection** reclaims heap objects the program can no longer reach. The runtime traces pointers from **roots** — stack slots, globals, registers — and frees everything else.

**Thread-local garbage collection** gives each thread its own heap region. Each thread can collect garbage in its region without stopping every other thread. Shared objects still live in a separate shared area or get special tracking.

That is the core idea: local allocate, local collect, shared path only when needed.

## Why it exists

Many programs use dozens of threads. They all allocating from one heap creates lock traffic. One global collector freezing all threads creates long pauses.

Thread-local GC reduces both problems. A thread allocates in its own region with less locking. A thread collects its own garbage while others keep running.

The pattern fits server workers and task pools. One request usually creates and destroys objects on one thread. Most lifetime is local even when sharing is possible.

## How it works

**Step 1 — Local allocation.** The runtime assigns each thread a nursery block. New objects land there first. Allocation is often a pointer bump inside the block.

**Step 2 — Local roots.** When collection runs on thread T, it reads T's stack and registers. Those slots are roots for T's pass only.

**Step 3 — Local trace.** The collector follows pointers from roots through objects in T's heap regions. Reachable objects survive. Unreachable objects in those regions become free space.

**Step 4 — Escape.** If an object must be visible to another thread, it **escapes**. The runtime **promotes** it to shared heap memory or marks it globally rooted. After that, T's local pass will not free it.

**Step 5 — Cross-thread edges.** Another thread may hold a pointer into T's heap. **Write barriers** record such stores. T's collector adds those records to its root set. Without this step, T could free live memory.

**Step 6 — Safepoint on T only.** T pauses briefly so roots are stable. Other threads continue unless they hit their own safepoints.

Learn one term, then the next. Allocation is local. Collection is local. Escape moves outward. Barriers protect inward pointers from other threads.

## Tradeoffs and failure modes

**Benefit — less contention.** Threads touch separate allocation regions. Fewer threads wait on one malloc lock.

**Benefit — shorter pauses.** Stop-the-world applies to one collector pass on one region, not the full process every time.

**Cost — promotion.** Moving an escaped object copies bytes and updates pointers. Frequent escape erodes the win.

**Cost — barriers.** Every store that might publish a pointer pays a small tax. Complexity rises in the runtime.

**Failure — missed cross-thread pointer.** Collector frees memory another thread still uses. Crash or corruption follows. Barriers and safepoints exist to prevent this.

**Failure — floating garbage.** A stale pointer keeps memory alive though logic discarded the object. RAM waste, not usually wrong results.

**Failure — hot thread.** One thread fills and collects its nursery constantly. Others idle. May need page stealing or heap balancing.

**Failure — fragmentation.** Free holes in one thread's region cannot satisfy a large allocation without compaction or shared fallback.

Compare benefits only after each cost term is defined above. Local wins when most objects die on the creating thread. Shared overhead dominates when most objects escape immediately.

## One concrete walkthrough

Use one server with four worker threads: W1, W2, W3, W4. One shared `session_map`.

**Event A — parse only.** Request hits W2. Parser allocates 120 objects in W2's nursery. Stack root points to the tree. Handler returns. Root gone. W2 runs local GC. Tree unreachable. Space reclaimed. W1, W3, W4 never paused globally.

**Event B — read shared session.** Next request on W2. Lookup finds session 8842 in `session_map`. Object already in shared heap. W2 reads via pointer. No promotion. No escape.

**Event C — new session.** Next request on W2. No cookie. W2 allocates session 9910 locally. Handler inserts into `session_map`. Escape detected. Runtime promotes 9910 to shared heap. Map stores shared address. W2 local GC later skips 9910.

**Event D — other thread reads.** Later request on W3. Loads session 9910 from map. Valid because promotion moved it before W2 reclaimed nursery memory.

**Event E — load.** W2 local GC every ~200 requests. Shared old-gen GC every ~60 seconds. Global pause time drops versus one monolithic collector.

Replay the same four events when testing a mental model. Local create and destroy on W2. Shared map only for cross-thread survival. Promotion at insert time. Barriers implied at that insert.

That sequence is thread-local GC with minimal parallel concepts on the page: one thread, one nursery, one escape, one remote read — ordered, not stacked.
