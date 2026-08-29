# Thread-Local Garbage Collection

## What it is

Four worker threads — W1, W2, W3, W4 — serve HTTP requests for `api-srv`. One request hits W2 at 14:02:11. W2 reads 4 KB JSON, allocates roughly 120 small parser objects totaling 22 KB, builds a response, sends it, and returns from the handler by 14:02:11.040. Nothing from that parse must survive the response.

Under a monolithic collector, reclaiming those 120 objects might require pausing all four workers while a global scan runs. Under **thread-local garbage collection**, W2 sweeps its own 22 KB while W1, W3, and W4 keep executing — because those objects lived in W2's allocation region and no other thread still pointed at them.

That sentence names the idea before the abstract label: each thread owns a slice of heap work — allocate locally, reclaim locally when pointers from that thread's work are gone — and only involve everyone else when data must outlive one handler or cross thread boundaries.

Formally, a **thread-local heap** is the per-thread region where fast allocation lands first. A **local collection** traces from that thread's stack and frees unreachable objects in that region without a process-wide stop. Shared structures — here, the session map — still use memory every thread can reach; objects placed there follow different rules, introduced when our example needs them.

## Why it exists

Stay with W2's shift. At 14:02:11 it allocated 22 KB in 40 ms of wall time. Three other workers did the same pattern concurrently — roughly 66 KB/s of short-lived parse garbage across the process, almost none of it referenced across threads.

If all four threads bump one global free list, each allocation contends on the same lock or atomic. If one global collector runs, all four handlers freeze together; the 40 ms handler stretches when a 30 ms global pause lands inside it.

Thread-local GC matches what the trace already shows: garbage born on W2 dies on W2. Giving W2 its own nursery and sweeper removes contention and shrinks pause blast radius to the hot thread's safepoint — not because sharing is forbidden, but because this workload rarely shares before death.

## How it works

Revisit the 14:02:11 request step by step; each mechanism appears only when the step needs it.

**Allocation.** W2's runtime keeps a nursery pointer at `0xA0000`. Each parser object bumps the pointer — 22 KB consumed from W2's pages, not from a global pool.

**Roots.** While `handle_req` runs, stack slot at `RBP-32` holds `0xA0100`, the parse tree root. Registers may mirror that value. These are **roots** — starting points for liveness.

**Handler exit.** Return pops the frame; `RBP-32` is dead. No stack root reaches the 120 objects. They are logically garbage but not yet reclaimed bytes.

**Local collection.** W2's nursery hits a threshold; W2 enters a safepoint — only W2's core pauses briefly. The collector scans W2's stack (no inbound edges), walks remembered cross-thread edges (none for this parse), marks nothing in the parse cluster, returns 22 KB to W2's free list. W1 still serves at 14:02:11.041.

Next request on W2 at 14:02:15: client presents cookie `session-8842`. W2 locks a bucket in the global **`session_map`**, reads pointer `0x700200` to an existing session object in **shared heap** memory allocated days earlier on W3 and promoted then. W2 never copies the session body into its nursery for keeps — it only reads through the shared pointer. Local collection rules do not apply to reclaim that object on W2's pass; shared roots and map structure protect it.

Next request at 14:02:19: no cookie. W2 allocates `Session{ id: 9910 }` at `0xA1000` (256 B) in its nursery, then inserts into `session_map`. Insert is the moment the example needs new vocabulary:

- **Escape** — 9910 must live after `handle_req` returns and W3 may read it tomorrow.
- **Write barrier** — store into the map logs that a foreign root now points at `0xA1000`.
- **Promotion** — runtime copies 9910 to shared address `0x700000`, updates the map, so W2's later local sweeps will not free memory W3 will dereference.

At 14:03:02, W3 serves a request, loads `session-9910`, follows `0x700000` — valid because promotion happened at 14:02:19.003, before W2's next local sweep at 14:02:19.050.

The same W2 thread illustrated allocate → root loss → local reclaim, then allocate → escape → barrier → promotion → cross-thread read — without leaving the concrete timeline.

## Tradeoffs and failure modes

Measure tradeoffs against the running example.

**Win.** W2 reclaimed 22 KB at 14:02:11.050 without stopping W1's request at 14:02:11.038–14:02:11.060. Lock traffic on allocation dropped versus one shared bump pointer contended by four workers.

**Cost.** Session 9910 paid promotion — copy 256 B, fix map pointer, barrier on insert — tax a parse-only request avoids.

**Failure — skipped promotion.** If 9910 stayed at `0xA1000` in W2's nursery but the map stored that address, W2's 14:02:19.050 local sweep could recycle `0xA1000`. W3's 14:03:02 load would be use-after-free. The example's insert path exists precisely to prevent that.

**Failure — floating garbage.** If W2 accidentally kept a stale local pointer to a finished parse tree, a local sweep would preserve dead 22 KB. RAM loss, not wrong response bytes.

**Failure — hot W2.** If W2 alone receives 80% of traffic, its nursery sweeps every few requests while W3's collector idles — uneven CPU on collection, not wrong semantics.

**Failure — everything escapes.** If every request inserted large objects into `session_map`, promotion would dominate and local nurseries would stay tiny — design overhead without W2-style local reclaim wins.

## One concrete walkthrough

One table, same characters and timestamps, full pass.

| Time | Thread | Event | Heap / effect |
|------|--------|-------|----------------|
| 14:02:11.000 | W2 | JSON parse starts | — |
| 14:02:11.020 | W2 | 120 objects, 22 KB | W2 nursery `0xA0000–0xA58FF` |
| 14:02:11.035 | W2 | Response sent | — |
| 14:02:11.040 | W2 | Handler return | Stack root gone |
| 14:02:11.050 | W2 | Local GC | +22 KB free to W2; W1/W3/W4 running |
| 14:02:15.010 | W2 | Read session 8842 | Deref shared `0x700200`; no promotion |
| 14:02:19.000 | W2 | New session 9910 | 256 B at `0xA1000` nursery |
| 14:02:19.003 | W2 | Map insert | Barrier; promote → `0x700000` |
| 14:02:19.050 | W2 | Local GC | Skips 9910; may reclaim other local scraps |
| 14:03:02.100 | W3 | Read session 9910 | Valid shared read |

Read the table top to bottom: that is thread-local GC for `api-srv` — local death for parse garbage on the thread that created it; shared life for sessions with explicit promotion at the map insert that first exposed 9910 to other threads.

Return to 14:02:11 whenever the abstractions blur: four workers, one parse burst, 22 KB reclaimed on W2 alone — the rest is the same story with escape added when the cookie line goes missing.
