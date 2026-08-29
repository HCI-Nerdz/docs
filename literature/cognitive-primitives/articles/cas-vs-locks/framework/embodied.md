# Compare-and-Swap Versus Locks

## What it is

Picture two workers reaching for the same notebook on a shared desk. If both grab and write at once, entries smear together. Programs face the same problem when multiple threads touch the same memory.

A **lock** works like a physical token—say, a baton passed around a relay team. To edit the notebook, you must first **grasp** the baton. While your hand closes around it, others cannot take it; they **wait in line**, shifting weight, maybe pacing (spinning) or sitting down until called (sleeping). You flip pages, pencil in changes, then **release** the baton into the next waiting hand. Your grip enforces one editor at a time across everything the baton governs.

**Compare-and-swap** (CAS) feels different in the body. There is no baton for the whole desk. Instead, you **glance** at one number on a sticky note, **hold that glance in mind**, scribble the next number on a slip, and in one motion ask the hardware: "If the sticky still shows what I saw, paste my slip over it; otherwise shove my hand away." You **bump** into another worker only at that instant—not by standing in a long queue, but by having your single-motion update rejected so you must look again and retry.

Both stop mangled shared state. Locks coordinate by **holding** something. CAS coordinates by **touching one word once** under a strict if-unchanged rule. Neither approach removes the need for care. A lock lets you rearrange several items on the desk while you hold the baton; CAS only guarantees that one sticky note changes atomically. The embodied difference is sustained grasp versus a quick tap that either sticks or bounces off.

## Why it exists

Computers run many threads because one thread alone would **stand idle** too often—waiting for disk, network, or slow work. Parallelism speeds the whole job, but shared counters, queues, and flags become contested objects on the shared desk.

Without coordination, two threads can **pull** the same value toward themselves, each **adding** one in their head, and **push** back the same result—one increment vanishes. That failure is why these tools exist: to make shared updates feel as reliable as a single hand editing alone.

Locks trade waiting in line for clarity—easy to explain, "grab before you change." CAS trades repeated quick taps for the chance to avoid a line when updates are small and contention is light.

## How it works

### Locks: grasp, work, release

A thread tries to **acquire** the lock—closing fingers on the baton. Success means entry to a **critical section** where protected memory may be read and written freely. Failure means blocking: the thread keeps **reaching** (spin lock) or **rests** until awakened (mutex with kernel support).

Inside, the holder may update many fields, establish temporary inconsistent layouts, then restore invariants before **releasing**. Release opens the next waiter's turn. Nested locks mean holding one baton while reaching for another—dangerous if two threads reach in opposite orders and each **holds** what the other needs (deadlock—a frozen tug where neither can let go safely).

### CAS: look, plan, one touch

CAS targets one memory word. The thread **reads** the current value into a register, **computes** a new value, and invokes the atomic compare-and-swap: if memory still equals the expected value, **write** the new one and signal success; otherwise **fail** without writing.

On failure, the thread did not wait in a lock queue—it simply **mis-timed** the tap. It reads again and retries. Algorithms for lock-free stacks feel like: **peek** at the top plate, **set** your plate to point at it, then **try** to swap the stack top to your plate in one motion; if someone else placed a plate first, your swap fails and you **peek** again.

Memory ordering matters: you must **set down** links on your node before you **tap** the head pointer, or another thread might **lift** a head that points to unfinished work.

## Tradeoffs and failure modes

**Locks — when they feel good:** You **hold** the baton across a whole editing session. Multi-field updates stay private until you **release**. The story in your muscles is simple: one gripped object, one turn.

**Locks — when they hurt:** A hot baton creates a long **line**; cores **stand** doing nothing or **jog in place** spinning. Deadlock is two people each **holding** one handle and **pulling** the other's. Priority inversion is a slow worker **grasping** while an urgent worker waits.

**CAS — when it feels good:** Light contention means quick taps succeed; no baton handoff for a single counter bump. Several threads can **work** on separate data while occasionally **bumping** at one word.

**CAS — when it hurts:** Heavy contention turns into repeated failed taps—**jittering** retries that burn CPU. CAS cannot **hold** a multi-item scene; complex structures need intricate choreography. **ABA** is like seeing the same sticky number return after someone else used and discarded the paper underneath—the glance looked valid, but the history was not.

Choosing is embodied tradeoff: sustained **grasp** versus repeated **tap-and-check**. Neither removes the need to think about what must stay untouched while hands move.

## One concrete walkthrough

A shared counter starts at 0. Thread A and Thread B each will add 1.

**With a lock:** A **grasps** the lock baton. B **reaches**, finds the baton taken, **waits**. A reads 0, writes 1, **releases**. B **grasps**, reads 1, writes 2, **releases**. Counter reads 2. One line, one turn at a time—felt clearly in the body.

**With CAS:** No baton. A reads 0, prepares 1, CAS succeeds—the sticky flips to 1. B perhaps still expected 0; CAS **shoves back** failure. B reads 1, CAS to 2, succeeds. Same result without standing in a baton line.

Push onto a shared stack head H. A and B both **peek** H, prepare nodes X and Y pointing to H. A's head-swap succeeds; head is X. B's swap expected H but head is X—failed tap. B **peeks** again (now X), links Y to X, swaps head X→Y. Both pushes land.

Failure story: suppose A swaps head to X before X's next pointer is **laid down**. Another thread might **lift** X and look for a next link that is not there yet—a **reach** into air. That is why ordering before the CAS matters as much as the tap itself.

Locks: **hold**, edit, **release**. CAS: **glance**, **tap once**, **retry** if bounced. Pick the coordination that matches how much of the desk must stay still while your hands move.
