# Compare-and-Swap Versus Locks

## What it is

Begin with facts. A computer has finite memory. Memory holds bytes at addresses. A running program is a sequence of instructions executed by one or more hardware threads on one or more cores. Each thread maintains its own instruction pointer and local registers. All threads attached to one process can access the same address space unless the platform says otherwise.

If two threads execute load and store instructions targeting the same address without coordination, the final byte pattern depends on interleaving order. Interleaving is not under the programmer's direct control. Therefore shared mutable locations require explicit synchronization to obtain predictable outcomes.

A **lock** (mutex) is a synchronization object backed by a flag in memory. Protocol: before accessing shared mutable state, a thread sets the flag to "held" if it is "free"; otherwise the thread waits; the holder performs loads and stores on the protected state; then the holder sets the flag to "free." Invariant enforced: at most one thread executes the protected region at a time.

**Compare-and-swap** (CAS) is a primitive provided by the processor (or very low-level runtime) with stronger semantics than separate load, compare, and store. CAS atomically reads a word, compares it to an expected value, and conditionally stores a new value. From the viewpoint of other threads, that read-compare-write on that one word is indivisible.

Both mechanisms exist to impose order on concurrent memory operations. They differ in granularity and blocking behavior.

## Why it exists

Sequential execution of all work underuses hardware when some threads wait on I/O. Parallel threads reduce wall-clock time but introduce concurrent access to shared variables— counters, free lists, configuration words.

Without synchronization, two increment operations both read the same value v, both compute v+1, both store v+1. The mathematical intent was two increments. The memory holds one. That discrepancy follows directly from independent instruction streams racing on one address.

Locks restore sequential semantics for a code region by mutual exclusion. CAS restores correctness for single-word updates by making progress conditional on the word still having the value observed locally; failed attempts imply another thread intervened, so the thread re-reads and tries again.

## How it works

### Locks from first principles

Memory holds the lock word and the protected data. Acquire is a loop or blocking wait until the lock word transitions free→held by this thread. While held, other threads' acquire attempts fail or block. The holder executes arbitrary instruction sequences on protected data— including multiple stores that temporarily violate global invariants. Release writes held→free, establishing a happens-before edge between the holder's stores and the next acquirer's loads, provided the lock implementation is correct.

Blocking can be implemented by spinning (repeated atomic read of lock word) or by kernel sleep when the platform maps mutexes to scheduler objects. Both are consequences of the same rule: only one holder.

Nested acquisition of two locks in opposite order by two threads creates circular wait: each holds one resource and waits for the other. That is deadlock, a stable bad state derived from the lock protocol, not from hardware failure.

### CAS from first principles

Given address A, CAS(A, expected, desired) conceptually performs in one atomic step: t ← *A; if t == expected then *A ← desired and return success; else return failure without storing.

A counter increment without locks: loop { read v from A; compute v'; if CAS(A, v, v') succeeds then break; }. Each successful CAS corresponds to one logical increment applied despite concurrent incrementers, because a successful CAS proves no other thread changed A between this thread's read and the atomic write.

For a linked structure, only the head pointer word might use CAS. Other fields are written before the CAS publishes the new head. Reason: other threads may immediately load the head and dereference; the node must be fully initialized before the head store becomes visible. Memory ordering fences or language atomics encode which stores are visible before the CAS store.

CAS does not block concurrent readers of unrelated words. It can fail under contention; failure means retry, not sleep— unless the programmer wraps CAS in a loop that backs off or yields.

## Tradeoffs and failure modes

**Locks — derived advantages:** Mutual exclusion scales to arbitrary critical section size. Any number of fields can be updated while the exclusion invariant holds. Reasoning reduces to sequential execution inside the section.

**Locks — derived costs:** Exclusion serializes threads; speedup is bounded by section length and lock contention. Waiting threads consume scheduler or CPU resources. Deadlock and priority inversion follow from lock graphs and scheduling, not from CAS.

**CAS — derived advantages:** Single-word updates can proceed without holding an exclusion lock over unrelated instructions. Successful CAS under low contention avoids kernel involvement.

**CAS — derived costs:** One CAS equals one word's atomicity; multi-word invariants need additional design (locks, fine-grained locks, or lock-free algorithms with proof obligations). Retry storms under contention approximate spin-lock cost. ABA arises when equality of bit pattern does not imply equality of abstract state— address reuse makes expected match spuriously. Correct lock-free algorithms require specifying happens-before relations beyond naive CAS placement.

Selection rule from primitives: if the invariant spans k>1 words that must appear together, mutual exclusion or a proven multi-word protocol is required; if the invariant is "this one word takes a valid successor value," CAS retry loops may suffice.

## One concrete walkthrough

Shared integer C at address 0x1000, initial value 0. Threads T1 and T2 each execute one increment.

**Lock-based derivation:** Mutex M guards C. T1 acquires M: M was free, now held. T2 attempts acquire: M held, T2 blocks. T1 loads 0 from 0x1000, stores 1, releases M. T2 acquires, loads 1, stores 2, releases. Final C=2. Interleaving of increments is serialized by M.

**CAS-based derivation:** No M. T1 reads C=0. T1 invokes CAS(0x1000, 0, 1): atomic step succeeds; C=1. T2 read C=0 before success or attempts CAS(0x1000, 0, 1): fails because *0x1000 is 1. T2 reads C=1. T2 CAS(0x1000, 1, 2): succeeds. Final C=2. No global exclusion, but each increment applied exactly once because CAS success counts a unique transition from observed v to v+1.

Stack head at address P, initially node N. Push allocates X, sets X.next=N, then CAS(P, N, X). Concurrent push by another thread: one CAS succeeds, the other fails on expected N, re-reads P, links its node to current head, CAS again. Correctness rests on X.next being stored before CAS(P,...) so the successor relation is valid when P exposes X.

Incorrect ordering— CAS before initializing X.next— violates the primitive requirement that published pointers point to complete nodes. That bug is independent of choosing CAS over locks; it follows from visibility rules built on store order.

Bottom line from first principles: concurrent instruction streams plus shared addresses imply races; locks serialize regions; CAS atomically conditionalizes single-word stores; pick the tool whose guarantees match the size of the state transition you need to make indivisible at the abstraction level that other threads observe.
