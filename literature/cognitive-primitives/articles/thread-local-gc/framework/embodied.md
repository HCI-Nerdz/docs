# Thread-Local Garbage Collection

## What it is

Imagine you are carrying a tray through a busy kitchen. Each cook works at a station. Your station is a **thread** — one worker among several in the same program. The counter space in front of you is memory you can reach without crossing the floor.

When you chop vegetables, you set pieces on your counter. Each piece is an **object**. When a plate is done and nobody will pick it up again, it becomes trash. **Garbage collection** is the moment someone sweeps away plates that no cook still has a hand on — nothing points to them from a live order ticket or an active hand.

In many kitchens, one manager blows a whistle and everyone freezes while the whole floor is cleaned — global **stop-the-world** collection. **Thread-local garbage collection** gives each cook a personal bus tub and a rule: you can sweep your own counter while others keep working, as long as you respect plates that left your station on someone's else's tray.

You still share the pass window — the **shared heap** — for dishes every station must see. Most prep scraps die on the station where they were cut.

## Why it exists

Feel the jam when twelve cooks reach for one salt bowl at once — that is lock contention on a single heap. Feel the full stop when the manager shouts "hands up" — every thread idle, cores waiting.

Thread-local GC lets you **grab** from a local pile, **drop** scraps in your tub, and **empty** the tub without making the whole line stand still. Programs that handle many independent orders — web requests, job workers — mostly allocate and discard on one station. The body of the work stays local; the design matches that rhythm.

## How it works

**Grasping and releasing**: Allocation on a thread-local heap is like scooping from a bin directly in front of you — bump the pointer, place the object, no walk across the room. When the handler returns, stack **roots** — your active hands and the ticket clipped to them — let go. What nothing still touches becomes sweepable.

**Walking the line**: The collector starts from what you are still holding — registers, stack slots — and **follows** references object to object, like tracing which plates still connect to an active order. Unvisited objects get ** scraped** into the reclaim pile.

**Handing off across stations**: When an object must outlive your shift or be seen by another cook — a session stored in a global map — you **carry** it to the pass window. That move is **promotion** or **escape** to the shared heap. Your local sweeps will not trash it afterward; the shared layer owns it now.

**Bumping without spilling**: If cook B still holds a fork aimed at food on A's counter, A cannot dump that food. **Write barriers** note when a pointer crosses from shared or foreign memory into something local — or when you publish a local dish to the pass — so collectors do not **lift** a plate someone else's hand still reaches for.

**Waiting at safepoints**: Sometimes a cook must pause a beat so roots are stable while a local sweep runs — a brief stillness at that station, not the whole kitchen frozen.

The embodied loop: reach locally, work, release roots, sweep locally; carry outward only what must be shared; mark cross-station touches so nothing is snatched from under a live hand.

## Tradeoffs and failure modes

**Ease in the fingers**: Local allocation and collection reduce waiting in line at global locks. You stay in your square of counter — better cache warmth, less shoving.

**Heavier arms for shared dishes**: Promotion copies or relocates; barriers add a small hitch every time you pass a plate across the floor. If most objects **escape**, you carry everything to the window and the local tub stays empty — overhead without relief.

**The drop**: Miss a cross-thread reference and a sweeper clears a plate still pinned by someone else's fork — crash or corruption. The body metaphor fails here in one way: there is no shouting cook; the machine just reads bad bytes. Correctness depends on barrier discipline.

**Stale grips**: A forgotten pointer keeps garbage looking alive — floating waste, like a ticket still clipped though the order canceled. Space lost, not necessarily wrong answers.

**One station drowning**: A hot thread fills its tub every few seconds while others idle — uneven sweat. Runtimes rebalance pages or steal empty bins.

**Cracked counter**: Fragmentation leaves unusable gaps on one station; large roasts won't fit though total free space exists elsewhere.

## One concrete walkthrough

You are cook **W2** at a four-station line. A ticket arrives: parse a JSON order.

You **pull** two hundred small objects onto W2's counter — strings, nodes — all from W2's local heap. Your hands hold the root struct; references **chain** down into the tree. You plate the HTTP response and **release** the root when the handler returns. W2's collector **sweeps**: nothing on the stack points inward; the tree goes to the tub. W1, W3, W4 never stopped chopping.

Next ticket: "reuse session 8842." You **reach** to the pass window — the shared session map — and **pick up** a handle to an object already living there. No local allocation for the session body; you only **hold** a pointer while you cook.

Next ticket: new guest, no session. You **mold** `Session 9910` on W2's counter, then **slide** it into the shared map when the order commits. The runtime **carries** 9910 to shared storage — promotion — so W3 can **grasp** it tomorrow. Your later sweeps skip 9910; the map **roots** it for everyone.

Picture the failure you avoided: if 9910 stayed only on W2's counter but the map held a raw address there, W3's reach would land on memory W2 already swept. Promotion moves the meal to the window before W2's tub tips.

Rush hour: W2's local nursery fills every third ticket; you **empty** small parse scraps quickly while the pass window gets a slower scrub less often. The kitchen stays loud with parallel motion — local release, local sweep, shared handoff only when the order leaves your station for good.

That is thread-local GC felt through the shift: grasp locally, release, sweep; carry shared; never yank a plate another hand still touches.
