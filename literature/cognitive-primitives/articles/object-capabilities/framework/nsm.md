# Capability-Based Security

## What it is

In a computer system, many parts need to do things to other parts. One part may want to read a file. Another may want to send data on a network. The system must decide who can do what.

Capability-based security is one way to decide this. A **capability** is a thing you hold. If you hold it, you can do something specific. If you do not hold it, you cannot. You cannot make a fake one. The system treats the capability as proof that you may act.

This is different from another common way: checking a name against a list. In that model, you say who you are. The system looks up your name on a list and sees if the list allows you. In the capability model, you do not prove who you are to get access. You show what you hold.

People also call this **object-capability** security when capabilities are tied to particular objects or resources, not just to broad roles.

## Why it exists

Systems grew large. Many programs run at once. They share memory, files, and devices. If every program could do everything, one broken or malicious program could harm the whole machine.

Engineers wanted a rule that is easy to reason about: **you can only do what you were given the power to do**. Nothing else. No hidden back doors. No "I am the admin, so I can do anything" unless someone actually handed you that power.

Lists of names and permissions became hard to manage. A file might have a list of who may read it. But when a program runs, it often acts on behalf of someone else. A mail program reads your mail folder. A web server reads files for visitors. The program is in the middle. If the system only checks the program's identity, the program may get more power than it needs. If the system checks your identity but the program lies about who asked, security breaks.

Capabilities address this by making **authority travel with the request**. What you hold is what you can use. When you give part of your authority to another component, you give a capability. You do not give your whole identity.

## How it works

Each capability names an operation on a specific target. Read this file. Write to this socket. Allocate from this memory region. The runtime or kernel ensures that capabilities cannot be copied or guessed. They are issued by a trusted part of the system.

When code wants to act, it must present the capability. The gatekeeper checks: is this a valid capability for this action? If yes, the action proceeds. If no, it fails. There is no separate step where code asks "may user X do Y?" unless X was already bound into the capability when it was created.

Capabilities can be **delegated**. If you hold a read capability for a file, you may hand a copy to another process. That process can then read the file. You may hand a reduced capability: read-only, not write. Delegation is explicit. Nothing receives authority by default.

Systems using this model try to remove **ambient authority**: power that every program has just because it is running. Classic examples include the ability to open any file by path name, or to connect to any network address. In a strict capability system, a program starts with only the capabilities its launcher provided. It must receive more through deliberate handoff.

Implementation varies. Some systems use hardware support. Some use language-level object references that the runtime protects. Some use kernel-managed opaque tokens. The idea is the same: unforgeable proof of permission tied to a specific right.

## Tradeoffs and failure modes

Capability systems excel at **least authority**. Components receive narrow rights. Compromise of one component limits damage. Reasoning is local: follow the capabilities, not every list in the system.

They struggle with **revocation**. If you hand a capability to another party, you cannot always take it back unless the system tracks all copies or uses short-lived capabilities. ACL systems can remove a name from a list; capability systems must design renewal, expiration, or indirection through a revocable proxy.

**Confused deputy** problems appear in both models but look different. A deputy is a program that serves others. It may be tricked into using its own broad authority on behalf of a malicious requester. Capability design tries to ensure deputies hold only delegated capabilities for each request, not their full personal power.

Usability and familiarity work against adoption. Developers think in paths and user names. Capability systems ask them to thread tokens through interfaces. Without language and library support, this feels foreign.

**Capability leakage** is a failure mode: logging a capability, storing it in a world-readable place, or sending it over an insecure channel effectively grants access to whoever finds it. Treating capabilities like secrets is essential.

Global policy can be harder to audit at a glance. An ACL on a file shows all readers in one place. Capability chains require tracing who received what, which may be scattered across processes.

## One concrete walkthrough

Imagine a small document service. Alice wants Bob's editor to spell-check her draft without letting the editor read her other files.

In an ACL-style setup, Alice might change permissions on the draft file so "Bob's editor" can read it. The editor program runs with its own identity. When it opens the file, the system checks the list. This works if the editor is trustworthy and the list is correct. If the editor can open files by path and Alice's path is guessable, mistakes matter.

In a capability setup, Alice's launcher creates a read capability bound to the draft object only. Alice passes that capability to the editor through a controlled channel—an RPC argument, a file descriptor, a sealed envelope in the runtime. The editor invokes read through the capability. It cannot construct a capability for Alice's tax records because it never received one. Its initial capability set contains no ambient file access.

Alice may pass a **write capability** for a suggestions file without passing write access to the draft itself. The editor returns corrections through that narrower channel.

If Alice later revokes access, she depends on design choices. She might use a forwarding object that holds the real capability and checks a revocation flag. She might issue time-limited capabilities. She cannot simply delete Bob's name from one list if Bob already holds a copied token.

The walkthrough shows the core pattern: authority is an object you hold and hand off, not a property inferred from who you claim to be at the door.
