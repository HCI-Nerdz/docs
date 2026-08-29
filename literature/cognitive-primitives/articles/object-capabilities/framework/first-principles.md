# Capability-Based Security

## What it is

Start with facts every operating system already enforces: a running program cannot read bytes from disk or memory unless some mechanism inside the system permits that read. Permission is not magic. It is a check that happens at a gate before an action runs.

Capability-based security is a design for those gates. Instead of asking "who are you?" and consulting a roster, the gate asks "what do you possess?" Possession means an unforgeable token—a capability—that the system issued and that names exactly one allowed action on exactly one target. Hold the token, pass the gate for that action. Lack the token, fail.

When the target is a specific object—a file, a socket, a memory segment—the idea is called object-capability security. The capability is the key to that object, not a global rank.

Nothing here requires new physics. It reorganizes where the check looks and what evidence satisfies it.

## Why it exists

Fact: many programs run concurrently on shared hardware. Fact: any program can contain defects or malice. Fact: if two programs can touch the same resource, one's failure can become another's damage.

From those facts follows a design pressure: minimize what each program can touch by default. Another fact: programs often act as intermediaries. A compression utility reads a file you chose; a web server reads files for anonymous visitors. The intermediary is not the human user, yet work proceeds through it.

Roster-based checks tie permissions to identities—user names, service accounts. An intermediary often runs under one identity with many permissions. Then a small bug in the intermediary exposes everything that identity may touch, even when one request needed one file.

Capability-based design treats each request as carrying its own evidence of permission. The intermediary should operate with the capabilities the client delegated for that job, not with its full account-wide powers. The goal is not novelty. It is aligning the system's checks with the actual scope of each task.

## How it works

Build upward from issuance. Some trusted component—the kernel, a supervisor process, a language runtime with protected references—creates capabilities. User-level code cannot mint valid ones; that would break unforgeability.

A capability encodes at least a target reference and an permitted operation. Presentation happens at invocation: "read using capability C." The gatekeeper validates C's authenticity and match, then performs the read or returns an error. There is no inherent second lookup unless the capability design embeds one.

At process creation, the parent selects an initial capability set—often minimal—and hands it to the child. Expansion occurs only when some holder delegates by transmitting a capability over an IPC channel, a function argument, or an inherited handle table.

Delegation may attenuate: derive a read-only capability from a read-write one, or a time-bounded capability from a persistent one. Attenuation rules are part of the mint's policy.

Removing ambient authority is a deliberate step. If every program retains a built-in "open by path string" power, capabilities around specific objects can be bypassed. Strict designs close that bypass so path names alone carry no force.

Different implementations store capabilities as sealed integers, as object references the type system cannot confuse, or as kernel-managed descriptors. The invariant is the same: possession of a valid capability is necessary and sufficient for the named action, modulo revocation mechanics.

## Tradeoffs and failure modes

Least authority follows from construction. You cannot invoke power you were never given. Local reasoning follows too: inspect a component's capability set to learn its reach, without merging every roster in the fleet.

Revocation is not free. Copying a capability gives the recipient an independent key. Unlike deleting a user name from an ACL, you must plan expiry, indirection through revocable forwarders, or accept stale access until keys die.

Confused deputy attacks exploit intermediaries that still wield broad identity-based power. The fix is procedural and architectural: for each request, the deputy must use only delegated capabilities supplied for that request, not its private master set.

Human factors matter. Developers learn path strings and chmod. Capability systems ask for explicit token threading. Without syntactic support, adoption stalls even when the logic is sound.

Leakage equates to key exposure. Capabilities are secrets. Treat logged tokens like logged passwords.

Visibility tradeoffs cut both ways. ACLs centralize "who may access this object." Capability graphs distribute that knowledge across handoffs. Compliance teams may need graph tooling.

## One concrete walkthrough

Reconstruct one task from the ground up.

Alice has bytes she considers a draft document. The system represents those bytes as an object O. Alice's editor process E already holds capability R_rw—read and write on O—because Alice opened the document through E legitimately.

Alice requests spell-check from remote service S. Fact: S must read O's bytes to analyze them. Fact: S must not necessarily read Alice's other objects. Fact: giving S Alice's full user identity often over-shares.

E therefore mints or selects R_ro, a read-only capability on O, and transmits R_ro to S inside the spell-check request. S invokes read on O, presenting R_ro. The gate on O validates and returns bytes. S lacks capabilities for Alice's other objects; absent ambient path authority, S cannot reach them by naming paths.

For returning results, E transmits W_s, a write capability on a separate suggestions object Sugg. S writes output via W_s. S never receives write capability on O, so it cannot replace the draft unless E mis-delegates.

Revocation: if R_ro is a bare copy with no expiry, S may retain access after the job. If E routed access through forwarder F that E controls, E can stop F and thereby cut S's route while S still holds only a capability to F, not directly to O.

Each step rests on the same primitives: mint at trusted boundaries, present at gates, delegate explicitly, avoid ambient bypass. That is capability-based security built upward from what operating systems already must enforce—controlled access to resources—without treating identity alone as sufficient proof.
