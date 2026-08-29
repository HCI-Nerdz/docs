# Thread-Local Garbage Collection

## What it is

THERE IS a program. THE program runs on one machine. THE machine has memory — a place where data can stay for some time.

When THE program does many things at the same time, it often uses **threads**. A thread is like one worker inside THE program. EACH worker has its own path through the code. EACH worker can put data in memory.

When data is no longer needed, something must remove it. If no one removes it, memory fills up. **Garbage collection** is when THE runtime finds data that no one can reach anymore and gives that space back.

In many runtimes, ONE collector looks at ALL memory used by ALL threads at once. In **thread-local garbage collection**, EACH thread has its own area of memory for new data. EACH thread's collector works mostly on THAT thread's area. THE collector for one thread does NOT have to stop all other threads while it works.

This is NOT the same as saying each thread never shares data. Threads CAN share data. But much of what one thread creates stays inside that thread's world until something shows that another thread needs it too.

## Why it exists

When MANY threads share ONE big heap, they often fight for the same locks when they want to allocate memory or when THE collector runs. If one thread is collecting, others may have to wait. Waiting is BAD when you WANT many cores to stay busy.

Thread-local collection exists BECAUSE people WANT this: one thread CAN reclaim its own unused data WITHOUT making all other threads stop. One thread CAN allocate in its own area WITHOUT touching a global lock on every small allocation.

This is GOOD for programs where most objects live and die inside the thread that made them — request handlers, worker tasks, short-lived buffers. In those cases, MOST garbage is local. MOST collection work can stay local too.

## How it works

Each thread gets a **thread-local heap** — a block of memory tied to that thread. When the thread creates a new object, the allocator puts it in that thread's heap first. This is fast BECAUSE the thread often does NOT need to ask other threads for permission.

The thread-local collector runs when a thread's heap is full or on a schedule. It starts from **roots** — places the running code still knows about, like local variables on the stack and registers. It follows **pointers** from root to object to object. Anything it never reaches is garbage. It frees that space inside the thread-local heap.

Some objects MUST be seen by other threads — a message queue, a cache, a global table. Those objects **escape** the thread-local heap. THE runtime **promotes** them to a **shared heap** or marks them so all collectors know they are still alive. Promotion costs MORE than local allocation, but it happens only when sharing is real.

Cross-thread pointers are the hard part. IF thread A holds a pointer to an object in thread B's heap, thread B's collector CANNOT free that object while A still uses it. THE runtime tracks these links — with **write barriers**, **remembered sets**, or **handshakes** at collection time — so no thread frees something another thread still reaches.

Some designs use **generational** ideas inside each local heap: young objects die fast locally; old shared objects move out. THE exact mix varies by runtime, but THE pattern is the same: local work by default, shared machinery when data leaves the thread.

## Tradeoffs and failure modes

THE good part: less lock contention, less stop-the-world time for the whole program, better cache behavior when a thread mostly touches its own memory.

THE bad part: promotion and cross-thread tracking add complexity. IF the runtime guesses wrong about what stays local, objects bounce between heaps and cost MORE. IF escape is frequent, thread-local heaps shrink in benefit and THE system pays overhead without getting much isolation.

A **failure mode** is missing a cross-thread reference. THEN a collector frees memory that is still in use. THAT causes crashes or silent corruption. THIS is why write barriers and safe points matter.

Another failure mode is **floating garbage** — memory that is dead globally but still looks alive to one thread's collector BECAUSE a stale pointer has not been cleared yet. Usually harmless except wasted space; sometimes fixed by occasional global scans.

Memory **fragmentation** can hit one thread's heap hard while others have free space. THE runtime may ** steal** empty pages from idle threads or **balance** heaps over time.

IF one thread allocates far MORE than others, its local heap grows while others stay small. Load imbalance CAN mean one thread does heavy collection while others idle. SOME runtimes resize or migrate objects to spread cost.

## One concrete walkthrough

THERE IS a web server. IT has four worker threads. EACH thread handles incoming requests one at a time.

Request arrives at thread 2. Thread 2 parses JSON into many small objects — strings, maps, numbers — all in thread 2's local heap. THE handler builds a response. WHEN THE response is sent, those parse objects are unreachable. Thread 2's local collector runs. IT finds no pointers from the stack to those objects. IT reclaims the space. Threads 1, 3, and 4 never paused.

THE next request on thread 2 needs a row from a **shared session cache** — a map every thread reads. THE handler loads the session object. THAT object already lives in THE shared heap BECAUSE sessions outlive one request. Thread 2 only holds a pointer to it. NO promotion happens for that read.

NOW thread 2 creates a new session BECAUSE the client had no cookie. THE new session MUST survive after THE handler returns — other requests on other threads may need it. WHEN thread 2 stores THE session in THE shared cache, THE runtime **promotes** THE session object from thread 2's local heap to THE shared heap. AFTER promotion, thread 3 CAN find it. Thread 2's later local collections WILL NOT free it BECAUSE it is no longer only thread 2's private garbage.

IF thread 2 had kept a local copy and only posted a pointer without promotion, thread 3 might follow a pointer into memory thread 2's collector thought was dead. THE runtime prevents that by promoting or by pinning escaped objects until THE shared layer owns them.

At peak load, thread 2's local heap fills every few requests. ITS collector runs often but cheaply — mostly young garbage from parsing. THE shared heap is collected less often, with MORE care for cross-thread roots. THE server keeps accepting work on all four threads BECAUSE no global stop-the-world pause blocked them during thread 2's local sweeps.

That is thread-local garbage collection in one place: MOST death stays local; SHARED life is explicit; THE hard work is knowing WHEN data crossed from one thread's world into everyone's.
