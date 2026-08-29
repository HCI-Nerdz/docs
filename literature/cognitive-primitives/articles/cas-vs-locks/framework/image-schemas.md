# Compare-and-Swap Versus Locks

## What it is

Imagine shared memory as a **CONTAINER**: a bounded room with a door. Several execution threads are agents that may need to enter, alter what is inside, and leave. Without rules, two agents can cross the threshold at once and collide over the same object—a classic **FORCE** conflict where neither agent's intended change survives intact.

A **lock** is an explicit boundary control on that container. To modify protected data, a thread must first move **IN** through the gate by acquiring the lock. While one thread is **INSIDE**, others are kept **OUT** at the boundary—they block or spin at the door. Release is the movement back **OUT**, opening the container for the next waiter. The mental image is single occupancy: one body in the room at a time.

**Compare-and-swap** (CAS) uses a different schema. Picture a single slot on a conveyor (**LOCATION** as a point, not a room). A thread **SOURCE**s a snapshot of the slot's current value, travels mentally along a **PATH** toward a **GOAL** value it wants installed, and the hardware performs one indivisible check: if the slot still holds the expected value, write the new one; otherwise abort. There is no sustained "inside" period for the whole structure—only an atomic crossing at that one word. The metaphor here is **LINK**: compare the current link state, and either swap the link target or discover someone else already changed it.

Both mechanisms address the same vertical problem—**UP** the stack of abstraction we need correctness—but via different routes through the shared-memory landscape.

## Why it exists

Parallel programs exist because sequential **PATH**s waste time: while one thread waits on I/O, others can advance along their own **GOAL** lines. But when those paths converge on the same **CONTAINER**, uncontrolled merging causes corruption.

Consider a counter as a small box inside the room. Two threads follow parallel **PATH**s that both include "read box, add one, write box." Without coordination, both paths read the same value and both write the same incremented result—one update vanishes. That lost increment is a **BLOCKAGE** of progress toward the true sum, not a physical block but a failure of joint **FORCE** toward a shared **GOAL**.

Locks exist because "one occupant at a time" is an easy boundary rule. CAS exists because hardware can enforce atomic compare-and-set at one memory word, letting threads compete via retry loops instead of queueing at a door—useful when the editable state is small and the algorithm designer can draw a precise **PATH** for safe updates.

## How it works

### Lock mechanics as CONTAINER control

Acquisition is entry: the thread moves from **OUT** to **IN** relative to the critical section **CONTAINER**. If the door is already held, the thread's **PATH** stalls at the boundary—either busy-wait (spinning in place) or sleep until notified. Inside, the thread performs arbitrary work on everything the lock covers—multiple fields, invariants, temporary violations that must not be observed mid-flight. Release reverses the crossing: **IN** to **OUT**, handing the boundary key to the next waiter.

This model scales to nested **CONTAINER**s (lock A then lock B) but introduces **BLOCKAGE** cycles: thread 1 holds A, wants B; thread 2 holds B, wants A—neither can complete its **PATH** (deadlock).

### CAS mechanics as atomic LINK swap

CAS operates on one memory word. The thread reads the current value (establish a **SOURCE** state), computes a desired successor (**GOAL**), and invokes the atomic primitive: if memory still equals the expected **SOURCE**, install **GOAL**; else fail. On failure, the thread must redraw its **PATH** from the new current value.

For a lock-free stack push, the head pointer is the **LINK** anchor. A thread reads head (**SOURCE**), links its new node to that head, then CAS-es head from old to new node address. If another thread moved head first, CAS fails—the **PATH** must restart from the updated head. The metaphor stops at the room door: there is no period where the entire stack structure is locked; only the head word's **LINK** changes atomically. Correctness depends on careful ordering of ordinary stores before the CAS—metaphorically, laying down track segments before throwing the switch.

## Tradeoffs and failure modes

**Locks — strengths:** The **CONTAINER** metaphor matches whole-structure updates. Invariants spanning many fields can be maintained **INSIDE** without external observers seeing broken **PART-WHOLE** relations.

**Locks — weaknesses:** High contention creates a queue at the boundary—threads pile **UP** waiting, and **FORCE** from many cores concentrates on one door. Deadlock is a closed loop of **BLOCKAGE**. Priority inversion is a smaller thread holding the door while a larger urgent thread waits outside.

**CAS — strengths:** No long **IN/OUT** occupancy for an entire structure; threads race along parallel **PATH**s and only reconcile at one word. Under light contention, this can be faster than funneling everyone through one gate.

**CAS — weaknesses:** The single-word **LINK** view breaks if you need atomic multi-field change—you cannot CAS an entire room. **ABA** is a subtle break in the metaphor: the slot looks like the same **SOURCE** you saw, but the world changed around it (e.g., a freed node reused at the same address). Heavy contention turns retry **PATH**s into spinning **BLOCKAGE** at the CPU. Designing correct lock-free structures requires keeping the metaphor aligned with memory ordering rules—where intuitive "first write pointer, then CAS head" must match actual visibility guarantees.

When the metaphor breaks, say so: CAS is not a smaller lock on the whole container; it is a railroad switch at one tie. Locks are not CAS repeated; they serialize everything behind one door.

## One concrete walkthrough

Shared counter at 0. Two threads each want to add 1.

**Lock version:** Thread A acquires—enters the **CONTAINER** around the counter. B reaches the door, **BLOCKED** outside. A reads 0, writes 1, releases—exits. B enters, reads 1, writes 2, exits. **GOAL** reached: counter is 2.

**CAS version:** Both threads start **PATH**s without a room. A reads 0, aims for 1, CAS(0→1) succeeds—the switch moves. B had read 0 or tries with stale expected 0; CAS fails because the word is already 1. B reads 1, CAS(1→2) succeeds. Same **GOAL**, no door queue.

Now a stack head at node N. A pushes X; B pushes Y. Both read head N (**same SOURCE**). Both prepare new nodes pointing to N. A's CAS on head succeeds: head **LINK**s to X. B's CAS expected N, but head is X—failure. B redraws: read head X, link Y to X, CAS head X→Y. Both nodes present; no lost **PART-WHOLE** chain.

If a designer CAS-es the head but writes `X.next` after the CAS, another thread might traverse a head pointing to X while X.next is not yet visible—a broken **LINK** where the metaphor of "atomic swap" falsely implied the whole push was done. That is where the image schema must yield to explicit ordering rules.

Locks map cleanly to **CONTAINER** boundaries; CAS maps to atomic **LINK** replacement at one anchor. Choose the schema that fits the shape of what must move **IN** and **OUT** of consistency as a unit.
