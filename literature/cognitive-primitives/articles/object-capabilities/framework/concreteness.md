# Capability-Based Security

## What it is

Picture a parking garage that issues one plastic swipe card per slot. The card opens only that gate, only for entry and exit to that slot. You cannot scratch a duplicate that the reader accepts. If the card is not on your key ring, that gate stays dark.

A **capability** in computer security works like that swipe card. It is an unforgeable token tied to one resource and one kind of action—read this file, write that pipe, send on this network port. Software presents the token when it acts. No token, no action.

**Object-capability** security means the token attaches to a specific object: a particular file handle, not "all files labeled public."

The usual alternative looks like a clipboard at the guard desk. You say your name; the guard scans a paper list next to the door. Capability security skips the name game at the door. You either have the card or you do not.

## Why it exists

A laptop runs dozens of programs at once—browser, mail client, backup tool, music player. Each program touches files, network sockets, and cameras. If every program could open any file by typing a path, one rogue or buggy program could read passwords, delete homework, or spam contacts.

Engineers wanted a simple picture: **programs start with few keys and gain keys only when someone hands them over.** That limits blast radius. A compromised music player without a mail-folder key cannot read mail, even if the programmer made a dumb mistake elsewhere.

Real workflows pass work through chains. A mail app displays a attachment; a virus scanner inspects bytes; a previewer renders a thumbnail. Each helper should see only the attachment, not the whole disk. Name-and-list security often gives each helper the user's full identity. Capability security lets the mail app hand the scanner a read key for that one blob—like lending a single folder key instead of your house key.

## How it works

When a program starts, the launcher tucks a small set of tokens into its pocket—maybe standard input, maybe one data file, maybe nothing extra. Each token is an opaque number or protected reference the kernel or runtime understands.

The program calls "read bytes from X." It must show the read token for X. The system checks the token's stamp: valid mint, correct object, allowed operation. Then the read happens or the call fails cold.

Programs can **give copies** of tokens to other programs, like copying a hotel key at the front desk if policy allows. They can sometimes mint weaker tokens—read-only, one-hour expiry—so the recipient gets a single room, not the whole building.

Strict capability designs remove **ambient keys**: the invisible master access many Unix programs inherit—open any path, connect anywhere, fork shells. Without ambient keys, opening `/etc/passwd` fails unless some earlier step handed a token for that file, which normal apps never should.

Only trusted parts of the system—the kernel, a runtime VM, a security server—create new tokens. Application code cannot print believable fakes.

## Tradeoffs and failure modes

Narrow keys make damage containment concrete. A thief who picks your gym locker key cannot drive your car. A hacked thumbnail renderer without bank-file keys cannot read statements.

Taking keys back is harder than removing a name from the guard's clipboard. Copy a token to another process and that process may keep it until you design expiry, proxies, or short-lived sub-keys.

The **confused deputy** is a trusted middle program—say, a file server—that still carries wide keys while doing small errands. An attacker asks it to use its own broad access instead of the narrow token the client should supply. Good capability hygiene forces the middle program to use only the client's token for that request.

Programmers live in a world of file paths and usernames. Rewiring every interface to pass tokens feels clumsy until tools absorb the pattern—languages where object references already are capabilities.

**Leaked tokens** behave like lost swipe cards. Post a capability in a public log or chat and anyone can use it until it expires or someone disables the lock at the source.

Auditing "who can read this file?" is one glance at an ACL list but a scavenger hunt through token handoffs in pure capability graphs—unless tooling maps the chain.

## One concrete walkthrough

Scene: Alice finishes a chapter draft. She clicks "Check spelling." Behind the scenes, three visible actors—the editor shell, Alice's draft file, Bob's remote spell-check service.

**Step 1 — Start:** The editor already holds a read/write token for the open draft because Alice opened it through the editor. The spell-check service holds no tokens for Alice's files.

**Step 2 — Handoff:** The editor sends an RPC to Bob's service. In the RPC payload rides a read-only token for the draft object, minted or attenuated for this job. The editor does not send Alice's password or a blanket "run as Alice" flag.

**Step 3 — Use:** Bob's service presents the read token to the draft object. Bytes flow; suggestions compute. Bob never constructs a path string to `/Users/Alice/taxes.pdf` because he lacks a token for that object and the runtime rejects bare paths.

**Step 4 — Return path:** The editor passes Bob a write token aimed at a "suggestions" scratch object. Bob writes corrections there. The draft file token did not include write for Bob, so Bob cannot silently replace the chapter with spam.

**Step 5 — Revoke (optional twist):** Alice cancels the job. If tokens were one-shot, Bob's read already died. If Bob kept a copy, Alice needs a forwarder she controls or must wait for expiry. She cannot simply erase "Bob" from one central list unless the system also used lists at the object.

Count the keys in play: one read on the draft, one write on suggestions, zero on everything else. That countable scene is capability security at work—authority as specific, handable objects, not as a fog of identity.
