# Compare-and-Swap Versus Locks

## What it is

THERE IS shared memory. MORE THAN ONE part of a program CAN read and write the same place at the same time. When this happens, something BAD CAN happen: two parts DO changes that do not fit together, and after this NO ONE KNOWS the true state.

A **lock** is something like a gate on a room. IF someone wants to change what is INSIDE, that someone MUST first take the gate key. WHILE someone holds the key, others CAN NOT enter to change things. AFTER the change is done, the holder gives the key back.

**Compare-and-swap** (CAS) is a different kind of tool. THERE IS one word in memory. Someone reads the word, THINKS about a new value, and asks the machine: IF the word is still what I saw BEFORE, put this new value there; IF NOT, do nothing and tell me it failed. All of this happens in one step that the hardware treats as indivisible.

Both are ways to stop conflicting changes. They DO this in different ways. A lock says: only one at a time. CAS says: change only IF nothing else changed the value since I looked.

## Why it exists

Programs DO many things at once BECAUSE waiting is slow. One part CAN work WHILE another waits for disk or network. BUT IF two parts change the same counter, list head, or flag without coordination, the result CAN be wrong.

THERE IS a simple example. Two parts both read a counter showing 5. Both add 1. Both write 6. The counter SHOULD be 7. BECAUSE neither saw the other's work, the final value is wrong. This IS the kind of problem both locks and CAS address.

Locks exist BECAUSE the idea is easy: one holder, one room. CAS exists BECAUSE sometimes you WANT to change one word without blocking everyone else, and BECAUSE hardware CAN check-and-set in a single atomic step. CAS IS often PART OF building locks, queues, and counters at a lower level.

## How it works

### Locks

Someone WANTS to change shared data. That someone tries to acquire the lock. IF the lock IS free, the acquirer holds it. IF NOT, the acquirer waits or retries later. WHILE the lock IS held, other changers MUST wait at the boundary. The holder reads, modifies, writes, then releases. AFTER release, the next waiter CAN enter.

Locks CAN live in user space or involve the operating system when waiters sleep. A **mutex** IS one common kind: mutual exclusion, meaning at most one holder.

### Compare-and-swap

CAS works on one memory location, often called an **atomic variable**. The operation IS: read the current value; compare it to an expected value; IF they match, write a new value and report success; IF they do not match, report failure without writing.

A typical retry loop looks like this in meaning, not in any one API: read `old`; compute `new` from `old`; call CAS with expected=`old` and desired=`new`; IF CAS fails, someone else changed the value, so read again and retry.

CAS does NOT by itself protect a whole data structure. IF a structure has many fields, changing one pointer with CAS does NOT stop another thread from seeing a half-updated structure unless the design makes that safe.

## Tradeoffs and failure modes

**Locks — GOOD:** The rule IS simple. Protect everything INSIDE the critical section. One holder at a time IS easy to reason about for many programs.

**Locks — BAD:** IF many threads WANT the same lock, they wait. Waiting CAN mean spinning (burning CPU) or sleeping (kernel cost). Locks CAN cause **deadlock** IF two parts each hold one lock and WANT the other's. Locks CAN cause **priority inversion** when a low-priority holder blocks a high-priority waiter. Heavy lock use CAN limit speedup when many cores fight for one gate.

**CAS — GOOD:** For simple updates (increment, swap a pointer when building a lock-free stack), CAS CAN succeed without blocking others. Failed CAS means retry, not necessarily sleep.

**CAS — BAD:** CAS only atomically updates one word. Complex structures need careful algorithms. **ABA** IS a known failure mode: a value looks the same as before but the memory IS NOT the same story (pointer reused). Retry loops CAN spin under heavy contention and waste CPU. Writing correct lock-free code IS hard; bugs ARE subtle and rare in testing.

**Choosing:** Locks fit when many fields must change together or when simplicity matters. CAS fits when one-word updates ARE enough and designers accept retry logic and careful memory ordering.

## One concrete walkthrough

THERE IS a shared counter, starting at 0. Two threads each WANT to add 1.

**With a lock:** Thread A acquires the lock. Thread B tries, CAN NOT enter, waits. A reads 0, writes 1, releases. B acquires, reads 1, writes 2, releases. Final value IS 2. GOOD.

**With CAS:** No lock. A reads 0, computes 1, CAS(expected=0, desired=1) succeeds. B read 0 earlier or reads after; B's CAS(expected=0, desired=1) fails BECAUSE the value IS now 1. B reads 1, CAS(expected=1, desired=2) succeeds. Final value IS 2. GOOD.

Now THERE IS a linked list head pointer. Thread A wants to push node X: read head, set X.next to head, CAS head from old to X. Thread B pushes Y at the same time with the same pattern. IF both read the same head and both CAS with that same expected head, one succeeds and one fails and retries with the updated head. The list IS NOT lost IF the algorithm IS correct.

IF someone used CAS on a counter but also changed a related field outside CAS, another thread COULD see inconsistent state. THAT IS WHY CAS IS NOT a blanket replacement for locks: the scope of what MUST happen atomically MUST match the tool.

In sum: locks enforce one-at-a-time access through a held gate. CAS enforces change-only-if-unchanged on one word through hardware-supported compare-and-set. Both exist BECAUSE shared memory plus parallel DO-ing creates conflict; both CAN prevent lost updates when used WHERE their rules fit.
