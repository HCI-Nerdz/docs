# Compare-and-Swap Versus Locks

## What it is

Two checkout clerks share one paper tally sheet on the counter. Customers completed today: the sheet reads **42**. Clerk Amy marks another sale; so does Ben— at the same moment. Each clerk reads 42, adds one in their head, and writes 43. The sheet ends at 43. One sale vanished. Nobody touched the sheet maliciously; the schedule simply overlapped.

That tally sheet is shared memory. Amy and Ben are threads. The lost increment is why synchronization exists.

A **lock** fixes the tally scene by adding a **talking stick** on the counter. Whoever holds the stick may read and rewrite the sheet. The other clerk waits. Amy grabs the stick, reads 42, writes 43, puts the stick down. Ben grabs it, reads 43, writes 44. The count is correct because only one clerk updates at a time.

**Compare-and-swap** (CAS) fixes the scene differently— no stick, but a strict rule on the single number cell. Amy reads 42 and tells the register machine: "If the cell still says 42, set it to 43; otherwise reject my update." Ben tries the same starting from 42; one clerk's conditional write wins, the other's is rejected. The loser reads the new value and tries again. The number moves 42→43→44 without a stick, as long as each clerk retries after rejection.

The tally sheet example will carry through this article. Locks coordinate the whole update episode. CAS coordinates one atomic change to the number cell.

## Why it exists

Programs split work across threads for speed— while one clerk waits on a credit card machine, another serves customers. Shared tallies, inventory counts, job queues, and "is the server ready" flags all look like that sheet on the counter.

Any time two threads read-modify-write the same location without rules, you can replay the 42→43 lost sale. Locks exist because "one clerk at a time" is easy to enforce on a block of code. CAS exists because hardware can test-and-set one word in a single indivisible step, which is enough for many tallies and pointer updates if clerks accept retry when rejected.

## How it works

Return to the sheet. With a lock, the protected **critical section** is: read cell, add one, write cell. Acquire lock, run those three steps, release lock. Every other thread's identical section waits.

With CAS on the tally, there is no lock around the whole section. Loop: read cell into `seen`; compute `seen + 1`; CAS(cell, expected=`seen`, desired=`seen + 1`); if CAS fails, another clerk changed the cell— go back to read. The loop is the waiting, but waiting happens as retries, not as blocking on a stick.

Now widen the scene slightly. Besides the count, the store keeps a chain of receipt stubs— a stack whose **head pointer** is the top stub. Pushing a stub means: new stub points to old head, then head moves to new stub. Two clerks pushing at once resembles two tally races.

Lock version: hold the stick for the whole push— wire the stub, move head, done, release.

CAS version: prepare the stub link first (new stub points at current head), then CAS head from old top to new stub. If head changed between read and CAS, reject, read fresh head, relink, CAS again. The tally stick never appears; only the head pointer word is updated atomically.

Important detail from the receipt stack: link the stub before CAS-ing head. If head moves to your stub before your stub points backward, the next clerk follows a dangling reference— like a receipt with no prior stub attached.

## Tradeoffs and failure modes

**Locks in the tally shop:** Simple story for clerks and for programmers. One stick covers the whole back room if needed— count plus ledger plus inventory in one critical section. Cost: if every sale hits the same stick, clerks queue; rush hour means waiting. Two sticks taken in opposite order by two clerks can deadlock— each holds one stick, waits for the other. A slow clerk holding the stick delays an urgent manager (priority inversion).

**CAS in the tally shop:** No stick queue for a single cell; clerks bump, retry, succeed. Light overlap stays fast. Cost: only one word per successful CAS. Updating count **and** ledger line together still needs a stick or a careful multi-step protocol. Heavy rush hour turns into many rejected CAS attempts— clerks repeatedly erasing and rewriting like spin-waiting. **ABA** is a rare tally oddity: the cell shows 42 again, but the underlying receipt chain changed and was rebuilt— your "still 42" assumption was unsafe at a deeper level. Lock-free designs need extra tags or guards for that.

Neither tool helps if you protect the wrong thing— CAS on the count while changing an unprotected ledger still races.

## One concrete walkthrough

Reset the tally: cell = 0. Amy and Ben each add one sale.

**Lock walkthrough:** Amy takes stick. Ben waits at the counter. Amy reads 0, writes 1, drops stick. Ben takes stick, reads 1, writes 2, drops stick. Cell = 2. Matches two sales.

**CAS walkthrough:** No stick. Amy reads 0, CAS(0→1) OK. Ben tries CAS(0→1) fail— cell is 1. Ben reads 1, CAS(1→2) OK. Cell = 2. Same outcome.

Receipt stack: head points to stub S. Amy pushes A; Ben pushes B.

Both read head S. Amy links A→S, CAS head S→A wins. Ben had linked B→S; CAS head expected S fails. Ben reads head A, links B→A, CAS head A→B wins. Stack: B→A→S.

Wrong push: Ben CAS-es head to B before B→… is written. Amy might read head B and follow an unset link— crash or garbage. Fix: complete B→A first, then CAS head— same ordering rule as putting the receipt in the tray before announcing it is on top.

The tally sheet started this explanation: two clerks, one number, one lost sale without rules. Locks prevent overlap by mutual exclusion on the update ritual. CAS prevents lost increments by atomic conditional writes and honest retries. Choose the stick when the whole back-office routine must run alone; choose CAS when the hot path is a single cell or head pointer and clerks can retry politely after rejection.
