# Capability-Based Security

## What it is

Alice is editing chapter three in her writing app. She clicks **Check spelling**. Behind that button lies a security question: how can a remote spell-check service read this one chapter without gaining access to Alice's entire documents folder?

**Capability-based security** answers by issuing keys, not by trusting names. A capability is an unforgeable token that grants one specific action—read, write, connect—on one specific resource. The spell-check service may read chapter three only if Alice's editor hands it a read capability for that chapter object. No token, no read. A fake token fails validation.

This differs from the familiar pattern where the service logs in as "Alice" or as a powerful service account and inherits everything that identity may touch. Capabilities make the handoff visible: the editor passes exactly the key needed for spelling, not the whole keyring.

When capabilities bind to particular objects—this file, this socket—we call the approach **object-capability** security. Alice's scenario is the spine for everything below.

## Why it exists

Alice's case shows why broad identity fails. The spell-check service is useful precisely because it is not Alice. It runs on another machine, maintained by Bob. Alice wants its eyes on chapter three only.

If the service runs with Alice's full user permissions, a bug or compromise in Bob's code exposes tax PDFs, medical notes, and drafts for other books. If the service runs under its own service account, Alice must either pre-authorize that account on her files—again over-sharing—or rely on fragile path checks.

Capabilities match how Alice thinks about the errand: "look at *this* document, suggest fixes, do not wander." The editor should delegate read access to the chapter object and nothing else. Authority follows the task, not the label on the service's badge.

## How it works

Return to the click. The editor already holds read and write capabilities on the open chapter object—Alice opened it through the editor, and the launcher minted those capabilities at open time.

When Alice clicks **Check spelling**, the editor prepares a remote job. It attenuates its read capability to read-only and embeds that capability in the RPC to Bob's service. Bob's worker wakes with that single capability in its set, plus whatever minimal network capability the platform already granted for speaking to the editor.

Bob's code calls read on the chapter object, presenting the delegated capability. The object server—kernel module, document store, or language runtime—validates the token and returns bytes. Bob cannot open `../taxes.pdf` by path if the runtime removed ambient file authority; he holds no capability for that object.

For suggestions, the editor creates a scratch suggestions object and passes Bob a write capability aimed at it. Bob returns corrections through that channel. He never received write capability on the chapter itself.

Only trusted mints create capabilities. Bob cannot forge a read capability for Alice's archive. He can only use what the editor sent. Further delegation—Bob handing the capability to a sub-worker—follows platform rules; Alice's editor may forbid redelegation when minting the attenuated read token.

## Tradeoffs and failure modes

Alice gains containment. A compromised spell-checker reads chapter three, not the whole folder. The security story matches the user story.

Revocation bites when Bob keeps a copy. If Alice cancels spell-check but the read capability has no expiry, Bob's worker may still read until Alice adds a revocable forwarder or rotates the chapter object. ACL users delete "Bob's service" from a list; capability users plan token lifetime and proxies.

The **confused deputy** would be Bob's service using its own service-account powers to read whatever path Alice's message names. Capability discipline forces Bob to use only the capability bundled with the request, ignoring his broader identity for that call.

Alice does not see capabilities directly, but engineers must thread them through APIs. Poor ergonomics lead to shortcuts—falling back to "run as Alice"—that undo the model.

If the editor logs the capability token or sends it over an unencrypted channel, **leakage** gives attackers the same read access Bob received. Capabilities are credentials.

Auditors asking "who can read Alice's chapter?" must trace delegation from editor to Bob, not only read the chapter file's ACL—unless the deployment mixes models.

## One concrete walkthrough

Walk the click again with timestamps.

**T0:** Alice opens chapter three. The document store mints read/write capabilities bound to object `Ch3`. The editor holds them.

**T1:** Alice clicks **Check spelling**. The editor mints `Ch3-readonly`, valid for one hour, non-redelegatable. It opens an RPC to Bob's pool.

**T2:** RPC payload carries `Ch3-readonly` and a write capability `Sugg-write` on a fresh suggestions object. Bob's worker stores both. Its capability set contains no other Alice objects.

**T3:** Bob presents `Ch3-readonly` to the document store. Text streams. Bob runs spelling models. He presents `Sugg-write` and records proposed edits.

**T4:** RPC returns suggestions. The editor merges visibly. Bob's process discards tokens; one-hour expiry guarantees stale tokens fail even if Bob logged them carelessly.

**T5 (alternate):** Alice hits **Cancel** at T2.5. If the RPC never delivered, Bob never received capabilities. If delivery completed, Alice's forwarder on `Ch3` marks the job revoked; further reads through her proxy fail even though Bob still holds a capability referencing the proxy.

Same characters throughout: Alice, the editor, object `Ch3`, Bob's spell-check service, capabilities as explicit keys. That single scene is capability-based security—authority minted narrowly, handed deliberately, and checked at each gate—without granting Bob the run of Alice's disk because he knows her name.
