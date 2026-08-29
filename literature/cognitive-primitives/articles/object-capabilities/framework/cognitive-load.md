# Capability-Based Security

## What it is

A **capability** is proof you may perform one specific action on one specific resource.

The proof is an unforgeable token or protected reference. You present it when you act. Without it, the system refuses.

This model is called **capability-based security**. When tokens attach to individual resources, people say **object-capability** security.

The token is not a password you memorize. The system mints it. You cannot craft a believable copy in user space.

## Why it exists

Programs share one machine. They read files, use networks, and access devices.

If every program could do everything, one failure could damage all data. Engineers needed a clear rule for limiting harm.

The rule: a program may do only what it was explicitly given power to do. Nothing extra.

Another common approach stores permissions on lists tied to user names. That model is called **access control list** security, or ACL security for short.

In ACL security, you announce an identity at the gate. The gatekeeper looks up the name on a list beside the resource.

Capability security ties permissions to tokens you hold instead. You do not re-prove identity at every call if you already hold the right token.

Intermediaries make the difference visible. A mail app reads your inbox on your behalf. A web server reads files for strangers.

If the intermediary runs under your full user identity, its bugs expose everything you may access. Capabilities let the mail app hold a read token for one message, not your whole account.

## How it works

The system mints capabilities at trusted boundaries. Only the kernel, runtime, or designated servers can create valid tokens.

Each capability names a target and an operation. Examples include read on a file object or send on a channel object.

When code invokes an operation, it must supply the matching capability. The gatekeeper validates the token. Valid tokens allow the action. Missing or invalid tokens block it.

Programs receive a small initial set of capabilities at launch. They gain more only when another component delegates by passing a capability along.

**Delegation** means copying or forwarding a capability to another process, sometimes in weakened form. Read-only delegation excludes write.

The sender may also forbid further delegation. That rule is called **attenuation**. The new token carries fewer powers than the parent.

**Ambient authority** means power every program gets by default, such as opening arbitrary paths. Capability-oriented designs remove ambient authority so access requires an explicit token.

Without that removal, a program could bypass object tokens by naming paths the old way. Strict designs close that hole.

Implementation details vary by platform. Some systems use numeric handles. Some use language references the type checker protects.

The invariant stays the same. Possession of a valid capability is what unlocks the named action.

## Tradeoffs and failure modes

Capability systems make **least authority** easier. Components hold narrow rights. Attack surface shrinks.

You can read a component's capability set and know its reach. You need not merge every ACL in the fleet to reason locally.

**Revocation** is harder than editing a central list. After you delegate a capability, the recipient may retain a copy. Designs use expiring tokens, proxies, or indirection to recover control.

An expiring token stops working after a deadline. A proxy object forwards requests until the owner disables it.

The **confused deputy** is a trusted service tricked into using its own broad rights for a narrow client request. Mitigation requires acting only with client-supplied capabilities for that call.

The deputy must not fall back to its personal master keys when a client omits a token.

Developer ergonomics lag mainstream path-and-user APIs. Passing capabilities through every interface adds ceremony unless the language supports it natively.

Some languages treat object references as capabilities by default. That choice reduces boilerplate.

**Capability leakage** occurs when tokens appear in logs, configs, or insecure channels. Anyone who obtains the token obtains the right.

Treat leaked capabilities like leaked passwords. Rotate, expire, or invalidate at the mint.

Auditing global access may require tracing delegation chains rather than reading one file-level list. Compliance tools sometimes graph capability handoffs to rebuild the picture.

## One concrete walkthrough

Alice uses an editor. She runs spell-check on one draft file.

The editor holds read and write capabilities for that draft. The spell-check service starts with none of Alice's file capabilities.

Alice triggers spell-check. The editor sends a read capability for the draft inside the remote call. The capability is read-only.

The spell-check service presents the capability to the file object. The object verifies the token and returns text. The service cannot open Alice's other files. It never received capabilities for them.

Path strings alone do not help the service if ambient file authority is gone. Names without tokens fail at the gate.

The editor also sends a write capability for a suggestions buffer. The service writes corrections there. It cannot rewrite the draft because it lacks write capability on the draft object.

Two tokens cover two actions. Neither token grants folder-wide access.

Bob operates the remote spell-check pool. He never sees Alice's password. He sees only the tokens her editor attached to this job.

Alice cancels long-running checks if capabilities were time-limited. If the service copied the read capability without limits, Alice may need a revocable proxy object to block further reads.

She might insert a forwarder that holds the real read capability. Revoking the job disables the forwarder. The service still holds a token, but the token points at a dead forwarder.

The scenario shows the through-line. Authority travels as explicit tokens. Identity alone does not grant access. Each hop adds only the capabilities needed for that hop.

That pattern is why capability-based security remains a reference design for systems that must delegate work across trust boundaries without handing over whole user accounts.
