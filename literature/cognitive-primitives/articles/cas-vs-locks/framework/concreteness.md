# Compare-and-Swap Versus Locks

## What it is

Multiple threads can read and write the same memory address at the same time. When they do, updates can overwrite each other and produce wrong results.

A **lock** is a small flag or mutex object. Before a thread changes protected data, it sets or acquires the lock. Other threads see the lock taken and wait. The holder updates the data, then clears or releases the lock.

**Compare-and-swap** (CAS) is a single hardware-backed step on one memory word. The thread supplies an expected value and a new value. If the word still equals the expected value, hardware writes the new value and reports success. If not, hardware leaves the word unchanged and reports failure.

Both tools prevent lost updates on shared variables. A lock blocks other threads during an entire critical section. CAS tries to change one word only when that word has not changed since the thread read it.

## Why it exists

Programs use many threads so that while one thread waits on disk or network, others keep running. Threads often share counters, queue heads, configuration flags, and cache entries stored in ordinary RAM.

Without synchronization, two threads updating one counter can both read 5, both compute 6, and both write 6. The counter should be 7. One increment disappeared. Locks and CAS exist to stop that class of error.

Locks match the everyday rule: one thread at a time in the protected region. CAS matches cases where a single word— a pointer, an integer—can be updated with a tight read-modify-write loop that retries on conflict.

## How it works

### Locks

A thread calls acquire on a mutex. If the mutex is free, the thread becomes the owner. If not, the thread blocks in the kernel or spins in a loop until the mutex is free.

Inside the critical section, the thread reads and writes every field covered by the lock— a struct, a buffer index, a tree node. Temporary broken states are allowed because no other thread can enter. The thread then releases the mutex, waking a waiter if any.

Read-write locks split shared read access from exclusive write access, but the core picture stays the same: a gate on a region of code and data.

### Compare-and-swap

Modern CPUs expose CAS as an instruction family (for example, compare-and-exchange on x86). The operation is atomic: no other thread can observe a half-finished compare-and-write on that word.

Typical retry pattern on a counter: read `value` into a local variable; compute `value + 1`; run CAS on the shared counter with expected=`value` and desired=`value + 1`; if CAS fails, another thread changed the counter, so read again and repeat.

For a lock-free stack, a thread reads the head pointer, stores it in `new_node.next`, then CAS-es the head from the old pointer to `new_node`. Failure means another thread changed head first; the thread retries with the fresh head.

CAS does not lock the whole stack. It only atomically swaps the head word. Correctness requires that `new_node.next` is written before the CAS so other threads never follow a pointer into an uninitialized node.

## Tradeoffs and failure modes

**Locks — advantages:** One mutex can guard many variables and long code paths. The rule is easy to state: acquire, change data, release. Debuggers and tools understand lock ordering.

**Locks — disadvantages:** Many threads on one hot mutex spend time waiting. Spin locks burn CPU while waiting. Sleeping mutexes cost kernel transitions. Two threads locking resources A and B in opposite order can deadlock. A low-priority thread holding a mutex can delay a high-priority thread (priority inversion).

**CAS — advantages:** Simple updates— increment a stat, swap a pointer— can succeed without blocking. Under low contention, retries are cheap.

**CAS — disadvantages:** Only one word per CAS. Updating three related fields needs a clever algorithm or still needs a lock. Under heavy contention, retry loops spin and waste cores. The ABA problem: a pointer value repeats after a node was freed and reallocated, so CAS thinks nothing changed when the structure did. Lock-free code is easy to get wrong; bugs show up rarely and only under race timing.

Pick a lock when several fields must change together or when team velocity favors simple rules. Pick CAS when the hot path touches one word and designers can prove the retry loop is correct—including memory ordering fences where the CPU requires them.

## One concrete walkthrough

Shared 32-bit counter in memory, value 0. Thread 1 and Thread 2 each add 1.

**Lock path:** Thread 1 acquires mutex M. Thread 2 tries M, blocks. Thread 1 loads counter (0), stores 1, releases M. Thread 2 acquires M, loads counter (1), stores 2, releases M. Counter is 2.

**CAS path:** No mutex. Thread 1 loads counter 0, CAS(expected=0, desired=1) succeeds. Thread 2 loads 0 or attempts CAS with expected 0; CAS fails because counter is 1. Thread 2 loads 1, CAS(expected=1, desired=2) succeeds. Counter is 2.

Second scene: lock-free stack with head pointer `H` pointing to node A. Thread 1 pushes node X; Thread 2 pushes node Y.

Both read head A. Thread 1 writes X.next = A, CAS head A→X succeeds. Thread 2 wrote Y.next = A but CAS head expected A fails; head is X. Thread 2 reads head X, sets Y.next = X, CAS head X→Y succeeds. Stack top is Y, which links to X, which links to A.

Wrong version: Thread 1 CAS-es head to X before writing X.next = A. Thread 2 might read head X and follow X.next while it is still garbage. That is not a CAS versus lock issue alone; it is wrong instruction order. The fix is write `next` first, then CAS the head— or use a lock around the whole push.

Concrete summary: a lock is a visible flag that keeps other threads out of a code region. CAS is one atomic finger on one word that succeeds only if the word still matches what you saw. Both fix counter and pointer races when applied to the right-sized piece of memory.
