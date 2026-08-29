# Capability-Based Security

## What it is

Capability-based security organizes access around **LINK** and **CONTAINER** rather than around labels on a central roster.

A capability is a **LINK**: a protected connection between a subject (a running program or object) and a specific permission on a specific resource. The link is not something you can sketch from memory. The system forges it. If the link exists in your **CONTAINER**—your reachable set of references—you may traverse it to perform one defined action. If the link is absent, the path is closed.

This contrasts with roster-based control. There, the resource **CONTAINS** a list of names allowed to enter. A requester arrives at the boundary, states an identity, and a gatekeeper compares the name to the list. Capability security inverts the picture: the requester arrives carrying keys. Each key **LINKS** to exactly one door.

**Object-capability** security applies the same schema when the resource side of the link is itself an object—an file handle, a memory segment, a channel—and the link grants method-level **PATH** access along a narrow route, not blanket entry to a whole region.

## Why it exists

Shared systems **CONTAIN** many actors moving along many **PATH**s. A web server **PATH**s from socket to disk. A backup agent **PATH**s from scheduler to volume. When every actor carries default **FORCE**—the power to open arbitrary **PATH**s by name—one misrouted or captured actor can **FORCE** change across the whole machine.

Engineers sought a boundary schema that matches how delegation works in physical offices. You do not shout your title at every door. You carry a badge that **LINKS** you to specific rooms. You may hand a visitor a temporary badge; the badge **CONTAINER**s less **FORCE** than yours.

Roster models break at the **LINK** between intermediary and resource. The backup agent is a deputy: it **LINK**s Alice's request to storage. If the deputy retains broad **FORCE** while serving a narrow request, an attacker can trick the deputy into applying excessive **FORCE** along the wrong **PATH**. Capability design tries to make each handoff carry only the **LINK** needed for that leg of the **PATH**, not the deputy's full keyring.

## How it works

At startup, a process **CONTAINER**s an initial set of capabilities—often small. Each capability is an opaque token or reference. Internally it **LINK**s to a gate record: which object, which operation, which constraints.

When code invokes an operation, it must supply the capability as the ticket for that **PATH**. The runtime verifies the token, follows the internal **LINK**, and either applies **FORCE** at the target or blocks. There is no second gate that asks a global question unless the capability itself embeds that check.

Delegation is **LINK** replication under control. Holder A may copy a capability to holder B, or mint a weaker child capability whose **CONTAINER** of allowed operations is smaller. Passing a capability is passing a **PATH** segment. Parent capabilities do not automatically leak sibling **PATH**s.

Systems pursuing this model remove ambient **FORCE**: the **VERTICALITY** of privilege where "running at all" implies high reach. Instead, **VERTICAL** expansion happens only by explicit receipt of new **LINK**s. A program at the bottom does not rise unless something above hands it a rung.

Implementation places the forge at a trusted **CONTAINER**—kernel, microkernel server, language runtime. User code cannot manufacture **LINK**s; it can only receive, hold, and forward those the forge issued.

## Tradeoffs and failure modes

The **CONTAINER** model localizes reasoning. To see what can happen to an object, trace which **LINK**s exist in which holders' **CONTAINER**s. You need not merge every roster in the system. Least authority follows naturally: narrow **LINK**s mean narrow **PATH**s.

Revocation is the hard **PATH**. Once a **LINK** leaves your **CONTAINER** and enters another's, you cannot assume recall unless the architecture inserts a proxy **LINK** you still control, or unless capabilities expire. Rosters offer a single place to erase a name; capability graphs require deliberate **PATH**s for invalidation.

**Confused deputy** is a **FORCE** misapplication: a deputy **LINK** with wide **FORCE** serves a request that should use a narrow **LINK**. Capability mitigations route each request through delegated tokens so the deputy's personal **CONTAINER** never enters the transaction.

Operational **VERTICALITY** can invert: auditing who can reach a file is easy on one roster, harder when **LINK**s fan out through many **CONTAINER**s. Tools must reconstruct the graph.

Leakage treats capabilities as physical keys. Store a **LINK** in a log or send it down an unprotected **PATH**, and anyone who picks it up inherits the **FORCE**. The **CONTAINER** boundary moves with the token.

Adoption friction comes from habit. Developers map **PATH**s by string names and user labels. Capability systems ask them to thread **LINK**s through interfaces—a different spatial metaphor, but one that matches delegation more literally.

## One concrete walkthrough

Follow one document through the schemas.

Alice **CONTAINER**s a draft file object. She wants Bob's spell-check service to traverse a read **PATH** to that object only—not to her archive **CONTAINER**.

Roster style: Alice adds Bob's service identity to the draft's access list. The service arrives at the file boundary, names itself, and the gatekeeper compares against the list inside the file **CONTAINER**. If the service also holds ambient **FORCE** to open **PATH**s by string name, a bug might widen the **PATH** beyond the list's intent.

Capability style: Alice's launcher forges a read **LINK** to the draft. Alice sends that **LINK** to the spell-check service along the RPC **PATH**. The service presents the **LINK** at the object gate. The gate verifies and opens read **FORCE** along that single **PATH**. The service's **CONTAINER** lacks **LINK**s to Alice's other files; it cannot **FORCE** a route it was never given.

Alice may forge a second **LINK**—write access to a suggestions object—and **PATH** that separately. The spell-check **PATH** returns through the suggestions **LINK**, not through a global write **FORCE** on the draft.

Revocation: if Alice must cut access, she depends on whether Bob still **CONTAINER**s a copied **LINK**. She may insert a forwarder object that **LINK**s Bob to the draft through her proxy; revoking means breaking the proxy **PATH** while Bob still holds only the outer **LINK**. Without that indirection, recall is not guaranteed.

The walkthrough holds the schemas constant: capabilities are forged **LINK**s in explicit **CONTAINER**s, not inferred **FORCE** from identity shouted at the door.
