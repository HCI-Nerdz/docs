# Capability-Based Security

## What it is

Think of authority the way you think about holding something in your hand.

In capability-based security, permission is not a costume you wear—a role label the system recognizes on sight. Permission is a token you **grasp**. While you hold it, you may act on a specific resource in a specific way. When you release it or never receive it, that action is out of reach. You cannot shape a convincing fake; the mint that stamped the token is the only source.

**Object-capability** systems bind each token to a particular thing: this file, this socket, this memory block. The grasp is not "administrator everywhere." It is "read *this* document" or "write *this* buffer."

Other designs work like showing ID at a checkpoint. You announce who you are; a clerk searches a roster. Capability designs work like handoff: you arrive with the key already in your palm, or you do not enter.

## Why it exists

Programs rarely act alone. They receive requests, fetch data, call other programs. Each hop is a moment where authority can sprawl or shrink—like passing a tool across a workbench.

If every program is born with a full toolbox merely because it started running, any flaw in the program becomes a flaw in the whole workshop. Engineers wanted newborn programs to arrive with **empty hands** except for what the launcher deliberately placed there.

The failure mode they targeted feels like handing someone a master key because they asked nicely while wearing a trustworthy uniform. A server process "is" the web server account, so it can read every file that account may read—even when one request only needed one page. Capability thinking says: for this request, **hand off** only the page key, not the ring with every key.

Sensorimotor language fits without pretending machines want things. Processes do not intend. Still, the mechanics mirror physical delegation: grasp, hold, transfer, release. Design clarity improves when interfaces encode those moves explicitly.

## How it works

At launch, the runtime places a small set of tokens in the process's grip. Each token encodes which operation on which target is permitted. When code calls "read" or "send," it must place the matching token on the counter. The kernel or runtime inspects the token, confirms it is genuine and applicable, and executes or refuses.

**Transfer** is first-class. If you hold a read token for a document, you may duplicate it into another process's hand—often with strict rules about whether duplication is allowed. You may instead mint a weaker token: read but not write, or access until a deadline. The transfer is visible in the program boundary: arguments, channels, constructor parameters. Nothing is implied by global identity.

Systems committed to this model strip **ambient grasp**: the invisible keys every legacy process carries—open any path string, bind any port, tweak any environment variable. Removing ambient grasp forces every new power to arrive through an explicit handoff chain. That chain is auditable the way a sequence of physical passes is auditable.

Forging happens only at trusted mints: the operating system, a microkernel server, a language virtual machine that protects references. User code cannot synthesize feel-alike tokens; it can only forward what it legitimately holds.

## Tradeoffs and failure modes

Least authority becomes a natural posture. You hand over a screwdriver, not the whole chest. A compromised helper cannot reach resources it never received, even if the helper is "trusted software."

Revocation is awkward once a token sits in another's grip. Unlike erasing a name from a central roster, you cannot un-hand something remotely unless you kept a intermediating holder— a proxy that still holds the real token and checks a revoke flag—or unless tokens expire by design.

The **confused deputy** is a server that still holds a fat keyring while serving a narrow errand. An attacker crafts a request that tricks the server into using its own broad keys instead of the narrow token the client should have supplied. Capability discipline requires the server to act only with tokens presented for that request, keeping its personal ring in the drawer.

Developers feel friction because mainstream APIs are path- and username-shaped, not token-shaped. Threading tokens through every call looks verbose until languages make it ordinary—built-in reference types, sealed capabilities, standard patterns for attenuation.

Leakage is dropping a key on the floor. Log a token, embed it in a world-readable config, transmit it unencrypted, and whoever picks it up can grasp what you grasped. Operational hygiene treats capabilities like physical credentials.

Global visibility shifts. A roster on a file shows every named holder in one glance. Token chains require tracing handoffs across processes— harder for humans, sometimes easier for automated graph tools.

## One concrete walkthrough

Alice runs a draft in an editor ecosystem. She wants Bob's spell-check worker to touch that draft once, not her entire documents folder.

**Handoff path:** Alice's supervisor process already holds a read token for the draft—perhaps Alice created the draft through that supervisor. The supervisor **places** a read token into the spell-check invocation. Bob's worker wakes with that token in its hand and nothing else for Alice's files.

Bob's code calls read on the draft object, presenting the token. The object server verifies mint marks and opens the bytes. Bob never received tokens for Alice's tax PDFs; path-string tricks fail if the runtime removed ambient file grasp.

Alice may **transfer** a second token—a write handle on a suggestions object—so Bob returns corrections without receiving write grasp on the draft itself. Two tokens, two narrow actions, visible in the call setup.

If Alice later wants Bob to lose access, she depends on design. If Bob copied the token freely, he may still hold it. Alice might have routed Bob through a proxy object she controls, so revoking means the proxy stops forwarding even though Bob's fingers still curl around a now-dead reference. Or she issued a token that expires after one hour.

At no point did Bob announce "I am the spell-check service account" and inherit a wide identity. He **held** what Alice **handed off**, used it along one arc of work, and could not reach beyond that arc without another transfer.

That is the embodied core of capability security: authority as graspable, transferable, attenuatable tokens—not as ambient rank you wear once at the door.
