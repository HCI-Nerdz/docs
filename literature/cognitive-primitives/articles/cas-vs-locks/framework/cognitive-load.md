# Compare-and-Swap Versus Locks

## What it is

Many threads can run at the same time. They often share variables in memory. If two threads update the same variable without rules, one update can be lost.

A **lock** is a rule enforced by a small synchronization object, usually called a mutex. One thread holds the mutex at a time. That thread alone may run the protected code and change the protected data. Other threads must wait until the mutex is released.

**Compare-and-swap** (CAS) is different. It is one atomic hardware operation on a single memory word. The thread names an expected value and a new value. If the word still equals the expected value, it becomes the new value. If not, nothing is written and the operation reports failure.

This article compares locks and CAS as two ways to keep shared updates correct.

## Why it exists

Threads exist to use multiple CPU cores and to overlap waiting with work. Shared counters, queues, and flags are common. Shared memory is fast but unsafe without coordination.

Example failure: two threads increment a counter. Both read 10. Both write 11. The counter should be 12. It is 11. Something must serialize or validate updates. Locks serialize whole critical sections. CAS validates one word at a time and retries if another thread changed it first.

## How it works

### How locks work

Step one: a thread acquires the mutex. If another thread holds it, this thread waits.

Step two: the holder runs critical section code. It may read and write many variables.

Step three: the holder releases the mutex. A waiting thread can now acquire.

That is the full lock cycle. Only one thread is inside at a time.

Some locks spin instead of sleeping. Spinning means looping until the mutex is free. Sleeping means the operating system pauses the thread until a wake-up.

### How compare-and-swap works

CAS applies to one memory location. The location is often called an atomic variable.

The thread reads the current value. It computes a new value. It calls CAS with two arguments: expected (what it saw) and desired (what it wants).

If memory still matches expected, memory becomes desired. The call succeeds.

If memory differs, the call fails. The thread reads again and may retry.

CAS does not stop other threads from running. It only makes one word's update conditional and indivisible.

A retry loop on a counter looks like this: read v; compute v+1; CAS with expected v and desired v+1; on failure, go back to read.

## Tradeoffs and failure modes

### Lock tradeoffs

Locks are easy to apply to large code regions. One mutex can guard many variables.

Locks hurt when many threads wait on the same mutex. Throughput drops. CPU time goes to waiting or spinning.

**Deadlock** means two threads each hold one lock and wait for the other's. Neither proceeds.

**Priority inversion** means a low-priority thread holds a lock while a high-priority thread waits.

### CAS tradeoffs

CAS avoids blocking for simple single-word updates. Failed attempts retry instead of queueing.

CAS does not guard multiple words by itself. Protecting a whole struct usually still needs a lock or a complex lock-free design.

Under heavy contention, many threads retry CAS in a loop. That burns CPU without making progress— similar cost profile to spin locks.

**ABA** is a CAS-specific pitfall. A value looks unchanged, but the memory's meaning changed (for example, a reused address). Safe algorithms use extra tags or hazard pointers. That adds complexity.

Correct lock-free code is hard to test. Race bugs appear under load and vanish in the debugger.

### Choosing between them

Use a lock when several fields must change together. Use CAS when one word updates suffice and you can write a correct retry loop. Many programs use locks for most shared state and CAS inside specialized libraries.

## One concrete walkthrough

Start with counter = 0. Thread A and Thread B each add 1.

**Lock walkthrough:** A acquires mutex. B tries to acquire; B waits. A reads 0, writes 1, releases mutex. B acquires, reads 1, writes 2, releases. Counter is 2. Only one thread touched the counter at a time.

**CAS walkthrough:** No mutex. A reads 0. A runs CAS expected 0, desired 1. Success. Counter is 1. B read 0 earlier, or B runs CAS expected 0, desired 1. Failure, because counter is 1. B reads 1. B runs CAS expected 1, desired 2. Success. Counter is 2. Two threads interleaved, but no increment was lost.

Second example: stack head pointer. Push adds a node at the front.

Thread A reads head H. A sets new_node.next = H. A runs CAS on head: expected H, desired address of new_node. Success.

Thread B also pushes. B read H before A succeeded. B's CAS on head with expected H fails. Head is now A's node. B reads new head. B links its node. B CAS-es head again. Success.

If A CAS-ed head before setting new_node.next, another thread could read a head pointing to an incomplete node. Order matters: prepare the node, then CAS the head.

Summary in one line each: a lock keeps every other thread out until release. CAS changes one word only if it still matches what you read. Both prevent the lost-update bug when used at the right scope.
