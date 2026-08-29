# Thread-Local Garbage Collection

## What it is

Picture a large building. The building is the process. Inside it, several **rooms** are **threads** — each room has its own door from the hall, its own desk space, its own trash bin. **Memory** is the stuff on the desks and in the cabinets.

When code in a room creates an object, it often lands on that room's **thread-local heap** — a private allocation area bounded like a container. You put things **in**; the collector sweeps **out** what nobody in that room still points to.

**Garbage collection** is the janitor's route: start from known anchors (stack frames, registers — roots at the **source** of the search), follow **links** along pointer **paths**, mark everything reachable, empty what lies outside the reachable set.

In a classic design, one janitor locks every room and cleans the whole floor at once — **stop-the-world**. In **thread-local garbage collection**, each room keeps a private bin. A janitor can walk **path** through one room's containers without blocking every other room's door. Shared corridors and lobby furniture live in a **shared heap** — a central container objects enter when they must be visible **across** room boundaries.

The metaphor stops where physics starts: memory is not literally furniture, and pointers are not ropes. But the **CONTAINER** schema (inside/outside, local vs shared) and **LINK** schema (who points to whom) match how the machinery is organized.

## Why it exists

The **FORCE/BLOCKAGE** image explains the motivation. When every thread allocates from one global heap, they push against the same lock — a bottleneck, a door everyone tries to pass at once. When one collector runs globally, it **blocks** every thread at a safepoint; work piles up in a vertical queue — higher latency, lower throughput.

Thread-local GC **redirects** allocation **flow** along parallel **paths**: thread A's objects rise and fall inside A's vertical stack of pages; thread B's along B's. Contention drops because most **SOURCE-PATH-GOAL** trips stay inside one thread: allocate here, use here, die here.

Programs shaped like many independent **journeys** — HTTP workers, task queues — fit this map. Each request travels from entry to response mostly inside one room. That shape is why the design exists: the traffic pattern already favors local containers.

## How it works

**CONTAINER**: Each thread owns a young allocation region — often bump-pointer space at the **bottom** (fast path) with overflow into slower arenas. The **boundary** between thread-local and shared memory is enforced by the runtime, not by the programmer's type system alone.

**SOURCE-PATH-GOAL**: Collection begins at **roots** (sources) on the thread's stack and in thread-local registers. The tracer walks edges object to object along pointer **paths**. Unvisited objects inside the local container become candidates for reclamation — the **goal** is free pages returned to the thread's pool.

When an object must survive outside its birth thread, it **crosses** the container wall — **promotion** or **escape** to the shared heap. The crossing is a phase change: local collectors no longer treat the object as private garbage.

**LINK/PART-WHOLE**: Cross-thread references are links between parts of different wholes. If thread 1 holds a pointer into thread 2's local heap, thread 2's collector must not reclaim the target — the **link** keeps it **part of** the live graph globally even if thread 2 alone would discard it. Write **barriers** log when such links are created or updated; **remembered sets** or handshake protocols at safepoints keep the part-whole graph consistent.

Some systems stack **generations** inside each local container: a short-lived nursery **below**, older local objects **above**, with occasional promotion upward into shared old space. The verticality is organizational, not a hardware requirement — but it helps readers see why "most death is low" in the building.

Where the metaphor breaks: there is no fixed geography — heaps can be arenas of bytes, not rooms with walls. **Promotion** is copying bits and updating pointers, not moving a chair through a door. Still, the container and link schemas track the real invariants.

## Tradeoffs and failure modes

**Good trade**: Parallel **paths** mean less **blockage** at allocation and less global **stop-the-world**. Locality improves cache behavior — a thread's hand stays inside its own container.

**Bad trade**: Objects that **escape** often pay promotion tax. Misclassified traffic — too much sharing through local heaps — creates churn across boundaries. Complexity rises: barriers, remembered sets, multiple collectors, balancing heuristics.

**Failure — broken link**: If a cross-thread edge is invisible to the collector, one thread reclaims memory another still traverses. The **path** leads off a cliff — use-after-free. This is the central correctness hazard.

**Failure — floating garbage**: A stale pointer inside one container keeps memory alive though the program logically discarded it — wasted space, not usually corruption.

**Failure — imbalance**: One thread's container overflows while others are empty; one janitor works overtime. Runtimes may **steal** pages or migrate objects — horizontal balancing across containers.

**Failure — fragmentation**: Free holes inside one arena cannot serve another thread's large allocation without compaction or fallback to shared space.

Global invariants still matter: some cycles or weak references need runtime-wide policy. Thread-local collection shrinks the **whole** that must stop; it does not erase shared **parts**.

## One concrete walkthrough

**Scene**: A server building with four worker rooms — threads W1–W4. A **shared lobby heap** holds the session directory — a map every worker reads.

A request enters **W2**. W2's handler allocates a parse tree — 200 small nodes — all **inside** W2's local nursery container. Pointers run from W2's stack frame **down** into the nursery along a short **path**. Response sent; stack frame pops. Roots gone. W2's local collector traces, finds the tree unreachable **inside** W2's boundary, reclaims pages. W1, W3, W4 never hit a global safepoint.

Next request on W2: lookup `session-8842` in the lobby map. The session object lives in the **shared** container — promoted in an earlier request. W2 follows a **link** from its stack into the lobby; no promotion on read.

New client, no cookie: W2 allocates `Session{ id: 9910 }` locally, then inserts it into the lobby map. At insert, the runtime **promotes** `9910` — copies or relocates across the local/shared **boundary**, updates the map's pointer. Now W3 can follow the same **path** from lobby to session. W2's later local sweeps will not erase `9910`; the lobby **link** roots it for all rooms.

If promotion were skipped and W3 read a pointer still targeting W2's private nursery, W2 might reclaim under that address after its handler returns — a broken **cross-container link**. The barrier at insert prevents that by moving ownership to shared space or pinning until safe.

Under load, W2's nursery fills every few requests; local collections are frequent but shallow — mostly parse debris. The lobby collector runs less often, scans cross-thread roots, compacts if needed. Throughput stays high because **blockage** is local: four **paths**, four bins, one shared floor for the furniture that must stay in the hall.

That walkthrough is the image in motion: containers for birth and death, links for shared life, paths for tracing, boundaries crossed only when the program's graph demands it.
